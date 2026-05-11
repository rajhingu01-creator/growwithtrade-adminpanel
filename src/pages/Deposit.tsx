import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Wallet, ArrowDownToLine, CheckCircle2, CreditCard, Smartphone, Bitcoin, QrCode } from 'lucide-react';
import { CURRENCIES, getCurrencySymbol, getMinDepositAmount } from '../utils/currency';

const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI / GPay / PhonePe', icon: Smartphone, color: 'text-blue-400', comingSoon: true },
  { id: 'crypto', name: 'Crypto (Automatic)', icon: Bitcoin, color: 'text-emerald-400' },
  { id: 'crypto_manual', name: 'Crypto (Direct Transfer)', icon: QrCode, color: 'text-amber-400' },
  { id: 'card', name: 'Debit/Credit Card', icon: CreditCard, color: 'text-indigo-400', comingSoon: true },
];

export const Deposit = () => {
  const { user, token, updateBalances, currency, setCurrency } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const symbol = getCurrencySymbol(currency);
  const minDeposit = getMinDepositAmount(currency);

  const [amount, setAmount] = useState(Math.ceil(minDeposit).toString());
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const parseApiResponse = async (res: Response) => {
    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || 'Request failed' };
    }
    return data;
  };

  // Update amount when currency changes
  useEffect(() => {
    setAmount(Math.ceil(minDeposit).toString());
  }, [currency, minDeposit]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const paymentStatus = query.get('payment');
    if (paymentStatus === 'success') {
      setSuccess(true);
      setError('');
    } else if (paymentStatus === 'cancelled') {
      setSuccess(false);
      setError('Payment was cancelled. You can try again.');
    }
  }, [location.search]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod);
    if (selectedMethod?.comingSoon) {
      setError('This payment method is coming soon.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (paymentMethod === 'crypto_manual') {
        navigate(`/direct-transfer-pay?amount=${encodeURIComponent(amount)}`);
        return;
      }

      if (paymentMethod === 'upi') {
        const res = await fetch('/api/user/deposit/upi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: Number(amount),
            currency,
            email,
            targetAccount: 'real'
          })
        });

        const data = await parseApiResponse(res);
        if (!res.ok) throw new Error(data.error || 'Failed to create UPI payment session');

        const paymentUrl = data.payment_url || data.checkout_url || data.invoice_url || data.qr_url;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error('UPI gateway responded but no payment link was returned.');
        }
        return;
      }

      if (paymentMethod === 'crypto') {
        const res = await fetch('/api/user/deposit/crypto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            amount: Number(amount),
            currency,
            targetAccount: 'real',
            email
          })
        });

        const data = await parseApiResponse(res);
        if (!res.ok) throw new Error(data.error || 'Failed to create payment session');

        if (data.invoice_url) {
          window.location.href = data.invoice_url;
          // Prevent further execution while the browser is redirecting
          setLoading(true);
          return;
        } else {
          console.error('No invoice URL received:', data);
          throw new Error('Payment gateway response was successful, but no checkout link was provided. Please try again.');
        }
      }

      // Default manual deposit flow
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(amount),
          method: paymentMethod,
          currency
        })
      });

      const data = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      updateBalances(data.realBalance, data.demoBalance);
      setSuccess(true);
      setAmount(Math.ceil(minDeposit).toString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mx-auto mb-6">
          <ArrowDownToLine size={32} className="text-emerald-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-2">Deposit Funds</h2>
        <p className="text-slate-400 text-center mb-8">Select a payment method to add funds</p>

        <div className="space-y-6">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Current Balance</span>
            <span className="text-white font-mono font-bold text-lg">
              {symbol}{(user?.realBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 size={18} />
              Deposit request submitted. Waiting for admin approval.
            </div>
          )}

          <form onSubmit={handleDeposit} className="space-y-6">
            {/* Payment Method */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Select Payment Method</label>
              <div className="grid grid-cols-1 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      paymentMethod === method.id 
                        ? 'bg-blue-500/10 border-blue-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    } ${method.comingSoon ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <method.icon size={20} className={method.color} />
                      <span className="font-medium">{method.name}</span>
                    </div>
                    {method.comingSoon && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount and Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 mb-2">
                  Your Email (for verification)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 mb-2">
                  Amount to Deposit
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium">{symbol}</span>
                  </div>
                  <input
                    type="number"
                    min={Math.ceil(minDeposit)}
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={Math.ceil(minDeposit).toString()}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[Math.ceil(minDeposit), Math.ceil(minDeposit * 2), Math.ceil(minDeposit * 5)].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                >
                  +{symbol}{preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Confirm Deposit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
