import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, Bitcoin, Copy, CheckCircle2, QrCode, AlertCircle, Info } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrencySymbol } from '../utils/currency';
import { QRCodeSVG } from 'qrcode.react';

export const CryptoDeposit = () => {
  const { user, token, currency } = useAuthStore();
  const symbol = getCurrencySymbol(currency);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const amount = queryParams.get('amount') || '0';

  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [platformAddress, setPlatformAddress] = useState('TYH9jP7qW4XzM2V1k8L5N3B6S0R4D7F2A');

  useEffect(() => {
    fetch('/api/settings/crypto-address')
      .then(res => res.json())
      .then(data => setPlatformAddress(data.address))
      .catch(err => console.error('Failed to fetch platform address', err));
  }, []);

  const handleCopy = async () => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(platformAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = platformAddress;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress.trim()) {
      setError('Please enter your sending wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/deposit/manual-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(amount),
          userAddress,
          currency
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit deposit');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-slate-900 rounded-3xl border border-emerald-500/20 p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Deposit Submitted!</h2>
          <p className="text-slate-400 mb-8">
            Your deposit request for {symbol}{amount} has been received. Our team will verify the transaction within 30-60 minutes.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/deposit" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-wider">Back</span>
      </Link>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16"></div>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Crypto Deposit</h2>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-1">USDT (TRC20) Network Only</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <Bitcoin size={24} className="text-amber-400" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Amount Display */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount to Send</span>
            <span className="text-white font-mono font-black text-xl tracking-tighter">
              {symbol}{amount}
            </span>
          </div>

          {/* Payment Instructions */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
            <Info className="text-blue-400 shrink-0" size={18} />
            <p className="text-[11px] text-blue-200/70 leading-relaxed">
              Please send exactly <span className="text-blue-400 font-bold">{symbol}{amount}</span> to the address below using the <span className="text-white font-bold underline underline-offset-4">TRC20 (Tron)</span> network.
            </p>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Platform Wallet Address</label>
            <div className="relative group">
              <input
                readOnly
                value={platformAddress}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-12 py-4 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 bottom-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center group/btn"
              >
                {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && <p className="text-[10px] text-emerald-500 font-bold mt-2 px-1 animate-in fade-in slide-in-from-top-1">Address copied to clipboard!</p>}
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Scan QR to Pay</span>
            <div className="p-5 bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform duration-500 border-4 border-slate-800/5">
              <QRCodeSVG 
                value={platformAddress} 
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "https://cryptologos.cc/logos/tether-usdt-logo.png",
                  x: undefined,
                  y: undefined,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <hr className="border-slate-800/50" />

          {/* User Input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Your Sending Wallet Address</label>
              <input
                type="text"
                required
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="Enter your USDT TRC20 address"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-600 transition-all"
              />
              <p className="text-[9px] text-slate-500 mt-2 px-1 leading-relaxed">
                Provide the address you used to send the payment. This helps us verify your transaction faster.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-4 rounded-xl text-[11px] font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'I have paid'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
