import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Shield, RefreshCw } from 'lucide-react';

interface UserData {
  _id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
}

export const Admin = () => {
  const { token, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const resetBalance = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-balance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to reset balance');
      
      // Update local state
      setUsers(users.map(u => u._id === userId ? { ...u, balance: 100000 } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You need administrator privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
              <tr>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-medium text-white">{u.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        u.isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {u.isAdmin ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      ${u.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => resetBalance(u._id)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto transition-colors"
                        title="Reset to $100,000"
                      >
                        <RefreshCw size={16} />
                        Reset Balance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
