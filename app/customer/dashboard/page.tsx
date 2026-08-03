'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface Order {
  id: string;
  resource_id: string;
  status: 'pending' | 'approved' | 'rejected';
  gcash_ref_number?: string;
  resources: Resource;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Theme State (Dark / Light Mode)
  const [darkMode, setDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'store' | 'purchases' | 'chat'>('store');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Checkout Modal State
  const [selectedItem, setSelectedItem] = useState<Resource | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_UUID || 'ADMIN_UUID_DITO'; // Ilagay ang Admin UUID o kunin dynamic

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setResources(data || []);
  };

  const fetchMyOrders = useCallback(async (userEmail: string) => {
    if (!userEmail) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*, resources(*)')
      .eq('buyer_email', userEmail)
      .order('created_at', { ascending: false });

    if (!error) setMyOrders(data || []);
  }, []);

  // Fetch Chat History & Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    // Realtime Listener para sa chat
    const channel = supabase
      .channel('teacher-chat-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      await Promise.all([
        fetchResources(),
        fetchMyOrders(currentUser.email || ''),
      ]);

      setLoading(false);
    };

    checkUser();
  }, [router, fetchMyOrders]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedItem || !user) return;

    const isFree = selectedItem.price === 0;
    const cleanRefNumber = refNumber.trim();

    if (!isFree && cleanRefNumber.length < 8) {
      setErrorMessage('Mangyaring maglagay ng valid na GCash Reference Number (at least 8 digits).');
      return;
    }

    const existing = myOrders.find((o) => o.resource_id === selectedItem.id);
    if (existing && existing.status !== 'rejected') {
      setErrorMessage('May umiiral ka nang order o kopya para sa material na ito.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('orders').insert([
      {
        resource_id: selectedItem.id,
        buyer_name: user.user_metadata?.full_name || user.email,
        buyer_email: user.email,
        gcash_ref_number: isFree ? 'FREE_ITEM' : cleanRefNumber,
        amount: selectedItem.price,
        status: isFree ? 'approved' : 'pending',
      },
    ]);

    setSubmitting(false);

    if (error) {
      setErrorMessage('Nagka-error sa pag-process: ' + error.message);
    } else {
      setOrderSuccess(true);
      setRefNumber('');
      fetchMyOrders(user.email);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: user.id,
        receiver_id: 'admin', // O pwede ring specific admin UUID
        content: newMessage,
      },
    ]);

    if (!error) {
      setNewMessage('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-medium transition-colors ${darkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>I-na-load ang Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Top Navbar */}
      <header className={`border-px px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/30">
              E
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">EduDepot PH</h1>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Welcome, Teacher {user?.user_metadata?.full_name || user?.email}!
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Actions: Home Link, Theme Toggle & Logout */}
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

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/20 transition cursor-pointer shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Navigation Tabs (Idinagdag ang Support Chat Tab) */}
        <div className={`flex gap-6 border-b mb-8 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('store')}
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'store'
                ? 'border-blue-600 text-blue-500'
                : darkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>📚 Storefront / Materials</span>
          </button>
          
          <button
            onClick={() => setActiveTab('purchases')}
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'purchases'
                ? 'border-blue-600 text-blue-500'
                : darkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>📦 My Purchased Materials</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${darkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              {myOrders.filter((o) => o.status === 'approved').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'border-blue-600 text-blue-500'
                : darkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>💬 Support Chat sa Admin</span>
          </button>
        </div>

        {/* TAB 1: STOREFRONT */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((item) => {
              const existingOrder = myOrders.find(
                (o) => o.resource_id === item.id
              );
              const isApproved = existingOrder?.status === 'approved';
              const isPending = existingOrder?.status === 'pending';
              const isRejected = existingOrder?.status === 'rejected';

              return (
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

                    {isApproved ? (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                      >
                        <span>Download</span>
                        <span>➔</span>
                      </a>
                    ) : isPending ? (
                      <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-3.5 py-2 rounded-xl border border-amber-500/25">
                        Pending Verification
                      </span>
                    ) : isRejected ? (
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setErrorMessage('');
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-rose-600/20"
                      >
                        Mag-order Muli
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setErrorMessage('');
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-blue-600/25"
                      >
                        {item.price > 0 ? 'Bumili' : 'Get Free'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: MY PURCHASES */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <div className={`rounded-3xl p-10 text-center border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                Wala ka pang nabibiling material.
              </div>
            ) : (
              myOrders.map((order) => (
                <div
                  key={order.id}
                  className={`border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                >
                  <div>
                    <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {order.resources?.title || 'Material'}
                    </h3>
                    <p className={`text-xs mt-1 font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      GCash Ref: {order.gcash_ref_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    {order.status === 'approved' ? (
                      <a
                        href={order.resources?.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 inline-block"
                      >
                        Download File
                      </a>
                    ) : order.status === 'rejected' ? (
                      <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 inline-block">
                        Rejected / Payment Failed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 inline-block">
                        Waiting for Admin Approval
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: SUPPORT CHAT SA ADMIN */}
        {activeTab === 'chat' && (
          <div className={`border rounded-3xl p-6 shadow-xl flex flex-col h-[550px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b mb-4 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Real-time Direct Chat kay Admin</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Magtanong tungkol sa iyong order o bayad. Sasagot agad ang admin dito.
                </p>
              </div>
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>

            {/* Listahan ng Mensahe */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 my-auto py-20">
                  Wala pang mensahe. Simulan nang mag-chat sa ibaba!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3.5 rounded-2xl text-xs max-w-[75%] leading-relaxed ${
                      msg.sender_id === user?.id
                        ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                        : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="I-type ang iyong concern o mensahe dito..."
                className={`flex-1 border rounded-2xl p-3.5 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-2xl text-xs font-bold transition cursor-pointer shadow-md shadow-blue-600/25"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* CHECKOUT MODAL */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setOrderSuccess(false);
                  setErrorMessage('');
                }}
                className={`absolute top-5 right-5 font-bold cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
              >
                ✕
              </button>

              {!orderSuccess ? (
                <>
                  <h2 className="text-xl font-black tracking-tight mb-1">
                    Checkout Order
                  </h2>
                  <p className={`text-xs mb-5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedItem.title}
                  </p>

                  {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-2xl mb-4 font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {selectedItem.price > 0 && (
                    <div className={`border rounded-2xl p-4 mb-5 text-xs ${darkMode ? 'bg-blue-950/40 border-blue-900/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                      <p className="font-bold mb-1.5 text-sm">GCash Payment Details:</p>
                      <p className="mb-1">
                        Number:{' '}
                        <span className="font-mono font-bold">09XX-XXX-XXXX</span>
                      </p>
                      <p className="mb-2">
                        Name: <span className="font-semibold">EduDepot PH</span>
                      </p>
                      <p className="font-black text-emerald-500 text-sm pt-1 border-t border-blue-500/20">
                        Amount: ₱{selectedItem.price.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    {selectedItem.price > 0 && (
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                          GCash Reference Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1002345678"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className={`w-full border rounded-2xl p-3.5 text-xs focus:outline-none focus:border-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl text-xs transition mt-2 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>I-pinoproseso...</span>
                        </>
                      ) : (
                        <span>Kumpirmahin ang Order</span>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-emerald-500/10">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    Order Submitted!
                  </h3>
                  <p className={`text-xs mb-6 font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Nareceive na namin ang order mo.{' '}
                    {selectedItem.price > 0
                      ? 'Mag-appear ito sa "My Purchased Materials" tab kapag na-approve na ng Admin.'
                      : 'Maaari mo na itong i-download agad!'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setOrderSuccess(false);
                      setActiveTab('purchases');
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-xs font-bold cursor-pointer transition shadow-md shadow-blue-600/25"
                  >
                    Tingnan sa Purchases
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