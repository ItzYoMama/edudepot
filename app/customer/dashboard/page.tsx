'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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

  const [activeTab, setActiveTab] = useState<'store' | 'purchases'>('store');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Checkout Modal State
  const [selectedItem, setSelectedItem] = useState<Resource | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

    // Check if order already exists to avoid duplication
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
        I-na-load ang Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">EduDepot PH</h1>
          <p className="text-xs text-slate-500">
            Welcome, Teacher {user?.user_metadata?.full_name || user?.email}!
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition"
        >
          Logout
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab('store')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'store'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📚 Storefront / Materials
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === 'purchases'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 My Purchased Materials (
            {myOrders.filter((o) => o.status === 'approved').length})
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

              return (
                <div
                  key={item.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {item.subject}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.grade_level}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">
                      {item.title}
                    </h2>
                    <p className="text-slate-500 text-xs line-clamp-3 mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="border-t pt-4 mt-auto flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Presyo
                      </span>
                      <span className="text-base font-bold text-emerald-600">
                        {item.price > 0 ? `₱${item.price.toFixed(2)}` : 'FREE'}
                      </span>
                    </div>

                    {isApproved ? (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Download ➔
                      </a>
                    ) : isPending ? (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl border border-amber-200">
                        Pending Verification
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setErrorMessage('');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
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
              <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border">
                Wala ka pang nabibiling material.
              </div>
            ) : (
              myOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {order.resources?.title || 'Material'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      GCash Ref: {order.gcash_ref_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    {order.status === 'approved' ? (
                      <a
                        href={order.resources?.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                      >
                        Download File
                      </a>
                    ) : order.status === 'rejected' ? (
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg">
                        Rejected / Payment Failed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg">
                        Waiting for Admin Approval
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CHECKOUT MODAL */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative border">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setOrderSuccess(false);
                  setErrorMessage('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>

              {!orderSuccess ? (
                <>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">
                    Checkout Order
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    {selectedItem.title}
                  </p>

                  {errorMessage && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4">
                      {errorMessage}
                    </div>
                  )}

                  {selectedItem.price > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-900">
                      <p className="font-bold mb-1">GCash Payment Details:</p>
                      <p>
                        Number:{' '}
                        <span className="font-mono font-bold">09XX-XXX-XXXX</span>
                      </p>
                      <p>
                        Name: <span className="font-semibold">EduDepot PH</span>
                      </p>
                      <p className="mt-1 font-bold text-emerald-700">
                        Amount: ₱{selectedItem.price.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                    {selectedItem.price > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          GCash Reference Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1002345678"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className="w-full border rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition mt-2 disabled:opacity-50"
                    >
                      {submitting
                        ? 'I-pinoproseso...'
                        : 'Kumpirmahin ang Order'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    Order Submitted!
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
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
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
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