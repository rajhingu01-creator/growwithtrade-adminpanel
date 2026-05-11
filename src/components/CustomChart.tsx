import React, { useEffect, useRef, memo, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, CrosshairMode, LineSeries, AreaSeries, BarSeries, IPriceLine, PriceScaleMode } from 'lightweight-charts';
import { useChartStore } from '../store/useChartStore';
import { useTradeStore } from '../store/useTradeStore';
import { BarChart3, LineChart, AreaChart, TrendingUp, Clock, Settings2, Activity, Eye, EyeOff } from 'lucide-react';

type ChartMode = 'candle' | 'line' | 'area' | 'bar';
type TimeFrame = '1s' | '5s' | '10s' | '1m' | '2m';

interface CustomChartProps {
  assetId: string;
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

const TIMEFRAMES: { label: string; value: TimeFrame }[] = [
  { label: '1s', value: '1s' },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '1m', value: '1m' },
  { label: '2m', value: '2m' },
];

const MODES: { label: string; value: ChartMode; icon: any }[] = [
  { label: 'Candle', value: 'candle', icon: TrendingUp },
  { label: 'Line', value: 'line', icon: LineChart },
  { label: 'Area', value: 'area', icon: AreaChart },
  { label: 'Bar', value: 'bar', icon: BarChart3 },
];

interface Indicator {
  id: string;
  name: string;
  color: string;
  calculate: (data: any[]) => { time: number; value: number | any }[];
  type: 'line' | 'scatter' | 'bands';
}

