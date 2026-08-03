'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modal notification state para sa credentials reminder
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Dark/Light Mode state
  const [darkMode, setDarkMode] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // I-check muna kung magkapareho ang password at confirm password
    if (password !== confirmPassword) {
      setErrorMessage('Hindi magkatugma ang Password at Confirm Password.');
      return;
    }

    setLoading(true);

    // 1. Sign up ang user gamit ang Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'customer',
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setLoading(false);
      setErrorMessage(authError.message);
      return;
    }

    // 2. I-save o i-update sa profiles table (id, full_name, at role)
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: authData.user.id,
            full_name: fullName,
            role: 'customer',
          },
        ]);

      if (profileError) {
        console.error('Error saving profile details:', profileError.message);
      }
    }

    setLoading(false);
    
    // Ipakita ang pop-up reminder modal bago mag-redirect sa store
    setShowReminderModal(true);
  };

  const handleProceedToStore = () => {
    router.push('/store');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'}`}>
      
      {/* Navigation Actions sa top-right corner */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Link 
          href="/"
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
        >
          <span>←</span>
          <span>Home</span>
        </Link>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 shadow-sm cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div className={`p-8 md:p-10 rounded-3xl border shadow-xl max-w-md w-full transition-all duration-300 ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/50' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        
        {/* Logo/Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/30">
            E
          </div>
          <h1 className="text-xl font-black tracking-tight">EduDepot PH</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold tracking-tight mb-1">Gumawa ng Account</h2>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Magsimula kaagad sa pag-download ng teaching materials
          </p>
        </div>
        
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-2xl mb-5 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Buong Pangalan
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full border rounded-2xl p-3.5 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full border rounded-2xl p-3.5 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              placeholder="teacher@deped.gov.ph"
            />
          </div>

          {/* Password Field na may View/Hide icon */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full border rounded-2xl p-3.5 pr-10 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? 'Itago' : 'Ipakita'}
              </button>
            </div>
          </div>

          {/* Confirm Password Field na may View/Hide icon */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Kumpirmahin ang Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full border rounded-2xl p-3.5 pr-10 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showConfirmPassword ? 'Itago' : 'Ipakita'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl text-xs transition mt-2 disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gumagawa ng Account...</span>
              </>
            ) : (
              <span>Mag-Sign Up</span>
            )}
          </button>
        </form>

        <div className={`mt-6 pt-5 border-t text-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            May account ka na ba?{' '}
            <Link 
              href="/auth/login" 
              className="font-bold text-blue-500 hover:text-blue-400 hover:underline"
            >
              Log In dito
            </Link>
          </p>
        </div>
      </div>

      {/* POP-UP NOTIFICATION / MODAL REMINDER PARA SA CREENTIALS */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`max-w-sm w-full p-6 rounded-3xl border shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold mb-4 mx-auto">
              💡
            </div>
            <h3 className="text-base font-bold text-center mb-2">Paalala sa iyong Account!</h3>
            <p className={`text-xs text-center mb-5 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Matagumpay na nagawa ang iyong account. Mangyaring <strong className="text-amber-400">tandaan, isulat, o picturan</strong> ang iyong Email at Password para hindi mo ito makalimutan sa susunod mong pag-login.
            </p>

            {/* Box kung saan makikita nila ang kanilang nilagay */}
            <div className={`p-3.5 rounded-2xl text-xs mb-5 border space-y-1 ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Password:</strong> {password}</p>
            </div>

            <button
              onClick={handleProceedToStore}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-blue-600/25"
            >
              Naiintindihan ko na, Pumunta sa Store →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}