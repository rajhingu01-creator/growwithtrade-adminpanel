import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowUpFromLine, CheckCircle2, Building2, Smartphone, Bitcoin, CreditCard, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol, getMinWithdrawalAmount } from '../utils/currency';
import { Link } from 'react-router-dom';

const WITHDRAWAL_METHODS = [
  { id: 'bank', name: 'Bank Transfer', icon: Building2, color: 'text-blue-400', comingSoon: true },
  { id: 'crypto', name: 'Crypto (USDT)', icon: Bitcoin, color: 'text-amber-400' },
];

export const Withdrawal = () => {
  const { user, token, updateBalances, currency, setCurrency } = useAuthStore();
  const symbol = getCurrencySymbol(currency);
  const minWithdrawal = getMinWithdrawalAmount(currency);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(WITHDRAWAL_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Get saved details for the selected method
  const getSavedDetails = () => {
    if (!user?.withdrawalMethods) return null;
    
    const selectedMethod = WITHDRAWAL_METHODS.find(m => m.id === method);
    if (selectedMethod?.comingSoon) return null;

    if (method === 'bank' && user.withdrawalMethods.bank) {
      const { accountName, accountNumber, bankName, ifscCode } = user.withdrawalMethods.bank;
      return `Account Name: ${accountName}\nAccount Number: ${accountNumber}\nBank: ${bankName}\nIFSC: ${ifscCode}`;
    }
    
    if (method === 'crypto' && user.withdrawalMethods.crypto) {
      const { walletAddress, network } = user.withdrawalMethods.crypto;
      return `Wallet Address: ${walletAddress}\nNetwork: ${network}`;
    }
    
    return null;
  };

  const savedDetails = getSavedDetails();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedDetails) {
      setError('Please add withdrawal details in your profile first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(amount),
          method,
          details: savedDetails,
          currency
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      updateBalances(data.realBalance, data.demoBalance);
      setSuccess(true);
      setAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-[#161a1e] rounded-[2rem] border border-slate-800 shadow-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
        
        <div className="flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mx-auto mb-6 border border-blue-500/20 shadow-xl">
          <ArrowUpFromLine size={32} className="text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tighter">Withdraw Funds</h2>
        <p className="text-slate-500 text-center mb-8 text-xs font-bold uppercase tracking-widest">Secure Fund Extraction</p>

        <div className="space-y-6 relative z-10">
          {!user?.isVerified && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-center">
              <AlertTriangle className="text-amber-500 mx-auto mb-3" size={28} />
              <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-3">
                Account verification required before withdrawal.
              </p>
              <Link
                to="/verify-account"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Verify Account
              </Link>
            </div>
          )}

          <div className="bg-[#0b0e11] rounded-2xl p-5 border border-slate-800/50 shadow-inner flex justify-between items-center group/balance">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Capital</span>
            <span className="text-white font-mono font-black text-xl tracking-tighter group-hover/balance:text-blue-400 transition-colors">
              {symbol}{(user?.realBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {error && (
            <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              Extraction sequence initiated
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Payout Destination</label>
              <div className="grid grid-cols-1 gap-3">
                {WITHDRAWAL_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      method === m.id 
                        ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/5' 
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                    } ${m.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${method === m.id ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                        <m.icon size={20} className={method === m.id ? 'text-blue-400' : 'text-slate-600'} />
                      </div>
                      <span className={`text-xs font-black uppercase tracking-widest ${method === m.id ? 'text-white' : ''}`}>{m.name}</span>
                    </div>
                    {m.comingSoon && (
                      <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-500/20">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Amount to Extract</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <span className="text-slate-500 font-black text-lg group-focus-within/input:text-blue-400 transition-colors">{symbol}</span>
                </div>
                <input
                  type="number"
                  min={Math.ceil(minWithdrawal)}
                  max={user?.realBalance}
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0b0e11] border border-slate-800 rounded-2xl pl-10 pr-4 py-4 text-white font-mono font-black text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                  placeholder={Math.ceil(minWithdrawal).toString()}
                />
              </div>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setAmount(user?.realBalance.toString() || '0')}
                  className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 size={12} />
                  Extract Maximum
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Security Details</label>
              {savedDetails ? (
                <div className="bg-[#0b0e11] border border-slate-800 rounded-2xl p-5 shadow-inner">
                  <pre className="text-slate-300 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                    {savedDetails}
                  </pre>
                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-end">
                    <Link to="/profile" className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                      Modify Protocol <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center shadow-lg">
                  <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
                  <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-4 leading-relaxed">Security protocol missing. Please add withdrawal details.</p>
                  <Link 
                    to="/profile" 
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    Add Protocol
                  </Link>
                </div>
              )}
            </div>

            <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <h5 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">Compliance Notice</h5>
              <ul className="text-[9px] font-bold text-slate-600 space-y-2 uppercase tracking-wider">
                <li className="flex items-start gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full mt-1 shrink-0"></div> 24-hour verification window.</li>
                <li className="flex items-start gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full mt-1 shrink-0"></div> Mandatory identity check.</li>
                <li className="flex items-start gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full mt-1 shrink-0"></div> Minimum threshold: {symbol}{Math.ceil(minWithdrawal)}.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !user?.isVerified || !amount || Number(amount) < minWithdrawal || Number(amount) > (user?.realBalance || 0) || !savedDetails}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm active:scale-[0.98]"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Authorizing...</>
              ) : (
                'Confirm Extraction'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
