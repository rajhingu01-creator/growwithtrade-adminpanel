import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Admin } from '@/src/types';
import AdminLayout from '@/src/components/layout/AdminLayout';
import LoginPage from '@/src/components/auth/LoginPage';
import DashboardOverview from '@/src/components/dashboard/DashboardOverview';
import UserList from '@/src/components/users/UserList';
import UserProfile from '@/src/components/users/UserProfile';
import TransactionList from '@/src/components/transactions/TransactionList';
import TradeList from '@/src/components/trades/TradeList';
import KYCList from '@/src/components/kyc/KYCList';
import AlgorithmSettings from '@/src/components/settings/AlgorithmSettings';
import CryptoSettings from '@/src/components/settings/CryptoSettings';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export default function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[App] Initializing Auth...');
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (tokenFromUrl) {
          console.log('[App] New token detected from URL');
          localStorage.setItem('admin_token', tokenFromUrl);
          localStorage.setItem('token', tokenFromUrl);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const activeToken = tokenFromUrl || localStorage.getItem('admin_token') || localStorage.getItem('token');
        const savedAdmin = localStorage.getItem('admin_session');

        if (activeToken) {
          console.log('[App] Attempting auto-login with token');
          
          // Add a timeout to the fetch request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

          try {
            const res = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${activeToken}` },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              const userData = await res.json();
              if (userData.isAdmin) {
                const adminData: Admin = {
                  uid: userData.id,
                  email: userData.email || userData.username,
                  role: 'admin'
                };
                console.log('[App] Auto-login successful');
                setAdmin(adminData);
                localStorage.setItem('admin_session', JSON.stringify(adminData));
              } else {
                console.warn('[App] User is not an admin');
                localStorage.removeItem('admin_session');
                localStorage.removeItem('admin_token');
                localStorage.removeItem('token');
              }
            } else {
              console.warn('[App] Auto-login failed with status:', res.status);
              // If unauthorized, clear session
              if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_session');
                localStorage.removeItem('admin_token');
                localStorage.removeItem('token');
              }
            }
          } catch (fetchError: any) {
            console.warn('[App] Auto-login fetch failed:', fetchError.name === 'AbortError' ? 'Timeout' : fetchError.message);
            // On timeout or network error, use saved session if available
            if (savedAdmin) {
              console.log('[App] Using saved session due to network failure');
              setAdmin(JSON.parse(savedAdmin));
            }
          }
        } else if (savedAdmin) {
          setAdmin(JSON.parse(savedAdmin));
        }
      } catch (e: any) {
        console.error('[App] Auth init error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = (adminData: Admin) => {
    setAdmin(adminData);
    localStorage.setItem('admin_session', JSON.stringify(adminData));
  };

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('token');
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 text-sm animate-pulse">Initializing Secure Portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
        <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 mb-6">
          <p className="text-red-500 font-semibold mb-2">Initialization Error</p>
          <p className="text-slate-400 text-sm max-w-md">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Router basename="/adminpanel">
        <Routes>
          <Route path="/login" element={!admin ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} />
          
          <Route element={admin ? <AdminLayout admin={admin} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/kyc" element={<KYCList />} />
            <Route path="/settings" element={<AlgorithmSettings />} />
            <Route path="/crypto-settings" element={<CryptoSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <Toaster />
    </TooltipProvider>
  );
}
