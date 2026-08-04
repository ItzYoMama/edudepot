'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  price: number;
  file_url: string;
}

export default function StorePage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Fake modal state (para sa non-logged in users)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Resource | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setResources(data || []);
      setLoading(false);
    };

    init();
  }, []);

  const handleBuyClick = (item: Resource) => {
    if (!user) {
      // Hindi naka-login → ipakita ang login prompt
      setSelectedItem(item);
      setShowLoginPrompt(true);
      return;
    }
    // Naka-login na → punta sa customer dashboard
    router.push('/customer/dashboard');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-medium transition-colors ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>I-na-load ang Store...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar - Pareho sa Customer Dashboard */}
      <header className={`border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/30">
              E
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">EduDepot PH</h1>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {user 
                  ? `Welcome, Teacher ${user?.user_metadata?.full_name || user?.email}!` 
                  : 'Learning Materials Store'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Link 
            href="/"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
          >
            <span>←</span>
            <span>Home</span>
          </Link>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 shadow-sm cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {user ? (
            <Link
              href="/customer/dashboard"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
            >
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            📚 Storefront / Materials
          </h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {user 
              ? 'Pumunta sa Dashboard para makabili at ma-download ang materials.'
              : 'Mag-browse ng materials. Kailangan mag-login para makabili.'
            }
          </p>
        </div>

        {/* Storefront Grid - KAPAREHO ng Customer Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.length === 0 ? (
            <div className={`col-span-full rounded-3xl p-10 text-center border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
              Wala pang available na materials.
            </div>
          ) : (
            resources.map((item) => (
              <div
                key={item.id}
                className={`border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all duration-300 ${darkMode ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-md'}`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold px-3 py-1 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                      {item.subject}
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.grade_level}
                    </span>
                  </div>
                  <h2 className={`text-base font-bold mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {item.title}
                  </h2>
                  <p className={`text-xs line-clamp-3 mb-6 font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.description}
                  </p>
                </div>

                <div className={`border-t pt-4 mt-auto flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div>
                    <span className={`text-[10px] block uppercase font-bold tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Presyo
                    </span>
                    <span className={`text-base font-black ${item.price > 0 ? 'text-emerald-500' : 'text-blue-500'}`}>
                      {item.price > 0 ? `₱${item.price.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleBuyClick(item)}
                    className={`font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md ${
                      user
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                        : 'bg-slate-600 hover:bg-slate-500 text-white shadow-slate-600/25'
                    }`}
                  >
                    {user 
                      ? (item.price > 0 ? 'Bumili' : 'Get Free') 
                      : '🔒 Login to Buy'
                    }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LOGIN PROMPT MODAL (kapag hindi naka-login) */}
      {showLoginPrompt && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <button
              onClick={() => {
                setShowLoginPrompt(false);
                setSelectedItem(null);
              }}
              className={`absolute top-5 right-5 font-bold cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
            >
              ✕
            </button>

            <div className="text-center py-4">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                🔒
              </div>
              <h3 className="text-lg font-bold mb-2">
                Login Required
              </h3>
              <p className={`text-xs mb-2 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Gusto mong bilhin:
              </p>
              <p className={`text-sm font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {selectedItem.title}
              </p>
              <p className={`text-xs mb-6 font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Kailangan mong mag-login muna para makabili at ma-download ang learning materials.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-md shadow-blue-600/25 text-center"
                >
                  Login / Mag-register
                </Link>
                <button
                  onClick={() => {
                    setShowLoginPrompt(false);
                    setSelectedItem(null);
                  }}
                  className={`w-full font-bold py-3 rounded-2xl text-xs transition border ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Mag-browse pa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}