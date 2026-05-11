import { create } from 'zustand';

const SESSION_EXPIRY_KEY = 'sessionExpiry';
const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours

const getStoredSession = () => {
  const token = localStorage.getItem('token');
  const rawExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  const expiry = rawExpiry ? Number(rawExpiry) : NaN;

  if (!token) {
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    return {
      token: null,
      isAuthenticated: false,
    };
  }

  // Backward compatibility: if expiry is missing/invalid, keep user logged in and create a fresh window.
  if (!Number.isFinite(expiry) || expiry <= 0) {
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_TIMEOUT_MS));
    return {
      token,
      isAuthenticated: true,
    };
  }

  const isValid = expiry > Date.now();

  if (!isValid) {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }

  return {
    token: isValid ? token : null,
    isAuthenticated: isValid,
  };
};

interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  currency: string;
  realBalance: number;
  demoBalance: number;
  isVerified: boolean;
  isAdmin: boolean;
  kyc?: {
    status?: 'pending' | 'approved' | 'rejected';
    idType?: string;
    idNumber?: string;
    submittedAt?: string;
    reviewedAt?: string;
    reason?: string;
  };
  withdrawalMethods?: {
    bank?: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      ifscCode: string;
    };
    crypto?: {
      walletAddress: string;
      network: string;
    };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  currency: string;
  accountType: 'real' | 'demo';
  setAccountType: (type: 'real' | 'demo') => void;
  setCurrency: (currency: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateBalances: (real: number, demo: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  ...getStoredSession(),
  user: null,
  currency: localStorage.getItem('currency') || 'USD',
  accountType: (localStorage.getItem('accountType') as 'real' | 'demo') || 'demo',
  setAccountType: (type) => {
    localStorage.setItem('accountType', type);
    set({ accountType: type });
  },
  setCurrency: (currency) => {
    localStorage.setItem('currency', currency);
    set((state) => ({ 
      currency,
      user: state.user ? { ...state.user, currency } : null
    }));
  },
  login: (user, token) => {
    const expiry = Date.now() + SESSION_TIMEOUT_MS;
    localStorage.setItem('token', token);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiry));
    const userCurrency = user.currency || 'USD';
    localStorage.setItem('currency', userCurrency);
    set({ user, token, isAuthenticated: true, currency: userCurrency });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },
  updateBalances: (real, demo) => set((state) => ({
    user: state.user ? { ...state.user, realBalance: real, demoBalance: demo } : null
  }))
}));
