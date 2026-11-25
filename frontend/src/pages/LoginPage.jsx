import React, { useState } from 'react';
import { GraduationCap, Lock, User, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ onBackPublic }) {
  const { login, schoolSettings } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-800 text-white p-6 text-center relative">
          <button
            onClick={onBackPublic}
            className="absolute left-4 top-4 inline-flex items-center gap-1 text-xs bg-emerald-700/80 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </button>
          <div className="h-14 w-14 rounded-2xl bg-white/15 mx-auto flex items-center justify-center mb-3">
            <GraduationCap className="h-8 w-8 text-amber-300" />
          </div>
          <h1 className="text-xl font-extrabold">{schoolSettings?.school_name || 'Shapla Ideal High School'}</h1>
          <p className="text-sm text-emerald-100 font-bangla">{schoolSettings?.school_name_bn || 'অ্যাডমিন ও স্টাফ লগইন'}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In to School Dashboard'}
          </button>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5" /> Quick Demo Role Accounts (Test Access Control):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill('admin', 'admin123')}
                className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-left hover:bg-emerald-100"
              >
                <div className="font-bold text-emerald-900">Headmaster</div>
                <div className="text-[10px] text-emerald-700">admin / admin123</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('admission', 'staff123')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-left hover:bg-slate-100"
              >
                <div className="font-bold text-slate-800">Admission Officer</div>
                <div className="text-[10px] text-slate-500">admission / staff123</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('exam', 'staff123')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-left hover:bg-slate-100"
              >
                <div className="font-bold text-slate-800">Exam Controller</div>
                <div className="text-[10px] text-slate-500">exam / staff123</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('accounts', 'staff123')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-left hover:bg-slate-100"
              >
                <div className="font-bold text-slate-800">Accounts Officer</div>
                <div className="text-[10px] text-slate-500">accounts / staff123</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
