import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import https from 'https';
import crypto from 'crypto';
import mongoose from 'mongoose';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();
mongoose.set('bufferCommands', false);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const HAS_MONGODB = Boolean(MONGODB_URI);
const IS_VERCEL = process.env.VERCEL === '1';
let dbInitPromise: Promise<void> | null = null;

if (!HAS_MONGODB) {
  console.warn('MONGODB_URI is not defined in .env. Starting API without database connection.');
}

let isAlgoEnabled = true;

const initDatabase = async () => {
  if (!HAS_MONGODB) {
    console.warn('MongoDB is disabled. API routes that need DB will return errors.');
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = mongoose
    .connect(MONGODB_URI!, { 
      serverSelectionTimeoutMS: 5000,
      family: 4 // Force IPv4
    })
    .then(() => {
      console.log('Connected to MongoDB Atlas');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      console.warn('Starting server without database. API routes that need DB will return errors.');
    })
    .finally(() => {
      dbInitPromise = null;
    });

  return dbInitPromise;
};

// --- MongoDB Schemas & Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  phone: String,
  password: { type: String, required: true },
  passwordPlainEnc: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  realBalance: { type: Number, default: 0 },
  demoBalance: { type: Number, default: 10000 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  hasTradedSinceLastDeposit: { type: Boolean, default: true },
  verificationDetails: {
    idType: String,
    idNumber: String,
    verifiedAt: String
  },
  kyc: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    frontId: String,
    backId: String,
    selfie: String,
    submittedAt: Date,
    reviewedAt: Date,
    reason: String
  },
  bank: {
    accountHolder: String,
    accountNumber: String,
    ifsc: String,
    bankName: String
  },
  loginHistory: [{
    ip: String,
    device: String,
    location: String,
    timestamp: { type: Date, default: Date.now }
  }],
  withdrawalMethods: { type: Map, of: Object, default: {} },
  lastActive: { type: Date, default: Date.now },
  resetTokenHash: { type: String, default: '' },
  resetTokenExp: { type: Date, default: null }
}, { timestamps: true });

const tradeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  symbol: String,
  assetId: { type: String, default: 'cosmos' },
  type: { type: String, enum: ['up', 'down'] },
  amount: Number,
  price: Number,
  payout: { type: Number, default: 80 },
  isSignal: { type: Boolean, default: false },
  accountType: { type: String, enum: ['real', 'demo'], default: 'demo' },
  duration: Number,
  expiryTime: Number,
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closeTimestamp: Date,
  closePrice: Number,
  pnl: Number,
  timestamp: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'] },
  amount: Number,
  method: String,
  details: String,
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
  reason: String,
  orderId: String, // Plisio order_id
  txnId: String, // Plisio txn_id
  transactionCode: { type: String, unique: true },
  timestamp: { type: Date, default: Date.now }
});

const generateTransactionCode = () => {
  return 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const User = mongoose.model('User', userSchema);
const Trade = mongoose.model('Trade', tradeSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Setting = mongoose.model('Setting', new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  description: String
}, { timestamps: true }));

