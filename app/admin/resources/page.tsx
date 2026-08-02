'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Resource {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  price: number;
  created_at: string;
}

export default function AdminResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Route protection
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdminLoggedIn');
    if (!isAdmin) {
      router.push('/admin/login');
    } else {
      fetchResources();
    }
  }, [router]);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`Sigurado ka bang gusto mong burahin ang "${title}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('resources').delete().eq('id', id);

    if (error) {
      alert('Error sa pagbura: ' + error.message);
    } else {
      setResources(resources.filter((item) => item.id !== id));
      alert('Matagumpay na nabura ang material!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin - Manage Materials</h1>
            <p className="text-sm text-gray-500">Listahan ng lahat ng naka-publish na learning materials</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
            >
              + Mag-add ng Bago
            </button>
            <button
              onClick={() => router.push('/store')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg border transition"
            >
              Tingnan sa Store ➔
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">I-na-load ang mga items...</div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Wala pang nai-upload na materials.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                  <th className="p-3">Title</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Price</th>
                  <th className="p-3 text-right">Aksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {resources.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{item.title}</td>
                    <td className="p-3">{item.subject}</td>
                    <td className="p-3">{item.grade_level}</td>
                    <td className="p-3 font-bold text-green-600">
                      {item.price > 0 ? `₱${item.price.toFixed(2)}` : 'FREE'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs font-medium transition border border-red-200"
                      >
                        Burahin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}