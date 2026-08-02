'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Resource {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  file_url: string;
  file_path: string;
  created_at: string;
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Form Input States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('Learning Modules');
  const [file, setFile] = useState<File | null>(null);

  // UI & Data States
  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        fetchResources();
      }
    };

    checkAdminAccess();
  }, [router]);

  // Fetch Existing Resources from Database
  const fetchResources = async () => {
    setLoadingResources(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResources(data);
    }
    setLoadingResources(false);
  };

  // Logout Function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // Upload Function
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title || price === '') {
      setStatusMessage({
        type: 'error',
        text: 'Pakisagutan ang lahat ng required fields at pumili ng file.',
      });
      return;
    }

    setUploading(true);
    setStatusMessage(null);

    try {
      // 1. Unique Filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // 2. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('educational-resources')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 3. Get Public URL
      const { data: urlData } = supabase.storage
        .from('educational-resources')
        .getPublicUrl(filePath);

      // 4. Insert to Database Table
      const { error: dbError } = await supabase.from('resources').insert([
        {
          title,
          description,
          price: Number(price),
          category,
          file_url: urlData.publicUrl,
          file_path: filePath,
          created_at: new Date().toISOString(),
        },
      ]);

      if (dbError) throw dbError;

      // Success Reset
      setStatusMessage({
        type: 'success',
        text: 'Matagumpay na na-upload ang bagong material!',
      });

      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('Learning Modules');
      setFile(null);

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh resource list
      fetchResources();
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

  // Delete Resource Function
  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Sigurado ka bang gusto mong burahin ang resource na ito?')) return;

    try {
      // Delete from Storage
      if (filePath) {
        await supabase.storage.from('educational-resources').remove([filePath]);
      }

      // Delete from Database
      const { error } = await supabase.from('resources').delete().eq('id', id);

      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: 'Naisagawas nang maayos ang pagbura ng resource.',
      });

      fetchResources();
    } catch (error: any) {
      alert('Error in deleting resource: ' + error.message);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium bg-gray-50">
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
            Logged in as Admin: <span className="font-semibold text-gray-700">{adminUser?.email}</span>
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
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Upload Form Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Upload Learning Materials</h2>
          <p className="text-sm text-gray-500 mb-6">
            Dito mo pwedeng i-upload ang mga bagong resources, modules, at test banks para sa storefront.
          </p>

          {statusMessage && (
            <div
              className={`p-4 mb-6 rounded-lg text-sm font-medium border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title / Pamagat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Halimbawa: Grade 10 Math Reviewer - Quarter 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Presyo (PHP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="150"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Learning Modules">Learning Modules</option>
                  <option value="Test Banks">Test Banks</option>
                  <option value="Lesson Plans">Lesson Plans</option>
                  <option value="Worksheets">Worksheets</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description (Opsyonal)</label>
              <textarea
                rows={2}
                placeholder="Maikling paglalarawan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Pumili ng File <span className="text-red-500">*</span>
              </label>
              <input
                id="file-input"
                type="file"
                required
                accept=".pdf,.docx,.doc,.zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm disabled:opacity-50"
            >
              {uploading ? 'Ina-upload...' : '🚀 Upload Material'}
            </button>
          </form>
        </div>

        {/* Existing Resources List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-md font-bold text-gray-800 mb-4">Uploaded Resources ({resources.length})</h3>

          {loadingResources ? (
            <p className="text-sm text-gray-500">Kina-karga ang mga resources...</p>
          ) : resources.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Wala pang na-upload na materials.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-3 px-2">Title</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Price</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {resources.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">{item.title}</td>
                      <td className="py-3 px-2">
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-semibold">₱{item.price}</td>
                      <td className="py-3 px-2 text-right space-x-2">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline font-semibold"
                        >
                          View File
                        </a>
                        <button
                          onClick={() => handleDelete(item.id, item.file_path)}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}