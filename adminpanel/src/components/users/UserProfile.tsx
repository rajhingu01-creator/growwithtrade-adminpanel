import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Activity, 
  FileCheck, 
  MapPin,
  Globe,
  TrendingDown,
  TrendingUp,
  UserCircle,
  Lock,
  FileText,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Transaction, KYC, BankAccount, LoginHistory } from '@/src/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { adminService } from '@/src/services/adminService';
import { toast } from 'sonner';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [kyc, setKyc] = useState<KYC | null>(null);
  const [bank, setBank] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDateSafely = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  useEffect(() => {
    let unsubTx: (() => void) | undefined;
    let unsubLogin: (() => void) | undefined;

    const fetchData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const userData = await adminService.getUser(userId);
        setUser(userData);

        const kycData = await adminService.getKYC(userId);
        setKyc(kycData);

        const bankData = await adminService.getBank(userId);
        setBank(bankData);

        unsubTx = adminService.listenToUserTransactions(userId, setTransactions);
        unsubLogin = adminService.listenToLoginHistory(userId, setLoginHistory);
      } catch (error) {
        console.error('[UserProfile] Error fetching data:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubTx) unsubTx();
      if (unsubLogin) unsubLogin();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] w-full rounded-3xl" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <UserCircle className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-slate-500 mb-8 max-w-xs text-center">The user you are looking for does not exist or has been removed from the system.</p>
        <Button onClick={() => navigate('/users')} className="rounded-xl px-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  const totalProfit = Array.isArray(transactions) 
    ? transactions
        .filter(t => t.mode === 'trade')
        .reduce((sum, t) => sum + (Number(t.details?.profit) || 0), 0)
    : 0;

  const handleKYCUpdate = async (status: 'approved' | 'rejected') => {
    if (!userId) return;
    try {
      await adminService.updateKYCStatus(userId, status);
      toast.success(`KYC status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update KYC status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/users')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Profile</h2>
          <p className="text-sm text-slate-500">Managing details for {user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center font-bold text-3xl text-primary mb-4">
                  {user.email[0].toUpperCase()}
                </div>
                <h3 className="text-xl font-bold">{user.username || 'No Username'}</h3>
                <p className="text-sm text-slate-500 mb-2">{user.email}</p>
                <Badge className={cn(
                  "rounded-full capitalize",
                  user.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {user.status}
                </Badge>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">User ID</span>
                    <span className="text-slate-600 dark:text-slate-300 font-mono">{user.uid}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Username</span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{user.username || 'Not set'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Email Address</span>
                    <span className="text-slate-600 dark:text-slate-300">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Phone Number</span>
                    <span className="text-slate-600 dark:text-slate-300">{user.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Password</span>
                    <span className="text-slate-600 dark:text-slate-300 font-mono" title={user.password}>{user.password || '••••••••'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={cn("w-4 h-4", user.status === 'active' ? "text-emerald-500" : "text-red-500")} />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Account Status</span>
                    <span className={cn("font-bold capitalize", user.status === 'active' ? "text-emerald-500" : "text-red-500")}>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Member Since</span>
                    <span className="text-slate-600 dark:text-slate-300">{formatDateSafely(user.registrationDate, 'MMMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">₹{Number(user.realBalance || 0).toLocaleString('en-IN')}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Account Balance</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <h2 className="text-3xl font-bold tracking-tight text-primary">₹{Number(user.demoBalance || 0).toLocaleString('en-IN')}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Demo Practice Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg">Trading Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Trades</span>
                <span className="font-bold">{transactions.filter(t => t.mode === 'trade').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Profit/Loss</span>
                <span className={cn("font-bold", totalProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                  ₹{Math.abs(totalProfit).toLocaleString('en-IN')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800 w-full justify-start h-auto">
              <TabsTrigger value="transactions" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="kyc" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                KYC & Identity
              </TabsTrigger>
              <TabsTrigger value="bank" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                Bank Details
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                Security & Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{tx.mode}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[10px] font-bold text-blue-500">
                            {tx.transactionCode || 'N/A'}
                          </TableCell>
                          <TableCell className="font-bold">{tx.currency === 'USD' ? '₹' : tx.currency} {tx.amount.toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "rounded-full",
                              tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">{formatDateSafely(tx.date, 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-slate-400">No transactions found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kyc" className="mt-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>KYC Information</CardTitle>
                    <Badge className={cn(
                      "rounded-full capitalize px-4 py-1",
                      kyc?.status === 'approved' ? "bg-emerald-500 text-white" : 
                      kyc?.status === 'pending' ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {kyc?.status || 'Not Started'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {kyc ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">ID Type</p>
                          <p className="font-semibold capitalize">{(kyc.idType || 'N/A').replace('_', ' ')}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">ID Number</p>
                          <p className="font-mono font-semibold">{kyc.idNumber || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500">ID Proof</p>
                          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                            {(kyc.documentImage || kyc.idProofUrl) ? (
                              <img src={kyc.documentImage || kyc.idProofUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <FileCheck className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500">Address Proof</p>
                          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                            {kyc.addressProofUrl ? (
                              <img src={kyc.addressProofUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <MapPin className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500">Selfie</p>
                          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                            {kyc.selfieUrl ? (
                              <img src={kyc.selfieUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UserCircle className="w-8 h-8 text-slate-300" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Verification Status
                        </h4>
                        <p className="text-sm text-slate-500 mb-4">{kyc.adminNotes || 'No notes provided by admin.'}</p>
                        <div className="flex gap-3">
                          <Button 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                            onClick={() => handleKYCUpdate('approved')}
                            disabled={kyc.status === 'approved'}
                          >
                            Approve KYC
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="rounded-xl"
                            onClick={() => handleKYCUpdate('rejected')}
                            disabled={kyc.status === 'rejected'}
                          >
                            Reject KYC
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                      <p>No KYC documents submitted yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank" className="mt-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <CardDescription>Primary account for withdrawals</CardDescription>
                </CardHeader>
                <CardContent>
                  {bank ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Bank Name</p>
                        <p className="font-bold text-lg">{bank.bankName}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Account Number</p>
                        <p className="font-mono text-lg">{bank.accountNumber}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">IFSC Code</p>
                        <p className="font-mono text-lg uppercase">{bank.ifsc || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">UPI ID</p>
                        <p className="font-medium text-lg">{bank.upiId || 'Not provided'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Activity className="w-12 h-12 mb-4 opacity-20" />
                      <p>No bank account linked yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>Recent Login Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Device / Browser</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-mono text-xs">{h.ipAddress}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{h.location || 'Unknown'}</span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-slate-500" title={h.userAgent}>
                            {h.userAgent || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-slate-500">{formatDateSafely(h.timestamp, 'MMM d, HH:mm:ss')}</TableCell>
                        </TableRow>
                      ))}
                      {loginHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-slate-400">No login history available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
