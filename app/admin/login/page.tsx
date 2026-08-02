'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. I-verify ang credentials gamit ang Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      setError('Maling Admin Email o Password!');
      return;
    }

    // 2. Suriin kung ganap na Admin ang Role sa metadata
    const userRole = data.user?.user_metadata?.role;

    if (userRole !== 'admin') {
      // Kung hindi Admin, i-sign out agad para ligtas
      await supabase.auth.signOut();
      setLoading(false);
      setError('Access Denied: Hindi ka nakarehistro bilang Admin.');
      return;
    }

    setLoading(false);
    // 3. I-redirect sa Admin Upload page
    router.push('/admin/upload');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">EduDepot PH</h1>
          <p className="text-sm text-gray-500">Secure Admin Portal Access</p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              placeholder="admin@edudepot.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Ina-authenticate...' : 'Login bilang Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}