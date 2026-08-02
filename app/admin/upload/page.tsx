'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminUploadPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Kung walang session o hindi admin ang role, ibalik sa admin login
      if (!session || session.user.user_metadata?.role !== 'admin') {
        router.push('/admin/login');
      } else {
        setAdminUser(session.user);
        setCheckingAuth(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Logout Function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">
        Sinusuri ang Admin Access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">EduDepot PH</h1>
          <p className="text-xs text-gray-500">
            Logged in as Admin: <span className="font-semibold">{adminUser?.email}</span>
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Upload Learning Materials</h2>
          <p className="text-sm text-gray-500 mb-6">
            Dito mo pwedeng i-upload ang mga bagong resources, modules, at test banks para sa storefront.
          </p>

          {/* Dito ilalagay ang iyong Upload Form */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
            <p className="text-gray-500 text-sm">Form for uploading resources goes here...</p>
          </div>
        </div>
      </main>
    </div>
  );
}