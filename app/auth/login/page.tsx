'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // 1. Mag-log in gamit ang Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    // 2. Kunin ang role mula sa User Metadata (default: 'customer' kung walang role na naka-assign)
    const userRole = user?.user_metadata?.role || 'customer';

    // Pwede mo rin i-check kung partikular na email ang Admin
    const isAdmin = userRole === 'admin' || user?.email === 'admin@edudepot.ph';

    // 3. I-redirect sa tamang Dashboard batay sa Role
    if (isAdmin) {
      router.push('/admin/dashboard');
    } else if (userRole === 'customer' || userRole === 'user') {
      router.push('/customer/dashboard'); // O pwedeng router.push('/shop')
    } else {
      router.push('/dashboard'); // Teacher/Staff Dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">EduDepot PH</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mag-login para ma-access ang iyong account
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
              className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition disabled:opacity-50"
          >
            {loading ? 'Pumapasok...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}