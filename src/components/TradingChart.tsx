import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

interface TradingChartProps {
  data?: any[];
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

export const TradingChart = ({ 
  colors: {
    backgroundColor = 'transparent',
    textColor = '#94a3b8',
    upColor = '#10b981',
    downColor = '#f43f5e',
  } = {} 
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 450
        });
      }
    };

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
      height: chartContainerRef.current.clientHeight || 450,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: 'rgba(37, 99, 235, 0.5)',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: 'rgba(37, 99, 235, 0.5)',
          style: 2,
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    // Add a second series for volume-like bars
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(37, 99, 235, 0.1)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // set as an overlay
    });

    // Initial data
    const initialData = [];
    const volumeData = [];
    let time = Math.floor(Date.now() / 1000) - 100 * 60;
    let value = 64231.50;
    
    for (let i = 0; i < 100; i++) {
      const open = value + (Math.random() - 0.5) * 20;
      const close = open + (Math.random() - 0.5) * 30;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      
      initialData.push({ time: time as any, open, high, low, close });
      volumeData.push({ 
        time: time as any, 
        value: Math.random() * 100,
        color: close > open ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'
      });
      time += 60;
      value = close;
    }
    
    series.setData(initialData);
    volumeSeries.setData(volumeData);
    chartRef.current = chart;
    seriesRef.current = series;

    // Real-time updates
    const interval = setInterval(() => {
      if (seriesRef.current) {
        const nextTime = (Math.floor(Date.now() / 1000)) as any;
        const open = value;
        const close = open + (Math.random() - 0.5) * 20;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        
        value = close;
        seriesRef.current.update({ time: nextTime, open, high, low, close });
        volumeSeries.update({ 
          time: nextTime, 
          value: Math.random() * 100,
          color: close > open ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'
        });
      }
    }, 2000);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      chart.remove();
    };
  }, []);

  return (
    <div className="w-full h-full relative group">
      <div ref={chartContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-xl tracking-tighter">BTC/USD</span>
          <span className="text-emerald-400 font-mono text-sm font-bold">+2.45%</span>
        </div>
        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Real-time Market Data</div>
      </div>
      <div className="absolute top-4 right-4 flex gap-2">
        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-slate-400">1M</div>
        <div className="px-2 py-1 bg-blue-600 border border-blue-500 rounded text-[10px] font-bold text-white">5M</div>
        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-slate-400">15M</div>
        <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-slate-400">1H</div>
      </div>
    </div>
  );
};
