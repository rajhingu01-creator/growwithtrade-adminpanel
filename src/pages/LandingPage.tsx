import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Shield, Globe, ArrowRight, CheckCircle2, BarChart3, Smartphone, DollarSign, Bitcoin, Euro, Activity } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { TradingChart } from '../components/TradingChart';

const FloatingIcon = ({ icon: Icon, delay, x, y, color, mousePos, factor = 0.02 }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ 
      opacity: [0.4, 0.8, 0.4],
      y: mousePos ? (mousePos.y - window.innerHeight / 2) * factor : [0, -20, 0],
      x: mousePos ? (mousePos.x - window.innerWidth / 2) * factor : [0, 10, 0],
    }}
    transition={{ 
      duration: 5, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut",
      x: { type: "spring", damping: 30, stiffness: 100 },
      y: { type: "spring", damping: 30, stiffness: 100 }
    }}
    style={{ left: x, top: y }}
    className={`absolute z-0 ${color} opacity-20 hidden lg:block`}
  >
    <Icon size={48} strokeWidth={1} />
  </motion.div>
);

const MarketTicker = () => {
  const [prices, setPrices] = useState([
    { pair: 'BTC/USD', price: '64,231.50', change: '+2.4%' },
    { pair: 'EUR/USD', price: '1.0842', change: '-0.1%' },
    { pair: 'GBP/USD', price: '1.2654', change: '+0.3%' },
    { pair: 'ETH/USD', price: '3,452.12', change: '+1.8%' },
    { pair: 'GOLD', price: '2,154.30', change: '+0.5%' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map(p => ({
        ...p,
        price: (parseFloat(p.price.replace(',', '')) + (Math.random() - 0.5) * 2).toFixed(p.pair.includes('/') ? 4 : 2)
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-blue-600/10 border-y border-blue-500/10 py-2 overflow-hidden whitespace-nowrap">
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="inline-flex gap-12"
      >
        {[...prices, ...prices, ...prices].map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-slate-400 font-bold text-xs tracking-widest uppercase">{p.pair}</span>
            <span className="text-white font-mono text-xs">{p.price}</span>
            <span className={p.change.startsWith('+') ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
              {p.change}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const LandingPage = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [displayText, setDisplayText] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fullText = "Access global markets with lightning-fast execution, advanced technical analysis, and institutional-grade security.";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    let i = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(timer);
    }, 30);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Mouse Glow */}
      <motion.div 
        animate={{ 
          x: mousePos.x - 300,
          y: mousePos.y - 300,
        }}
        transition={{ type: "spring", damping: 40, stiffness: 150, mass: 0.5 }}
        className="fixed w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -z-10"
      ></motion.div>

      {/* Parallax Background Elements */}
      <div className="fixed inset-0 -z-20 pointer-events-none">
        <motion.div 
          animate={{ 
            x: (mousePos.x - window.innerWidth / 2) * 0.02,
            y: (mousePos.y - window.innerHeight / 2) * 0.02,
          }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10"
        ></motion.div>
        
        {/* Floating Data Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: "110%", x: `${Math.random() * 100}%` }}
            animate={{ y: "-10%" }}
            transition={{ 
              duration: 15 + Math.random() * 20, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 20 
            }}
            className="absolute w-[1px] h-20 bg-gradient-to-t from-transparent via-blue-500/20 to-transparent"
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-300">
                <Zap className="text-white w-7 h-7 fill-white animate-pulse" />
              </div>
              <span className="text-white font-black text-xl sm:text-3xl tracking-tighter uppercase">
                Trade <span className="text-blue-500">With Grow</span>
              </span>
            </motion.div>
            
            {/* Desktop Menu */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center gap-4"
            >
              <Link 
                to="/login" 
                className="text-slate-300 hover:text-white font-medium px-4 py-2 transition-colors"
              >
                Login
              </Link>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/register" 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-full transition-all shadow-lg shadow-blue-500/20"
                >
                  Create for Free
                </Link>
              </motion.div>
            </motion.div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white p-2"
              >
                {isMobileMenuOpen ? <Activity className="rotate-45" /> : <Activity />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate-900 border-b border-white/5 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <Link 
                  to="/login" 
                  className="block text-slate-300 hover:text-white font-medium text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Create for Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <MarketTicker />
        
        {/* Floating Decorative Icons with Parallax */}
        <FloatingIcon icon={DollarSign} x="10%" y="30%" delay={0} color="text-emerald-500" mousePos={mousePos} factor={0.03} />
        <FloatingIcon icon={Bitcoin} x="85%" y="25%" delay={1} color="text-amber-500" mousePos={mousePos} factor={-0.04} />
        <FloatingIcon icon={Euro} x="15%" y="70%" delay={2} color="text-blue-500" mousePos={mousePos} factor={0.05} />
        <FloatingIcon icon={Activity} x="80%" y="75%" delay={3} color="text-rose-500" mousePos={mousePos} factor={-0.02} />

        <div className="max-w-7xl mx-auto text-center mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 tracking-[0.2em] uppercase">
                Institutional Grade Trading
              </span>
            </motion.div>
            
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white mb-6 leading-[1.1] sm:leading-[0.9] tracking-tighter">
              TRADE LIKE A <br />
              <motion.span 
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600 bg-[length:200%_auto] drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                PROFESSIONAL
              </motion.span>
            </h1>

            <div className="min-h-[80px] sm:min-h-[60px] mb-10">
              <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium px-6">
                {displayText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-1 h-5 bg-blue-500 ml-1 translate-y-1"
                />
              </p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link 
                  to="/register" 
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-10 py-4 sm:px-12 sm:py-5 rounded-2xl sm:rounded-full text-base sm:text-lg transition-all shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    START TRADING
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </span>
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto bg-slate-900/40 backdrop-blur-xl text-slate-200 font-black px-10 py-4 sm:px-12 sm:py-5 rounded-2xl sm:rounded-full text-base sm:text-lg transition-all border border-slate-800 hover:border-slate-600 hover:text-white hover:bg-slate-800/60 flex items-center justify-center"
                >
                  TRY FREE DEMO
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Main Platform Mockup with Parallax */}
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              x: (mousePos.x - window.innerWidth / 2) * -0.01,
              rotateX: (mousePos.y - window.innerHeight / 2) * 0.01,
              rotateY: (mousePos.x - window.innerWidth / 2) * 0.01,
            }}
            transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-24 relative"
          >
            <div className="relative z-10 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-3 shadow-[0_0_100px_rgba(37,99,235,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-8 bg-white/5 rounded-t-2xl flex items-center px-4 gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
              </div>
              <div className="overflow-hidden rounded-2xl mt-6 border border-white/5 shadow-2xl relative group h-[300px] sm:h-[450px]">
                <TradingChart />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            {/* Floating Stat Cards */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ 
                x: (mousePos.x - window.innerWidth / 2) * -0.02,
                opacity: 1 
              }}
              transition={{ delay: 1, duration: 0.8 }}
              whileHover={{ scale: 1.1 }}
              className="absolute -left-6 top-1/4 z-20 bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl hidden lg:block cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Profit Rate</div>
                  <div className="text-lg font-mono font-bold text-white">95.4%</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ 
                x: (mousePos.x - window.innerWidth / 2) * 0.02,
                opacity: 1 
              }}
              transition={{ delay: 1.2, duration: 0.8 }}
              whileHover={{ scale: 1.1 }}
              className="absolute -right-6 bottom-1/4 z-20 bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl hidden lg:block cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Security</div>
                  <div className="text-lg font-mono font-bold text-white">AES-256</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section with Glassmorphism */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">POWERFUL FEATURES</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg font-medium">Engineered for speed, built for reliability, designed for the modern trader.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="text-yellow-400" />,
                title: "Instant Execution",
                desc: "Proprietary high-frequency engine ensures your orders hit the market in under 10ms."
              },
              {
                icon: <Shield className="text-blue-400" />,
                title: "Bank-Grade Security",
                desc: "Multi-signature cold storage and end-to-end encryption for total peace of mind."
              },
              {
                icon: <BarChart3 className="text-emerald-400" />,
                title: "Smart Analytics",
                desc: "AI-powered market insights and over 100+ technical indicators at your fingertips."
              },
              {
                icon: <Globe className="text-indigo-400" />,
                title: "Global Liquidity",
                desc: "Deep liquidity pools across 50+ markets ensuring the best possible pricing."
              },
              {
                icon: <TrendingUp className="text-rose-400" />,
                title: "Maximum Payouts",
                desc: "Industry-leading payout ratios up to 95% on major currency pairs."
              },
              {
                icon: <Smartphone className="text-slate-400" />,
                title: "Native Experience",
                desc: "A seamless trading experience across all devices with zero latency."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -15, scale: 1.02, rotateZ: 1 }}
                className="p-10 rounded-[2.5rem] bg-slate-900/40 border border-slate-800 hover:border-blue-500/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mb-8 border border-slate-800 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xl">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <span className="text-blue-500 font-bold text-xs uppercase tracking-[0.3em] mb-4 block">Live Experience</span>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-none">
                REAL-TIME <br />
                <span className="text-slate-500">MARKET DATA</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-400 mb-10 font-medium leading-relaxed">
                Experience the power of our high-frequency trading engine. Our charts update in real-time with zero latency, giving you the edge you need to succeed in volatile markets.
              </p>
              <div className="space-y-6">
                {[
                  { title: "Lightning Fast", desc: "Order execution in under 10ms" },
                  { title: "Smart Indicators", desc: "100+ technical analysis tools" },
                  { title: "Global Assets", desc: "Trade Forex, Crypto, and Stocks" }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                      <CheckCircle2 size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{item.title}</h4>
                      <p className="text-slate-500 text-xs">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 w-full"
            >
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-3 shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-8 bg-white/5 rounded-t-2xl flex items-center px-4 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                </div>
                <div className="overflow-hidden rounded-2xl mt-6 bg-slate-950 h-[300px] sm:h-[400px]">
                  <TradingChart />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section with Counter Animation */}
      <section className="py-32 bg-slate-900/50 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 -z-10 blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: "Trading Volume", value: 2.4, suffix: "B+" },
              { label: "Active Traders", value: 1.2, suffix: "M+" },
              { label: "Countries", value: 150, suffix: "+" },
              { label: "Uptime", value: 99.9, suffix: "%" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-5xl font-black text-white mb-3 tracking-tighter flex items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    {stat.value}
                  </motion.span>
                  <span>{stat.suffix}</span>
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 relative overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full -z-10"
        ></motion.div>
        
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tighter leading-none">
              READY TO <br />
              <motion.span 
                animate={{ color: ["#3b82f6", "#6366f1", "#3b82f6"] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-blue-500"
              >
                DOMINATE?
              </motion.span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 mb-14 font-medium max-w-2xl mx-auto">Join 1.2M+ traders who have already chosen the future of trading. Experience the difference today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link 
                  to="/register" 
                  className="block w-full sm:w-auto bg-blue-600 text-white font-black px-16 py-6 rounded-full text-xl hover:bg-blue-500 transition-all shadow-[0_0_50px_rgba(37,99,235,0.4)] relative overflow-hidden group"
                >
                  <span className="relative z-10">CREATE ACCOUNT</span>
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                </Link>
              </motion.div>
              <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <span>No hidden fees</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-20 border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 md:gap-12 mb-12 sm:mb-16">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="text-white w-6 h-6 fill-white" />
              </div>
              <span className="text-white font-black text-2xl tracking-tighter">Trade with Grow</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-blue-500 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Security</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Support</a>
            </div>
          </div>
          <div className="text-center border-t border-slate-900 pt-12">
            <p className="text-slate-600 text-[10px] sm:text-xs max-w-3xl mx-auto mb-8 leading-relaxed font-medium px-4">
              Risk Warning: Trading financial instruments involves significant risk. Our services may not be suitable for everyone. 
              Ensure you fully understand the risks involved before trading. Past performance is not indicative of future results.
            </p>
            <div className="text-slate-700 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em]">
              © 2026 Trade with Grow Global Markets Ltd.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
