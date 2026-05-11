import React, { useState } from 'react';
import { LogIn, Lock, Mail, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'AUTHENTICATION_FAILED: INVALID_CREDENTIALS');
      }
    } catch (err: any) {
      console.error(err);
      setError('COMMUNICATION_ERROR: LINK_FAILURE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090A] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,255,163,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(26,28,30,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(26,28,30,.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="p-10 bg-[#0B0C0E] border border-[#1A1C1E] rounded-xs shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#00FFA3] rounded-sm flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,255,163,0.1)]">
              <span className="font-black italic text-black text-4xl">T</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">TWG<span className="text-[#00FFA3]">Support</span></h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-3">Auth Protocol Interface</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#00FFA3] transition-colors">
                    <Mail size={14} />
                  </div>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121417] border border-[#222529] rounded-sm py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#00FFA3]/50 transition-all font-mono"
                    placeholder="ENTER_IDENTITY_EMAIL"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Cipher (Password)</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#00FFA3] transition-colors">
                    <Lock size={14} />
                  </div>
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#121417] border border-[#222529] rounded-sm py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#00FFA3]/50 transition-all font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-sm flex items-center gap-3"
                >
                  <ShieldAlert size={16} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-mono text-red-500 uppercase tracking-tighter">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-[#E0E0E0] hover:bg-white disabled:bg-slate-800 disabled:text-slate-600 text-black font-black uppercase text-[11px] tracking-[0.2em] py-4 px-6 rounded-sm transition-all duration-300 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              {loading ? (
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:200ms]" />
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:400ms]" />
                </div>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Execute Auth Transmission</span>
                </>
              )}
            </button>
            
            <div className="text-center pt-4">
              <p className="text-[9px] text-slate-600 font-mono uppercase leading-relaxed tracking-wider">
                Unauthorized access is strictly monitored.<br/>
                AES-256-GCM Secure Channel Active.
              </p>
            </div>
          </form>
        </div>
        
        <div className="mt-8 flex justify-center gap-8 text-[8px] font-mono text-slate-700 uppercase tracking-widest">
           <span>Vers: 2.4.5-Stable</span>
           <span>Node: US-WEST-A1</span>
           <span>Enc: Hardware</span>
        </div>
      </motion.div>
    </div>
  );
}
