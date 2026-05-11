import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Download, 
  UserCheck, 
  UserX, 
  Eye,
  Mail,
  Phone,
  Shield,
  History as HistoryIcon,
  Ban,
  Trash2,
  CheckSquare,
  Square,
  Key,
  Link as LinkIcon,
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/src/services/adminService';
import { User } from '@/src/types';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [isBlockUserOpen, setIsBlockUserOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordTargetUid, setPasswordTargetUid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [blockTarget, setBlockTarget] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = adminService.listenToUsers((data) => {
      console.log(`[UserList] Received ${data.length} users from service`);
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(user => {
    try {
      const matchesSearch = 
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.uid || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    } catch (e) {
      console.error('[UserList] Filter error for user:', user, e);
      return false;
    }
  });
  console.log(`[UserList] Filtered to ${filteredUsers.length} users (search: "${searchQuery}", status: "${statusFilter}")`);

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      await adminService.updateUserStatus(user.uid, newStatus);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error('Failed to update user status');
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'deactivated') => {
    try {
      await Promise.all(selectedIds.map(id => adminService.updateUserStatus(id, status)));
      toast.success(`Bulk ${status === 'active' ? 'activation' : 'deactivation'} completed`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to complete bulk action');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };
  
  const handleBlockByTarget = async () => {
    if (!blockTarget) return;
    
    // Find user by email or UID
    const userToBlock = users.find(u => u.email === blockTarget || u.uid === blockTarget);
    
    if (userToBlock) {
      try {
        await adminService.updateUserStatus(userToBlock.uid, 'deactivated');
        toast.success('User blocked successfully');
        setIsBlockUserOpen(false);
        setBlockTarget('');
      } catch (error) {
        toast.error('Failed to block user');
      }
    } else {
      toast.error('User not found with provided Email or UID');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !passwordTargetUid) return;
    
    setIsChangingPassword(true);
    try {
      await adminService.changeUserPassword(passwordTargetUid, newPassword);
      toast.success('Password updated successfully in MongoDB');
      setIsChangePasswordOpen(false);
      setNewPassword('');
      setPasswordTargetUid('');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} users? This cannot be undone.`)) return;
    try {
      await adminService.bulkDelete('users', selectedIds);
      toast.success(`${selectedIds.length} users deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete users');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.uid));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const headers = ['UID', 'Email', 'Username', 'Phone', 'Status', 'Registration Date'];
    const rows = filteredUsers.map(u => [
      u.uid,
      u.email,
      u.username || '',
      u.phoneNumber || '',
      u.status,
      u.registrationDate
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage platform members and their account status.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-4 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-primary">{selectedIds.length} Selected</span>
              <Separator orientation="vertical" className="h-4 mx-2" />
              <Button size="sm" variant="ghost" className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 h-8 px-3" onClick={() => handleBulkStatusUpdate('active')}>
                <UserCheck className="w-4 h-4 mr-1" /> Activate
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3" onClick={() => handleBulkStatusUpdate('deactivated')}>
                <Ban className="w-4 h-4 mr-1" /> Block
              </Button>
            </div>
          )}
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
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={exportToCSV}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
          <Button variant="destructive" className="rounded-xl" onClick={() => setIsBlockUserOpen(true)}>
            <Ban className="w-4 h-4 mr-2" />
            Block User
          </Button>
        </div>
      </div>

      <Dialog open={isBlockUserOpen} onOpenChange={setIsBlockUserOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Enter the User ID or Email address of the user you want to block.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="target" className="text-sm font-medium">User ID or Email</label>
              <Input 
                id="target" 
                placeholder="UID or email@example.com" 
                value={blockTarget}
                onChange={(e) => setBlockTarget(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockUserOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleBlockByTarget} className="rounded-xl">Block Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              Set a new password for user ID: <span className="font-mono text-xs font-bold text-primary">{passwordTargetUid}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">New Password</label>
              <Input 
                id="new-password" 
                type="password"
                placeholder="Enter new password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)} className="rounded-xl" disabled={isChangingPassword}>Cancel</Button>
            <Button onClick={handlePasswordChange} className="rounded-xl" disabled={isChangingPassword || !newPassword}>
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by email, username or UID..." 
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full px-4"
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedIds([]);
                }}
              >
                All
              </Button>
              <Button 
                variant={statusFilter === 'active' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full px-4"
                onClick={() => {
                  setStatusFilter('active');
                  setSelectedIds([]);
                }}
              >
                Active
              </Button>
              <Button 
                variant={statusFilter === 'deactivated' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full px-4"
                onClick={() => {
                  setStatusFilter('deactivated');
                  setSelectedIds([]);
                }}
              >
                Deactivated
              </Button>
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
                      {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Balance (Real/Demo)</TableHead>
                  <TableHead>Is Active</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.uid} 
                      className={cn(
                        "group border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                        selectedIds.includes(user.uid) && "bg-primary/5 hover:bg-primary/5"
                      )}
                    >
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => toggleSelect(user.uid)}
                        >
                          {selectedIds.includes(user.uid) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-500">{user.uid}</TableCell>
                      <TableCell className="font-medium">{user.username || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-slate-500">{user.phoneNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit max-w-[140px] truncate">
                          ••••••••
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-emerald-500">₹{user.realBalance?.toLocaleString('en-IN')}</span>
                          <span className="text-xs text-slate-400 font-medium">₹{user.demoBalance?.toLocaleString('en-IN')} (Demo)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "rounded-full capitalize",
                          user.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {user.status === 'active' ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {format(new Date(user.registrationDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/users/${user.uid}`)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                               setPasswordTargetUid(user.uid);
                               setIsChangePasswordOpen(true);
                             }}>
                               <Key className="w-4 h-4 mr-2" /> Change Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              try {
                                const data = await adminService.generateResetLink(user.uid);
                                if (data.link) {
                                  // Clipboard API with Fallback
                                  if (navigator.clipboard && window.isSecureContext) {
                                    await navigator.clipboard.writeText(data.link);
                                    toast.success('Reset link copied to clipboard!');
                                  } else {
                                    // Fallback for non-secure contexts (HTTP)
                                    const textArea = document.createElement("textarea");
                                    textArea.value = data.link;
                                    textArea.style.position = "fixed";
                                    textArea.style.left = "-9999px";
                                    textArea.style.top = "0";
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                      document.execCommand('copy');
                                      toast.success('Reset link copied!');
                                    } catch (err) {
                                      console.error('Fallback copy failed', err);
                                      toast.error('Failed to copy. Link: ' + data.link);
                                    }
                                    document.body.removeChild(textArea);
                                  }
                                } else {
                                  toast.error('Server did not return a link');
                                }
                              } catch (error: any) {
                                console.error('[UserList] Reset link error:', error);
                                // If it's not an API error (already toasted in service), show generic error
                                if (!error.message?.includes('API Error')) {
                                  toast.error('Error: ' + (error.message || 'Failed to generate link'));
                                }
                              }
                            }}>
                              <LinkIcon className="w-4 h-4 mr-2" /> Copy Reset Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" /> Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-500 focus:text-red-500"
                              onClick={() => deleteUser(user.uid)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No users found matching your criteria.</p>
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
