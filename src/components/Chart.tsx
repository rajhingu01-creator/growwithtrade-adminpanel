import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, ISeriesApi, IPriceLine, LineSeries, BarSeries, AreaSeries, IChartApi, MouseEventParams } from 'lightweight-charts';
import { Pencil, Trash2, TrendingUp, Minus, MousePointer2, ChevronLast } from 'lucide-react';

interface Drawing {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical';
  points: { time: number; price: number }[];
  color: string;
}

interface ChartProps {
  initialData: { time: number; open: number; high: number; low: number; close: number }[];
  latestPoint: { time: number; open: number; high: number; low: number; close: number } | null;
  openTrades?: { id: string; price: number; type: 'up' | 'down' }[];
  height?: number;
  chartType?: 'candlestick' | 'line' | 'bar' | 'area';
  timeFrame?: string;
  assetId?: string;
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

export const Chart: React.FC<ChartProps> = ({
  initialData,
  latestPoint,
  openTrades = [],
  height = 400,
  chartType = 'candlestick',
  timeFrame = '10s',
  assetId = 'cosmos',
  colors: {
    backgroundColor = 'transparent',
    textColor = '#D9D9D9',
    upColor = '#10b981',
    downColor = '#f43f5e',
  } = {},
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const seriesTypeRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const drawingSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const previewSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  const [drawingMode, setDrawingMode] = useState<'none' | 'trendline' | 'horizontal' | 'vertical'>('none');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeDrawing, setActiveDrawing] = useState<Drawing | null>(null);

  // Use refs for values needed in event listeners to avoid re-subscribing
  const drawingModeRef = useRef(drawingMode);
  const activeDrawingRef = useRef(activeDrawing);
  
  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  useEffect(() => {
    activeDrawingRef.current = activeDrawing;
  }, [activeDrawing]);

  const sortedInitialData = React.useMemo(() => {
    if (!initialData || initialData.length === 0) return [];
    // Sort and filter out duplicates
    const sorted = [...initialData].sort((a, b) => a.time - b.time);
    const unique = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i].time > sorted[i - 1].time) {
        unique.push(sorted[i]);
      }
    }
    return unique;
  }, [initialData]);

  // Clear drawings on asset switch or timeframe switch
  useEffect(() => {
    setDrawings([]);
    setActiveDrawing(null);
    setDrawingMode('none');
    lastUpdateTimeRef.current = 0; // Reset on asset switch or timeframe switch
  }, [assetId, timeFrame]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || height 
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#64748b',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: '#161a1e', style: 1 },
        horzLines: { color: '#161a1e', style: 1 },
      },
      timeScale: {
        borderColor: '#161a1e',
        timeVisible: true,
        secondsVisible: true,
        barSpacing: 12, // Increased spacing for better visibility
        rightOffset: 12,
      },
      rightPriceScale: {
        borderColor: '#161a1e',
        scaleMargins: {
          top: 0.05, // More space
          bottom: 0.05, // More space
        },
        autoScale: true,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          width: 1,
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const createSeries = () => {
      if (chartType === 'candlestick') {
        return chart.addSeries(CandlestickSeries, {
          upColor,
          downColor,
          borderVisible: false,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
      } else if (chartType === 'line') {
        return chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
        });
      } else if (chartType === 'bar') {
        return chart.addSeries(BarSeries, {
          upColor,
          downColor,
        });
      } else {
        return chart.addSeries(AreaSeries, {
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineColor: '#3b82f6',
          lineWidth: 2,
        });
      }
    };

    const newSeries = createSeries();
    seriesRef.current = newSeries;
    seriesTypeRef.current = chartType;
    
    if (sortedInitialData.length > 0) {
      try {
        const isCandleOrBar = chartType === 'candlestick' || chartType === 'bar';
        const data = isCandleOrBar
          ? sortedInitialData.filter(d => 
              d.time !== undefined && d.open !== undefined && 
              d.high !== undefined && d.low !== undefined && d.close !== undefined
            )
          : sortedInitialData
              .filter(d => d.time !== undefined && d.close !== undefined && !isNaN(d.close))
              .map(d => ({ time: d.time, value: d.close }));
        
        newSeries.setData(data as any);
        lastUpdateTimeRef.current = sortedInitialData[sortedInitialData.length - 1].time;
        chart.timeScale().fitContent();
      } catch (e) {
        console.warn('Initial data set failed in main effect:', e);
      }
    }

    // Live Preview Handler
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const mode = drawingModeRef.current;
      const active = activeDrawingRef.current;
      
      if (mode === 'none' || !param.point || !param.time || !active) return;

      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      const time = param.time as number;

      if (!previewSeriesRef.current) {
        previewSeriesRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(33, 150, 243, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
      }

      const p0 = active.points[0];
      if (p0 && p0.price !== undefined && !isNaN(p0.price) && price !== undefined && !isNaN(price)) {
        previewSeriesRef.current.setData([
          { time: p0.time as any, value: p0.price },
          { time: time as any, value: price },
        ]);
      }
    });

    // Drawing Click Handler
    chart.subscribeClick((param: MouseEventParams) => {
      const mode = drawingModeRef.current;
      const active = activeDrawingRef.current;

      if (mode === 'none' || !param.point || !param.time) return;

      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      const time = param.time as number;

      if (mode === 'horizontal') {
        const newDrawing: Drawing = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'horizontal',
          points: [{ time, price }],
          color: '#2196f3',
        };
        setDrawings(prev => [...prev, newDrawing]);
        setDrawingMode('none');
      } else if (mode === 'vertical') {
        const newDrawing: Drawing = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'vertical',
          points: [{ time, price }],
          color: '#2196f3',
        };
        setDrawings(prev => [...prev, newDrawing]);
        setDrawingMode('none');
      } else if (mode === 'trendline') {
        if (!active) {
          setActiveDrawing({
            id: 'active',
            type: 'trendline',
            points: [{ time, price }],
            color: '#2196f3',
          });
        } else {
          const newDrawing: Drawing = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'trendline',
            points: [...active.points, { time, price }],
            color: '#2196f3',
          };
          setDrawings(prev => [...prev, newDrawing]);
          setActiveDrawing(null);
          setDrawingMode('none');
          if (previewSeriesRef.current) {
            chart.removeSeries(previewSeriesRef.current);
            previewSeriesRef.current = null;
          }
        }
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      previewSeriesRef.current = null;
    };
  }, [backgroundColor, textColor, upColor, downColor, chartType, height]); // Added chartType and height to dependencies

  // Update drawings on chart
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    drawingSeriesRef.current.forEach(s => chartRef.current?.removeSeries(s));
    drawingSeriesRef.current.clear();
    
    drawings.forEach(drawing => {
      const lineSeries = chartRef.current!.addSeries(LineSeries, {
        color: drawing.color,
        lineWidth: 2,
        lineStyle: 0,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });

      if (drawing.type === 'horizontal' && sortedInitialData.length > 0) {
        const firstTime = sortedInitialData[0].time;
        const lastTime = sortedInitialData[sortedInitialData.length - 1].time;
        const price = drawing.points[0]?.price;
        
        if (price !== undefined && !isNaN(price)) {
          // Ensure strictly ascending order
          if (firstTime === lastTime) {
            lineSeries.setData([
              { time: firstTime as any, value: price },
              { time: (firstTime + 1) as any, value: price },
            ]);
          } else {
            lineSeries.setData([
              { time: firstTime as any, value: price },
              { time: lastTime as any, value: price },
            ]);
          }
        }
      } else if (drawing.type === 'vertical' && sortedInitialData.length > 0) {
        // LineSeries cannot have duplicate timestamps. 
        // For vertical lines, we use a tiny offset to satisfy the library.
        lineSeries.setData([
          { time: drawing.points[0].time as any, value: 0 },
          { time: (drawing.points[0].time + 0.001) as any, value: 1000000 },
        ]);
      } else if (drawing.type === 'trendline' && drawing.points.length === 2) {
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];
        
        if (p1 && p2 && p1.price !== undefined && p2.price !== undefined && !isNaN(p1.price) && !isNaN(p2.price)) {
          if (p1.time === p2.time) {
            lineSeries.setData([
              { time: p1.time as any, value: p1.price },
              { time: (p1.time + 1) as any, value: p2.price },
            ]);
          } else {
            const sorted = [p1, p2].sort((a, b) => a.time - b.time);
            lineSeries.setData([
              { time: sorted[0].time as any, value: sorted[0].price },
              { time: sorted[1].time as any, value: sorted[1].price },
            ]);
          }
        }
      }
      drawingSeriesRef.current.set(drawing.id, lineSeries);
    });
  }, [drawings, sortedInitialData]);

  // Only update the entire series data when the asset or timeframe changes
  useEffect(() => {
    if (seriesRef.current && sortedInitialData.length > 0) {
      try {
        const isCandleOrBar = chartType === 'candlestick' || chartType === 'bar';
        const data = isCandleOrBar
          ? sortedInitialData.filter(d => 
              d.time !== undefined && d.open !== undefined && 
              d.high !== undefined && d.low !== undefined && d.close !== undefined
            )
          : sortedInitialData
              .filter(d => d.time !== undefined && d.close !== undefined && !isNaN(d.close))
              .map(d => ({ time: d.time, value: d.close }));
        
        seriesRef.current.setData(data as any);
        lastUpdateTimeRef.current = sortedInitialData[sortedInitialData.length - 1].time;
        
        // Always fit content when asset changes to ensure history is visible immediately
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
          
          // Force a small right offset so the latest candle isn't stuck to the edge
          chartRef.current.timeScale().scrollToRealTime();
        }
      } catch (e) {
        console.warn('Initial data set failed:', e);
      }
    }
  }, [assetId, timeFrame, chartType, sortedInitialData.length]); // Added sortedInitialData.length to ensure it runs when data arrives

  useEffect(() => {
    if (seriesRef.current && latestPoint) {
      // Basic validation to avoid "Value is undefined"
      if (latestPoint.time === undefined || latestPoint.open === undefined || 
          latestPoint.high === undefined || latestPoint.low === undefined || 
          latestPoint.close === undefined || isNaN(latestPoint.close)) {
        return;
      }

      try {
        // Strict chronological order check
        if (latestPoint.time >= lastUpdateTimeRef.current) {
          const isCandleOrBar = chartType === 'candlestick' || chartType === 'bar';
          
          // Final check to ensure we don't pass undefined to series
          if (isCandleOrBar) {
            if (latestPoint.open === undefined || latestPoint.high === undefined || 
                latestPoint.low === undefined || latestPoint.close === undefined ||
                isNaN(latestPoint.open) || isNaN(latestPoint.high) ||
                isNaN(latestPoint.low) || isNaN(latestPoint.close)) {
              return;
            }
          } else {
            if (latestPoint.close === undefined || isNaN(latestPoint.close)) {
              return;
            }
          }

          const data = isCandleOrBar 
            ? latestPoint 
            : { time: latestPoint.time, value: latestPoint.close };
          
          seriesRef.current.update(data as any);
          lastUpdateTimeRef.current = latestPoint.time;

          // Optionally scroll to real-time only if the user is near the right edge
          // But for now, let's just let them scroll freely.
        } else {
          console.warn('Ignoring out-of-order update:', latestPoint.time, 'Last update:', lastUpdateTimeRef.current);
        }
      } catch (e) {
        // Silently ignore out-of-order updates to prevent app crash
        console.warn('Chart update failed:', e);
      }
    }
  }, [latestPoint, chartType]);

  useEffect(() => {
    if (!seriesRef.current) return;
    
    const currentIds = new Set(openTrades.map(t => t.id));
    for (const [id, line] of priceLinesRef.current.entries()) {
      if (!currentIds.has(id)) {
        seriesRef.current.removePriceLine(line);
        priceLinesRef.current.delete(id);
      }
    }
    
    openTrades.forEach(trade => {
      if (!priceLinesRef.current.has(trade.id)) {
        // Basic validation to avoid "Value is undefined"
        if (typeof trade.price !== 'number' || isNaN(trade.price)) {
          return;
        }

        try {
          const line = seriesRef.current!.createPriceLine({
            price: trade.price,
            color: trade.type === 'up' ? '#10b981' : '#f43f5e',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: trade.type.toUpperCase(),
          });
          priceLinesRef.current.set(trade.id, line);
        } catch (e) {
          console.warn('Failed to create price line for trade:', trade.id, e);
        }
      }
    });
  }, [openTrades]);

  const clearDrawings = () => {
    setDrawings([]);
    setActiveDrawing(null);
    setDrawingMode('none');
  };

  return (
    <div className="relative group">
      {/* Toolbar */}
      <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 bg-[#1e2329]/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => setDrawingMode('none')}
          className={`p-2 rounded-md transition-colors ${drawingMode === 'none' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          title="Cursor"
        >
          <MousePointer2 size={18} />
        </button>
        <button 
          onClick={() => { setDrawingMode('trendline'); setActiveDrawing(null); }}
          className={`p-2 rounded-md transition-colors ${drawingMode === 'trendline' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          title="Trendline"
        >
          <TrendingUp size={18} />
        </button>
        <button 
          onClick={() => { setDrawingMode('horizontal'); setActiveDrawing(null); }}
          className={`p-2 rounded-md transition-colors ${drawingMode === 'horizontal' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          title="Horizontal Line"
        >
          <Minus size={18} />
        </button>
        <button 
          onClick={() => { setDrawingMode('vertical'); setActiveDrawing(null); }}
          className={`p-2 rounded-md transition-colors ${drawingMode === 'vertical' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          title="Vertical Line"
        >
          <div className="rotate-90"><Minus size={18} /></div>
        </button>
        <div className="h-px bg-slate-700 mx-1 my-1" />
        <button 
          onClick={clearDrawings}
          className="p-2 rounded-md text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
          title="Clear All"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {drawingMode !== 'none' && (
        <div className="absolute top-4 right-4 z-30 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-lg">
          {drawingMode === 'trendline' ? (activeDrawing ? 'Click to set end point' : 'Click to set start point') : 'Click to set line'}
        </div>
      )}

      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
};