const INDICATORS: Indicator[] = [
  {
    id: 'sma',
    name: 'SMA 20',
    color: '#fbbf24',
    type: 'line',
    calculate: (data, length = 20) => {
      if (data.length < length) return [];
      return data.map((d, i) => {
        if (i < length - 1) return null;
        const slice = data.slice(i - length + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val.close, 0);
        return { time: d.time, value: sum / length };
      }).filter(Boolean) as any;
    }
  },
  {
    id: 'ema',
    name: 'EMA 20',
    color: '#8b5cf6',
    type: 'line',
    calculate: (data, length = 20) => {
      if (data.length < length) return [];
      const k = 2 / (length + 1);
      let ema = data[0].close;
      return data.map((d, i) => {
        ema = d.close * k + ema * (1 - k);
        return i >= length - 1 ? { time: d.time, value: ema } : null;
      }).filter(Boolean) as any;
    }
  },
  {
    id: 'wma',
    name: 'WMA 20',
    color: '#ec4899',
    type: 'line',
    calculate: (data, length = 20) => {
      if (data.length < length) return [];
      const weightSum = (length * (length + 1)) / 2;
      return data.map((d, i) => {
        if (i < length - 1) return null;
        let sum = 0;
        for (let j = 0; j < length; j++) {
          sum += data[i - j].close * (length - j);
        }
        return { time: d.time, value: sum / weightSum };
      }).filter(Boolean) as any;
    }
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands',
    color: '#3b82f6',
    type: 'bands',
    calculate: (data, length = 20, stdDev = 2) => {
      if (data.length < length) return [];
      return data.map((d, i) => {
        if (i < length - 1) return null;
        const slice = data.slice(i - length + 1, i + 1);
        const sma = slice.reduce((acc, val) => acc + val.close, 0) / length;
        const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - sma, 2), 0) / length;
        const sd = Math.sqrt(variance);
        return { 
          time: d.time, 
          upper: sma + stdDev * sd,
          lower: sma - stdDev * sd,
          middle: sma
        };
      }).filter(Boolean) as any;
    }
  },
  {
    id: 'donchian',
    name: 'Donchian Channels',
    color: '#10b981',
    type: 'bands',
    calculate: (data, length = 20) => {
      if (data.length < length) return [];
      return data.map((d, i) => {
        if (i < length - 1) return null;
        const slice = data.slice(i - length + 1, i + 1);
        const high = Math.max(...slice.map(s => s.high ?? s.close));
        const low = Math.min(...slice.map(s => s.low ?? s.close));
        return { time: d.time, upper: high, lower: low, middle: (high + low) / 2 };
      }).filter(Boolean) as any;
    }
  },
  {
    id: 'kama',
    name: 'KAMA',
    color: 'rgba(59, 130, 246, 0.6)',
    type: 'line',
    calculate: (data, length = 10, fastSC = 2, slowSC = 30) => {
      if (data.length < length + 1) return [];
      let kama = data[0].close;
      const fastAlpha = 2 / (fastSC + 1);
      const slowAlpha = 2 / (slowSC + 1);
      return data.map((d, i) => {
        if (i < length) { kama = d.close; return { time: d.time, value: kama }; }
        const change = Math.abs(d.close - data[i - length].close);
        let volatility = 0;
        for (let j = i - length + 1; j <= i; j++) volatility += Math.abs(data[j].close - data[j - 1].close);
        const er = volatility !== 0 ? change / volatility : 0;
        const sc = Math.pow(er * (fastAlpha - slowAlpha) + slowAlpha, 2);
        kama = kama + sc * (d.close - kama);
        return { time: d.time, value: kama };
      });
    }
  },
  {
    id: 'psar',
    name: 'Parabolic SAR',
    color: '#f59e0b',
    type: 'scatter',
    calculate: (data, step = 0.02, maxStep = 0.2) => {
      if (data.length < 2) return [];
      let sar = data[0].low;
      let ep = data[0].high;
      let af = step;
      let isUp = true;
      return data.map((d, i) => {
        if (i === 0) return { time: d.time, value: sar };
        const prevSar = sar;
        sar = prevSar + af * (ep - prevSar);
        if (isUp) {
          if (d.low < sar) { isUp = false; sar = ep; ep = d.low; af = step; }
          else { if (d.high > ep) { ep = d.high; af = Math.min(maxStep, af + step); } sar = Math.min(sar, data[i-1].low, i>1?data[i-2].low:data[i-1].low); }
        } else {
          if (d.high > sar) { isUp = true; sar = ep; ep = d.high; af = step; }
          else { if (d.low < ep) { ep = d.low; af = Math.min(maxStep, af + step); } sar = Math.max(sar, data[i-1].high, i>1?data[i-2].high:data[i-1].high); }
        }
        return { time: d.time, value: sar };
      });
    }
  },
  {
    id: 'supertrend',
    name: 'SuperTrend',
    color: '#ef4444',
    type: 'line',
    calculate: (data, length = 10, multiplier = 3) => {
      if (data.length < length) return [];
      let trend = true;
      let upperBand = 0, lowerBand = 0;
      let superTrend: any[] = [];
      
      const atr: number[] = [];
      data.forEach((d, i) => {
        if (i === 0) { atr.push(d.high - d.low); return; }
        const tr = Math.max(d.high - d.low, Math.abs(d.high - data[i-1].close), Math.abs(d.low - data[i-1].close));
        atr.push((atr[i-1] * (length - 1) + tr) / length);
      });

      data.forEach((d, i) => {
        if (i < length) return;
        const mid = (d.high + d.low) / 2;
        const basicUpper = mid + multiplier * atr[i];
        const basicLower = mid - multiplier * atr[i];
        
        upperBand = (basicUpper < upperBand || data[i-1].close > upperBand) ? basicUpper : upperBand;
        lowerBand = (basicLower > lowerBand || data[i-1].close < lowerBand) ? basicLower : lowerBand;
        
        if (trend && d.close < lowerBand) trend = false;
        else if (!trend && d.close > upperBand) trend = true;
        
        superTrend.push({ time: d.time, value: trend ? lowerBand : upperBand, color: trend ? '#10b981' : '#f43f5e' });
      });
      return superTrend;
    }
  },
  {
    id: 'pivot',
    name: 'Pivot Points',
    color: '#64748b',
    type: 'line',
    calculate: (data) => {
      if (data.length < 2) return [];
      // Simplified Daily Pivot for intraday
      const last = data[data.length - 1];
      const p = (last.high + last.low + last.close) / 3;
      return data.map(d => ({ time: d.time, value: p }));
    }
  },
  {
    id: 'zigzag',
    name: 'ZigZag',
    color: '#ffffff',
    type: 'line',
    calculate: (data, deviation = 5) => {
      if (data.length < 10) return [];
      const zigzags: any[] = [];
      let lastVal = data[0].close;
      let trend = 0; // 1 up, -1 down
      
      data.forEach((d, i) => {
        const diff = ((d.close - lastVal) / lastVal) * 100;
        if (Math.abs(diff) > deviation) {
          zigzags.push({ time: d.time, value: d.close });
          lastVal = d.close;
        }
      });
      return zigzags;
    }
  }
];

