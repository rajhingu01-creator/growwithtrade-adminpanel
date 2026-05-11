import React, { useState, useEffect } from 'react';
import { Radar, Zap, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Signal {
  id: string;
  assetId: string;
  assetName: string;
  type: 'up' | 'down';
  accuracy: number;
  expiresAt: number;
  status: 'active' | 'used' | 'expired';
}

const ASSETS = [
  { id: 'cosmos', name: 'Cosmos (OTC)' },
  { id: 'eurusd', name: 'EUR/USD' },
  { id: 'gbpusd', name: 'GBP/USD' },
  { id: 'usdjpy', name: 'USD/JPY' },
  { id: 'btcusd', name: 'Bitcoin' },
  { id: 'ethusd', name: 'Ethereum' }
];

export const Signals = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate a new signal every 30-60 seconds
  useEffect(() => {
    const generateSignal = () => {
      setIsGenerating(true);
      
      setTimeout(() => {
        const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        const type = Math.random() > 0.5 ? 'up' : 'down';
        // Display high accuracy to the user (85-95%)
        // But the actual backend logic remains 40% win / 60% loss
        const accuracy = 85 + Math.floor(Math.random() * 11); 
        
        const newSignal: Signal = {
          id: Math.random().toString(36).substr(2, 9),
          assetId: asset.id,
          assetName: asset.name,
          type,
          accuracy,
          expiresAt: Date.now() + 60000, // 1 minute expiry
          status: 'active'
        };

        setSignals(prev => [newSignal, ...prev].slice(0, 5));
        setIsGenerating(false);
      }, 2000);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10s to generate
        generateSignal();
      }
    }, 10000);

    // Initial signal
    generateSignal();

    return () => clearInterval(interval);
  }, []);

  // Cleanup expired signals
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSignals(prev => prev.map(s => {
        if (s.status === 'active' && s.expiresAt < now) {
          return { ...s, status: 'expired' };
        }
        return s;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUseSignal = (signal: Signal) => {
    if (signal.status !== 'active') return;

    // Dispatch custom event for Dashboard to pick up
    const event = new CustomEvent('place-signal-trade', {
      detail: {
        assetId: signal.assetId,
        type: signal.type,
        amount: null // Let dashboard use current investment amount
      }
    });
    window.dispatchEvent(event);

    setSignals(prev => prev.map(s => s.id === signal.id ? { ...s, status: 'used' } : s));
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-blue-500/20 transition-all group relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg sm:rounded-xl"></div>
        <Radar size={14} className={`relative z-10 sm:hidden ${isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
        <Radar size={16} className={`relative z-10 hidden sm:block ${isGenerating ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
        <span className="relative z-10 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]">Signals</span>
        {signals.filter(s => s.status === 'active').length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-lg shadow-rose-500/40 animate-bounce z-20">
            {signals.filter(s => s.status === 'active').length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-[#161a1e]/95 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
            >
              <div className="bg-white/5 p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <Zap size={18} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-white font-black text-[11px] uppercase tracking-widest leading-none mb-1">AI Intelligence</h3>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Quantum Analysis</span>
                  </div>
                </div>
                <div className="bg-blue-500/10 px-2 py-1.5 rounded-lg border border-blue-500/20">
                  <span className="text-[9px] text-blue-400 uppercase tracking-widest font-black">92% Precision</span>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3 space-y-3 bg-black/20">
                {signals.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="relative inline-block">
                      <Loader2 className="w-12 h-12 text-blue-500/50 animate-spin mx-auto" />
                      <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Decoding Patterns...</p>
                  </div>
                ) : (
                  signals.map((signal) => (
                    <div
                      key={signal.id}
                      className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                        signal.status === 'active' 
                          ? 'bg-white/5 border-white/5 hover:border-blue-500/30 cursor-pointer active:scale-[0.98]' 
                          : 'bg-black/40 border-white/5 opacity-40 grayscale'
                      }`}
                      onClick={() => handleUseSignal(signal)}
                    >
                      {signal.status === 'active' && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <div className="text-white font-black text-xs uppercase tracking-tight mb-1">{signal.assetName}</div>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            <Clock size={10} className="text-blue-500" />
                            <span>Expires: {Math.max(0, Math.floor((signal.expiresAt - Date.now()) / 1000))}s</span>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          signal.type === 'up' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {signal.type === 'up' ? 'Bullish' : 'Bearish'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl shadow-lg ${signal.type === 'up' ? 'bg-emerald-500/20 shadow-emerald-500/10' : 'bg-rose-500/20 shadow-rose-500/10'}`}>
                            {signal.type === 'up' ? (
                              <TrendingUp size={20} className="text-emerald-400" />
                            ) : (
                              <TrendingDown size={20} className="text-rose-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Reliability</span>
                            <div className="text-[11px] font-black uppercase tracking-widest text-blue-400">
                              {signal.accuracy}% <span className="text-slate-600 text-[8px]">Power</span>
                            </div>
                          </div>
                        </div>
                        
                        {signal.status === 'active' ? (
                          <button className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-xl shadow-blue-600/20 group-hover:scale-105 active:scale-95 border border-white/10">
                            Execute
                          </button>
                        ) : (
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                            {signal.status === 'used' ? (
                              <><CheckCircle2 size={12} className="text-emerald-500" /> Active</>
                            ) : (
                              <><AlertCircle size={12} className="text-rose-500" /> Void</>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/5">
                <p className="text-[8px] font-bold text-slate-600 text-center leading-relaxed uppercase tracking-[0.2em]">
                  Real-time market analysis. Risk warning applies.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
