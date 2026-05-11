import { useState, useEffect } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  MoreVertical,
  FileText,
  Check,
  X, 
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/src/services/adminService';
import { KYC } from '@/src/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function KYCList() {
  const [kycList, setKycList] = useState<KYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = adminService.listenToKYC((data) => {
      setKycList(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredKYC = kycList.filter(kyc => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      kyc.userId.toLowerCase().includes(q) ||
      (kyc.username || '').toLowerCase().includes(q) ||
      (kyc.email || '').toLowerCase().includes(q) ||
      (kyc.idNumber || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || kyc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      await adminService.updateKYCStatus(userId, status);
      toast.success(`KYC ${status} successfully`);
    } catch (error) {
      toast.error('Failed to update KYC status');
    }
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    try {
      await Promise.all(selectedIds.map(id => adminService.updateKYCStatus(id, status)));
      toast.success(`Bulk ${status} completed for ${selectedIds.length} KYC requests`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to complete bulk action');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} KYC records?`)) return;
    try {
      await adminService.bulkDelete('kyc', selectedIds);
      toast.success(`${selectedIds.length} KYC records deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete KYC records');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredKYC.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredKYC.map(k => k.userId));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteKYC = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this KYC record?')) return;
    try {
      await adminService.deleteKYC(userId);
      toast.success('KYC deleted successfully');
    } catch (error) {
      toast.error('Failed to delete KYC');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KYC Verification</h2>
          <p className="text-slate-500 dark:text-slate-400">Review and approve user identity documents.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-4 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-primary">{selectedIds.length} Selected</span>
              <Separator orientation="vertical" className="h-4 mx-2" />
              <Button size="sm" variant="ghost" className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 h-8 px-3" onClick={() => handleBulkAction('approved')}>
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
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">{kycList.filter(k => k.status === 'pending').length} Pending Requests</span>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by user, email, ID number..." 
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <Button 
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-full px-4 capitalize"
                  onClick={() => {
                    setStatusFilter(status as any);
                    setSelectedIds([]);
                  }}
                >
                  {status}
                </Button>
              ))}
            </div>
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
                      {selectedIds.length === filteredKYC.length && filteredKYC.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>ID Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredKYC.length > 0 ? (
                  filteredKYC.map((kyc) => (
                    <TableRow 
                      key={kyc.userId} 
                      className={cn(
                        "group border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                        selectedIds.includes(kyc.userId) && "bg-primary/5 hover:bg-primary/5"
                      )}
                    >
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => toggleSelect(kyc.userId)}
                        >
                          {selectedIds.includes(kyc.userId) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="text-sm font-semibold">{kyc.username || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{kyc.email || `${kyc.userId.substring(0, 12)}...`}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className="font-semibold uppercase">{(kyc.idType || 'ID').replace('_', ' ')}</div>
                          <div className="text-slate-500">{kyc.idNumber || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "rounded-full capitalize",
                          kyc.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : 
                          kyc.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {kyc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {kyc.updatedAt ? format(new Date(kyc.updatedAt), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {kyc.documentImage ? (
                          <a href={kyc.documentImage} target="_blank" rel="noreferrer">
                            <img src={kyc.documentImage} alt="KYC document" className="w-14 h-14 rounded-lg object-cover border border-slate-300 dark:border-slate-700" />
                          </a>
                        ) : (
                          <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-slate-800">No Image</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {kyc.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 rounded-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleUpdateStatus(kyc.userId, 'approved')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleUpdateStatus(kyc.userId, 'rejected')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => navigate(`/users/${kyc.userId}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="rounded-xl w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-emerald-500" onClick={() => handleUpdateStatus(kyc.userId, 'approved')}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-500" onClick={() => handleUpdateStatus(kyc.userId, 'rejected')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <FileText className="w-4 h-4 mr-2" />
                                View History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-500 focus:text-red-500"
                                onClick={() => deleteKYC(kyc.userId)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete KYC
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No KYC requests found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
