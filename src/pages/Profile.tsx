import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Mail, Shield, Wallet, Phone, CheckCircle, AlertCircle, ArrowDownToLine, ArrowUpFromLine, Clock, Check, XCircle, Building2, Bitcoin, Plus, Save, Loader2, Globe, ChevronDown, Download, MessageSquare, ExternalLink, HelpCircle } from 'lucide-react';
import { getCurrencySymbol, CURRENCIES } from '../utils/currency';
import { Link } from 'react-router-dom';

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'completed' | 'processing' | 'failed';
  timestamp: string;
  transactionCode?: string;
}

interface WithdrawalMethods {
  bank?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
  crypto?: {
    walletAddress: string;
    network: string;
  };
}

export const Profile = () => {
  const { user, currency, setCurrency, token, login, accountType } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'crypto' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const symbol = getCurrencySymbol(currency);

  // Form states
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: ''
  });
  const [cryptoDetails, setCryptoDetails] = useState({
    walletAddress: '',
    network: 'TRC20'
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/user/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error('Failed to fetch transactions', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();

    if (user?.withdrawalMethods) {
      if (user.withdrawalMethods.bank) setBankDetails(user.withdrawalMethods.bank);
      if (user.withdrawalMethods.crypto) setCryptoDetails(user.withdrawalMethods.crypto);
    }
  }, [token, user?.withdrawalMethods]);

  const handleSaveMethod = async () => {
    if (!selectedMethod || !token) return;
    setIsSaving(true);
    try {
      const details = selectedMethod === 'bank' ? bankDetails : cryptoDetails;
      const res = await fetch('/api/user/withdrawal-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: selectedMethod, details })
      });

      if (res.ok) {
        const data = await res.json();
        if (user) {
          login({ ...user, withdrawalMethods: data.withdrawalMethods }, token);
        }
        setIsAccountModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save method', err);
    } finally {
        setIsSaving(false);
      }
    };

    const handleDownloadTransactions = () => {
      if (transactions.length === 0) return;

      const headers = ['Type', 'Amount', 'Status', 'Date', 'Time'];
      const rows = transactions.map(tx => [
        tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
        `${tx.type === 'deposit' ? '+' : '-'}${tx.amount}`,
        tx.status.toUpperCase(),
        new Date(tx.timestamp).toLocaleDateString(),
        new Date(tx.timestamp).toLocaleTimeString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${user?.username || 'user'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Account Info Card */}
      <div className={`bg-slate-900 rounded-2xl border border-slate-800 mb-8 relative ${isCurrencyDropdownOpen ? 'z-50' : 'z-10'}`}>
        <div className="bg-slate-800/50 px-4 sm:px-8 py-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left rounded-t-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 flex-shrink-0">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1">
                {user.isAdmin ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <Shield size={12} /> Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-blue-400 text-xs bg-blue-400/10 px-2 py-0.5 rounded-full">
                    <User size={12} /> User
                  </span>
                )}
                {user.isVerified ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} /> Verified
                  </span>
                ) : user.kyc?.status === 'pending' ? (
                  <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Clock size={12} /> Verification Pending
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <AlertCircle size={12} /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            {!user.isVerified && (
              <Link
                to="/verify-account"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                {user.kyc?.status === 'pending' ? 'Update Verification' : 'Verify Now'}
              </Link>
            )}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 border border-slate-700"
            >
              <Building2 size={16} />
              Withdrawal Accounts
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Account Details</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
                  <User size={18} className="text-slate-500" />
                  <span className="text-white">{user.username}</span>
                </div>
              </div>

              {user.email && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email ID</label>
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
                    <Mail size={18} className="text-slate-500" />
                    <span className="text-white">{user.email}</span>
                  </div>
                </div>
              )}

              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
                    <Phone size={18} className="text-slate-500" />
                    <span className="text-white">{user.phone}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Account ID</label>
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
                  <Shield size={18} className="text-slate-500" />
                  <span className="text-white font-mono text-sm">{user.id}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Financial Overview</h3>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="text-blue-400" size={24} />
                <h4 className="text-blue-400 font-medium">Real Balance</h4>
              </div>
              <div className="text-4xl font-mono font-bold text-white">
                {symbol}{user.realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="text-slate-400" size={24} />
                <h4 className="text-slate-400 font-medium">Demo Balance</h4>
              </div>
              <div className="text-4xl font-mono font-bold text-white">
                {symbol}{user.demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Saved Methods Preview */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Saved Withdrawal Methods</h4>
              <div className="grid grid-cols-1 gap-2">
                {user.withdrawalMethods?.bank ? (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Building2 size={18} className="text-emerald-400" />
                      <div>
                        <div className="text-xs text-white font-medium">{user.withdrawalMethods.bank.bankName}</div>
                        <div className="text-[10px] text-slate-500">****{user.withdrawalMethods.bank.accountNumber.slice(-4)}</div>
                      </div>
                    </div>
                    <Check size={14} className="text-emerald-400" />
                  </div>
                ) : null}
                {user.withdrawalMethods?.crypto ? (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Bitcoin size={18} className="text-amber-400" />
                      <div>
                        <div className="text-xs text-white font-medium">Crypto ({user.withdrawalMethods.crypto.network})</div>
                        <div className="text-[10px] text-slate-500">{user.withdrawalMethods.crypto.walletAddress.slice(0, 6)}...{user.withdrawalMethods.crypto.walletAddress.slice(-4)}</div>
                      </div>
                    </div>
                    <Check size={14} className="text-emerald-400" />
                  </div>
                ) : null}
                {!user.withdrawalMethods?.bank && !user.withdrawalMethods?.crypto && (
                  <div className="text-xs text-slate-500 italic">No withdrawal methods saved yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Withdrawal Accounts</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedMethod('bank')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedMethod === 'bank' 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building2 size={32} />
                  <span className="font-bold text-sm">Bank Account</span>
                </button>
                <button
                  onClick={() => setSelectedMethod('crypto')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedMethod === 'crypto' 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Bitcoin size={32} />
                  <span className="font-bold text-sm">Crypto Wallet</span>
                </button>
              </div>

              {selectedMethod === 'bank' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="SBI, HDFC, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">IFSC Code</label>
                      <input
                        type="text"
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="SBIN0001234"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === 'crypto' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Wallet Address (USDT)</label>
                    <input
                      type="text"
                      value={cryptoDetails.walletAddress}
                      onChange={(e) => setCryptoDetails({...cryptoDetails, walletAddress: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Paste your USDT address"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Network</label>
                    <select
                      value={cryptoDetails.network}
                      onChange={(e) => setCryptoDetails({...cryptoDetails, network: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="TRC20">TRC20 (Recommended)</option>
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedMethod && (
                <button
                  onClick={handleSaveMethod}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Account Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-800/50 px-4 sm:px-8 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Transaction History</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadTransactions}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20"
            >
              <Download size={14} />
              Download CSV
            </button>
            <div className="hidden sm:block text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest">Deposits & Withdrawals</div>
          </div>
        </div>
        
        <div className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
                <Clock size={32} />
              </div>
              <p className="text-slate-500">No transactions found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">
                      <th className="px-4 sm:px-8 py-4 font-bold">Type</th>
                      <th className="px-4 sm:px-8 py-4 font-bold">Code</th>
                      <th className="px-4 sm:px-8 py-4 font-bold">Amount</th>
                      <th className="px-4 sm:px-8 py-4 font-bold">Status</th>
                      <th className="px-4 sm:px-8 py-4 font-bold text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 sm:px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {tx.type === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                            </div>
                            <span className="text-white font-bold capitalize text-sm">{tx.type}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4">
                          <span className="text-slate-400 font-mono text-[10px] font-bold tracking-wider">
                            {tx.transactionCode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-8 py-4">
                          <span className={`font-mono font-bold text-sm ${
                            tx.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}{symbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 sm:px-8 py-4">
                          <div className="flex items-center gap-2">
                            {tx.status === 'completed' && (
                              <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase bg-emerald-400/10 px-2.5 py-1 rounded-full">
                                <Check size={12} /> Completed
                              </span>
                            )}
                            {tx.status === 'processing' && (
                              <span className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase bg-blue-400/10 px-2.5 py-1 rounded-full">
                                <Clock size={12} className="animate-pulse" /> Processing
                              </span>
                            )}
                            {tx.status === 'failed' && (
                              <span className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase bg-rose-400/10 px-2.5 py-1 rounded-full">
                                <XCircle size={12} /> Failed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4 text-right">
                          <div className="text-slate-300 text-xs font-medium">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-slate-500 text-[10px] font-bold">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-slate-800">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tx.type === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                        </div>
                        <div>
                          <div className="text-white font-bold capitalize text-sm">{tx.type}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[10px] font-bold">
                              {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-blue-500/80 text-[10px] font-black tracking-widest uppercase">
                              {tx.transactionCode || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`font-mono font-black text-sm ${
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}{symbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {tx.status === 'completed' && (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase bg-emerald-400/10 px-2.5 py-1 rounded-full">
                            <Check size={10} /> Completed
                          </span>
                        )}
                        {tx.status === 'processing' && (
                          <span className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase bg-blue-400/10 px-2.5 py-1 rounded-full">
                            <Clock size={10} className="animate-pulse" /> Processing
                          </span>
                        )}
                        {tx.status === 'failed' && (
                          <span className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase bg-rose-400/10 px-2.5 py-1 rounded-full">
                            <XCircle size={10} /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Links Section */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 border-t border-slate-800/50">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
          <Link 
            to="/terms" 
            target="_blank" 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
          >
            <Shield size={14} />
            Terms
          </Link>
          <Link 
            to="/faq" 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
          >
            <HelpCircle size={14} />
            FAQ
          </Link>
        </div>
        
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
          <span>© 2026 Trade With Grow</span>
          <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
          <span>Professional Trading Platform</span>
        </div>
      </div>
    </div>
  );
};
