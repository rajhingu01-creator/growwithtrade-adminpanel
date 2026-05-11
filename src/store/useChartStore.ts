import { create } from 'zustand';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartState {
  assetData: Record<string, {
    history: Candle[];
    latest: Candle | null;
    sentiment: { up: number; down: number };
  }>;
  activeAssetId: string | null;
  eventSource: EventSource | null;
  setHistory: (assetId: string, history: Candle[]) => void;
  updateLatest: (assetId: string, latest: Candle, sentiment?: { up: number; down: number }) => void;
  connect: (assetId: string) => void;
  disconnect: () => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  assetData: {},
  activeAssetId: null,
  eventSource: null,
  setHistory: (assetId, history) => set((state) => ({
    assetData: {
      ...state.assetData,
      [assetId]: {
        ...state.assetData[assetId],
        history,
        sentiment: state.assetData[assetId]?.sentiment || { up: 50, down: 50 }
      }
    }
  })),
  updateLatest: (assetId, latest, sentiment) => set((state) => {
    const asset = state.assetData[assetId];
    if (!asset) return state;

    const newAssetData = { ...state.assetData };
    const currentHistory = [...(asset.history || [])];
    
    if (asset.latest && latest.time > asset.latest.time) {
      const lastHistoryEntry = currentHistory[currentHistory.length - 1];
      if (!lastHistoryEntry || lastHistoryEntry.time < asset.latest.time) {
        currentHistory.push(asset.latest);
        if (currentHistory.length > 1000) currentHistory.shift();
      }
    }

    newAssetData[assetId] = {
      ...asset,
      history: currentHistory,
      latest,
      sentiment: sentiment || asset.sentiment || { up: 50, down: 50 }
    };

    return { assetData: newAssetData };
  }),
  connect: (assetId) => {
    const { eventSource, activeAssetId, disconnect } = get();
    
    if (eventSource && activeAssetId === assetId) return;
    
    disconnect();
    
    const connectToSSE = () => {
      const newEventSource = new EventSource(`/api/chart/stream?assetId=${assetId}`);
      
      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            get().setHistory(assetId, data.history);
            get().updateLatest(assetId, data.current, data.sentiment);
          } else if (data.type === 'update') {
            get().updateLatest(assetId, data.current, data.sentiment);
          }
        } catch (e) {}
      };
      
      newEventSource.onerror = (err) => {
        console.warn('SSE Error, reconnecting...', err);
        newEventSource.close();
        setTimeout(() => {
          if (get().activeAssetId === assetId) connectToSSE();
        }, 2000);
      };

      set({ eventSource: newEventSource });
    };

    set({ activeAssetId: assetId });
    connectToSSE();
  },
  disconnect: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null, activeAssetId: null });
    }
  }
}));
