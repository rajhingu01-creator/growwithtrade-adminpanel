import { useState, useEffect } from 'react';
import { 
  Search, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Clock,
  ArrowUp,
  ArrowDown,
  Filter,
  User,
  History,
  ShieldCheck,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/src/services/adminService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TradeList() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'real' | 'demo'>('real');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const unsub = adminService.listenToTrades(
      accountTypeFilter === 'all' ? null : accountTypeFilter, 
      (data) => {
        setTrades(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [accountTypeFilter]);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      trade.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade._id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const deleteTrade = async (tradeId: string) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return;
    try {
      await adminService.deleteTrade(tradeId);
      toast.success('Trade deleted successfully');
    } catch (error) {
      toast.error('Failed to delete trade');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} trades?`)) return;
    try {
      await adminService.bulkDelete('trades', selectedIds);
      toast.success(`${selectedIds.length} trades deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete trades');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTrades.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrades.map(t => t._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const headers = ['ID', 'User ID', 'Symbol', 'Type', 'Amount', 'Price', 'Status', 'PnL', 'Account', 'Date'];
    const rows = filteredTrades.map(t => [
      t._id,
      t.userId,
      t.symbol,
      t.type,
      t.amount,
      t.price,
      t.status,
      t.pnl || 0,
      t.accountType,
      t.timestamp
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trades_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Trades</h2>
          <p className="text-slate-500 dark:text-slate-400">Monitor all user trading activity in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="rounded-xl gap-2 animate-in fade-in slide-in-from-top-2"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedIds.length} Selected
            </Button>
          )}
          <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-1 bg-blue-500 w-full" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Trades</p>
                <h3 className="text-2xl font-bold mt-1">{trades.filter(t => t.status === 'open').length}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-1 bg-emerald-500 w-full" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Volume</p>
                <h3 className="text-2xl font-bold mt-1">₹{trades.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
          <div className="h-1 bg-primary w-full" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Real Trades</p>
                <h3 className="text-2xl font-bold mt-1">{trades.filter(t => t.accountType === 'real').length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={accountTypeFilter} onValueChange={(v: any) => setAccountTypeFilter(v)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="real" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Real Account</TabsTrigger>
          <TabsTrigger value="demo" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Demo Account</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">All</TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 mt-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search by User ID, Asset or Trade ID..." 
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[150px] rounded-xl border-slate-200 dark:border-slate-800">
                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open Trades</SelectItem>
                    <SelectItem value="closed">Closed Trades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                  <TableHead className="w-12">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === filteredTrades.length && filteredTrades.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-12 text-center">Type</TableHead>
                  <TableHead>User & Asset</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status / PnL</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-16 w-full rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <History className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No trades found</p>
                        <p className="text-sm">Try adjusting your filters or search query.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrades.map((trade) => (
                    <TableRow 
                      key={trade._id} 
                      className={cn(
                        "group border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                        selectedIds.includes(trade._id) && "bg-primary/5 hover:bg-primary/5"
                      )}
                    >
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => toggleSelect(trade._id)}
                        >
                          {selectedIds.includes(trade._id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mx-auto",
                          trade.type === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {trade.type === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm uppercase">{trade.symbol?.replace(' (OTC)', '')}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-bold">OTC</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{(trade as any).username || 'User'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({trade.userId.substring(0, 6)}...)</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-white">₹{trade.amount?.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{trade.accountType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {trade.price?.toFixed(trade.symbol?.includes('BTC') ? 2 : 5)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg border-slate-200 dark:border-slate-800 font-mono">
                          {trade.duration}s
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {trade.status === 'open' ? (
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 rounded-full animate-pulse">
                            OPEN
                          </Badge>
                        ) : (
                          <div className={cn(
                            "font-bold text-sm",
                            trade.pnl > 0 ? "text-emerald-500" : trade.pnl < 0 ? "text-rose-500" : "text-slate-400"
                          )}>
                            {trade.pnl > 0 ? '+' : ''}₹{trade.pnl?.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {format(new Date(trade.timestamp), 'MMM d, HH:mm')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(trade.timestamp), 'ss')}s
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => deleteTrade(trade._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
