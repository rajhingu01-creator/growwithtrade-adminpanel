import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
}

function TradingViewWidget({ symbol = "OANDA:AUDUSD", theme = "dark" }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // Clear previous widget
    const widgetContainer = container.current.querySelector('.tradingview-widget-container__widget');
    if (widgetContainer) {
      widgetContainer.innerHTML = '';
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "allow_symbol_change": false,
      "calendar": false,
      "details": false,
      "hide_side_toolbar": true,
      "hide_top_toolbar": true,
      "hide_legend": true,
      "hide_volume": true,
      "hotlist": false,
      "interval": "1",
      "locale": "en",
      "save_image": false,
      "style": "1",
      "symbol": symbol,
      "theme": theme,
      "timezone": "Etc/UTC",
      "backgroundColor": theme === 'dark' ? "#0b0e11" : "#ffffff",
      "gridColor": "rgba(46, 46, 46, 0.06)",
      "watchlist": [],
      "withdateranges": false,
      "compareSymbols": [],
      "studies": [],
      "autosize": true
    });
    
    if (widgetContainer) {
      widgetContainer.appendChild(script);
    }
    
    return () => {
      if (widgetContainer) {
        widgetContainer.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
    </div>
  );
}

export default memo(TradingViewWidget);
