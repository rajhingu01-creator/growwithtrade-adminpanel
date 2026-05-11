import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Calendar,
  Search,
  FileText,
  DownloadCloud
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { adminService } from '@/src/services/adminService';
import { User, Transaction } from '@/src/types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all'>('weekly');

  useEffect(() => {
    const fetchStats = async () => {
      const data = await adminService.getDashboardStats(timeframe);
      setStats(data);
      const cData = await adminService.getChartStats();
      setChartData(cData);
    };

    fetchStats();
  }, [timeframe]);

  useEffect(() => {
    const unsubTransactions = adminService.listenToRecentTransactions(setRecentTransactions);
    const unsubUsers = adminService.listenToRecentUsers(setRecentUsers);
    const unsubTrades = adminService.listenToTrades('real', (data) => {
      setRecentTrades(data.slice(0, 5)); // Just show latest 5 real trades
    });

    return () => {
      unsubTransactions();
      unsubUsers();
      unsubTrades();
    };
  }, []);

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <Card className="overflow-hidden border-none shadow-lg bg-white dark:bg-slate-900 group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className={cn("p-3 rounded-2xl shadow-lg", color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold">
              {trend}
            </Badge>
          )}
        </div>
        <div className="space-y-1 relative z-10">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-3xl font-black tracking-tight group-hover:text-primary transition-colors">
            {typeof value === 'number' && (title.includes('Deposits') || title.includes('Revenue')) ? `$${value.toLocaleString()}` : value}
          </h3>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            Platform <span className="text-primary">Intelligence</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Real-time oversight and advanced controls.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="destructive" 
            className="rounded-xl"
            onClick={async () => {
              if (window.confirm('Are you sure? This will delete all users, trades, and transactions!')) {
                try {
                  await adminService.clearAllData();
                  window.location.reload();
                } catch (e) {
                  console.error(e);
                }
              }
            }}
          >
            <Search className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
          <Button variant="outline" className="rounded-xl">
            <Calendar className="w-4 h-4 mr-2" />
            Last 30 Days
          </Button>
          <Button className="rounded-xl">
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers || 0} 
          icon={Users} 
          trend="+12%" 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Active Users" 
          value={stats?.activeUsers || 0} 
          icon={Activity} 
          trend="+5%" 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Deposits" 
          value={stats?.totalDeposits || 0} 
          icon={ArrowUpRight} 
          trend="+18%" 
          color="bg-violet-500" 
        />
        <StatCard 
          title="Revenue" 
          value={stats?.revenue || 0} 
          icon={DollarSign} 
          trend="+24%" 
          color="bg-amber-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Transaction Trends</CardTitle>
            <CardDescription>Daily deposits vs withdrawals</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="deposits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDeposits)" strokeWidth={3} />
                <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" fillOpacity={1} fill="url(#colorWithdrawals)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Newest platform members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentUsers.map((user, i) => (
                <div key={user.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-primary">
                      {user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[120px]">{user.email}</p>
                      <p className="text-xs text-slate-500">{format(new Date(user.registrationDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full capitalize">
                    {user.status}
                  </Badge>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No recent registrations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Transactions & Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions Table */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest financial activity</CardDescription>
            </div>
            <Link 
              to="/transactions" 
              className={cn(buttonVariants({ variant: "ghost" }), "text-primary")}
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentTransactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{tx.userId.substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-bold">
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            tx.status === 'completed' ? "bg-emerald-500" : 
                            tx.status === 'pending' ? "bg-amber-500" : "bg-red-500"
                          )} />
                          <span className="capitalize">{tx.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                        No recent transactions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Live Trades Table */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Real Trades</CardTitle>
              <CardDescription>Latest trades from real accounts</CardDescription>
            </div>
            <Link 
              to="/trades" 
              className={cn(buttonVariants({ variant: "ghost" }), "text-primary")}
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Asset</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentTrades.map((trade) => (
                    <tr key={trade._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold uppercase">{trade.symbol}</td>
                      <td className="px-6 py-4 font-bold">₹{trade.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          "rounded-full",
                          trade.type === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {trade.type === 'up' ? 'UP' : 'DOWN'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {trade.status === 'open' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-blue-500 font-medium">OPEN</span>
                          </div>
                        ) : (
                          <span className={cn(
                            "font-bold",
                            trade.pnl > 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {trade.pnl > 0 ? '+' : ''}₹{trade.pnl?.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentTrades.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                        No live real trades
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Reports Section */}
      <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle>Weekly Reports</CardTitle>
          </div>
          <CardDescription>Download detailed performance reports for specific weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3].map((weekOffset) => {
              const now = new Date();
              const start = new Date(now.setDate(now.getDate() - now.getDay() - (weekOffset * 7)));
              const end = new Date(new Date(start).setDate(start.getDate() + 6));
              const startStr = format(start, 'yyyy-MM-dd');
              const endStr = format(end, 'yyyy-MM-dd');
              
              return (
                <div key={weekOffset} className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{weekOffset === 0 ? 'Current Week' : `Week ${weekOffset} Ago`}</p>
                    <p className="text-xs text-slate-500">{format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-primary hover:bg-primary/10"
                    onClick={() => adminService.downloadWeeklyReport(startStr, endStr)}
                  >
                    <DownloadCloud className="w-5 h-5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
