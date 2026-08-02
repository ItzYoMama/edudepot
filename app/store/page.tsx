'use client';

import { useEffect, useState } from 'react';
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

export default function StorePage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

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

    // 1. Kuhanin ang kasalukuyang session
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    // 2. I-fetch ang mga resources
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      const items: Resource[] = data || [];
      setResources(items);

      // 3. KUNG GALING SA SIGNUP AT MAY PENDING ITEM:
      const pendingItemId = localStorage.getItem('pending_checkout_item_id');
      
      // Papasukin LANG sa checkout kung TUNAY na may user session
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

  // 💡 FUNCTION PAG-CLICK NG BUMILI / DOWNLOAD
  const handleItemAction = (item: Resource) => {
    // KUNG WALANG NAKA-LOG IN NA USER:
    if (!currentUser) {
      // Save item ID sa local storage
      localStorage.setItem('pending_checkout_item_id', item.id);
      // I-redirect sa Sign Up page
      router.push('/signup');
      return;
    }

    // KUNG NAKA-LOG IN:
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">EduDepot PH Store</h1>
            <p className="text-gray-600 mt-1">High-Quality DepEd Teaching & Learning Materials</p>
          </div>

          {/* User Status / Auth Buttons */}
          <div>
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-medium">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/login')}
                  className="text-xs font-semibold text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Mag-search ng material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 p-3 text-gray-800 focus:outline-none focus:border-blue-500 shadow-sm"
          />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-lg border border-gray-300 p-3 text-gray-800 focus:outline-none focus:border-blue-500 shadow-sm bg-white"
          >
            <option value="All">Lahat ng Subjects</option>
            <option value="English">English</option>
            <option value="Math">Math</option>
            <option value="Science">Science</option>
            <option value="Filipino">Filipino</option>
            <option value="Araling Panlipunan">Araling Panlipunan</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">I-na-load ang mga materials...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {item.subject || 'General'}
                    </span>
                    <span className="text-xs text-gray-500">{item.grade_level || 'All Levels'}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h2>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">{item.description}</p>
                </div>

                <div className="border-t pt-4 mt-auto flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 block">Presyo</span>
                    <span className="text-lg font-bold text-green-600">
                      {item.price > 0 ? `₱${item.price.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleItemAction(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
                  >
                    {item.price > 0 ? 'Bumili' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHECKOUT MODAL (Bubukas LANG kapag may currentUser) */}
        {selectedItem && currentUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                ✕
              </button>

              {!orderSuccess ? (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Checkout Order</h2>
                  <p className="text-sm text-gray-600 mb-4">{selectedItem.title}</p>

                  {/* Payment Details */}
                  {selectedItem.price > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-900">
                      <p className="font-semibold mb-1">GCash Payment Details:</p>
                      <p>Number: <span className="font-mono font-bold">09XX-XXX-XXXX</span></p>
                      <p>Name: <span className="font-semibold">EduDepot PH</span></p>
                      <p className="mt-1 font-semibold text-green-700">Halaga: ₱{selectedItem.price.toFixed(2)}</p>
                    </div>
                  )}

                  <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pangalan ng Guro</label>
                      <input
                        type="text"
                        required
                        placeholder="Juan Dela Cruz"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full border rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (kung saan isesend)</label>
                      <input
                        type="email"
                        required
                        placeholder="teacher@deped.gov.ph"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full border rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 bg-gray-50"
                      />
                    </div>

                    {selectedItem.price > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">GCash Reference Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., 1002345678"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-sm mt-2 transition"
                    >
                      {submitting ? 'Isinesend...' : 'Kumpirmahin ang Order'}
                    </button>
                  </form>
                </>
              ) : (
                /* Success View */
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Maraming Salamat, Teacher!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Nareceived na namin ang order mo. Kapag na-verify ang payment, ipapadala ang download link sa iyong email.
                  </p>
                  <button
                    onClick={closeModal}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium"
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