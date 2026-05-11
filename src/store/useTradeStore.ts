import { create } from 'zustand';

export interface Trade {
  _id: string;
  symbol: string;
  assetId: string;
  type: 'up' | 'down';
  amount: number;
  price: number;
  timestamp: string;
  status: 'open' | 'closed';
  accountType: 'real' | 'demo';
  closePrice?: number;
  closeTimestamp?: string;
  pnl?: number;
  duration?: number;
  expiryTime?: number;
}

interface TradeState {
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  updateTrade: (trade: Trade) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
  updateTrade: (updatedTrade) => set((state) => ({
    trades: state.trades.map(t => t._id === updatedTrade._id ? updatedTrade : t)
  })),
}));
