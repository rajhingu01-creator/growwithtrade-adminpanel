import { User, Transaction, KYC, LoginHistory } from '@/src/types';
import { toast } from 'sonner';

const API_BASE = '/api/admin';

const getHeaders = () => {
  const token =
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token');

  if (!token) {
    console.warn('[adminService] No authentication token found in localStorage');
  } else {
    console.log('[adminService] Token being sent:', token.substring(0, 30) + '...'); // Log first 30 chars
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    const errorMsg = `API Error: ${res.status} ${text}`;
    console.error(errorMsg);
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }
  return res.json();
};

export const adminService = {
  // Dashboard Stats
  getDashboardStats: async (timeframe: string = 'weekly') => {
    try {
      const res = await fetch(`${API_BASE}/stats?timeframe=${timeframe}`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalTrades: 0,
        revenue: 0,
      };
    }
  },

  downloadWeeklyReport: async (start: string, end: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      window.open(`${API_BASE}/reports/weekly?start=${start}&end=${end}&token=${token}`, '_blank');
    } catch (e) {
      console.error(e);
    }
  },

  getChartStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/chart-stats`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // ================= USERS =================
  listenToUsers: (callback: (users: User[]) => void) => {
    const fetchUsers = async () => {
      try {
        const url = `${API_BASE}/users`;
        console.log(`[adminService] Fetching users from: ${url}`);
        const res = await fetch(url, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);
        console.log(`[adminService] Received ${data.length} users`);

        const mappedUsers: User[] = data.map((u: any) => ({
          uid: u._id,
          email: u.email || u.username || 'N/A',
          username: u.username,
          phoneNumber: u.phone || 'N/A',
          password: u.password,
          status: u.status || 'active',
          isActive: u.status === 'active',
          registrationDate: u.createdAt || new Date().toISOString(),
          lastLogin: u.lastActive || u.createdAt || new Date().toISOString(),
          realBalance: u.realBalance || 0,
          demoBalance: u.demoBalance || 0,
          isVerified: u.isVerified || false,
          isAdmin: u.isAdmin || false,
        }));

        callback(mappedUsers);
      } catch (e) {
        console.error('[adminService] Users fetch error:', e);
        callback([]); // Ensure component stops loading even on error
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  },

  listenToRecentUsers: (callback: (users: User[]) => void) => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/users`, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);

        const mappedUsers: User[] = data.slice(0, 5).map((u: any) => ({
          uid: u._id,
          email: u.email || u.username || 'N/A',
          username: u.username,
          phoneNumber: u.phone || 'N/A',
          password: u.password,
          status: u.status || 'active',
          isActive: u.status === 'active',
          registrationDate: u.createdAt || new Date().toISOString(),
          lastLogin: u.lastActive || u.createdAt || new Date().toISOString(),
          realBalance: u.realBalance || 0,
          demoBalance: u.demoBalance || 0,
          isVerified: u.isVerified || false,
          isAdmin: u.isAdmin || false,
        }));

        callback(mappedUsers);
      } catch (e) {
        console.error('[adminService] Recent users fetch error:', e);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  },

  getUser: async (userId: string): Promise<User> => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        headers: getHeaders(),
      });
      const u = await handleResponse(res);
      return {
        uid: u._id,
        email: u.email || u.username || 'N/A',
        username: u.username,
        phoneNumber: u.phone || 'N/A',
        password: u.password,
        status: u.status || 'active',
        isActive: u.status === 'active',
        registrationDate: u.createdAt || new Date().toISOString(),
        lastLogin: u.lastActive || u.createdAt || new Date().toISOString(),
        realBalance: u.realBalance || 0,
        demoBalance: u.demoBalance || 0,
        isVerified: u.isVerified || false,
        isAdmin: u.isAdmin || false,
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // ================= TRANSACTIONS =================
  listenToTransactions: (callback: (transactions: Transaction[]) => void) => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_BASE}/transactions`, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);

        const mappedTransactions: Transaction[] = data.map((t: any) => {
          const currencySymbols: Record<string, string> = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'BRL': 'R$',
            'AUD': 'A$',
            'CAD': 'C$',
            'JPY': '¥'
          };
          
          return {
            id: t._id,
            userId: t.userId,
            username: t.username || 'Unknown',
            email: t.userEmail || 'N/A',
            mode: t.type === 'deposit' ? 'deposit' : 'withdraw',
            currency: currencySymbols[t.userCurrency] || t.userCurrency || '$',
            amount: t.amount,
            status:
              t.status === 'completed'
                ? 'completed'
                : t.status === 'rejected'
                ? 'rejected'
                : 'pending',
            date: t.timestamp,
            paymentMethod: t.method,
            details: t.details,
            transactionCode: t.transactionCode,
          };
        });

        callback(mappedTransactions);
      } catch (e) {
        console.error('[adminService] Transactions fetch error:', e);
        callback([]);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  },

  listenToRecentTransactions: (callback: (transactions: Transaction[]) => void) => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_BASE}/transactions`, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);

        const mappedTransactions: Transaction[] = data.slice(0, 10).map((t: any) => ({
          id: t._id,
          userId: t.userId,
          mode: t.type === 'deposit' ? 'deposit' : 'withdraw',
          currency: '₹',
          amount: t.amount,
          status:
            t.status === 'completed'
              ? 'completed'
              : t.status === 'rejected'
              ? 'rejected'
              : 'pending',
          date: t.timestamp,
          paymentMethod: t.method,
          details: t.details,
          transactionCode: t.transactionCode,
        }));

        callback(mappedTransactions);
      } catch (e) {
        console.error('[adminService] Recent transactions fetch error:', e);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  },

  listenToUserTransactions: (userId: string, callback: (transactions: Transaction[]) => void) => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_BASE}/transactions?userId=${userId}`, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);

        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t._id,
          userId: t.userId,
          mode: t.type === 'deposit' ? 'deposit' : 'withdraw',
          currency: '₹',
          amount: t.amount,
          status:
            t.status === 'completed'
              ? 'completed'
              : t.status === 'rejected'
              ? 'rejected'
              : 'pending',
          date: t.timestamp,
          paymentMethod: t.method,
          details: t.details,
          transactionCode: t.transactionCode,
        }));

        callback(mappedTransactions);
      } catch (e) {
        console.error('[adminService] User transactions fetch error:', e);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  },

  // ================= TRADES =================
  listenToTrades: (accountType: string | null, callback: (trades: any[]) => void) => {
    const fetchTrades = async () => {
      try {
        let url = `${API_BASE}/trades`;
        if (accountType) url += `?accountType=${accountType}`;
        
        const res = await fetch(url, {
          headers: getHeaders(),
        });

        const data = await handleResponse(res);
        callback(data);
      } catch (e) {
        console.error('[adminService] Trades fetch error:', e);
        callback([]);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000); // More frequent for trades
    return () => clearInterval(interval);
  },

  // ================= APPROVE / REJECT =================
  updateTransactionStatus: async (txId: string, status: 'completed' | 'rejected') => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${txId}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });

      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  approveTransaction: async (txId: string) => {
    return adminService.updateTransactionStatus(txId, 'completed');
  },

  rejectTransaction: async (txId: string, reason: string) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${txId}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'rejected', reason }),
      });

      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteTransaction: async (txId: string) => {
    try {
      const res = await fetch(`${API_BASE}/transactions/${txId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteTrade: async (tradeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/trades/${tradeId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  bulkDelete: async (type: 'trades' | 'transactions' | 'users' | 'kyc', ids: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/bulk-delete/${type}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteKYC: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/kyc`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'suspended' | 'deactivated') => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status: status === 'deactivated' ? 'suspended' : status }),
      });

      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  deleteUser: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
  
  resetUserPassword: async (userId: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ newPassword }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
  
  getUserPlainPassword: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/password-plain`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      return { password: '' };
    }
  },

  // ================= KYC =================
  listenToKYC: (callback: (kyc: KYC[]) => void) => {
    const fetchKYC = async () => {
      try {
        const res = await fetch(`${API_BASE}/kyc`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        callback(data);
      } catch (e) {
        callback([]);
      }
    };
    fetchKYC();
    const interval = setInterval(fetchKYC, 10000);
    return () => clearInterval(interval);
  },

  getKYC: async (userId: string): Promise<KYC | null> => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/kyc`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      return null;
    }
  },

  updateKYCStatus: async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/kyc/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  changeUserPassword: async (userId: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ newPassword: password }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  generateResetLink: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reset-link`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // ================= BANK =================
  getBank: async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/bank`, {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      return null;
    }
  },

  // ================= LOGIN HISTORY =================
  listenToLoginHistory: (
    userId: string,
    callback: (history: LoginHistory[]) => void
  ) => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/${userId}/login-history`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        callback(data);
      } catch (e) {
        callback([]);
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  },

  clearAllData: async () => {
    try {
      const res = await fetch(`${API_BASE}/danger/clear-all-data`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // ================= SETTINGS =================
  getAlgoStatus: async () => {
    try {
      const res = await fetch('/api/admin/settings/algo', {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      return { isAlgoEnabled: true };
    }
  },

  toggleAlgo: async (enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/settings/algo', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enabled }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  getCryptoAddresses: async () => {
    try {
      const res = await fetch('/api/admin/settings/crypto-addresses', {
        headers: getHeaders(),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      return {};
    }
  },

  updateCryptoAddresses: async (addresses: Record<string, string>) => {
    try {
      const res = await fetch('/api/admin/settings/crypto-addresses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ addresses }),
      });
      return await handleResponse(res);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
};
