import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Shield, CreditCard, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const VerifyAccount = () => {
  const { user, token, login } = useAuthStore();
  const navigate = useNavigate();
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [documentImage, setDocumentImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  if (user.isVerified) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-emerald-500/20 w-20 h-20 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Verified</h1>
        <p className="text-slate-400 mb-8">Your account is already verified. You have full access to all features.</p>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition-colors"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      setError('Please enter your ID number');
      return;
    }
    if (!documentImage) {
      setError('Please upload your document photo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ idType, idNumber, documentImage })
      });

      if (res.ok) {
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (meRes.ok) {
          const me = await meRes.json();
          login(me, token!);
        }
        navigate('/profile');
      } else {
        const data = await res.json();
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Profile
      </button>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center text-blue-400">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
            <p className="text-slate-400">Complete verification to secure your account</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {user.kyc?.status === 'pending' && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">Your previous request is pending. You can re-submit updated documents.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">Select ID Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setIdType('national_id')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  idType === 'national_id' 
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <CreditCard size={24} />
                <span className="text-sm font-bold">National ID</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIdType('driving_license')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  idType === 'driving_license' 
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <FileText size={24} />
                <span className="text-sm font-bold">Driving License</span>
              </button>

              <button
                type="button"
                onClick={() => setIdType('passport')}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                  idType === 'passport' 
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Shield size={24} />
                <span className="text-sm font-bold">Passport</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">ID Number</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Enter your document number"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Document Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setDocumentImage(String(reader.result || ''));
                reader.readAsDataURL(file);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none"
            />
            {documentImage && (
              <img src={documentImage} alt="Document preview" className="mt-3 rounded-xl border border-slate-700 max-h-56 object-contain" />
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
