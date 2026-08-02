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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'customer',
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // 💡 I-redirect pabalik sa /store para mabuksan agad ang modal!
    router.push('/store'); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl border shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">Gumawa ng Account</h1>
        
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buong Pangalan</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="teacher@deped.gov.ph"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition"
          >
            {loading ? 'Gumagawa ng Account...' : 'Sign Up'}
          </button>
        </form>

        {/* 💡 INAYOS NA ROUTE PATH SA LOG IN LINK (/auth/login) */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-sm text-gray-600">
            May account ka na ba?{' '}
            <Link 
              href="/auth/login" 
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Log In dito
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}