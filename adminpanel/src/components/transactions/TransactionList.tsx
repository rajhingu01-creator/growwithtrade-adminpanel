import { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Download, 
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Check,
  X,
  Trash2,
  ShieldCheck,
  History as HistoryIcon,
  Shield
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '@/src/services/adminService';
import { Transaction } from '@/src/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'rejected'>('all');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = adminService.listenToTransactions((data) => {
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = tx.mode === activeTab;
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesDate = !date || format(new Date(tx.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const handleUpdateTransactionStatus = async (txId: string, status: 'completed' | 'rejected') => {
    try {
      await adminService.updateTransactionStatus(txId, status);
      toast.success(`Transaction ${status} successfully`);
    } catch (error) {
      toast.error('Failed to update transaction status');
    }
  };

  const deleteTransaction = async (txId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await adminService.deleteTransaction(txId);
      toast.success('Transaction deleted successfully');
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleBulkAction = async (status: 'completed' | 'rejected') => {
    try {
      await Promise.all(selectedIds.map(id => adminService.updateTransactionStatus(id, status)));
      toast.success(`Bulk ${status} completed for ${selectedIds.length} transactions`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to complete bulk action');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;
    try {
      await adminService.bulkDelete('transactions', selectedIds);
      toast.success(`${selectedIds.length} transactions deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete transactions');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const headers = ['ID', 'User ID', 'Type', 'Currency', 'Amount', 'Status', 'Date', 'Payment Method'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.userId,
      t.mode,
      t.currency,
      t.amount,
      t.status,
      t.date,
      t.paymentMethod || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}s_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-slate-500 dark:text-slate-400">Monitor and manage platform financial activity.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-4 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-primary">{selectedIds.length} Selected</span>
              <Separator orientation="vertical" className="h-4 mx-2" />
              <Button size="sm" variant="ghost" className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 h-8 px-3" onClick={() => handleBulkAction('completed')}>
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3" onClick={() => handleBulkAction('rejected')}>
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Separator orientation="vertical" className="h-4 mx-2" />
              <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-3" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          )}
          <Button variant="outline" className="rounded-xl" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => {
        setActiveTab(v);
        setSelectedIds([]);
      }} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="deposit" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Deposits
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Withdrawals
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 mt-6">
          <CardHeader className="pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search User ID or Tx ID..." 
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger render={
                  <Button variant="outline" className={cn(
                    "rounded-xl border-slate-200 dark:border-slate-800 justify-start text-left font-normal w-full",
                    !date && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                } />
                <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
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
                        {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-lg font-medium">No {activeTab}s found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow 
                        key={tx.id} 
                        className={cn(
                          "group border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                          selectedIds.includes(tx.id) && "bg-primary/5 hover:bg-primary/5"
                        )}
                      >
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => toggleSelect(tx.id)}
                          >
                            {selectedIds.includes(tx.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-blue-500">{tx.transactionCode || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{tx.id.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{tx.username}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{tx.userId.substring(0, 10)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{tx.currency} {tx.amount.toLocaleString()}</span>
                            <span className="text-[10px] uppercase text-slate-400 font-bold">{tx.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-full capitalize",
                            tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : 
                            tx.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {format(new Date(tx.date), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-slate-500 font-mono">
                          {tx.details || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {tx.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => handleUpdateTransactionStatus(tx.id, 'completed')}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleUpdateTransactionStatus(tx.id, 'rejected')}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              } />
                              <DropdownMenuContent align="end" className="rounded-xl w-48">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTx(tx);
                                  setIsDetailsOpen(true);
                                }}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/users/${tx.userId}`)}>User Profile</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => deleteTransaction(tx.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Transaction
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-primary" />
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about this {selectedTx?.mode}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTx && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Transaction ID</p>
                  <p className="font-mono text-sm break-all bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">{selectedTx.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">User ID</p>
                  <p className="font-mono text-sm break-all bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">{selectedTx.userId}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Amount</p>
                  <p className="text-xl font-black text-primary">{selectedTx.currency} {selectedTx.amount.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Status</p>
                  <Badge className={cn(
                    "rounded-full capitalize mt-1",
                    selectedTx.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : 
                    selectedTx.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {selectedTx.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Payment / Destination Info
                </p>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Method:</span>
                    <span className="text-sm font-bold uppercase">{selectedTx.paymentMethod || 'Manual'}</span>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="space-y-2">
                    <span className="text-sm text-slate-500">Details:</span>
                    <div className="text-sm font-medium bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-words whitespace-pre-wrap">
                      {selectedTx.details || 'No additional details provided.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Created on: {format(new Date(selectedTx.date), 'PPPP p')}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl w-full" onClick={() => setIsDetailsOpen(false)}>
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
