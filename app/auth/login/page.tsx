'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dark / Light Mode State
  const [darkMode, setDarkMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

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
    const userRole = user?.user_metadata?.role || 'customer';
    const isAdmin = userRole === 'admin' || user?.email === 'admin@edudepot.ph';

    if (isAdmin) {
      router.push('/admin/dashboard');
    } else if (userRole === 'customer' || userRole === 'user') {
      router.push('/customer/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between font-sans p-6 md:p-10 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* NAVIGATION BAR: BACK TO HOME & THEME TOGGLE */}
      <div className="w-full max-w-md mx-auto flex justify-between items-center">
        <Link 
          href="/"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
        >
          <span>←</span>
          <span>Back to Homepage</span>
        </Link>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border flex items-center gap-2 ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
        >
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      {/* LOGIN CARD CONTAINER */}
      <div className="w-full flex items-center justify-center my-auto py-8">
        <div className={`w-full max-w-md p-8 md:p-10 rounded-3xl border shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-900/90 border-slate-800 text-white shadow-slate-950/50' : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/50'}`}>
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg mx-auto mb-3 shadow-md shadow-blue-500/30">
              E
            </div>
            <h1 className="text-2xl font-black tracking-tight">EduDepot PH</h1>
            <p className={`text-xs mt-1.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Mag-login para ma-access ang iyong account
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-4 rounded-2xl mb-6 font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className={`w-full border rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full border rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-blue-500/25 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Pumapasok...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          <div className={`text-center mt-6 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Wala pang account?{' '}
              <Link href="/signup" className="text-blue-500 font-bold hover:underline">
                Mag-sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto text-center">
        <p className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          EduDepot PH • Secure Teacher Portal
        </p>
      </div>
    </div>
  );
}