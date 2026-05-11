import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Activity, BarChart3, Wallet, ShieldCheck, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import ChatWidget from './chat/ChatWidget';
import { useAuth } from '../lib/AuthContext';

export default function LandingPage() {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#08090A] text-[#E0E0E0] font-sans selection:bg-[#00FFA3] selection:text-black">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(26,28,30,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,28,30,.05)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,163,0.02)_0%,transparent_50%)] pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-[#1A1C1E] bg-[#08090A]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00FFA3] rounded-sm flex items-center justify-center font-black italic text-black text-xl">T</div>
              <span className="font-black text-xl tracking-tighter italic uppercase">TWG<span className="text-[#00FFA3]">Support</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <NavLink label="Terminal" active />
              <NavLink label="Liquidity" />
              <NavLink label="Protocols" />
              <NavLink label="Vault" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 bg-[#0B0C0E] px-4 py-1.5 border border-[#1A1C1E]">
               <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 uppercase font-mono leading-none mb-1 text-right">Available Margin</span>
                  <span className="text-xs font-mono font-bold text-[#00FFA3]">$1,240.50</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={logout}
                className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Exit
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black uppercase">
                {profile?.displayName?.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-20 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00FFA3]/5 border border-[#00FFA3]/20 text-[#00FFA3] text-[10px] font-black mb-10 uppercase tracking-[0.2em] italic">
            <Activity size={12} /> SYNC: GLOBAL MARKET_TIER_A
          </div>
          <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] mb-8 tracking-tighter uppercase italic">
            Execute <br/>
            <span className="text-[#00FFA3]">With Intent.</span>
          </h1>
          <p className="text-md text-slate-500 mb-12 max-w-md leading-relaxed font-medium uppercase tracking-tight">
            Institutional liquidity for the modern operative. Experience the world's most aggressive binary execution engine.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-[#00FFA3] text-black font-black uppercase text-xs tracking-widest py-5 px-10 rounded-sm transition-all shadow-[0_0_40px_rgba(0,255,163,0.15)] hover:shadow-[0_0_60px_rgba(0,255,163,0.25)] active:scale-95">
              Initiate Terminal
            </button>
            <button className="bg-transparent text-white border border-[#1A1C1E] font-black uppercase text-xs tracking-widest py-5 px-10 rounded-sm transition-all hover:bg-white hover:text-black active:scale-95">
              Protocol Specs
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-[#0B0C0E] border border-[#1A1C1E] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative z-10">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1A1C1E]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#00FFA3] rounded-full animate-pulse" />
                <span className="font-black text-xs uppercase tracking-widest italic">Live Flux: BTC_PERP</span>
              </div>
              <div className="text-right">
                <p className="text-[#00FFA3] font-mono font-bold text-sm">$64,281.40</p>
              </div>
            </div>
            
            <div className="h-56 bg-[#08090A] mb-8 relative overflow-hidden border border-[#1A1C1E] flex items-center justify-center font-mono text-[10px] text-slate-800">
               {/* Decorative Terminal elements */}
               <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4">GRID_A1_ACTIVE</div>
                  <div className="absolute bottom-4 right-4">TIMESTAMP: {Date.now()}</div>
               </div>
              <svg className="w-full h-full p-4" viewBox="0 0 400 200">
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                  d="M0 150 L50 120 L100 140 L150 100 L200 110 L250 60 L300 80 L350 40 L400 50" 
                  fill="none" 
                  stroke="#00FFA3" 
                  strokeWidth="3" 
                  strokeLinecap="square"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="bg-[#00FFA3] text-black font-black py-4 rounded-sm flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest italic transition-opacity hover:opacity-90">
                Buy Call
              </button>
              <button className="bg-transparent border border-[#1A1C1E] text-white font-black py-4 rounded-sm flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest italic hover:bg-red-500 hover:border-red-500 transition-all group">
                Buy Put
              </button>
            </div>
          </div>
          
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#00FFA3]/5 blur-[100px] rounded-full pointer-events-none" />
        </motion.div>
      </main>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1A1C1E] relative z-10">
        <div className="grid md:grid-cols-4 gap-12">
          <FeatureCard 
            title="Sovereignty" 
            desc="Military-grade encryption for all institutional nodes."
            tag="SEC_TYPE: HARDWARE"
          />
          <FeatureCard 
            title="Latency" 
            desc="Execution speed measured in micro-temporal units."
            tag="LAT: <0.02MS"
          />
          <FeatureCard 
            title="Liquidity" 
            desc="Deep-flux integration with tier-1 banking systems."
            tag="DPTH: UNLIMITED"
          />
          <FeatureCard 
            title="Analytics" 
            desc="Real-time sentiment mapping across the global core."
            tag="ALG: GEN_V_PRO"
          />
        </div>
      </section>

      <ChatWidget />
    </div>
  );
}

function NavLink({ label, active }: { label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={cn(
        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
        active ? "text-[#00FFA3]" : "text-slate-500 hover:text-white"
      )}
    >
      {label}
    </a>
  );
}

function FeatureCard({ title, desc, tag }: { title: string, desc: string, tag: string }) {
  return (
    <div className="space-y-4 group">
      <div className="flex items-center gap-2">
         <div className="h-px flex-1 bg-[#1A1C1E] group-hover:bg-[#00FFA3]/30 transition-colors" />
         <span className="text-[9px] font-mono text-slate-700 uppercase tracking-tighter">{tag}</span>
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest italic group-hover:text-[#00FFA3] transition-colors">{title}</h3>
      <p className="text-slate-600 text-xs leading-relaxed uppercase tracking-tight">{desc}</p>
    </div>
  );
}
