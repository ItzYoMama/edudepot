'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Resource {
  id: string;
  title: string;
  description: string;
  subject?: string;
  grade_level?: string;
  price: number;
  category: string;
  file_url: string;
  file_path?: string;
  created_at: string;
}

interface Order {
  id: string;
  resource_id: string;
  buyer_name: string;
  buyer_email: string;
  status: 'pending' | 'approved' | 'rejected';
  gcash_ref_number?: string;
  amount: number;
  created_at: string;
  resources: Resource;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'upload' | 'resources'>('orders');

  // Upload Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('Learning Modules');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, resources(*)')
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
  }, []);

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setResources(data);
  }, []);

  const checkAdminSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/admin/login');
      return;
    }

    const currentUser = session.user;
    const userRole = currentUser.user_metadata?.role;

    if (userRole !== 'admin') {
      await supabase.auth.signOut();
      router.push('/admin/login');
      return;
    }

    setUser(currentUser);
    await fetchOrders();
    await fetchResources();
    setLoading(false);
  }, [router, fetchOrders, fetchResources]);

  useEffect(() => {
    checkAdminSession();
  }, [checkAdminSession]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();

      if (error) throw error;

      fetchOrders();
    } catch (error: any) {
      console.error('Update order error:', error);
      alert('Error updating status: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!file || !title || price === '') {
      setStatusMessage({
        type: 'error',
        text: 'Pakisagutan ang lahat ng required fields (Title, Price, at File) at pumili ng file.',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('educational-resources')
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('educational-resources')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('resources').insert([
        {
          title,
          description,
          subject,
          grade_level: gradeLevel,
          price: Number(price),
          category,
          file_url: urlData.publicUrl,
          file_path: filePath,
        },
      ]);

      if (dbError) throw dbError;

      setStatusMessage({
        type: 'success',
        text: 'Matagumpay na na-upload at na-publish ang Learning Material!',
      });

      setTitle('');
      setDescription('');
      setSubject('');
      setGradeLevel('');
      setPrice('');
      setCategory('Learning Modules');
      setFile(null);

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchResources();
      fetchOrders();
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatusMessage({
        type: 'error',
        text: error.message || 'Nagkaroon ng error sa pag-upload. Pakisubukan muli.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (id: string, filePath?: string) => {
    if (!confirm('Sigurado ka bang gusto mong burahin ang resource na ito?')) return;

    try {
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('educational-resources')
          .remove([filePath]);
        
        if (storageError) {
          console.warn('Storage delete warning:', storageError.message);
        }
      }

      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: 'Naisagawa nang maayos ang pagbura ng resource.',
      });
      fetchResources();
    } catch (error: any) {
      console.error('Delete resource error:', error);
      alert('Error in deleting resource: ' + (error.message || 'Unknown error'));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Bine-verify ang Admin Access...</p>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-6 py-4 flex justify-between items-center shadow-xs backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            E
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">EduDepot PH</h1>
            <p className="text-[11px] text-slate-500 truncate max-w-[180px] md:max-w-none">
              Admin Portal • <span className="font-medium text-slate-700">{user?.email}</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200/60 hover:bg-rose-100 font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer active:scale-95"
        >
          Logout
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Navigation Tabs - Responsive Scrollable on Mobile */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📋 Orders</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600 font-extrabold'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap active:scale-95 ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📤 Upload Material
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap active:scale-95 ${
              activeTab === 'resources'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📚 Resources ({resources.length})
          </button>
        </div>

        {/* TAB 1: MANAGE ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 shadow-xs">
                Wala pang mga order sa ngayon.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:border-slate-300"
                >
                  <div className="space-y-1 w-full md:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">
                        {order.resources?.title || 'Learning Material'}
                      </h3>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        ₱{order.amount?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Buyer: <span className="font-semibold text-slate-700">{order.buyer_name}</span> ({order.buyer_email})
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      GCash Ref: <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{order.gcash_ref_number || 'N/A'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                    {order.status === 'pending' ? (
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                          className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs shadow-emerald-600/20 active:scale-95 text-center"
                        >
                          Approve ✓
                        </button>
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                          className="flex-1 md:flex-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 text-center"
                        >
                          Reject ✕
                        </button>
                      </div>
                    ) : order.status === 'approved' ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: UPLOAD MATERIAL */}
        {activeTab === 'upload' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-900">Mag-upload ng Bagong Material</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ilagay ang detalye at i-attach ang learning resource file.</p>
            </div>

            {statusMessage && (
              <div className={`p-4 mb-6 rounded-xl text-xs font-medium border flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                <span>{statusMessage.text}</span>
                <button onClick={() => setStatusMessage(null)} className="font-bold opacity-60 hover:opacity-100 cursor-pointer">✕</button>
              </div>
            )}

            <form onSubmit={handleUploadResource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Title / Pamagat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Hal. Grade 7 Math Module"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Ilarawan ang nilalaman ng material..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subject</label>
                  <input
                    type="text"
                    placeholder="Hal. Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Grade Level</label>
                  <input
                    type="text"
                    placeholder="Hal. Grade 7"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Price (₱) (0 kung Libre) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition cursor-pointer"
                  >
                    <option value="Learning Modules">Learning Modules</option>
                    <option value="Test Banks">Test Banks</option>
                    <option value="Lesson Plans">Lesson Plans</option>
                    <option value="Worksheets">Worksheets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attachment File <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition text-center">
                  <input
                    id="file-input"
                    type="file"
                    required
                    accept=".pdf,.docx,.doc,.zip"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">Suportadong formats: PDF, DOCX, DOC, ZIP</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl text-xs transition mt-2 disabled:opacity-50 shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                {uploading ? 'Nag-a-upload sa Storage...' : '🚀 I-publish ang Material'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: VIEW ALL RESOURCES */}
        {activeTab === 'resources' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Lahat ng Nakalapag na Resources</h3>
            {resources.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Wala pang na-upload na materials.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Title</th>
                      <th className="py-3 px-3">Subject / Grade</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {resources.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-3 font-semibold text-slate-900">
                          {item.title}
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-500">
                          {item.subject || 'N/A'} {item.grade_level ? `(${item.grade_level})` : ''}
                        </td>
                        <td className="py-4 px-3">
                          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-800">₱{item.price}</td>
                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition"
                            >
                              View ↗
                            </a>
                            <button
                              onClick={() => handleDeleteResource(item.id, item.file_path)}
                              className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-95"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}