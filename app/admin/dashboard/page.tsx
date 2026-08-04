'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  created_at: string;
}

interface ChatConversation {
  userId: string;
  name: string;
  email: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'upload' | 'resources' | 'logs' | 'chat'>('orders');
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; email: string } | null>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState<'all' | '3months' | '6months' | '1year'>('6months');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState(1);

  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<string>('all');
  const [resourcePage, setResourcePage] = useState(1);

  const itemsPerPage = 5;
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Upload states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('Learning Modules');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Storage
  const [storageUsedMB, setStorageUsedMB] = useState<number>(0);
  const storageLimitMB = 1024;
  const storagePercentage = Math.min(Math.round((storageUsedMB / storageLimitMB) * 100), 100);

  // Chat States
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<{ id: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const calculateStorageSize = useCallback(async () => {
    try {
      let totalBytes = 0;
      const { data, error } = await supabase.storage.from('educational-resources').list('uploads', {
        limit: 1000,
        offset: 0,
      });
      if (error) return;
      if (data && data.length > 0) {
        data.forEach((fileItem: any) => {
          if (fileItem.metadata && fileItem.metadata.size) {
            totalBytes += fileItem.metadata.size;
          }
        });
      }
      setStorageUsedMB(Number((totalBytes / (1024 * 1024)).toFixed(2)));
    } catch (err) {
      console.error('Error calculating storage size:', err);
    }
  }, []);

  const logActivity = useCallback(async (action: string, details: string) => {
    try {
      await supabase.from('activity_logs').insert([{ action, details }]);
      fetchLogs();
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase.from('orders').select('*, resources(*)').order('created_at', { ascending: false });
    if (!error) setOrders(data || []);
  }, []);

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    if (!error && data) setResources(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (!error) setLogs(data || []);
  }, []);

  // ==================== CHAT FUNCTIONS ====================
  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or('sender_id.eq.admin,receiver_id.eq.admin')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    const map = new Map<string, ChatConversation>();

    data.forEach((msg: any) => {
      const otherId = msg.sender_id === 'admin' ? msg.receiver_id : msg.sender_id;
      if (otherId === 'admin') return;

      if (!map.has(otherId)) {
        map.set(otherId, {
          userId: otherId,
          name: msg.customer_name || `Customer ${otherId.slice(0, 8)}...`,
          email: msg.customer_email || '',
          lastMessage: msg.content,
          lastAt: msg.created_at,
          unread: msg.receiver_id === 'admin' && !msg.is_read ? 1 : 0,
        });
      } else {
        const existing = map.get(otherId)!;
        if (msg.receiver_id === 'admin' && !msg.is_read) {
          existing.unread += 1;
        }
        if (msg.customer_name) existing.name = msg.customer_name;
        if (msg.customer_email) existing.email = msg.customer_email;
      }
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    setChatConversations(sorted);
  }, []);

  const loadChatMessages = useCallback(async (customerId: string) => {
    setChatLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${customerId},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${customerId})`)
      .order('created_at', { ascending: true });

    if (!error) setChatMessages(data || []);
    setChatLoading(false);

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', customerId)
      .eq('receiver_id', 'admin')
      .eq('is_read', false);

    fetchConversations();
  }, [fetchConversations]);

  const handleAdminSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChatUser) return;

    const content = chatInput.trim();
    setChatInput('');

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: 'admin',
        receiver_id: selectedChatUser.id,
        content,
      },
    ]);

    if (!error) {
      loadChatMessages(selectedChatUser.id);
      fetchConversations();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder: any = payload.new;
          setNotifications(prev => [`May bagong order mula kay ${newOrder.buyer_name || 'Customer'} (₱${newOrder.amount})`, ...prev]);
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg: any = payload.new;
          if (newMsg.receiver_id === 'admin') {
            setNotifications(prev => [`Bagong mensahe mula kay ${newMsg.customer_name || 'Customer'}`, ...prev]);
            fetchConversations();
            if (selectedChatUser && selectedChatUser.id === newMsg.sender_id) {
              loadChatMessages(selectedChatUser.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, fetchConversations, loadChatMessages, selectedChatUser]);

  const checkAdminSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/admin/login'); return; }
    const currentUser = session.user;
    if (currentUser.user_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      router.push('/admin/login');
      return;
    }
    setUser(currentUser);
    await fetchOrders();
    await fetchResources();
    await fetchLogs();
    await calculateStorageSize();
    await fetchConversations();
    setLoading(false);
  }, [router, fetchOrders, fetchResources, fetchLogs, calculateStorageSize, fetchConversations]);

  useEffect(() => { checkAdminSession(); }, [checkAdminSession]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'approved' | 'rejected', buyerEmail?: string, resourceTitle?: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      if (buyerEmail) {
        console.log(`[Email Notification Sent to ${buyerEmail}]: Your order for "${resourceTitle}" has been ${newStatus}.`);
      }
      await logActivity('UPDATE_ORDER', `Na-update ang order ID ${orderId} sa status na ${newStatus}`);
      fetchOrders();
    } catch (error: any) { alert('Error updating status: ' + (error.message || 'Unknown error')); }
  };

  const handleSelectAllOrders = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedOrderIds(paginatedOrders.map(o => o.id));
    else setSelectedOrderIds([]);
  };

  const handleSelectOrderCheckbox = (id: string) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`Sigurado ka bang gusto mong i-update ang ${selectedOrderIds.length} orders sa ${newStatus}?`)) return;
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', selectedOrderIds);
      if (error) throw error;
      await logActivity('BULK_UPDATE_ORDERS', `Minarhan ang ${selectedOrderIds.length} orders bilang ${newStatus}`);
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (error: any) { alert('Error in bulk update: ' + (error.message || 'Unknown error')); }
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Buyer Name', 'Email', 'Resource', 'Amount', 'GCash Ref', 'Status', 'Purchase Date'];
    const rows = filteredOrders.map(o => [
      o.id, `"${o.buyer_name}"`, o.buyer_email, `"${o.resources?.title || 'N/A'}"`, o.amount, o.gcash_ref_number || 'N/A', o.status,
      o.created_at ? `"${new Date(o.created_at).toLocaleString()}"` : 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `edudepot_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logActivity('EXPORT_CSV', `Nag-export ng ${filteredOrders.length} orders`);
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    if (!file || !title || price === '') {
      setStatusMessage({ type: 'error', text: 'Pakisagutan ang lahat ng required fields (Title, Price, at File).' });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedBaseName = file.name.substring(0, file.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}-${sanitizedBaseName}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error: storageError } = await supabase.storage.from('educational-resources').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (storageError) throw storageError;
      const { data: urlData } = supabase.storage.from('educational-resources').getPublicUrl(filePath);
      if (!urlData?.publicUrl) throw new Error('Hindi makuha ang public URL ng file.');
      const { error: dbError } = await supabase.from('resources').insert([{ title, description, subject, grade_level: gradeLevel, price: Number(price), category, file_url: urlData.publicUrl, file_path: filePath }]);
      if (dbError) throw dbError;
      await logActivity('UPLOAD_RESOURCE', `Nag-upload ng bagong material: ${title}`);
      setStatusMessage({ type: 'success', text: 'Matagumpay na na-upload at na-publish ang Learning Material!' });
      setTitle(''); setDescription(''); setSubject(''); setGradeLevel(''); setPrice(''); setCategory('Learning Modules'); setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchResources();
      await calculateStorageSize();
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message || 'Nagkaroon ng error sa pag-upload.' });
    } finally { setUploading(false); }
  };

  const handleDeleteResource = async (id: string, filePath?: string, resourceTitle?: string) => {
    if (!confirm('Sigurado ka bang gusto mong burahin ang resource na ito?')) return;
    try {
      if (filePath) await supabase.storage.from('educational-resources').remove([filePath]);
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
      await logActivity('DELETE_RESOURCE', `Binura ang resource: ${resourceTitle || id}`);
      setStatusMessage({ type: 'success', text: 'Naisagawa nang maayos ang pagbura ng resource.' });
      fetchResources();
      await calculateStorageSize();
    } catch (error: any) { alert('Error in deleting resource: ' + (error.message || 'Unknown error')); }
  };

  const handleLogout = async () => {
    await logActivity('LOGOUT', `Nag-log out ang admin: ${user?.email}`);
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const filteredOrders = useMemo(() => orders.filter(o => 
    (orderStatusFilter === 'all' || o.status === orderStatusFilter) &&
    (o.buyer_name?.toLowerCase().includes(orderSearch.toLowerCase()) || o.buyer_email?.toLowerCase().includes(orderSearch.toLowerCase()) || o.gcash_ref_number?.toLowerCase().includes(orderSearch.toLowerCase()) || o.resources?.title?.toLowerCase().includes(orderSearch.toLowerCase()))
  ), [orders, orderSearch, orderStatusFilter]);

  const paginatedOrders = useMemo(() => filteredOrders.slice((orderPage - 1) * itemsPerPage, orderPage * itemsPerPage), [filteredOrders, orderPage]);
  const totalOrderPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

  const filteredResources = useMemo(() => resources.filter(r => 
    (resourceCategoryFilter === 'all' || r.category === resourceCategoryFilter) &&
    (r.title?.toLowerCase().includes(resourceSearch.toLowerCase()) || r.subject?.toLowerCase().includes(resourceSearch.toLowerCase()) || r.grade_level?.toLowerCase().includes(resourceSearch.toLowerCase()))
  ), [resources, resourceSearch, resourceCategoryFilter]);

  const paginatedResources = useMemo(() => filteredResources.slice((resourcePage - 1) * itemsPerPage, resourcePage * itemsPerPage), [filteredResources, resourcePage]);
  const totalResourcePages = Math.ceil(filteredResources.length / itemsPerPage) || 1;

  const resourceSalesCountMap = useMemo(() => {
    const map: { [resourceId: string]: number } = {};
    orders.forEach(o => {
      if (o.status === 'approved' && o.resource_id) {
        map[o.resource_id] = (map[o.resource_id] || 0) + 1;
      }
    });
    return map;
  }, [orders]);

  const monthlyRevenueData = useMemo(() => {
    const monthsMap: { [key: string]: number } = {};
    const now = new Date();
    const countMonths = analyticsFilter === '1year' ? 12 : analyticsFilter === '3months' ? 3 : 6;
    for (let i = countMonths - 1; i >= 0; i--) { 
      monthsMap[new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })] = 0; 
    }
    orders.forEach(o => {
      if (o.status === 'approved' && o.created_at) {
        const label = new Date(o.created_at).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (monthsMap[label] !== undefined) monthsMap[label] += (o.amount || 0);
      }
    });
    const entries = Object.entries(monthsMap);
    const maxAmount = Math.max(...entries.map(e => e[1]), 100);
    return entries.map(([month, amount]) => ({ month, amount, percentage: Math.round((amount / maxAmount) * 100) }));
  }, [orders, analyticsFilter]);

  const customerHistoryList = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => o.buyer_email?.toLowerCase() === selectedCustomer.email.toLowerCase());
  }, [orders, selectedCustomer]);

  const totalUnreadChats = chatConversations.reduce((sum, c) => sum + c.unread, 0);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-semibold tracking-wider uppercase">Bine-verify ang Admin Access...</p>
    </div>
  );

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders.filter((o) => o.status === 'approved').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const selectedConv = chatConversations.find(c => c.userId === selectedChatUser?.id);

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* SIDEBAR */}
      <aside className={`flex flex-col justify-between border-r shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-full bg-slate-900 border-slate-800 text-slate-300 h-screen sticky top-0`}>
        <div>
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/25 shrink-0">E</div>
            {!isSidebarCollapsed && (
              <div className="truncate">
                <h1 className="text-sm font-bold text-white tracking-wide">EduDepot PH</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Admin Panel</p>
              </div>
            )}
          </div>

          <div className="py-4 overflow-y-auto">
            {!isSidebarCollapsed && <p className="px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Main Menu</p>}
            <nav className="px-4 space-y-1.5 mb-6">
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className="flex items-center gap-2.5"><span className="text-base">📋</span>{!isSidebarCollapsed && <span>Orders</span>}</span>
                {!isSidebarCollapsed && pendingCount > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-amber-500 text-slate-950'}`}>{pendingCount}</span>}
              </button>

              <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className="flex items-center gap-2.5"><span className="text-base">💬</span>{!isSidebarCollapsed && <span>Chat Support</span>}</span>
                {!isSidebarCollapsed && totalUnreadChats > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'chat' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'}`}>{totalUnreadChats}</span>}
              </button>
            </nav>

            {!isSidebarCollapsed && <p className="px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Content Management</p>}
            <nav className="px-4 space-y-1.5 mb-6">
              <button onClick={() => setActiveTab('upload')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'upload' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className="text-base">📤</span>{!isSidebarCollapsed && <span>Upload Material</span>}
              </button>
              <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className="flex items-center gap-2.5"><span className="text-base">📚</span>{!isSidebarCollapsed && <span>Resources List</span>}</span>
                {!isSidebarCollapsed && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{resources.length}</span>}
              </button>
            </nav>

            {!isSidebarCollapsed && <p className="px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">System & Settings</p>}
            <nav className="px-4 space-y-1.5">
              <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className="text-base">📜</span>{!isSidebarCollapsed && <span>Activity Logs</span>}
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/80 space-y-4">
          {!isSidebarCollapsed && (
            <div className="px-2 mb-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span>Database Storage</span>
                <span className={storagePercentage > 80 ? 'text-amber-500' : 'text-blue-400'}>{storagePercentage}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${storagePercentage > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${storagePercentage}%` }}></div>
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5">{storageUsedMB} MB of {storageLimitMB / 1024} GB used</p>
            </div>
          )}
          {!isSidebarCollapsed && (
            <div className="px-2 truncate pt-2 border-t border-slate-800/80">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Signed in as</p>
              <p className="text-xs font-medium text-slate-300 truncate mt-0.5">{user?.email}</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2">
            <span>🚪</span>{!isSidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className={`border-b px-6 py-4 flex justify-between items-center shadow-xs transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-2 rounded-xl transition cursor-pointer ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeTab === 'orders' && 'Customer Orders & Payment Verification'}
                {activeTab === 'upload' && 'New Educational Material Upload'}
                {activeTab === 'resources' && 'Manage Learning Resources'}
                {activeTab === 'logs' && 'System Activity Logs & Audit Trail'}
                {activeTab === 'chat' && 'Customer Chat Support'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className={`relative p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}>
                <span>🔔</span>
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{notifications.length}</span>}
              </button>
              {showNotifDropdown && (
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl z-50 p-3 space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                    <span className="text-xs font-bold">Realtime Notifications</span>
                    <button onClick={() => setNotifications([])} className="text-[10px] text-blue-400 hover:underline">Clear all</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? <p className="text-[11px] text-slate-400 text-center py-4">Walang bagong notification.</p> : notifications.map((notif, index) => (
                      <div key={index} className="p-2 rounded-xl text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20">{notif}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}>
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
              <span className="text-2xl font-black text-emerald-500 mt-2">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Orders</span>
              <span className="text-2xl font-black text-amber-500 mt-2">{pendingCount}</span>
            </div>
            <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Resources</span>
              <span className="text-2xl font-black text-blue-500 mt-2">{resources.length}</span>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className={`border rounded-2xl p-6 shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Monthly Revenue Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Kabuuang kita batay sa napiling saklaw ng panahon</p>
              </div>
              <select value={analyticsFilter} onChange={(e: any) => setAnalyticsFilter(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <option value="3months">Huling 3 Buwan</option>
                <option value="6months">Huling 6 Buwan</option>
                <option value="1year">Huling 1 Taon</option>
              </select>
            </div>
            <div className={`h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              {monthlyRevenueData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>₱{item.amount.toLocaleString()}</div>
                  <div style={{ height: `${Math.max(item.percentage, 6)}%` }} className="w-full max-w-[40px] bg-blue-600 group-hover:bg-blue-500 rounded-t-lg transition-all duration-300 shadow-sm shadow-blue-500/20"></div>
                  <span className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-[50px]">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== CHAT SUPPORT TAB ==================== */}
          {activeTab === 'chat' && (
            <div className={`border rounded-2xl shadow-xs overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <div className="flex flex-col md:flex-row h-[600px]">
                {/* Conversations List */}
                <div className={`w-full md:w-80 border-r flex flex-col ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Conversations</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{chatConversations.length} customers</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {chatConversations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">Wala pang chat conversations.</div>
                    ) : (
                      chatConversations.map((conv) => (
                        <button
                          key={conv.userId}
                          onClick={() => {
                            setSelectedChatUser({ id: conv.userId });
                            loadChatMessages(conv.userId);
                          }}
                          className={`w-full text-left p-4 border-b transition cursor-pointer ${
                            selectedChatUser?.id === conv.userId
                              ? isDarkMode ? 'bg-blue-600/20 border-blue-500/30' : 'bg-blue-50 border-blue-100'
                              : isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{conv.name}</p>
                              {conv.email && <p className="text-[10px] text-slate-400 truncate">{conv.email}</p>}
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
                            </div>
                            {conv.unread > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{conv.unread}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(conv.lastAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col">
                  {selectedChatUser ? (
                    <>
                      <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {selectedConv?.name || `Customer ${selectedChatUser.id.slice(0, 8)}...`}
                          </p>
                          <p className="text-[11px] text-slate-400">{selectedConv?.email || 'Realtime chat'}</p>
                        </div>
                        <button onClick={() => { setSelectedChatUser(null); setChatMessages([]); }} className={`text-xs px-3 py-1.5 rounded-xl border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                          Close
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatLoading ? (
                          <div className="text-center text-xs text-slate-400 py-10">Loading messages...</div>
                        ) : chatMessages.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 py-10">Wala pang mensahe sa conversation na ito.</div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_id === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                msg.sender_id === 'admin'
                                  ? 'bg-blue-600 text-white rounded-br-md'
                                  : isDarkMode ? 'bg-slate-800 text-slate-200 rounded-bl-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'
                              }`}>
                                {msg.content}
                                <p className={`text-[9px] mt-1 ${msg.sender_id === 'admin' ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <form onSubmit={handleAdminSendMessage} className={`p-4 border-t flex gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your reply..."
                          className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                        />
                        <button type="submit" disabled={!chatInput.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer">
                          Send
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                      Piliin ang conversation sa kaliwa para magsimula ng chat.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS, UPLOAD, RESOURCES, LOGS tabs - same as before (kept for completeness) */}
          {activeTab === 'orders' && (
            <div className={`border rounded-2xl shadow-xs overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Listahan ng mga Transaksyon</h3>
                  <button onClick={handleExportCSV} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5">
                    <span>📥</span> Export CSV
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Search name, ref #..." value={orderSearch} onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }} className={`border rounded-xl px-3 py-2 text-xs focus:outline-none w-full sm:w-56 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(1); }} className={`border rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                    <option value="all">Lahat ng Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {selectedOrderIds.length > 0 && (
                <div className="bg-blue-600/10 border-b border-blue-500/20 px-5 py-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-400">{selectedOrderIds.length} orders ang napili</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleBulkUpdateStatus('approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Bulk Approve</button>
                    <button onClick={() => handleBulkUpdateStatus('rejected')} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Bulk Reject</button>
                  </div>
                </div>
              )}

              {paginatedOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">Walang nakitang order.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'}`}>
                          <th className="p-4 w-10"><input type="checkbox" checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0} onChange={handleSelectAllOrders} className="cursor-pointer accent-blue-600" /></th>
                          <th className="p-4">Customer (Click for History)</th>
                          <th className="p-4">Material / Price</th>
                          <th className="p-4">GCash Ref Number</th>
                          <th className="p-4">Purchase Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                        {paginatedOrders.map((order) => (
                          <tr key={order.id} className={`transition ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/50'}`}>
                            <td className="p-4"><input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => handleSelectOrderCheckbox(order.id)} className="cursor-pointer accent-blue-600" /></td>
                            <td className="p-4">
                              <button onClick={() => setSelectedCustomer({ name: order.buyer_name, email: order.buyer_email })} className={`font-bold text-left hover:underline cursor-pointer ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{order.buyer_name}</button>
                              <p className="text-[11px] text-slate-400">{order.buyer_email}</p>
                            </td>
                            <td className="p-4"><p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.resources?.title || 'Deleted Material'}</p><p className="text-emerald-500 font-bold mt-0.5">₱{order.amount?.toFixed(2)}</p></td>
                            <td className="p-4"><span className={`font-mono font-bold px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200/60 text-slate-800'}`}>{order.gcash_ref_number || 'N/A'}</span></td>
                            <td className="p-4 text-slate-400 whitespace-nowrap">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                order.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                order.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>{order.status}</span>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              {order.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateOrderStatus(order.id, 'approved', order.buyer_email, order.resources?.title)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Approve</button>
                                  <button onClick={() => handleUpdateOrderStatus(order.id, 'rejected', order.buyer_email, order.resources?.title)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Reject</button>
                                </>
                              )}
                              {order.status !== 'pending' && <span className="text-slate-400 text-[11px] italic">Tapos na</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={`p-4 border-t flex justify-between items-center text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                    <span>Pahina {orderPage} ng {totalOrderPages}</span>
                    <div className="flex gap-2">
                      <button disabled={orderPage === 1} onClick={() => setOrderPage(p => Math.max(p - 1, 1))} className={`px-3 py-1.5 rounded-xl border font-bold transition ${orderPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800'}`}>Nakaraan</button>
                      <button disabled={orderPage === totalOrderPages} onClick={() => setOrderPage(p => Math.min(p + 1, totalOrderPages))} className={`px-3 py-1.5 rounded-xl border font-bold transition ${orderPage === totalOrderPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800'}`}>Susunod</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* UPLOAD, RESOURCES, LOGS - same structure as original (omitted for length but present in full version) */}
          {activeTab === 'upload' && (
            <div className={`border rounded-2xl p-6 shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <h3 className={`font-bold text-sm mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mag-upload ng Bagong Learning Resource</h3>
              {statusMessage && (
                <div className={`p-4 mb-4 rounded-xl text-xs font-semibold ${statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {statusMessage.text}
                </div>
              )}
              <form onSubmit={handleUploadResource} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Hal. Grade 4 Math Module" className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price (₱)</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required placeholder="Hal. 150" className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Maikling paglalarawan..." className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hal. Mathematics" className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Grade Level</label>
                    <input type="text" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="Hal. Grade 4" className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <option value="Learning Modules">Learning Modules</option>
                      <option value="Lesson Plans">Lesson Plans</option>
                      <option value="Activity Sheets">Activity Sheets</option>
                      <option value="Exams & Quizzes">Exams & Quizzes</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">File Attachment</label>
                  <input id="file-input" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required className={`w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-sm shadow-blue-500/25 disabled:opacity-50">
                  {uploading ? 'Nag-a-upload...' : 'I-publish ang Resource'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className={`border rounded-2xl shadow-xs overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pamamahala ng mga Resources</h3>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Search resource title..." value={resourceSearch} onChange={(e) => { setResourceSearch(e.target.value); setResourcePage(1); }} className={`border rounded-xl px-3 py-2 text-xs focus:outline-none w-full sm:w-56 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                  <select value={resourceCategoryFilter} onChange={(e) => { setResourceCategoryFilter(e.target.value); setResourcePage(1); }} className={`border rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                    <option value="all">Lahat ng Kategorya</option>
                    <option value="Learning Modules">Learning Modules</option>
                    <option value="Lesson Plans">Lesson Plans</option>
                    <option value="Activity Sheets">Activity Sheets</option>
                    <option value="Exams & Quizzes">Exams & Quizzes</option>
                  </select>
                </div>
              </div>
              {paginatedResources.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">Walang nakitang resource.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'}`}>
                          <th className="p-4">Title & Details</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Price</th>
                          <th className="p-4">Total Sold / Downloads</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                        {paginatedResources.map((res) => {
                          const soldCount = resourceSalesCountMap[res.id] || 0;
                          return (
                            <tr key={res.id} className={`transition ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-4">
                                <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{res.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{res.subject || 'N/A'} • {res.grade_level || 'N/A'}</p>
                              </td>
                              <td className="p-4"><span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-extrabold">{res.category}</span></td>
                              <td className="p-4 text-emerald-500 font-bold">₱{res.price?.toFixed(2)}</td>
                              <td className="p-4"><span className="font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">{soldCount} beses nabili</span></td>
                              <td className="p-4 text-right space-x-2">
                                <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl transition inline-block">Download</a>
                                <button onClick={() => handleDeleteResource(res.id, res.file_path, res.title)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer">Delete</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className={`p-4 border-t flex justify-between items-center text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                    <span>Pahina {resourcePage} ng {totalResourcePages}</span>
                    <div className="flex gap-2">
                      <button disabled={resourcePage === 1} onClick={() => setResourcePage(p => Math.max(p - 1, 1))} className={`px-3 py-1.5 rounded-xl border font-bold transition ${resourcePage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800'}`}>Nakaraan</button>
                      <button disabled={resourcePage === totalResourcePages} onClick={() => setResourcePage(p => Math.min(p + 1, totalResourcePages))} className={`px-3 py-1.5 rounded-xl border font-bold transition ${resourcePage === totalResourcePages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800'}`}>Susunod</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className={`border rounded-2xl shadow-xs overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Activity Logs & Audit Trail</h3>
                <p className="text-xs text-slate-400 mt-0.5">Talaan ng mga ginawa ng admin sa system</p>
              </div>
              {logs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">Walang nakitang activity logs.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'}`}>
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                        <th className="p-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                      {logs.map((log) => (
                        <tr key={log.id} className={`transition ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/50'}`}>
                          <td className="p-4 font-bold font-mono text-blue-400">{log.action}</td>
                          <td className="p-4 text-slate-300">{log.details}</td>
                          <td className="p-4 text-right text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CUSTOMER HISTORY MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-700/50">
              <div>
                <h3 className="font-bold text-base">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.email}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold hover:bg-slate-700 cursor-pointer">✕</button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kasaysayan ng mga Inorder:</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {customerHistoryList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Walang makitang transaksyon.</p>
                ) : (
                  customerHistoryList.map(hist => (
                    <div key={hist.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <p className="font-bold">{hist.resources?.title || 'Unknown Material'}</p>
                        <p className="text-[10px] text-slate-400">{new Date(hist.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-500">₱{hist.amount}</p>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${hist.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{hist.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">Isara ang Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}