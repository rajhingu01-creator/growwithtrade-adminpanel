import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTradeStore } from '../store/useTradeStore';
import { useChartStore } from '../store/useChartStore';
import CustomChart from '../components/CustomChart';
import { ArrowUpRight, ArrowDownRight, Activity, Clock, Plus, Minus, ToggleRight, ChevronDown, Shield, Wallet, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrencySymbol, getMinTradeAmount } from '../utils/currency';

const TradeTimer = ({ expiryTime, onExpire }: { expiryTime: number; onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      
      setTimeLeft(prev => {
        if (prev !== remaining) return remaining;
        return prev;
      });
      
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 100); // High frequency update for smoothness

    return () => clearInterval(timer);
  }, [expiryTime, onExpire]);

  return (
    <span className="flex items-center gap-1">
      <span className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></span>
      {timeLeft}s
    </span>
  );
};

const ASSETS = [
  { id: 'cosmos', name: 'Cosmos (OTC)', payout: 80 },
  { id: 'eurusd', name: 'EUR/USD (OTC)', payout: 85 },
  { id: 'gbpusd', name: 'GBP/USD (OTC)', payout: 82 },
  { id: 'usdjpy', name: 'USD/JPY (OTC)', payout: 78 },
  { id: 'audusd', name: 'AUD/USD (OTC)', payout: 80 },
  { id: 'usdcad', name: 'USD/CAD (OTC)', payout: 75 },
  { id: 'usdchf', name: 'USD/CHF (OTC)', payout: 70 },
  { id: 'nzdusd', name: 'NZD/USD (OTC)', payout: 77 },
  { id: 'eurgbp', name: 'EUR/GBP (OTC)', payout: 81 },
  { id: 'eurjpy', name: 'EUR/JPY (OTC)', payout: 83 },
  { id: 'gbpjpy', name: 'GBP/JPY (OTC)', payout: 84 },
  { id: 'btcusd', name: 'Bitcoin (OTC)', payout: 60 },
  { id: 'ethusd', name: 'Ethereum (OTC)', payout: 65 },
  { id: 'inrusd', name: 'INR/USD (OTC)', payout: 72 },
  { id: 'brlusd', name: 'BRL/USD (OTC)', payout: 74 },
];

const ASSET_TV_SYMBOLS: Record<string, string> = {
  cosmos: 'BINANCE:ATOMUSDT',
  eurusd: 'FX:EURUSD',
  gbpusd: 'FX:GBPUSD',
  usdjpy: 'FX:USDJPY',
  audusd: 'OANDA:AUDUSD',
  usdcad: 'FX:USDCAD',
  usdchf: 'FX:USDCHF',
  nzdusd: 'FX:NZDUSD',
  eurgbp: 'FX:EURGBP',
  eurjpy: 'FX:EURJPY',
  gbpjpy: 'FX:GBPJPY',
  btcusd: 'BINANCE:BTCUSDT',
  ethusd: 'BINANCE:ETHUSDT',
  inrusd: 'FX:USDINR',
  brlusd: 'FX:USDBRL',
};