// Helper to aggregate 1s data into higher timeframes
const aggregateData = (data: any[], timeframe: TimeFrame) => {
  if (timeframe === '1s' || data.length === 0) return data;

  const seconds = timeframe === '5s' ? 5 : timeframe === '10s' ? 10 : timeframe === '1m' ? 60 : 120;
  const aggregated: any[] = [];
  let currentGroup: any = null;

  data.forEach((d: any) => {
    if (!d || typeof d.time !== 'number' || isNaN(d.time) || d.close === undefined) return;
    const groupTime = Math.floor(d.time / seconds) * seconds;
    if (isNaN(groupTime)) return;

    if (!currentGroup || currentGroup.time !== groupTime) {
      if (currentGroup) aggregated.push(currentGroup);
      currentGroup = {
        time: groupTime,
        open: Number(d.open ?? d.close),
        high: Number(d.high ?? d.close),
        low: Number(d.low ?? d.close),
        close: Number(d.close),
      };
    } else {
      currentGroup.high = Math.max(currentGroup.high, Number(d.high ?? d.close));
      currentGroup.low = Math.min(currentGroup.low, Number(d.low ?? d.close));
      currentGroup.close = Number(d.close);
    }
  });

  if (currentGroup) aggregated.push(currentGroup);
  return aggregated;
};

