import React, { useMemo, useState } from 'react';
import TradingViewWidget from '../components/TradingViewWidget';

const TV_SYMBOLS: Record<string, string> = {
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
  cosmos: 'BINANCE:ATOMUSDT',
};

const OPTIONS = [
  { id: 'eurusd', name: 'EUR/USD' },
  { id: 'gbpusd', name: 'GBP/USD' },
  { id: 'usdjpy', name: 'USD/JPY' },
  { id: 'audusd', name: 'AUD/USD' },
  { id: 'usdcad', name: 'USD/CAD' },
  { id: 'usdchf', name: 'USD/CHF' },
  { id: 'nzdusd', name: 'NZD/USD' },
  { id: 'eurgbp', name: 'EUR/GBP' },
  { id: 'eurjpy', name: 'EUR/JPY' },
  { id: 'gbpjpy', name: 'GBP/JPY' },
  { id: 'btcusd', name: 'BTC/USDT' },
  { id: 'ethusd', name: 'ETH/USDT' },
  { id: 'inrusd', name: 'USD/INR' },
  { id: 'brlusd', name: 'USD/BRL' },
  { id: 'cosmos', name: 'ATOM/USDT' },
];

export function MultiChart() {
  const prefersDark = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)').matches, []);
  const [symbols, setSymbols] = useState<string[]>([
    'eurusd',
    'gbpusd',
    'btcusd',
    'ethusd',
  ]);

  const setSymbol = (index: number, id: string) => {
    setSymbols((prev) => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6">
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-2xl font-black tracking-tight">4-Chart View</h2>
        <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Live Advanced Charts</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => {
          const id = symbols[i];
          const tv = TV_SYMBOLS[id] || 'FX:EURUSD';
          return (
            <div key={i} className="relative bg-[#0b0e11] border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden h-[40vh] md:h-[42vh]">
              <div className="absolute top-2 left-2 z-10">
                <select
                  className="bg-white/5 text-slate-200 text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-lg border border-white/10"
                  value={id}
                  onChange={(e) => setSymbol(i, e.target.value)}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full h-full">
                <TradingViewWidget symbol={tv} theme={prefersDark ? 'dark' : 'light'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