export const Dashboard = () => {
  const { user, token, updateBalances, currency, accountType } = useAuthStore();
  const symbol = getCurrencySymbol(currency);
  const { trades, setTrades, addTrade, updateTrade } = useTradeStore();
  const { assetData, connect } = useChartStore();
  
  const [investment, setInvestment] = useState(() => {
    const saved = localStorage.getItem('trading_investment');
    return saved ? parseInt(saved) : 1;
  });
  const [timeInSeconds, setTimeInSeconds] = useState(() => {
    const saved = localStorage.getItem('trading_timeInSeconds');
    return saved ? parseInt(saved) : 5;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(() => {
    const saved = localStorage.getItem('trading_selectedAssetId');
    return ASSETS.find(a => a.id === saved) || ASSETS[0];
  });
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  const defaultAssetData = React.useMemo(() => ({ history: [], latest: null, sentiment: { up: 50, down: 50 } }), []);
  const currentAssetData = assetData[selectedAsset.id] || defaultAssetData;
  const currentPrice = currentAssetData.latest?.close || 150;

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('trading_selectedAssetId', selectedAsset.id);
  }, [selectedAsset.id]);

  useEffect(() => {
    localStorage.setItem('trading_investment', investment.toString());
  }, [investment]);

  useEffect(() => {
    localStorage.setItem('trading_timeInSeconds', timeInSeconds.toString());
  }, [timeInSeconds]);

  // Use refs to access latest values in event listeners without re-adding them
  const stateRef = React.useRef({ token, selectedAsset, currentPrice, assetData, investment, timeInSeconds });
  useEffect(() => {
    stateRef.current = { token, selectedAsset, currentPrice, assetData, investment, timeInSeconds };
  }, [token, selectedAsset, currentPrice, assetData, investment, timeInSeconds]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    connect(selectedAsset.id);
  }, [selectedAsset.id, connect]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/trades', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTrades(data);
          
          // Re-schedule resolution for open trades after refresh
          data.forEach((trade: any) => {
            if (trade.status === 'open') {
              const expiry = trade.expiryTime || (new Date(trade.timestamp).getTime() + 60000);
              const delay = Math.max(0, expiry - Date.now());
              setTimeout(() => resolveTrade(trade._id), delay);
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch trades', err);
      }
    };
    fetchTrades();
  }, [token, setTrades]);

  useEffect(() => {
    const handleSignalTrade = async (e: any) => {
      const { assetId, type, amount: signalAmount } = e.detail;
      const { token, selectedAsset, assetData, investment, timeInSeconds } = stateRef.current;
      
      const asset = ASSETS.find(a => a.id === assetId) || selectedAsset;
      const tradeAmount = signalAmount || investment || 1000;
      
      // Select the asset if it's different
      if (asset.id !== selectedAsset.id) {
        setSelectedAsset(asset);
      }

      // Small delay to allow asset state to update if needed
      setTimeout(async () => {
        setLoading(true);
        setError('');
        try {
          const res = await fetch('/api/trades', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              symbol: asset.name,
              assetId: asset.id,
              type,
              amount: tradeAmount,
              price: assetData[asset.id]?.latest?.close || 150,
              payout: asset.payout,
              isSignal: true,
              accountType,
              duration: timeInSeconds
            })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Trade failed');
          
          addTrade(data.trade);
          updateBalances(data.realBalance, data.demoBalance);
          
          // Use the latest resolveTrade function
          const resolve = async (id: string) => {
            try {
              const r = await fetch(`/api/trades/${id}/resolve`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                }
              });
              const d = await r.json();
              if (r.ok) {
                updateTrade(d.trade);
                updateBalances(d.realBalance, d.demoBalance);
              }
            } catch (err) {
              console.error('Failed to resolve trade', err);
            }
          };

          const delay = Math.max(0, data.trade.expiryTime - Date.now());
          setTimeout(() => resolve(data.trade._id), delay);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }, 500);
    };

    window.addEventListener('place-signal-trade', handleSignalTrade);
    return () => window.removeEventListener('place-signal-trade', handleSignalTrade);
  }, [addTrade, updateBalances, updateTrade]); // Minimal dependencies

  const resolveTrade = React.useCallback(async (tradeId: string) => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        updateTrade(data.trade);
        updateBalances(data.realBalance, data.demoBalance);
      }
    } catch (err) {
      console.error('Failed to resolve trade', err);
    }
  }, [token, updateTrade, updateBalances]);

  const handleTrade = async (type: 'up' | 'down') => {
    const minAmount = getMinTradeAmount(currency);
    if (investment < minAmount) {
      setError(`Minimum trade amount is ${symbol}${minAmount.toFixed(2)} (equivalent to ₹30)`);
      return;
    }

    // setLoading(true); // Remove blocking loader for faster feel
    setError('');
    
    // Create an optimistic trade object
    const optimisticTrade = {
      _id: `temp-${Date.now()}`,
      symbol: selectedAsset.name,
      assetId: selectedAsset.id,
      type,
      amount: investment,
      price: currentPrice,
      payout: selectedAsset.payout,
      accountType,
      duration: timeInSeconds,
      timestamp: new Date().toISOString(),
      status: 'open' as const,
      expiryTime: Date.now() + (timeInSeconds * 1000)
    };

    // Add trade immediately to UI
    addTrade(optimisticTrade);

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: selectedAsset.name,
          assetId: selectedAsset.id,
          type,
          amount: investment,
          price: currentPrice,
          payout: selectedAsset.payout,
          accountType,
          duration: timeInSeconds
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Remove optimistic trade if it failed
        updateTrade({ ...optimisticTrade, status: 'closed', pnl: 0 } as any); 
        throw new Error(data.error || 'Trade failed');
      }
      
      // Replace optimistic trade with real one
      updateTrade(data.trade);
      updateBalances(data.realBalance, data.demoBalance);
      
      // Schedule resolution after the selected time
      const delay = Math.max(0, data.trade.expiryTime - Date.now());
      setTimeout(() => resolveTrade(data.trade._id), delay);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      // setLoading(false);
    }
  };

  const openTrades = React.useMemo(() => 
    trades.filter(t => t.status === 'open').map(t => ({
      id: t._id,
      price: t.price,
      type: t.type
    })),
    [trades]
  );

  const [chartHeight, setChartHeight] = useState(400);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 640) {
        setChartHeight(window.innerHeight - 150); // Mobile: take most of screen
      } else if (window.innerWidth < 1024) {
        setChartHeight(window.innerHeight - 200); // Tablet
      } else {
        setChartHeight(window.innerHeight - 80); // Desktop: match parent container minus navbar
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);  return (
    <div className="h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-[#0b0e11] selection:bg-blue-500/20">
      
      {/* Left Sidebar - Trade History (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col w-72 border-r border-slate-800/40 bg-[#0b0e11] shrink-0 shadow-2xl z-10">
        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between bg-[#161a1e]/30 backdrop-blur-sm">
          <h3 className="text-[10px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
            <Clock size={14} className="text-blue-500" />
            Live History
          </h3>
          <div className="bg-slate-800/50 px-2 py-0.5 rounded-md text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-700/30">{trades.length}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#0b0e11]">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-800/50 py-20">
              <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mb-4 border border-slate-800/30">
                <Activity size={32} className="opacity-20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Waiting for Trades</p>
            </div>
          ) : (
            trades.slice().reverse().map((trade) => (
              <div 
                key={trade._id} 
                className="bg-[#161a1e]/40 rounded-xl p-3 border border-slate-800/30 hover:border-slate-700/50 hover:bg-[#1c2127]/60 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: trade.type === 'up' ? '#10b981' : '#f43f5e' }}></div>
                <div className="flex justify-between items-start mb-2 pl-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200 font-black text-[11px] uppercase tracking-tighter">{trade.symbol}</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono font-bold group-hover:text-slate-400 transition-colors">
                    {format(new Date(trade.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
                
                <div className="flex justify-between items-end pl-1">
                  <div className="flex flex-col">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Investment</div>
                    <div className="text-xs font-mono font-black text-white">{symbol}{trade.amount.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase tracking-tighter ${
                      trade.status === 'open' ? 'text-blue-400 animate-pulse' :
                      trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {trade.status === 'open' ? (
                        <TradeTimer 
                          expiryTime={trade.expiryTime || (new Date(trade.timestamp).getTime() + (trade.duration || 60) * 1000)} 
                          onExpire={() => resolveTrade(trade._id)} 
                        />
                      ) : `${trade.pnl && trade.pnl > 0 ? '+' : ''}${symbol}${Math.abs(trade.pnl || 0).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#0b0e11] order-1 lg:order-2">
        {/* Top Overlay - Asset Selector & Stats */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Asset Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-3 bg-[#161a1e]/90 backdrop-blur-md px-2 sm:px-4 py-1 sm:py-2.5 rounded-lg sm:rounded-2xl border border-slate-700/50 shadow-2xl hover:bg-[#1c2127] transition-all group"
              >
                <div className="w-5 h-5 sm:w-8 sm:h-8 bg-blue-500/10 rounded-md sm:rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Activity size={12} className="text-blue-400 sm:hidden" />
                  <Activity size={18} className="text-blue-400 hidden sm:block" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[7px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">Market</div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-white font-black text-[10px] sm:text-sm tracking-tight uppercase truncate max-w-[60px] min-[400px]:max-w-[80px] sm:max-w-none">{selectedAsset.name.split(' ')[0]}</span>
                    <span className="text-emerald-400 font-black text-[7px] sm:text-[10px] bg-emerald-400/10 px-0.5 sm:px-1 py-0.5 rounded-md shrink-0">{selectedAsset.payout}%</span>
                    <ChevronDown size={10} className={`text-slate-500 transition-transform duration-300 shrink-0 ${isAssetDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {isAssetDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAssetDropdownOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-[#161a1e] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden py-2 sm:py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 sm:px-5 py-1.5 sm:py-2 mb-1 sm:mb-2">
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Available Markets</span>
                    </div>
                    <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar px-1.5 sm:px-2 space-y-0.5 sm:space-y-1">
                      {ASSETS.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            setSelectedAsset(asset);
                            setIsAssetDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all ${
                            selectedAsset.id === asset.id 
                              ? 'bg-blue-500/10 border-l-4 border-blue-500' 
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${asset.id === selectedAsset.id ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`}></div>
                            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight ${selectedAsset.id === asset.id ? 'text-white' : 'text-slate-400'}`}>{asset.name}</span>
                          </div>
                          <span className="text-[8px] sm:text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-1.5 sm:py-1 rounded-lg border border-emerald-400/10">{asset.payout}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile History Toggle */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-[#161a1e]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/50 shadow-2xl hover:bg-[#1c2127] transition-all pointer-events-auto"
            >
              <Clock size={14} className="text-blue-400" />
              <span className="text-[8px] font-black text-white uppercase tracking-widest">History</span>
            </button>
          </div>

          {/* Current Price Box */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-[#161a1e]/90 backdrop-blur-md px-2.5 sm:px-5 py-1.5 sm:py-3 rounded-lg sm:rounded-2xl border border-slate-700/50 shadow-2xl pointer-events-auto">
            <div className="text-right">
              <div className="flex items-center gap-1 sm:gap-2 justify-end mb-0.5 leading-none">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">Live</span>
              </div>
              <div className="text-sm sm:text-2xl font-mono font-black text-white leading-none tracking-tighter">
                {symbol}{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* The Chart */}
        <div className="flex-1 w-full bg-[#0b0e11] relative">
          <CustomChart assetId={selectedAsset.id} />
        </div>
      </div>

      {/* Execution Panel - Bottom on mobile, Right on desktop */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800/40 bg-[#0b0e11] flex flex-col shrink-0 z-10 shadow-2xl order-2 lg:order-3">
        <div className="p-3 sm:p-4 border-b border-slate-800/40 bg-[#161a1e]/30 backdrop-blur-sm hidden sm:block">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Shield size={14} className="text-blue-500" />
            Execution Panel
          </h3>
        </div>

        <div className="p-3 sm:p-5 flex flex-row lg:flex-col gap-3 sm:gap-6 overflow-x-auto lg:overflow-y-auto custom-scrollbar">
          {/* Time Selector */}
          <div className="flex-1 min-w-[120px] lg:min-w-0 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</label>
              <Clock size={12} className="text-slate-600 sm:hidden" />
              <Clock size={14} className="text-slate-600 hidden sm:block" />
            </div>
            <div className="bg-[#161a1e] rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-800/50 shadow-inner group">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <button 
                  onClick={() => setTimeInSeconds(prev => Math.max(5, prev - 5))}
                  className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-90 border border-slate-700/50"
                >
                  <span className="text-lg sm:text-xl font-bold">-</span>
                </button>
                <div className="text-center flex-1">
                  <input
                    type="text"
                    value={formatTime(timeInSeconds)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 6) {
                        const seconds = parseInt(val.slice(-2) || '0');
                        const minutes = parseInt(val.slice(-4, -2) || '0');
                        const hours = parseInt(val.slice(0, -4) || '0');
                        setTimeInSeconds(hours * 3600 + minutes * 60 + seconds);
                      }
                    }}
                    className="w-full bg-transparent text-center text-sm sm:text-2xl font-mono font-black text-white tracking-tighter outline-none focus:text-blue-400 transition-colors"
                  />
                </div>
                <button 
                  onClick={() => setTimeInSeconds(prev => prev + 5)}
                  className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-90 border border-slate-700/50"
                >
                  <Plus size={16} className="sm:hidden" />
                  <Plus size={20} className="hidden sm:block" />
                </button>
              </div>
            </div>
          </div>

          {/* Investment Selector */}
          <div className="flex-1 min-w-[120px] lg:min-w-0 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</label>
              <Wallet size={12} className="text-slate-600 sm:hidden" />
              <Wallet size={14} className="text-slate-600 hidden sm:block" />
            </div>
            <div className="bg-[#161a1e] rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-800/50 shadow-inner group">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <button 
                  onClick={() => setInvestment(prev => Math.max(1, prev - 1))}
                  className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-90 border border-slate-700/50"
                >
                  <Minus size={16} className="sm:hidden" />
                  <Minus size={20} className="hidden sm:block" />
                </button>
                <div className="text-center flex-1 flex items-center justify-center overflow-hidden">
                  <span className="text-sm sm:text-2xl font-mono font-black text-white shrink-0">{symbol}</span>
                  <input
                    type="text"
                    value={investment}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setInvestment(parseInt(val) || 0);
                    }}
                    onBlur={() => {
                      const minAmount = getMinTradeAmount(currency);
                      if (investment < minAmount) {
                        setInvestment(Math.ceil(minAmount));
                      }
                    }}
                    className="w-full bg-transparent text-sm sm:text-2xl font-mono font-black text-white tracking-tighter outline-none focus:text-blue-400 transition-colors ml-1"
                    style={{ width: `${Math.max(2, investment.toString().length)}ch` }}
                  />
                </div>
                <button 
                  onClick={() => setInvestment(prev => prev + 1)}
                  className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-90 border border-slate-700/50"
                >
                  <Plus size={16} className="sm:hidden" />
                  <Plus size={20} className="hidden sm:block" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Large on mobile bottom */}
        <div className="p-3 sm:p-5 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 bg-[#0b0e11]">
          <button 
            disabled={loading}
            onClick={() => handleTrade('up')}
            className="group relative overflow-hidden bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white h-14 sm:h-20 rounded-xl sm:rounded-2xl font-black transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center gap-0.5 sm:gap-1"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out skew-x-[-20deg]"></div>
            <ArrowUpFromLine size={20} className="group-hover:-translate-y-1 transition-transform sm:hidden" />
            <ArrowUpFromLine size={28} className="group-hover:-translate-y-1 transition-transform hidden sm:block" />
            <span className="text-xs sm:text-sm uppercase tracking-[0.2em]">Higher</span>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleTrade('down')}
            className="group relative overflow-hidden bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white h-14 sm:h-20 rounded-xl sm:rounded-2xl font-black transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:shadow-[0_15px_40px_rgba(244,63,94,0.4)] flex flex-col items-center justify-center gap-0.5 sm:gap-1"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out skew-x-[-20deg]"></div>
            <ArrowDownToLine size={20} className="group-hover:translate-y-1 transition-transform sm:hidden" />
            <ArrowDownToLine size={28} className="group-hover:translate-y-1 transition-transform hidden sm:block" />
            <span className="text-xs sm:text-sm uppercase tracking-[0.2em]">Lower</span>
          </button>
        </div>

        {error && (
          <div className="mx-3 sm:mx-5 mb-3 sm:mb-5 p-2 sm:p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg sm:rounded-xl text-[10px] sm:text-xs text-rose-400 font-bold animate-in fade-in slide-in-from-bottom-2">
            {error}
          </div>
        )}
      </div>

      {/* Mobile History Modal */}
      {isHistoryOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="fixed inset-0" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-full max-h-[80vh] bg-[#0b0e11] border-t border-slate-800 rounded-t-[2.5rem] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Clock size={20} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Trade History</h3>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <ChevronDown size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-600">
                  <Activity size={48} className="opacity-10 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">No trades yet</p>
                </div>
              ) : (
                trades.slice().reverse().map((trade) => (
                  <div 
                    key={trade._id} 
                    className="bg-[#161a1e] rounded-2xl p-4 border border-slate-800/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-10 rounded-full ${trade.type === 'up' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <div>
                        <div className="text-xs font-black text-white uppercase tracking-tight mb-0.5">{trade.symbol}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{format(new Date(trade.timestamp), 'HH:mm:ss')}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-white mb-0.5">{symbol}{trade.amount.toLocaleString()}</div>
                      <div className={`text-[10px] font-black uppercase ${
                        trade.status === 'open' ? 'text-blue-400' :
                        trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {trade.status === 'open' ? 'Active' : `${trade.pnl && trade.pnl > 0 ? '+' : ''}${symbol}${Math.abs(trade.pnl || 0).toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