const isDbConnected = () => mongoose.connection.readyState === 1;
const isDbUnavailableError = (error: any) => {
  const msg = String(error?.message || '');
  return (
    msg.includes('before initial connection is complete') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('MongoServerSelectionError')
  );
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve public assets (widget.js)
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || '3613d551578ca0e2ee1d7bc224693f22481eea682c3abb84a7cefe2167a581406baccce3ef54231c7c7eb36a2e526f9be02d47a14b6244426b26356bfe7c0543';
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const UROPAY_API_KEY = process.env.UROPAY_API_KEY || '';
const UROPAY_SECRET = process.env.UROPAY_SECRET || '';
const DEFAULT_PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
const APP_URL = (process.env.APP_URL || DEFAULT_PUBLIC_URL).replace(/['"]/g, '');
const ENC_KEY = (process.env.PASSWORD_ENC_KEY && process.env.PASSWORD_ENC_KEY.length >= 64)
  ? process.env.PASSWORD_ENC_KEY
  : crypto.createHash('sha256').update(JWT_SECRET).digest('hex');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const encryptText = (text: string) => {
  const key = Buffer.from(ENC_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
};
const decryptText = (encText: string) => {
  const key = Buffer.from(ENC_KEY, 'hex');
  const buf = Buffer.from(encText, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
};

// --- Database Schema ---
interface AssetData {
  currentPrice: number;
  trueMarketPrice: number; // Simulated "real" price
  // Smoothed external reference (e.g., Binance). Helps prevent unrealistic jumps.
  anchorPrice?: number;
  lastAnchorAt?: number;
  chartData: any[];
  currentCandleTime: number;
  currentOpen: number;
  currentHigh: number;
  currentLow: number;
  sentiment?: { up: number; down: number };
  baseSentiment?: number;
}

const assetsState: Record<string, AssetData> = {};
const ASSET_IDS = [
  'cosmos', 'eurusd', 'gbpusd', 'usdjpy', 'audusd', 'usdcad', 'usdchf', 
  'nzdusd', 'eurgbp', 'eurjpy', 'gbpjpy', 'btcusd', 'ethusd', 'inrusd', 'brlusd'
];

// --- SSE Broadcast System ---
interface SSEClient {
  id: string;
  res: any;
  assetId: string;
}
let sseClients: SSEClient[] = [];

// Real Market Price Fetcher
const fetchPriceFromBinance = (symbol: string): Promise<number> => {
  return new Promise((resolve) => {
    https.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const p = Number.parseFloat(json?.price);
          resolve(Number.isFinite(p) && p > 0 ? p : 0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const normalizeWithdrawalMethods = (value: any) => {
  if (!value) return undefined;
  // Mongoose Map serializes poorly through JSON; convert to plain object.
  if (value instanceof Map) return Object.fromEntries(value.entries());
  // Some mongoose versions return a MongooseMap-like object with entries()
  if (typeof value?.entries === 'function') {
    try {
      return Object.fromEntries(Array.from(value.entries()));
    } catch {
      // fall through
    }
  }
  return value;
};

// Box–Muller transform: standard normal random number
const randn = (() => {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(2.0 * Math.PI * v);
    const z1 = mag * Math.sin(2.0 * Math.PI * v);
    spare = z1;
    return z0;
  };
})();

const SYMBOL_MAP: Record<string, string> = {
  btcusd: 'BTCUSDT',
  ethusd: 'ETHUSDT',
  gbpusd: 'GBPUSDT',
  usdjpy: 'USDJPY',
  audusd: 'AUDUSDT',
  usdcad: 'USDCAD',
  usdchf: 'USDCHF',
  nzdusd: 'NZDUSDT',
  cosmos: 'ATOMUSDT',
  eurusd: 'EURUSDT',
  eurgbp: 'EURGBP',
  eurjpy: 'EURJPY',
  gbpjpy: 'GBPJPY',
};

// Mailer
const createTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (host && user && pass) {
    // For Gmail specifically, use service: 'gmail'
    if (host.includes('gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return nodemailer.createTransport({
      host, port, secure, auth: { user, pass }
    });
  }
  return null;
};

const sendResetEmail = async (to: string, link: string) => {
  const transporter = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@growww.local';
  const subject = 'Reset your password';
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-bottom:16px;">Reset your password</h2>
      <p style="color:#475569;line-height:1.6;margin-bottom:24px;">We received a request to reset your password. Click the button below to set a new one:</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
      </div>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;">This link will expire in 30 minutes.</p>
    </div>`;
  
  if (transporter) {
    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log('[MAIL] Reset email sent to:', to);
    } catch (err) {
      console.error('[MAIL ERROR] Failed to send email to:', to, err);
      throw err; // Rethrow to catch in the route
    }
  } else {
    console.log('[MAIL DEV] No SMTP configured. To:', to, 'Subject:', subject, 'Link:', link);
  }
};

const updateRealPrices = async () => {
  const now = Date.now();
  for (const id in SYMBOL_MAP) {
    const binanceSymbol = SYMBOL_MAP[id];
    const price = await fetchPriceFromBinance(binanceSymbol);
    const state = assetsState[id];
    if (price > 0 && state) {
      // Outlier filter: ignore sudden large jumps from the upstream feed.
      const prev = state.anchorPrice ?? state.trueMarketPrice ?? state.currentPrice;
      const relMove = prev > 0 ? Math.abs(price - prev) / prev : 0;
      if (prev > 0 && relMove > 0.05) {
        // Ignore >5% single refresh jumps (usually bad symbol, rate limits, or error payload).
        continue;
      }

      // Smooth anchor price (EMA) so the sim follows the "real" feed without snapping.
      const alpha = 0.15; // higher = faster to follow upstream
      state.anchorPrice = Number.isFinite(prev) ? (prev * (1 - alpha) + price * alpha) : price;
      state.lastAnchorAt = now;
    }
  }
};

// Initial prices (Used as starting points until real price is fetched)
const INITIAL_PRICES: Record<string, number> = {
  cosmos: 1.74,
  eurusd: 1.082,
  gbpusd: 1.254,
  usdjpy: 151.2,
  audusd: 0.654,
  usdcad: 1.358,
  usdchf: 0.902,
  nzdusd: 0.601,
  eurgbp: 0.862,
  eurjpy: 163.4,
  gbpjpy: 189.5,
  btcusd: 65000,
  ethusd: 3300,
  inrusd: 83.3,
  brlusd: 5.05
};

// Initialize all assets with substantial history
ASSET_IDS.forEach(id => {
  let price = INITIAL_PRICES[id] || 10 + Math.random() * 90;

  let candleTime = Math.floor(Date.now() / 1000);
  let history: any[] = [];
  
  // Generate 1000 candles of history
  const historySize = 1000;
  let time = candleTime - historySize;
  let close = price;
  
  for (let i = 0; i < historySize; i++) {
    const open = close;
    // Higher volatility factor for more realistic "non-flat" candles
    let volFactor = 0.0003; 
    if (id.includes('btc') || id.includes('eth')) volFactor = 0.0008;
    else if (id.includes('usd') || id.includes('eur') || id.includes('gbp')) volFactor = 0.0002;

    const volatility = price * volFactor;
    close = open + (Math.random() * (volatility * 2) - volatility);
    // Realistic High/Low wicks
    const wickHigh = Math.max(open, close) + (Math.random() * (volatility * 0.4));
    const wickLow = Math.min(open, close) - (Math.random() * (volatility * 0.4));
    
    history.push({ time, open, high: wickHigh, low: wickLow, close });
    time += 1;
  }

  assetsState[id] = {
    currentPrice: close,
    trueMarketPrice: close,
    chartData: history,
    currentCandleTime: candleTime,
    currentOpen: close,
    currentHigh: close,
    currentLow: close
  };
});

// Initial fetch
updateRealPrices();
// Update every 5 seconds to stay close to real market
setInterval(updateRealPrices, 5000);

const broadcastUpdate = () => {
  sseClients.forEach(client => {
    const state = assetsState[client.assetId] || assetsState['cosmos'];
    client.res.write(`data: ${JSON.stringify({ 
      type: 'update', 
      current: { time: state.currentCandleTime, open: state.currentOpen, high: state.currentHigh, low: state.currentLow, close: state.currentPrice },
      sentiment: state.sentiment || { up: 50, down: 50 }
    })}\n\n`);
  });
};

const CURRENCIES = [
  { code: 'USD', rate: 1.0 },
  { code: 'EUR', rate: 0.92 },
  { code: 'GBP', rate: 0.79 },
  { code: 'INR', rate: 83.0 },
  { code: 'BRL', rate: 5.0 },
  { code: 'AUD', rate: 1.5 },
  { code: 'CAD', rate: 1.35 },
  { code: 'JPY', rate: 150.0 },
];

const getInrValue = (amount: number, currencyCode: string) => {
  const inrRate = CURRENCIES.find(c => c.code === 'INR')?.rate || 83.0;
  const currentRate = CURRENCIES.find(c => c.code === currencyCode)?.rate || 1.0;
  return (amount / currentRate) * inrRate;
};

// Price update loop (High Frequency for Smooth Candles)
let cachedActiveTrades: any[] = [];
setInterval(async () => {
  if (!isDbConnected()) {
    cachedActiveTrades = [];
    return;
  }
  try {
    cachedActiveTrades = await Trade.find({ status: 'open' });
  } catch (err) {
    console.error('Error fetching active trades for cache:', err);
  }
}, 2000);

setInterval(async () => {
  const now = Math.floor(Date.now() / 1000);
  const candleTime = now;
  
  try {
    const allActiveTrades = cachedActiveTrades;

    ASSET_IDS.forEach(id => {
      const state = assetsState[id];
      if (!state) return;
      if (!Number.isFinite(state.currentPrice) || state.currentPrice <= 0) state.currentPrice = INITIAL_PRICES[id] || 1;
      if (!Number.isFinite(state.trueMarketPrice) || state.trueMarketPrice <= 0) state.trueMarketPrice = state.currentPrice;
      
      // Per-tick dynamics tuned to look "market-like" and avoid spikes.
      // dt = 0.2s (we run every 200ms)
      const dt = 0.2;
      const isCrypto = id.includes('btc') || id.includes('eth') || id.includes('cosmos');
      const isFx = id.includes('usd') || id.includes('eur') || id.includes('gbp') || id.includes('jpy') || id.includes('cad') || id.includes('chf') || id.includes('aud') || id.includes('nzd');

      // Target volatility per second (roughly). We'll scale noise by sqrt(dt).
      const sigmaPerSec = isCrypto ? 0.0012 : isFx ? 0.00035 : 0.0007;
      const noise = state.trueMarketPrice * sigmaPerSec * Math.sqrt(dt) * randn();

      // Mean-revert trueMarketPrice towards anchorPrice if present (prevents drift/explosions).
      const anchor = state.anchorPrice;
      const kAnchor = anchor && Number.isFinite(anchor) ? (isCrypto ? 0.025 : 0.04) : 0;
      const anchorPull = anchor && Number.isFinite(anchor) ? (anchor - state.trueMarketPrice) * kAnchor : 0;
      
      // 1. Update True Market Price (Natural random walk)
      // Clamp tick move to avoid unrealistic single-bar spikes.
      const maxTrueMovePct = isCrypto ? 0.0015 : 0.0006; // 0.15% crypto, 0.06% fx per tick cap
      const maxTrueMove = Math.max(1e-8, state.trueMarketPrice * maxTrueMovePct);
      const trueDelta = clamp(noise + anchorPull, -maxTrueMove, maxTrueMove);
      state.trueMarketPrice = Math.max(1e-8, state.trueMarketPrice + trueDelta);

      // 2. Anti-Majority Logic (if active trades exist and algo is enabled)
      const activeTrades = allActiveTrades.filter(t => t.assetId === id);
      const upAmount = activeTrades.filter(t => t.type === 'up').reduce((sum, t) => sum + t.amount, 0);
      const downAmount = activeTrades.filter(t => t.type === 'down').reduce((sum, t) => sum + t.amount, 0);
      
      let bias = 0;
      const totalAmount = upAmount + downAmount;
      if (isAlgoEnabled && totalAmount > 0) {
        // Extreme anti-majority logic for immediate impact
        const imbalance = (upAmount - downAmount) / totalAmount; // -1 to 1
        
        // Massive bias increase: move price by 0.5% - 1% per tick if fully imbalanced
        const biasStrength = isCrypto ? 0.005 : 0.003; 
        
        // The negative sign ensures we go opposite to the majority (higher investment)
        bias = -state.trueMarketPrice * biasStrength * imbalance;
        
        console.log(`[ALGO ACTIVE] ${id}: Up=$${upAmount}, Down=$${downAmount}, Bias=${bias.toFixed(6)}`);
      }

      // 3. Smooth Gravity Pull (Tethering)
      const diff = state.trueMarketPrice - state.currentPrice;
      const gravity = diff * (isCrypto ? 0.06 : 0.08); // quicker tether for FX to avoid drift

      // 4. Update Current Price with smoothing
      const jitterSigma = isCrypto ? 0.00035 : 0.00018;
      const jitter = state.currentPrice * jitterSigma * Math.sqrt(dt) * randn();
      
      // When algo is active, prioritize bias over gravity to ensure it wins
      let finalChange;
      if (isAlgoEnabled && totalAmount > 0) {
        finalChange = jitter + bias + (gravity * 0.1); // Minimize gravity pull when algo is active
      } else {
        finalChange = jitter + bias + gravity;
      }

      // Clamp current price tick movement as well (primary anti-spike).
      const maxCurMovePct = (isAlgoEnabled && totalAmount > 0) ? 0.02 : (isCrypto ? 0.0035 : 0.0015); 
      const maxCurMove = Math.max(1e-8, state.currentPrice * maxCurMovePct);
      finalChange = clamp(finalChange, -maxCurMove, maxCurMove);
      state.currentPrice = Math.max(1e-8, state.currentPrice + finalChange);
      
      if (!state.baseSentiment) state.baseSentiment = 50;
      state.baseSentiment += (Math.random() * 0.1 - 0.05);
      state.baseSentiment = Math.max(35, Math.min(65, state.baseSentiment));

      if (totalAmount > 0) {
        const realUpPercent = (upAmount / totalAmount) * 100;
        const blendedUp = (realUpPercent * 0.8) + (state.baseSentiment * 0.2);
        state.sentiment = { up: blendedUp, down: 100 - blendedUp };
      } else {
        state.sentiment = { up: state.baseSentiment, down: 100 - state.baseSentiment };
      }

      if (candleTime > state.currentCandleTime) {
        state.chartData.push({
          time: state.currentCandleTime,
          open: state.currentOpen,
          high: state.currentHigh,
          low: state.currentLow,
          close: state.currentPrice - finalChange
        });
        
        // Keep up to 5000 candles of history per asset
        if (state.chartData.length > 5000) state.chartData.shift();
        
        state.currentCandleTime = candleTime;
        state.currentOpen = state.currentPrice - finalChange;
        state.currentHigh = Math.max(state.currentOpen, state.currentPrice);
        state.currentLow = Math.min(state.currentOpen, state.currentPrice);
      } else {
        // Form realistic wicks (High/Low)
        const wickVol = Math.abs(finalChange) * 0.8; // wick proportional to recent move
        const randomHigh = state.currentPrice + (Math.random() * wickVol);
        const randomLow = state.currentPrice - (Math.random() * wickVol);
        
        state.currentHigh = Math.max(state.currentHigh, state.currentPrice, randomHigh);
        state.currentLow = Math.min(state.currentLow, state.currentPrice, randomLow);
      }
    });
    
    broadcastUpdate();
  } catch (error) {
    console.error('Error in price update loop:', error);
  }
}, 200); // Updated from 1000ms to 200ms for smoothness

// --- Middleware ---
const checkDbConnection = (req: any, res: any, next: any) => {
  // Always proceed in memory mode
  next();
};

app.use('/api', checkDbConnection);

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- API Routes ---

app.get('/api/chart/stream', (req, res) => {
  const assetId = (req.query.assetId as string) || 'cosmos';
  const state = assetsState[assetId] || assetsState['cosmos'];
  const clientId = Math.random().toString(36).substring(7);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  // Send initial data
  res.write(`data: ${JSON.stringify({ 
    type: 'init', 
    history: state.chartData, 
    current: { time: state.currentCandleTime, open: state.currentOpen, high: state.currentHigh, low: state.currentLow, close: state.currentPrice },
    sentiment: state.sentiment || { up: 50, down: 50 }
  })}\n\n`);

  const newClient: SSEClient = { id: clientId, res, assetId };
  sseClients.push(newClient);

  // Keep-alive heartbeat every 5 seconds to prevent timeout
  const heartbeat = setInterval(() => {
    if (res.writableEnded) return clearInterval(heartbeat);
    res.write(': heartbeat\n\n');
  }, 5000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
    res.end();
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again in a minute.' });
    }
    console.log('Register request received:', req.body);
    const { username, email, phone, password, currency } = req.body;
    const finalCurrency = currency || 'USD';
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('Existing user found:', existingUser);
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await User.countDocuments();
    
    const user = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      passwordPlainEnc: ENC_KEY ? encryptText(password) : '',
      currency: finalCurrency,
      realBalance: 0,
      demoBalance: 10000,
      isVerified: false,
      isAdmin: userCount === 0,
      hasTradedSinceLastDeposit: true
    });
    
    await user.save();
    console.log('User saved:', user);
    
    const token = jwt.sign({ userId: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        phone: user.phone,
        currency: finalCurrency,
        realBalance: user.realBalance,
        demoBalance: user.demoBalance,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    if (isDbUnavailableError(error)) {
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again in a minute.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again in a minute.' });
    }
    const { username, password, isDevLogin } = req.body;
    console.log(`[LOGIN] Attempt for: ${username}, isDevLogin: ${isDevLogin}`);
    
    let user = await User.findOne({ 
      $or: [
        { username: username },
        { email: username }
      ]
    });
    
    // Fallback for dev login if user doesn't exist or isn't admin
    if (isDevLogin) {
      if ((username === 'rajhingu01@gmail.com' && password === 'Admin@#1234') || 
          (username === 'v.meet0503@gmail.com' && password === 'Admin@#1245')) {
        
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!user) {
          console.log(`[LOGIN] Creating dev admin user: ${username}`);
          user = new User({
            username: username.split('@')[0],
            email: username,
            password: hashedPassword,
            passwordPlainEnc: ENC_KEY ? encryptText(password) : '',
            isAdmin: true,
            isVerified: true,
            realBalance: 100000,
            demoBalance: 10000
          });
        } else {
          console.log(`[LOGIN] Updating dev admin user credentials: ${username}`);
          user.password = hashedPassword;
          user.isAdmin = true;
          user.passwordPlainEnc = ENC_KEY ? encryptText(password) : '';
        }
        await user.save();
      }
    }

    if (!user) {
      console.log(`[LOGIN] User not found: ${username}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        phone: user.phone,
        currency: user.currency || 'USD',
        realBalance: user.realBalance,
        demoBalance: user.demoBalance,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    if (isDbUnavailableError(error)) {
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again in a minute.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid token' });

    const { email, name, sub: googleId } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if not exists
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = new User({
        username,
        email,
        password: hashedPassword,
        passwordPlainEnc: ENC_KEY ? encryptText(randomPassword) : '',
        isVerified: true, // Google accounts are usually verified
        realBalance: 0,
        demoBalance: 10000
      });
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        currency: user.currency || 'USD',
        realBalance: user.realBalance,
        demoBalance: user.demoBalance,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

app.post('/api/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await User.findOne({ $or: [{ email: new RegExp(`^${email}$`, 'i') }, { username: email }] });
    if (!user) {
      console.log('[AUTH] Forgot password requested for non-existent user:', email);
      // Do not reveal existence; respond success
      return res.json({ success: true });
    }
    console.log('[AUTH] Reset token generated for user:', user.email);
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    (user as any).resetTokenHash = hash;
    (user as any).resetTokenExp = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await user.save();
    const base = process.env.APP_BASE_URL || process.env.APP_URL || DEFAULT_PUBLIC_URL;
    const link = `${base}/reset-password?token=${token}`;
    await sendResetEmail(user.email, link);
    res.json({ success: true });
  } catch (error) {
    console.error('Forgot error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Invalid request' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetTokenHash: hash, resetTokenExp: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.passwordPlainEnc = ENC_KEY ? encryptText(password) : '';
    (user as any).resetTokenHash = '';
    (user as any).resetTokenExp = null;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify', authenticateToken, async (req: any, res: any) => {
  try {
    const { idType, idNumber, documentImage } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!idType || !idNumber) {
      return res.status(400).json({ error: 'ID type and ID number are required.' });
    }
    if (!documentImage || typeof documentImage !== 'string') {
      return res.status(400).json({ error: 'Document image is required.' });
    }

    if (user.isVerified) {
      return res.json({ success: true, isVerified: true, kycStatus: 'approved' });
    }

    user.isVerified = false;
    user.verificationDetails = { idType, idNumber, verifiedAt: '' };
    user.kyc.status = 'pending';
    user.kyc.frontId = documentImage;
    user.kyc.backId = '';
    user.kyc.selfie = '';
    user.kyc.idType = idType;
    user.kyc.idNumber = idNumber;
    user.kyc.submittedAt = new Date();
    user.kyc.reviewedAt = undefined as any;
    user.kyc.reason = '';
    await user.save();
    res.json({ success: true, isVerified: false, kycStatus: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userObj = user.toObject();
    const { password, ...userWithoutPassword } = userObj;
    res.json({
      ...userWithoutPassword,
      id: String(user._id),
      currency: user.currency || 'USD',
      isVerified: Boolean(user.isVerified),
      withdrawalMethods: normalizeWithdrawalMethods((userObj as any).withdrawalMethods ?? (user as any).withdrawalMethods)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/trades', authenticateToken, async (req: any, res: any) => {
  try {
    const { symbol, assetId, type, amount, price, payout = 80, isSignal = false, accountType = 'demo', duration = 60 } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const balanceKey = accountType === 'real' ? 'realBalance' : 'demoBalance';
    if (user[balanceKey] < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const trade = new Trade({
      userId: user._id,
      symbol,
      assetId: assetId || 'cosmos',
      type,
      amount,
      price,
      payout,
      isSignal,
      accountType,
      duration,
      expiryTime: Date.now() + (duration * 1000),
      status: 'open'
    });
    
    user[balanceKey] -= amount;
    if (accountType === 'real') {
      user.hasTradedSinceLastDeposit = true;
    }
    
    // Save both in parallel for speed
    await Promise.all([trade.save(), user.save()]);
    
    res.json({ trade, realBalance: user.realBalance, demoBalance: user.demoBalance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/trades/:id/resolve', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    const trade = await Trade.findOne({ _id: req.params.id, userId: req.user.userId });
    
    if (!user || !trade) return res.status(404).json({ error: 'Not found' });
    if (trade.status === 'closed') return res.status(400).json({ error: 'Already closed' });
    
    const assetState = assetsState[trade.assetId || 'cosmos'] || assetsState['cosmos'];
    
    trade.status = 'closed';
    trade.closeTimestamp = new Date();
    
    if (trade.isSignal) {
      const win = Math.random() < 0.4;
      trade.closePrice = win ? (trade.type === 'up' ? trade.price + 0.1 : trade.price - 0.1) : (trade.type === 'up' ? trade.price - 0.1 : trade.price + 0.1);
    } else {
      trade.closePrice = assetState.currentPrice;
    }
    
    let payoutAmount = 0;
    const payoutMultiplier = 1 + (trade.payout / 100);
    
    if (trade.type === 'up' && trade.closePrice > trade.price) payoutAmount = trade.amount * payoutMultiplier;
    else if (trade.type === 'down' && trade.closePrice < trade.price) payoutAmount = trade.amount * payoutMultiplier;
    else if (trade.closePrice === trade.price) payoutAmount = trade.amount;
    
    trade.pnl = payoutAmount - trade.amount;
    const balanceKey = trade.accountType === 'real' ? 'realBalance' : 'demoBalance';
    user[balanceKey] += payoutAmount;
    
    await trade.save();
    await user.save();
    res.json({ trade, realBalance: user.realBalance, demoBalance: user.demoBalance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/trades', authenticateToken, async (req: any, res: any) => {
  try {
    const userTrades = await Trade.find({ userId: req.user.userId });
    res.json(userTrades.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/deposit', authenticateToken, async (req: any, res: any) => {
  try {
    const { amount, method, currency = 'USD' } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const inrValue = getInrValue(amount, currency);
    if (inrValue < 299.9) return res.status(400).json({ error: 'Minimum deposit amount must be equivalent to ₹300' });
    
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      method: method || 'manual',
      details: `Target: real | Currency: ${currency}`,
      status: 'pending',
      transactionCode: generateTransactionCode()
    });
    
    await transaction.save();
    res.json({
      success: true,
      message: 'Deposit submitted successfully. Awaiting admin approval.',
      realBalance: user.realBalance,
      demoBalance: user.demoBalance,
      transaction
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- UroPay UPI Deposit (GPay/PhonePe/UPI) ---
app.post('/api/user/deposit/upi', authenticateToken, async (req: any, res: any) => {
  try {
    const { amount, currency = 'USD', targetAccount = 'real', email } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!UROPAY_API_KEY) {
      console.log('[UROPAY DEV]: No API key. Returning mock invoice.');
      const orderId = `UPI_DEV${Date.now().toString().slice(-6)}`;
      
      const transaction = new Transaction({
        userId: user._id,
        type: 'deposit',
        amount: Number(amount),
        method: 'upi',
        status: 'pending',
        orderId,
        details: `Target: ${targetAccount} | Email: ${email || user.email} (DEV MOCK)`,
        transactionCode: generateTransactionCode()
      });
      await transaction.save();

      return res.json({ 
        success: true, 
        payment_url: `${APP_URL || 'http://localhost:' + PORT}/api/dev/payment-success?orderId=${orderId}`
      });
    }

    const inrValue = getInrValue(Number(amount), String(currency));
    if (inrValue < 299.9) return res.status(400).json({ error: 'Minimum deposit amount must be equivalent to ₹300' });

    const orderId = `UPI${Date.now().toString().slice(-6)}${user._id.toString().slice(-4)}`;
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      method: 'upi',
      status: 'pending',
      orderId,
      details: `Target: ${targetAccount} | Email: ${email || user.email} | Currency: ${currency}`,
      transactionCode: generateTransactionCode()
    });
    await transaction.save();

    const uropayBaseUrl = process.env.UROPAY_API_BASE_URL || 'https://api.uropay.me';
    const authHash = UROPAY_SECRET
      ? crypto.createHash('sha512').update(UROPAY_SECRET).digest('hex')
      : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': UROPAY_API_KEY
    };
    if (authHash) headers.Authorization = `Bearer ${authHash}`;

    const payload = {
      amount: Math.round(inrValue * 100), // UroPay expects paise
      merchantOrderId: orderId,
      customerName: user.username,
      customerEmail: email || user.email,
      transactionNote: `Deposit_${targetAccount}_${user.username}`,
      notes: {
        userId: String(user._id),
        accountType: targetAccount
      }
    };

    const response = await fetch(`${uropayBaseUrl}/order/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data: any = await response.json();
    console.log('[UROPAY RESPONSE]:', JSON.stringify(data));

    const paymentUrl =
      data.payment_url ||
      data.paymentUrl ||
      data.checkout_url ||
      data.checkoutUrl ||
      data.data?.payment_url ||
      data.data?.paymentUrl ||
      data.data?.checkout_url ||
      data.data?.checkoutUrl ||
      data.data?.intentUrl;

    if (!paymentUrl) {
      const errorMsg = data.message || data.error || 'UroPay response did not include payment URL';
      return res.status(500).json({ error: errorMsg });
    }

    res.json({ payment_url: paymentUrl, order_id: orderId });
  } catch (error: any) {
    console.error('UroPay Deposit Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// --- Plisio Crypto Deposit ---
app.get('/api/settings/crypto-address', (req, res) => {
  res.json({ address: process.env.PLATFORM_CRYPTO_ADDRESS || 'TYH9jP7qW4XzM2V1k8L5N3B6S0R4D7F2A' });
});

app.post('/api/user/deposit/manual-crypto', authenticateToken, async (req: any, res: any) => {
  try {
    const { amount, userAddress, currency = 'USD' } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create a pending transaction
    const orderId = `manual_${Date.now()}_${user._id}`;
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      method: 'crypto',
      details: `From Address: ${userAddress}`,
      status: 'pending',
      orderId,
      transactionCode: generateTransactionCode()
    });
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Manual Crypto Deposit Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// --- NOWPayments Crypto Deposit ---
app.post('/api/user/deposit/crypto', authenticateToken, async (req: any, res: any) => {
  try {
    const { amount, currency = 'USD', targetAccount = 'real', email } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const orderId = `DEP${Date.now().toString().slice(-6)}${user._id.toString().slice(-4)}`;
    
    // Create a pending transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      method: 'crypto',
      status: 'pending',
      orderId,
      details: `Target: ${targetAccount} | Email: ${email || user.email}`,
      transactionCode: generateTransactionCode()
    });
    await transaction.save();

    // NOWPayments requires publicly reachable HTTPS callback/redirect URLs.
    const gatewayBaseUrl =
      process.env.NOWPAYMENTS_REDIRECT_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      (APP_URL.startsWith('https://') ? APP_URL : 'https://growwithtrade.com');

    console.log('[NOWPAYMENTS REQUEST]:', JSON.stringify({
      orderId: orderId,
      amount: amount.toString(),
      currency: currency.toUpperCase(),
      description: `Deposit_${targetAccount}_${user.username}`,
      userEmail: email || user.email,
      userName: user.username,
      effectiveAppUrl: gatewayBaseUrl
    }, null, 2));

    const invoicePayload = {
      price_amount: Number(amount),
      price_currency: String(currency).toLowerCase(),
      order_id: orderId,
      order_description: `Deposit_${targetAccount}_${user.username}`,
      ipn_callback_url: `${gatewayBaseUrl}/api/webhook/nowpayments`,
      success_url: `${gatewayBaseUrl}/deposit?payment=success&orderId=${encodeURIComponent(orderId)}`,
      cancel_url: `${gatewayBaseUrl}/deposit?payment=cancelled&orderId=${encodeURIComponent(orderId)}`
    };

    const createInvoice = async (baseUrl: string) => {
      const response = await fetch(`${baseUrl}/v1/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': NOWPAYMENTS_API_KEY
        },
        body: JSON.stringify(invoicePayload)
      });
      const data: any = await response.json();
      return { response, data };
    };

    // Try live first, fallback to sandbox when key belongs there.
    let usedBaseUrl = process.env.NOWPAYMENTS_API_BASE_URL || 'https://api.nowpayments.io';
    let { data } = await createInvoice(usedBaseUrl);
    if (data?.code === 'INVALID_API_KEY' || data?.message === 'Invalid api key') {
      const sandboxBaseUrl = 'https://api-sandbox.nowpayments.io';
      const retry = await createInvoice(sandboxBaseUrl);
      data = retry.data;
      if (!(data?.code === 'INVALID_API_KEY' || data?.message === 'Invalid api key')) {
        usedBaseUrl = sandboxBaseUrl;
      }
    }
    console.log('[NOWPAYMENTS RESPONSE RAW]:', JSON.stringify({ usedBaseUrl, data }));

    let invoiceUrl = data.invoice_url || data.data?.invoice_url || data.url || data.data?.url;

    if (!invoiceUrl && data.data && typeof data.data === 'string' && data.data.startsWith('http')) {
      invoiceUrl = data.data;
    }

    if (invoiceUrl) {
      res.json({ 
        invoice_url: invoiceUrl, 
        order_id: orderId 
      });
    } else {
      console.error('[NOWPAYMENTS ERROR] No URL found in response:', data);
      const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : 'Payment gateway returned success but no checkout URL was found.');
      throw new Error(errorMsg);
    }

  } catch (error: any) {
    console.error('NOWPayments Error Details:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// --- NOWPayments Webhook ---
app.post('/api/webhook/nowpayments', async (req: any, res: any) => {
  try {
    const payload = req.body;
    console.log('[NOWPAYMENTS WEBHOOK]:', JSON.stringify(payload));
    
    const orderId = payload.order_id || payload.data?.order_id;
    const status = payload.payment_status || payload.data?.payment_status;

    if (!orderId) return res.status(400).send('No orderId found');

    const transaction = await Transaction.findOne({ orderId: orderId });
    if (!transaction) return res.status(404).send('Transaction not found');

    if (transaction.status === 'completed') return res.send('OK');

    if (status === 'success' || status === 'completed' || status === 'finished' || status === 'confirmed') {
      // Auto-credit wallet on successful gateway confirmation.
      const user = await User.findById(transaction.userId);
      if (!user) return res.status(404).send('User not found');

      const details = String(transaction.details || '');
      const targetAccount = /Target:\s*demo/i.test(details) ? 'demo' : 'real';
      const creditAmount = Number(transaction.amount || 0);

      if (targetAccount === 'demo') {
        user.demoBalance += creditAmount;
      } else {
        user.realBalance += creditAmount;
      }
      user.hasTradedSinceLastDeposit = false;
      user.lastActive = new Date();

      transaction.status = 'completed';
      transaction.reason = 'Auto-approved by NOWPayments webhook.';

      await user.save();
      await transaction.save();
      console.log(`[NOWPAYMENTS] Auto-credited ${creditAmount} to ${targetAccount} wallet for order ${orderId}.`);
    } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      transaction.status = 'rejected';
      await transaction.save();
    }

    res.send('OK');
  } catch (error) {
    console.error('NOWPayments Webhook Error:', error);
    res.status(500).send('Error');
  }
});

app.post('/api/user/withdraw', authenticateToken, async (req: any, res: any) => {
  try {
    const { amount, method, details, currency = 'USD' } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your account before making a withdrawal.' });
    }
    
    const inrValue = getInrValue(amount, currency);
    if (inrValue < 599.9) return res.status(400).json({ error: 'Minimum withdrawal amount must be equivalent to ₹600' });
    
    if (user.realBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    if (!user.hasTradedSinceLastDeposit) return res.status(400).json({ error: 'You must place at least one trade after your last deposit to withdraw.' });
    
    user.realBalance -= Number(amount);
    
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal',
      amount: Number(amount),
      method: method || 'manual',
      details: details || '',
      status: 'processing',
      transactionCode: generateTransactionCode()
    });
    
    await transaction.save();
    await user.save();
    res.json({ realBalance: user.realBalance, demoBalance: user.demoBalance, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/reset-demo', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.demoBalance = 10000;
    await user.save();
    res.json({ demoBalance: user.demoBalance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/add-demo', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.demoBalance += 5000;
    await user.save();
    res.json({ demoBalance: user.demoBalance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/transactions', authenticateToken, async (req: any, res: any) => {
  try {
    const userTransactions = await Transaction.find({ userId: req.user.userId });
    res.json(userTransactions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/withdrawal-methods', authenticateToken, async (req: any, res: any) => {
  try {
    const { type, details } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.withdrawalMethods) user.withdrawalMethods = new Map();
    user.withdrawalMethods.set(type, details);
    user.markModified('withdrawalMethods');
    await user.save();
    res.json({ success: true, withdrawalMethods: normalizeWithdrawalMethods(user.withdrawalMethods) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/currency', authenticateToken, async (req: any, res: any) => {
  try {
    const { currency } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.currency = currency;
    await user.save();
    res.json({ success: true, currency: user.currency });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const timeframe = req.query.timeframe || 'weekly'; // 'all', 'weekly', 'monthly'
    let dateFilter: any = {};

    if (timeframe === 'weekly') {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { timestamp: { $gte: startOfWeek } };
    } else if (timeframe === 'monthly') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { timestamp: { $gte: startOfMonth } };
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    
    // Filter by date for deposits, withdrawals, and trades
    const deposits = await Transaction.find({ type: 'deposit', status: 'completed', ...dateFilter }).select('amount userId').lean();
    const withdrawals = await Transaction.find({ type: 'withdrawal', status: 'completed', ...dateFilter }).select('amount userId').lean();
    const totalTrades = await Trade.countDocuments(dateFilter);
    
    const rates: Record<string, number> = {
      'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'INR': 83.0, 'BRL': 5.0, 'AUD': 1.5, 'CAD': 1.35, 'JPY': 150.0
    };

    const allUserIds = [...new Set([...deposits.map(d => d.userId), ...withdrawals.map(w => w.userId)])].filter(id => mongoose.Types.ObjectId.isValid(id));
    const userCurrencyMap = (await User.find({ _id: { $in: allUserIds } }).select('currency').lean())
      .reduce((acc: any, u: any) => {
        acc[u._id.toString()] = u.currency || 'USD';
        return acc;
      }, {});

    const getInrAmount = (amount: number, userId: string) => {
      const userCurrency = userCurrencyMap[userId] || 'USD';
      const rateToUSD = rates[userCurrency] || 1.0;
      const inrRate = rates['INR'] || 83.0;
      return (amount / rateToUSD) * inrRate;
    };

    let totalDepositsINR = 0;
    for (const tx of deposits) {
      totalDepositsINR += getInrAmount(tx.amount || 0, tx.userId);
    }

    let totalWithdrawalsINR = 0;
    for (const tx of withdrawals) {
      totalWithdrawalsINR += getInrAmount(tx.amount || 0, tx.userId);
    }

    const revenueINR = totalDepositsINR * 0.05;

    res.json({
      totalUsers,
      activeUsers,
      totalDeposits: totalDepositsINR,
      totalWithdrawals: totalWithdrawalsINR,
      totalTrades,
      revenue: revenueINR,
      timeframe
    });
  } catch (error) {
    console.error('[ADMIN STATS ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/reports/weekly', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { timestamp: { $gte: startDate, $lte: endDate } };
    
    const deposits = await Transaction.find({ type: 'deposit', status: 'completed', ...dateFilter }).lean();
    const withdrawals = await Transaction.find({ type: 'withdrawal', status: 'completed', ...dateFilter }).lean();
    const trades = await Trade.find(dateFilter).lean();

    // Generate CSV data
    let csv = "Type,ID,User,Amount,Status,Date\n";
    deposits.forEach((d: any) => csv += `Deposit,${d._id},${d.userId},${d.amount},${d.status},${d.timestamp}\n`);
    withdrawals.forEach((w: any) => csv += `Withdrawal,${w._id},${w.userId},${w.amount},${w.status},${w.timestamp}\n`);
    trades.forEach((t: any) => csv += `Trade,${t._id},${t.userId},${t.amount},${t.status},${t.timestamp}\n`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=weekly_report_${start}_to_${end}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/admin/chart-stats', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    // Return last 7 days of stats (mocked for now but could be aggregated)
    const stats = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      users: Math.floor(Math.random() * 50) + 10,
      trades: Math.floor(Math.random() * 200) + 50,
      revenue: Math.floor(Math.random() * 1000) + 200
    }));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/reset-link', authenticateToken, requireAdmin, async (req: any, res: any) => {
  console.log(`[ADMIN] Reset link request for UID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    
    (user as any).resetTokenHash = hash;
    (user as any).resetTokenExp = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
    await user.save();

    const base = APP_URL || 'https://growwithtrade.com';
    const link = `${base}/reset-password?token=${token}`;
    
    console.log(`[ADMIN] Reset link generated for: ${user.email}`);
    res.json({ success: true, link });
  } catch (error) {
    console.error('[ADMIN] Reset link generation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const usersList = await User.find({}, { password: 0 });
    res.json(usersList);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id, { password: 0 });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = status;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id/kyc', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`[KYC] User not found for deletion: ${req.params.id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Completely reset KYC and remove from list
    user.kyc = {
      status: 'pending',
      frontId: '',
      backId: '',
      selfie: '',
      submittedAt: null, // This will remove it from the admin list based on our new query
      reviewedAt: null,
      reason: ''
    };
    user.isVerified = false;
    user.verificationDetails = {
      idType: '',
      idNumber: '',
      verifiedAt: ''
    };
    
    await user.save();
    console.log(`[KYC] Hard Reset KYC for user: ${user.email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[KYC] Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/trades', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.accountType) query.accountType = req.query.accountType;
    
    const trades = await Trade.find(query).sort({ timestamp: -1 }).limit(100).lean();
    
    // Enrich with user info
    const userIds = [...new Set(trades.map(t => t.userId))].filter(id => id && mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: userIds } }, { username: 1 }).lean();
    const userMap = users.reduce((acc: any, u: any) => {
      acc[u._id.toString()] = u.username;
      return acc;
    }, {});

    const enrichedTrades = trades.map((t: any) => ({
      ...t,
      username: userMap[t.userId] || 'Unknown'
    }));

    res.json(enrichedTrades);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const query: any = {};
    if (req.query.userId) query.userId = req.query.userId;
    
    // Use .lean() for faster execution and easier manipulation
    const txs = await Transaction.find(query).sort({ timestamp: -1 }).lean();
    
    // Enrich with user info efficiently
    const userIds = [...new Set(txs.map(tx => tx.userId))].filter(id => id && mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: userIds } }, { username: 1, email: 1, currency: 1 }).lean();
    const userMap = users.reduce((acc: any, user: any) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    const enrichedTxs = txs.map((tx: any) => ({
      ...tx,
      username: userMap[tx.userId]?.username || 'Unknown',
      userEmail: userMap[tx.userId]?.email || 'N/A',
      userCurrency: userMap[tx.userId]?.currency || 'USD'
    }));
    
    res.json(enrichedTxs);
  } catch (error) {
    console.error('[ADMIN API] Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/transactions/:id/status', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { status, reason } = req.body;
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const prevStatus = tx.status;
    tx.status = status;
    if (reason) tx.reason = reason;

    if (tx.type === 'deposit' && prevStatus !== 'completed' && status === 'completed') {
      const user = await User.findById(tx.userId);
      if (!user) return res.status(404).json({ error: 'User not found for this transaction' });

      const targetFromDetails = /Target:\s*(real|demo)/i.exec(tx.details || '');
      const targetAccount = (targetFromDetails?.[1]?.toLowerCase() === 'demo') ? 'demo' : 'real';
      if (targetAccount === 'demo') {
        user.demoBalance += Number(tx.amount || 0);
      } else {
        user.realBalance += Number(tx.amount || 0);
      }
      user.hasTradedSinceLastDeposit = false;
      await user.save();
    }

    await tx.save();
    res.json(tx);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/kyc', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const kycUsers = await User.find({ 
      $or: [
        { 'kyc.status': { $in: ['pending', 'approved', 'rejected'] } },
        { isVerified: true }
      ],
      'kyc.submittedAt': { $ne: null } 
    }, { password: 0 }).lean();
    
    const kycList = kycUsers.map(u => ({
      userId: u._id.toString(),
      username: u.username || 'N/A',
      email: u.email || 'N/A',
      status: u.kyc?.status || 'pending',
      submittedAt: u.kyc?.submittedAt,
      reviewedAt: u.kyc?.reviewedAt,
      reason: u.kyc?.reason || '',
      idType: u.verificationDetails?.idType || 'ID',
      idNumber: u.verificationDetails?.idNumber || 'N/A',
      documentImage: u.kyc?.frontId || '',
      addressProofUrl: u.kyc?.backId || '',
      selfieUrl: u.kyc?.selfie || '',
      updatedAt: u.kyc?.reviewedAt || u.kyc?.submittedAt || (u as any).updatedAt
    }));
    res.json(kycList);
  } catch (error) {
    console.error('[ADMIN KYC ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users/:id/kyc', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user.kyc?.toObject?.(),
      status: user.kyc?.status || 'pending',
      idType: user.verificationDetails?.idType || '',
      idNumber: user.verificationDetails?.idNumber || '',
      documentImage: user.kyc?.frontId || '',
      addressProofUrl: user.kyc?.backId || '',
      selfieUrl: user.kyc?.selfie || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/kyc/status', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { status, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.kyc.status = status;
    if (reason) user.kyc.reason = reason;
    user.kyc.reviewedAt = new Date();
    
    if (status === 'approved') {
      user.isVerified = true;
      user.verificationDetails.verifiedAt = new Date().toISOString();
    } else if (status === 'rejected') {
      user.isVerified = false;
    }
    
    await user.save();
    res.json(user.kyc);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users/:id/bank', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.bank);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users/:id/login-history', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.loginHistory || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/reset-balance', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.realBalance = 100000;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/password', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { newPassword, password } = req.body;
    const finalPassword = newPassword || password;
    
    if (!finalPassword || typeof finalPassword !== 'string' || finalPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hashed = await bcrypt.hash(finalPassword, 10);
    user.password = hashed;
    user.passwordPlainEnc = ENC_KEY ? encryptText(finalPassword) : '';
    await user.save();
    console.log(`[ADMIN] Password changed for user: ${user.username} via Admin Panel`);
    res.json({ success: true, stored: !!ENC_KEY });
  } catch (error) {
    console.error('[ADMIN] Password change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/settings/algo', authenticateToken, requireAdmin, async (req: any, res: any) => {
  res.json({ isAlgoEnabled });
});

app.get('/api/admin/settings/crypto-addresses', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const addresses = await Setting.findOne({ key: 'cryptoAddresses' });
    res.json(addresses?.value || {});
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/settings/crypto-addresses', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { addresses } = req.body;
    if (!addresses || typeof addresses !== 'object') {
      return res.status(400).json({ error: 'Invalid addresses format' });
    }
    
    await Setting.findOneAndUpdate(
      { key: 'cryptoAddresses' },
      { value: addresses, description: 'Manual Crypto Deposit Addresses' },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/settings/crypto-addresses', async (req: any, res: any) => {
  try {
    const addresses = await Setting.findOne({ key: 'cryptoAddresses' });
    res.json(addresses?.value || {});
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/settings/algo', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enabled value' });
    }
    
    isAlgoEnabled = enabled;
    await Setting.findOneAndUpdate(
      { key: 'isAlgoEnabled' },
      { value: enabled },
      { upsert: true }
    );
    
    console.log(`[SETTINGS] Algorithm toggled to: ${isAlgoEnabled}`);
    res.json({ success: true, isAlgoEnabled });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users/:id/password-plain', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id, { passwordPlainEnc: 1 });   
    if (!user) return res.status(404).json({ error: 'User not found' });        
    if (!user.passwordPlainEnc) return res.json({ password: '' });
    const plain = decryptText(user.passwordPlainEnc);
    res.json({ password: plain });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dangerous: Clear all data (for development use only)
app.delete('/api/admin/transactions/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/trades/:id', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk Delete Routes
app.post('/api/admin/bulk-delete/:type', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    const { type } = req.params;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    let result;
    switch (type) {
      case 'trades':
        result = await Trade.deleteMany({ _id: { $in: ids } });
        break;
      case 'transactions':
        result = await Transaction.deleteMany({ _id: { $in: ids } });
        break;
      case 'users':
        result = await User.deleteMany({ _id: { $in: ids }, isAdmin: false });
        break;
      case 'kyc':
        // For KYC, we reset instead of deleting user
        result = await User.updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              kyc: {
                status: 'pending',
                frontId: '',
                backId: '',
                selfie: '',
                submittedAt: null,
                reviewedAt: null,
                reason: ''
              },
              isVerified: false,
              verificationDetails: { idType: '', idNumber: '', verifiedAt: '' }
            }
          }
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    res.json({ success: true, count: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/danger/clear-all-data', authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    await User.deleteMany({ isAdmin: false }); // Keep admins to avoid locking out
    await Trade.deleteMany({});
    await Transaction.deleteMany({});
    await Setting.deleteMany({});
    console.log('[DANGER] All non-admin data cleared by admin');
    res.json({ success: true, message: 'All non-admin data has been cleared.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.use('/api/*', (req, res) => {
  console.log(`[404] API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Error Handler:', err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
  next(err);
});

async function startServer() {
  await initDatabase();

  // Load initial settings
  try {
    const algoSetting = await Setting.findOne({ key: 'isAlgoEnabled' });
    if (algoSetting) {
      isAlgoEnabled = algoSetting.value === true;
    } else {
      await Setting.create({ key: 'isAlgoEnabled', value: true, description: 'Trading algorithm enable/disable' });
      isAlgoEnabled = true;
    }
    console.log(`[SETTINGS] Algorithm Enabled: ${isAlgoEnabled}`);
  } catch (err) {
    console.error('Error loading settings:', err);
  }

  const distPath = path.join(process.cwd(), 'dist');
  const adminDistPath = path.join(distPath, 'adminpanel');

  // Isolated Admin Panel App
  const adminApp = express();
  adminApp.use(express.static(adminDistPath));
  adminApp.get('*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
  
  // Serve admin panel at root instead of /adminpanel
  app.use('/', adminApp);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false, // Disable HMR to avoid WebSocket port conflicts in this environment
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In this repo, we only serve the admin panel
    app.use(express.static(adminDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(adminDistPath, 'index.html'));
    });
  }

  const currentPort = Number(process.env.PORT) || PORT;
  const server = app.listen(currentPort, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${currentPort}`);
    console.log('Database Mode: MongoDB Atlas.');
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      const nextPort = currentPort + 1;
      console.log(`Port ${currentPort} is in use, retrying on ${nextPort}...`);
      setTimeout(() => {
        server.close();
        process.env.PORT = String(nextPort);
        startServer();
      }, 1000);
    }
  });
}

if (IS_VERCEL) {
  // On Vercel this file is loaded by a serverless handler, so we must not listen on a port.
  void initDatabase();
} else {
  startServer();
}

export default app;
