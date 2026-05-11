import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, ShieldCheck, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Admin } from '@/src/types';

interface LoginPageProps {
  onLogin: (admin: Admin) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    
    try {
      // First try real login to the backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok) {
        if (!data.user.isAdmin) {
          throw new Error('You do not have administrator privileges');
        }

        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('token', data.token); // Keep both for compatibility
        console.log('[LoginPage] Token set in localStorage:', localStorage.getItem('admin_token') ? 'Yes' : 'No');
        onLogin({
          uid: data.user.id,
          email: data.user.email || data.user.username,
          role: data.user.isAdmin ? 'admin' : 'staff'
        });
        toast.success('Logged in successfully');
      } else {
        // Fallback to hardcoded check for development/setup
        if ((email === 'rajhingu01@gmail.com' && password === 'Admin@#1234') || 
            (email === 'v.meet0503@gmail.com' && password === 'Admin@#1245')) {
          
          // Try to get a real token via dev login
          const devRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password, isDevLogin: true })
          });

          if (devRes.ok) {
            const devData = await devRes.json();
            localStorage.setItem('admin_token', devData.token);
            localStorage.setItem('token', devData.token);
            onLogin({
              uid: devData.user.id,
              email: devData.user.email || devData.user.username,
              role: devData.user.isAdmin ? 'admin' : 'staff'
            });
            toast.success('Logged in as Admin (Dev Mode)');
          } else {
            let devError = 'Dev login failed. Backend may be down.';
            try {
              const errJson = await devRes.json();
              devError = errJson.error || devError;
            } catch {
              // Keep default message for non-JSON responses
            }
            throw new Error(devError);
          }
        } else {
          throw new Error(data.error || 'Invalid credentials');
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Admin Portal</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Secure access for platform administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="admin@example.com" 
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg font-semibold rounded-xl mt-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              Sign In
            </Button>
          </form>
          <p className="text-xs text-center text-slate-400 mt-6">
            Authorized personnel only. All actions are logged.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
