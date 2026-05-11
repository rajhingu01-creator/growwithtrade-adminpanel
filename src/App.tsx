/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { FAQ } from './pages/FAQ';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { VerifyAccount } from './pages/VerifyAccount';
import { Deposit } from './pages/Deposit';
import { Withdrawal } from './pages/Withdrawal';
import { CryptoDeposit } from './pages/CryptoDeposit';
import { DirectTransferPayment } from './pages/DirectTransferPayment';
import { MultiChart } from './pages/MultiChart';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Activity, LogOut, Shield, User as UserIcon, Wallet, ArrowDownToLine, ArrowUpFromLine, Menu, X, MessageCircle, Zap, Globe, ChevronDown, CheckCircle2, RefreshCw, Plus } from 'lucide-react';
import { Signals } from './components/Signals';
import { SupportChat } from './components/SupportChat';
import { CURRENCIES, getCurrencySymbol } from './utils/currency';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const Navbar = () => {
  const { user, isAuthenticated, logout, currency, setCurrency, accountType, setAccountType, updateBalances, token } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsCurrencyOpen(false);
    setIsAccountOpen(false);
  }, [location.pathname]);

  const symbol = getCurrencySymbol(currency);

  return (
    <nav className="bg-[#0b0e11] sm:bg-[#0b0e11]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-3 group shrink-0 max-w-[20%] sm:max-w-none overflow-hidden">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-1 sm:p-2 rounded-lg sm:rounded-xl shadow-xl group-hover:scale-105 transition-transform duration-300">
                <Zap className="text-white w-3.5 h-3.5 sm:w-5 sm:h-5 fill-white" />
              </div>
            </div>
            <div className="hidden min-[480px]:flex flex-col min-w-0">
              <span className="text-white font-black text-[10px] sm:text-xl tracking-tighter uppercase italic group-hover:text-blue-400 transition-colors leading-none truncate">Trade with Grow</span>
              <span className="hidden sm:block text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-none mt-1">Professional Platform</span>
            </div>
          </Link>

          {isAuthenticated && user && (
            <div className="lg:hidden absolute left-[52%] -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 w-full max-w-[32vw]">
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className={`w-full flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg transition-all text-[8px] font-black uppercase tracking-wide border shadow-xl ${
                  accountType === 'real'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${accountType === 'real' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <div className="min-w-0 flex items-center">
                  <span className="text-white font-mono text-[9px] truncate">
                    {symbol}{(accountType === 'real' ? user.realBalance : user.demoBalance)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
                <ChevronDown size={8} className={`shrink-0 transition-transform duration-300 ${isAccountOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAccountOpen && (
                <>
                  <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={() => setIsAccountOpen(false)}></div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[88vw] max-w-sm bg-[#161a1e] border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[10001] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Account</span>
                    </div>
                    <button
                      onClick={() => {
                        setAccountType('real');
                        setIsAccountOpen(false);
                      }}
                      className={`w-full flex flex-col px-4 py-3 text-left transition-all ${
                        accountType === 'real' ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${accountType === 'real' ? 'text-emerald-400' : 'text-slate-500'}`}>Real Account</span>
                        {accountType === 'real' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </div>
                      <div className="text-4xl font-mono font-black text-white">{symbol}{user.realBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
                    </button>

                    <div className="h-px bg-slate-800/50 mx-4 my-1"></div>

                    <button
                      onClick={() => {
                        setAccountType('demo');
                        setIsAccountOpen(false);
                      }}
                      className={`w-full flex flex-col px-4 py-3 text-left transition-all ${
                        accountType === 'demo' ? 'bg-amber-500/10 border-l-4 border-amber-500' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${accountType === 'demo' ? 'text-amber-400' : 'text-slate-500'}`}>Demo Account</span>
                        {accountType === 'demo' && <CheckCircle2 size={14} className="text-amber-500" />}
                      </div>
                      <div className="text-4xl font-mono font-black text-white">{symbol}{user.demoBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
                    </button>

                    {accountType === 'demo' && (
                      <div className="flex flex-col border-t border-slate-800 mt-1">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch('/api/user/reset-demo', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                const data = await res.json();
                                updateBalances(user.realBalance, data.demoBalance);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full py-2.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={12} />
                          Refill to {symbol}10,000
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch('/api/user/add-demo', {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                const data = await res.json();
                                updateBalances(user.realBalance, data.demoBalance);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-full py-2.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 border-t border-slate-700/50"
                        >
                          <Plus size={12} />
                          Add {symbol}5,000
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {isAuthenticated && (
            <>
              {/* Desktop Menu */}
              {user && (
              <div className="hidden lg:flex items-center gap-4 xl:gap-8">
                <div className="flex items-center bg-white/5 backdrop-blur-sm rounded-2xl p-1 border border-white/5 shadow-inner">
                  <Signals />
                </div>
                
                {/* Account Switcher */}
                <div className="relative">
                  <button 
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest border shadow-2xl ${
                      accountType === 'real' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute w-3 h-3 rounded-full blur-[4px] ${accountType === 'real' ? 'bg-emerald-500/50 animate-pulse' : 'bg-amber-500/50 animate-pulse'}`}></div>
                      <div className={`relative w-2 h-2 rounded-full shadow-lg ${accountType === 'real' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="opacity-60 text-[9px]">{accountType === 'real' ? 'Live Portfolio' : 'Demo Practice'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">{symbol}{(accountType === 'real' ? user.realBalance : user.demoBalance)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
                        <ChevronDown size={12} className={`transition-transform duration-300 ${isAccountOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>
                  
                  {isAccountOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsAccountOpen(false)}></div>
                      <div className="absolute top-full right-0 mt-3 w-72 bg-[#161a1e] border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-2 mb-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Account</span>
                        </div>
                        <button
                          onClick={() => {
                            setAccountType('real');
                            setIsAccountOpen(false);
                          }}
                          className={`w-full flex flex-col px-4 py-3 text-left transition-all ${
                            accountType === 'real' ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${accountType === 'real' ? 'text-emerald-400' : 'text-slate-500'}`}>Real Account</span>
                            {accountType === 'real' && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </div>
                          <div className="text-xl font-mono font-black text-white">{symbol}{user.realBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
                        </button>
                        
                        <div className="h-px bg-slate-800/50 mx-4 my-1"></div>
                        
                        <button
                          onClick={() => {
                            setAccountType('demo');
                            setIsAccountOpen(false);
                          }}
                          className={`w-full flex flex-col px-4 py-3 text-left transition-all ${
                            accountType === 'demo' ? 'bg-amber-500/10 border-l-4 border-amber-500' : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${accountType === 'demo' ? 'text-amber-400' : 'text-slate-500'}`}>Demo Account</span>
                            {accountType === 'demo' && <CheckCircle2 size={14} className="text-amber-500" />}
                          </div>
                          <div className="text-xl font-mono font-black text-white">{symbol}{user.demoBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</div>
                        </button>

                        {accountType === 'demo' && (
                          <div className="flex flex-col border-t border-slate-800 mt-1">
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await fetch('/api/user/reset-demo', {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    updateBalances(user.realBalance, data.demoBalance);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full py-2.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                              <RefreshCw size={12} />
                              Refill to {symbol}10,000
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await fetch('/api/user/add-demo', {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    updateBalances(user.realBalance, data.demoBalance);
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full py-2.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 border-t border-slate-700/50"
                            >
                              <Plus size={12} />
                              Add {symbol}5,000
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-800/50"></div>

                <div className="flex items-center gap-2 xl:gap-3">
                  <Link to="/deposit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2">
                    <ArrowDownToLine size={14} />
                    Deposit
                  </Link>
                  <Link to="/withdrawal" className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg border border-slate-700/50 active:scale-95 flex items-center gap-2">
                    <ArrowUpFromLine size={14} />
                    Withdraw
                  </Link>
                </div>

                <div className="h-6 w-px bg-slate-800/50"></div>

                {/* Currency Display (Fixed after registration) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 text-slate-300 border border-slate-700/30">
                  <Globe size={14} className="text-blue-400" />
                  <span className="uppercase tracking-widest text-xs font-bold">{currency} ({symbol})</span>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-4">
                  <Link to="/profile" className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors shadow-lg">
                      <UserIcon size={16} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Trader</span>
                      <span className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{user.username}</span>
                    </div>
                  </Link>
                  <button 
                    onClick={logout}
                    className="p-2.5 text-slate-500 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-xl group border border-transparent hover:border-rose-500/20"
                    title="Logout"
                  >
                    <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
              )}

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center gap-1.5 shrink-0 ml-auto">
                <div className="bg-white/5 rounded-lg p-0.5 border border-white/5 scale-[0.65] origin-right translate-x-1">
                  <Signals />
                </div>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors border border-white/5 shadow-xl relative z-50"
                >
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-300 hover:text-white text-sm font-black uppercase tracking-widest transition-colors px-4 py-2">Login</Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95">Register</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="absolute right-3 top-16 w-[88vw] max-w-sm rounded-2xl border border-slate-700 bg-[#10151f] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-slate-300 text-sm font-bold mb-3">Quick Menu</div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/deposit" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 text-white font-bold text-sm">
                <ArrowDownToLine size={16} />
                Deposit
              </Link>
              <Link to="/withdrawal" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700">
                <ArrowUpFromLine size={16} />
                Withdraw
              </Link>
              <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 text-white font-bold text-sm border border-slate-700">
                <UserIcon size={16} />
                Trader
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-sm border border-rose-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
            <div className="mt-3 rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 text-center">
              {currency} ({symbol})
            </div>
          </div>
        </div>
      )}

    </nav>
  );
};

export default function App() {
  const { token, login, logout, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (!isAuthenticated) return;

    const rawExpiry = localStorage.getItem('sessionExpiry');
    let expiry = rawExpiry ? Number(rawExpiry) : NaN;
    if (!Number.isFinite(expiry) || expiry <= 0) {
      expiry = Date.now() + 3 * 60 * 60 * 1000;
      localStorage.setItem('sessionExpiry', String(expiry));
    }

    const remainingMs = expiry - Date.now();
    if (remainingMs <= 0) {
      logout();
      return;
    }

    const timer = window.setTimeout(() => {
      logout();
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, logout, token]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          login(user, token);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
        logout();
      }
    };
    fetchUser();
  }, [token, login, logout]);

  // Disable Inspect (Right Click and Developer Keys)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col">
        <Routes>
          <Route path="/" element={
            isAuthenticated ? (
              <>
                <Navbar />
                <main className="flex-1">
                  <Dashboard />
                </main>
              </>
            ) : (
              <LandingPage />
            )
          } />
          <Route path="/login" element={
            <>
              <Navbar />
              <main className="flex-1">
                <Login />
              </main>
            </>
          } />
          <Route path="/forgot-password" element={
            <>
              <Navbar />
              <main className="flex-1">
                <ForgotPassword />
              </main>
            </>
          } />
          <Route path="/reset-password" element={
            <>
              <Navbar />
              <main className="flex-1">
                <ResetPassword />
              </main>
            </>
          } />
          <Route path="/register" element={
            <>
              <Navbar />
              <main className="flex-1">
                <Register />
              </main>
            </>
          } />
          <Route path="/terms" element={
            <>
              <Navbar />
              <main className="flex-1">
                <TermsAndConditions />
              </main>
            </>
          } />
          <Route path="/faq" element={
            <>
              <Navbar />
              <main className="flex-1">
                <FAQ />
              </main>
            </>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <Profile />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/verify-account" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <VerifyAccount />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/deposit" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <Deposit />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/crypto-deposit" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <CryptoDeposit />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/direct-transfer-pay" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <DirectTransferPayment />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/withdrawal" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <Withdrawal />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <Admin />
              </main>
            </ProtectedRoute>
          } />
          <Route path="/multi" element={
            <ProtectedRoute>
              <Navbar />
              <main className="flex-1">
                <MultiChart />
              </main>
            </ProtectedRoute>
          } />
        </Routes>
        <SupportChat />
      </div>
    </Router>
  );
}
