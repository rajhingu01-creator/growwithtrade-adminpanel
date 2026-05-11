import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Admin } from '@/src/types';
import { 
  LayoutDashboard, 
  Users, 
  ArrowLeftRight, 
  ShieldCheck, 
  TrendingUp,
  History, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon,
  ChevronRight,
  UserCircle,
  BrainCircuit,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLayoutProps {
  admin: Admin;
  onLogout: () => void;
}

export default function AdminLayout({ admin, onLogout }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Trades', path: '/trades', icon: TrendingUp },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'KYC Verification', path: '/kyc', icon: ShieldCheck },
    { name: 'Algorithm Settings', path: '/settings', icon: BrainCircuit },
    { name: 'Crypto Settings', path: '/crypto-settings', icon: Wallet },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="relative z-20 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">Quotex Admin</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-1 py-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      location.pathname === item.path
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-white" : "group-hover:text-primary")} />
                    <span className="font-medium">{item.name}</span>
                    {location.pathname === item.path && (
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    )}
                  </Link>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 mt-auto">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate">{admin.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{admin.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl border-slate-200 dark:border-slate-700" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              {navItems.find(i => i.path === location.pathname)?.name || 'Admin Panel'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className="rounded-full">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">System Online</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