const CustomChart = ({ 
  assetId,
  colors: {
    backgroundColor = '#0b0e11',
    textColor = '#94a3b8',
    upColor = '#10b981',
    downColor = '#f43f5e',
  } = {} 
}: CustomChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const { assetData } = useChartStore();
  const { trades } = useTradeStore();
  
  // Tick to refresh trade line countdown labels (every 1s).
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((v) => (v + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);
  
  const [mode, setMode] = useState<ChartMode>(() => (localStorage.getItem('chart_mode') as ChartMode) || 'candle');
  const [timeframe, setTimeframe] = useState<TimeFrame>(() => (localStorage.getItem('chart_timeframe') as TimeFrame) || '1s');
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('active_indicators') || '[]')));
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('chart_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('chart_timeframe', timeframe);
  }, [timeframe]);

  useEffect(() => {
    localStorage.setItem('active_indicators', JSON.stringify(Array.from(activeIndicators)));
  }, [activeIndicators]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true,
        shiftVisibleRangeOnNewBar: true,
        rightOffset: 12,
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
        mode: PriceScaleMode.Normal,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
        entirePriceVolume: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScroll: true,
      handleScale: true,
    });

    setChartApi(chart);

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      setChartApi(null);
    };
  }, [backgroundColor, textColor]);

  // Update Indicator Series
  useEffect(() => {
    if (!chartApi) return;

    // Remove inactive indicator series
    indicatorSeriesRef.current.forEach((series, id) => {
      if (!activeIndicators.has(id)) {
        try { chartApi.removeSeries(series); } catch (e) {}
        indicatorSeriesRef.current.delete(id);
      }
    });

    // Add new active indicator series
    activeIndicators.forEach(id => {
      if (!indicatorSeriesRef.current.has(id)) {
        const indicator = INDICATORS.find(ind => ind.id === id);
        if (!indicator) return;

        let series;
        if (indicator.type === 'line') {
          series = chartApi.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
        } else if (indicator.type === 'scatter') {
          series = chartApi.addSeries(LineSeries, {
            color: indicator.color,
            lineWidth: 0,
            lineVisible: false,
            pointVisible: true,
            pointSize: 3,
            priceLineVisible: false,
            lastValueVisible: false,
          });
        } else if (indicator.type === 'bands') {
          // For simplicity, Bollinger/Donchian use 3 lines
          series = {
            upper: chartApi.addSeries(LineSeries, { color: indicator.color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
            lower: chartApi.addSeries(LineSeries, { color: indicator.color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
            middle: chartApi.addSeries(LineSeries, { color: indicator.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          };
        }
        if (series) indicatorSeriesRef.current.set(id, series as any);
      }
    });
  }, [chartApi, activeIndicators]);

  // Update Series based on Mode
  useEffect(() => {
    if (!chartApi) return;

    if (seriesRef.current) {
      try {
        chartApi.removeSeries(seriesRef.current);
      } catch (e) {
        console.warn('Failed to remove series:', e);
      }
      seriesRef.current = null;
      priceLinesRef.current.clear();
    }

    const commonOptions = {
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: 'price',
        precision: assetId.includes('btc') || assetId.includes('eth') ? 2 : 5,
        minMove: assetId.includes('btc') || assetId.includes('eth') ? 0.01 : 0.00001,
      },
    };

    try {
      if (mode === 'candle') {
        seriesRef.current = chartApi.addSeries(CandlestickSeries, {
          ...commonOptions,
          upColor, downColor, borderVisible: false, wickUpColor: upColor, wickDownColor: downColor,
        });
      } else if (mode === 'line') {
        seriesRef.current = chartApi.addSeries(LineSeries, {
          ...commonOptions,
          color: '#2563eb', lineWidth: 3,
        });
      } else if (mode === 'area') {
        seriesRef.current = chartApi.addSeries(AreaSeries, {
          ...commonOptions,
          topColor: 'rgba(37, 99, 235, 0.4)', bottomColor: 'rgba(37, 99, 235, 0.0)', lineColor: '#2563eb', lineWidth: 2,
        });
      } else {
        seriesRef.current = chartApi.addSeries(BarSeries, {
          ...commonOptions,
          upColor, downColor,
        });
      }
    } catch (e) {
      console.error('Failed to add series:', e);
    }

    const timer = setTimeout(() => {
      if (chartApi) {
        try { chartApi.timeScale().scrollToRealTime(); } catch (e) {}
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [chartApi, mode, upColor, downColor, assetId]);

  // Track if we need to fit content
  const lastAssetTimeframeRef = useRef<string>('');

  // Update Data and Trades
  useEffect(() => {
    const data = assetData[assetId];
    if (seriesRef.current && data && chartApi) {
      const dataMap = new Map();
      
      if (Array.isArray(data.history)) {
        data.history.forEach((d: any) => {
          if (d && typeof d.time === 'number' && !isNaN(d.time) && d.close !== undefined) {
            dataMap.set(d.time, d);
          }
        });
      }
      
      if (data.latest && typeof data.latest.time === 'number' && !isNaN(data.latest.time) && data.latest.close !== undefined) {
        dataMap.set(data.latest.time, data.latest);
      }
      
      if (dataMap.size === 0) return;

      const allData = Array.from(dataMap.values()).sort((a: any, b: any) => a.time - b.time);
      const displayData = aggregateData(allData, timeframe);
      
      if (displayData.length > 0) {
        try {
          if (mode === 'candle' || mode === 'bar') {
            const sanitizedData = displayData
              .filter((d: any) => d && typeof d.time === 'number' && !isNaN(d.time))
              .map((d: any) => ({
                time: Number(d.time),
                open: Number(d.open ?? d.close),
                high: Number(d.high ?? d.close),
                low: Number(d.low ?? d.close),
                close: Number(d.close)
              }))
              .filter((d: any) => !isNaN(d.time) && !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close));
              
            if (sanitizedData.length > 0) {
              seriesRef.current.setData(sanitizedData);
            }
          } else {
            const sanitizedData = displayData
              .filter((d: any) => d && typeof d.time === 'number' && !isNaN(d.time))
              .map((d: any) => ({ 
                time: Number(d.time), 
                value: Number(d.close) 
              }))
              .filter((d: any) => !isNaN(d.time) && !isNaN(d.value));
              
            if (sanitizedData.length > 0) {
              seriesRef.current.setData(sanitizedData);
            }
          }

          // Update Indicators
          activeIndicators.forEach(id => {
            const indicator = INDICATORS.find(ind => ind.id === id);
            const series = indicatorSeriesRef.current.get(id);
            if (indicator && series) {
              const indicatorData = indicator.calculate(displayData);
              if (indicator.type === 'bands') {
                const s = series as any;
                s.upper.setData(indicatorData.map((d: any) => ({ time: d.time, value: d.upper })));
                s.lower.setData(indicatorData.map((d: any) => ({ time: d.time, value: d.lower })));
                s.middle.setData(indicatorData.map((d: any) => ({ time: d.time, value: d.middle })));
              } else {
                series.setData(indicatorData.map((d: any) => ({ time: d.time, value: d.value })));
              }
            }
          });

          const assetTimeframeKey = `${assetId}-${timeframe}`;
          if (lastAssetTimeframeRef.current !== assetTimeframeKey) {
            try {
              chartApi.timeScale().fitContent();
              seriesRef.current?.applyOptions({}); 
              lastAssetTimeframeRef.current = assetTimeframeKey;
            } catch (e) {}
          }
        } catch (err) {
          console.error('Error setting chart data:', err);
        }
      }

      // Handle Trade Lines
      try {
        const currentAssetTrades = trades
          .filter(t => t.status === 'open' && (t.assetId === assetId || t.symbol.toLowerCase().includes(assetId.toLowerCase())))
          .map((t) => {
            const expiry =
              typeof t.expiryTime === 'number'
                ? t.expiryTime
                : new Date(t.timestamp).getTime() + Number(t.duration || 60) * 1000;
            const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
            return { trade: t, remaining };
          })
          .filter(({ remaining }) => remaining > 0);
        const currentTradeIds = new Set(currentAssetTrades.map(({ trade }) => trade._id));
        priceLinesRef.current.forEach((line, id) => {
          if (!currentTradeIds.has(id)) {
            try { seriesRef.current?.removePriceLine(line); } catch (e) {}
            priceLinesRef.current.delete(id);
          }
        });

        if (seriesRef.current) {
          currentAssetTrades.forEach(({ trade, remaining }) => {
            if (typeof trade.price !== 'number' || isNaN(trade.price)) return;

            const lineOptions = {
              price: trade.price,
              color: trade.type === 'up' ? upColor : downColor,
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `${trade.type === 'up' ? 'BUY' : 'SELL'} $${trade.amount} · ${remaining}s`,
            };

            try {
              if (priceLinesRef.current.has(trade._id)) {
                const oldLine = priceLinesRef.current.get(trade._id);
                if (oldLine) { try { seriesRef.current?.removePriceLine(oldLine); } catch (e) {} }
                priceLinesRef.current.delete(trade._id);
              }
              const newLine = seriesRef.current?.createPriceLine(lineOptions);
              if (newLine) priceLinesRef.current.set(trade._id, newLine);
            } catch (e) {
              console.warn('Failed to update price line for trade:', trade._id, e);
            }
          });
        }
      } catch (err) {
        console.error('Error handling trade lines:', err);
      }
    }
  }, [assetData, assetId, mode, timeframe, trades, upColor, downColor, chartApi, activeIndicators, nowTick]);

  return (
    <div className="w-full h-full relative">
      {/* Indicators Menu */}
      <div className="absolute top-20 sm:top-24 left-4 z-[60]">
        <button
          onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
          className={`flex items-center gap-2 bg-[#161a1e]/90 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/10 shadow-2xl transition-all ${isIndicatorsOpen ? 'text-blue-400 border-blue-500/30' : 'text-slate-400'}`}
        >
          <Settings2 size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Indicators</span>
        </button>

        {isIndicatorsOpen && (
          <>
            <div className="fixed inset-0 z-[-1]" onClick={() => setIsIndicatorsOpen(false)}></div>
            <div className="absolute top-full left-0 mt-2 w-56 bg-[#161a1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="px-4 py-2 border-b border-white/5 mb-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Tools</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-2 space-y-1">
                {INDICATORS.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndicator(ind.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${activeIndicators.has(ind.id) ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={12} style={{ color: ind.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{ind.name}</span>
                    </div>
                    {activeIndicators.has(ind.id) ? <Eye size={12} /> : <EyeOff size={12} className="opacity-30" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chart Toolbar */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 bg-[#161a1e]/90 backdrop-blur-xl p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl scale-90 sm:scale-100">
        <div className="flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 border-r border-white/10 mr-0.5 sm:mr-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black transition-all ${
                timeframe === tf.value 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                  mode === m.value 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
                title={m.label}
              >
                <Icon size={14} className="sm:hidden" />
                <Icon size={16} className="hidden sm:block" />
              </button>
            );
          })}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default memo(CustomChart);

