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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  
  // Theme State (Dark / Light)
  const [darkMode, setDarkMode] = useState(false);

  // State para sa kasalukuyang naka-log in na user
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Checkout Modal States
  const [selectedItem, setSelectedItem] = useState<Resource | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      const items: Resource[] = data || [];
      setResources(items);

      const pendingItemId = localStorage.getItem('pending_checkout_item_id');
      if (pendingItemId && user) {
        const foundItem = items.find((item) => item.id === pendingItemId);
        if (foundItem) {
          setBuyerEmail(user.email || '');
          setBuyerName(user.user_metadata?.full_name || '');
          setSelectedItem(foundItem);
        }
        localStorage.removeItem('pending_checkout_item_id');
      }
    }
    setLoading(false);
  };

  const handleItemAction = (item: Resource) => {
    if (!currentUser) {
      localStorage.setItem('pending_checkout_item_id', item.id);
      router.push('/signup');
      return;
    }

    setBuyerEmail(currentUser.email || '');
    setBuyerName(currentUser.user_metadata?.full_name || '');
    setSelectedItem(item);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !currentUser) return;

    setSubmitting(true);

    const { error } = await supabase.from('orders').insert([
      {
        resource_id: selectedItem.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        gcash_ref_number: refNumber,
        amount: selectedItem.price,
        status: selectedItem.price === 0 ? 'approved' : 'pending',
      },
    ]);

    setSubmitting(false);

    if (error) {
      alert('May problema sa pagproseso: ' + error.message);
    } else {
      setOrderSuccess(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedItem(null);
    router.refresh();
  };

  const closeModal = () => {
    setSelectedItem(null);
    setBuyerName('');
    setBuyerEmail('');
    setRefNumber('');
    setOrderSuccess(false);
  };

  const filteredResources = resources.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      selectedSubject === 'All' || item.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className={`min-h-screen font-sans p-6 md:p-10 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* NAVIGATION: BACK TO HOME & THEME TOGGLE */}
        <div className="flex justify-between items-center mb-8">
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

        {/* HEADER */}
        <header className={`mb-10 border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
                E
              </div>
              <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>EduDepot PH Store</h1>
            </div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">High-Quality DepEd Teaching & Learning Materials</p>
          </div>

          {/* User Status / Auth Buttons */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-xs font-medium truncate max-w-[200px] text-slate-400">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition border shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-bold text-white bg-blue-600 px-4 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Mag-search ng material o paksa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 border rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:border-blue-500 transition shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
          />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={`border rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:border-blue-500 transition shadow-sm cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="All" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Lahat ng Subjects</option>
            <option value="English" className={darkMode ? 'bg-slate-900' : 'bg-white'}>English</option>
            <option value="Math" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Math</option>
            <option value="Science" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Science</option>
            <option value="Filipino" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Filipino</option>
            <option value="Araling Panlipunan" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Araling Panlipunan</option>
          </select>
        </div>

        {/* GRID */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-xs font-semibold tracking-wider uppercase">
            Ina-load ang mga materials...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs font-semibold tracking-wider uppercase">
            Walang nakitang teaching materials.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((item) => (
              <div 
                key={item.id} 
                className={`border rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/80'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full uppercase tracking-wider">
                      {item.subject || 'General'}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${darkMode ? 'bg-slate-950 text-slate-400 border border-slate-800' : 'bg-slate-100 text-slate-500'}`}>
                      {item.grade_level || 'All Levels'}
                    </span>
                  </div>
                  <h2 className={`text-base font-bold mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h2>
                  <p className={`text-xs line-clamp-3 mb-6 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.description}</p>
                </div>

                <div className={`border-t pt-4 mt-auto flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">Presyo</span>
                    <span className="text-base font-black text-emerald-500">
                      {item.price > 0 ? `₱${item.price.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleItemAction(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    {item.price > 0 ? 'Bumili' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHECKOUT MODAL */}
        {selectedItem && currentUser && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
              <button 
                onClick={closeModal} 
                className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-xs transition cursor-pointer ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
              >
                ✕
              </button>

              {!orderSuccess ? (
                <>
                  <h2 className="text-lg font-bold mb-1">Checkout Order</h2>
                  <p className="text-xs text-slate-400 mb-5">{selectedItem.title}</p>

                  {/* Payment Details */}
                  {selectedItem.price > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 text-xs text-blue-300 space-y-1.5">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-blue-400 mb-1">GCash Payment Details:</p>
                      <p>Number: <span className="font-mono font-bold text-white">09XX-XXX-XXXX</span></p>
                      <p>Name: <span className="font-bold text-white">EduDepot PH</span></p>
                      <p className="pt-1 font-bold text-emerald-400 text-sm">Halaga: ₱{selectedItem.price.toFixed(2)}</p>
                    </div>
                  )}

                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pangalan ng Guro</label>
                      <input
                        type="text"
                        required
                        placeholder="Juan Dela Cruz"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address (kung saan isesend)</label>
                      <input
                        type="email"
                        required
                        placeholder="teacher@deped.gov.ph"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                      />
                    </div>

                    {selectedItem.price > 0 && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">GCash Reference Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., 1002345678"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs mt-2 transition cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Isinesend ang order...</span>
                        </>
                      ) : (
                        <span>Kumpirmahin ang Order</span>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Success View */
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black">
                    ✓
                  </div>
                  <h3 className="text-base font-bold mb-2">Maraming Salamat, Teacher!</h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed px-4">
                    Nareceived na namin ang order mo. Kapag na-verify ang payment, ipapadala ang download link sa iyong email.
                  </p>
                  <button
                    onClick={closeModal}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                  >
                    Isara
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}