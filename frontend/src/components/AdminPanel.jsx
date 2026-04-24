import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, FileText, Settings, LogOut, Eye, CheckCircle, XCircle, User, Calendar, Printer, Archive, Lock, Shield, Users, Activity, Trash2, UserPlus, Handshake, PhoneCall, Save, QrCode, Pencil, Plus, X, Globe, Percent, Package, UserCheck, ClipboardList, MessageCircle
} from 'lucide-react';
import logoColored from '../assets/logo-colored.png'; 
import LoanResearch from './LoanResearch';
import LoanOrigination from './LoanOrigination';
import PermissionMatrix from './PermissionMatrix';

const hasBrokenEncoding = (value = '') => /[ÐÑÒÓ]|â|�/.test(String(value));

const normalizeFinancialStats = (stats = []) => {
  const byOrder = new Map();

  stats.forEach((stat) => {
    const orderKey = Number.isFinite(Number(stat.order)) ? Number(stat.order) : `id-${stat._id}`;
    const currentScore = Number(hasBrokenEncoding(stat.label)) + Number(hasBrokenEncoding(stat.value));
    const existing = byOrder.get(orderKey);
    const existingScore = existing
      ? Number(hasBrokenEncoding(existing.label)) + Number(hasBrokenEncoding(existing.value))
      : Infinity;

    if (!existing || currentScore < existingScore) {
      byOrder.set(orderKey, stat);
    }
  });

  return Array.from(byOrder.values())
    .filter(stat => !hasBrokenEncoding(stat.label) && !hasBrokenEncoding(stat.value))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
};

const PRODUCT_NAMES = {
  'biz_loan': 'Бизнесийн зээл',
  'car_purchase_loan': 'Автомашин худалдан авах',
  'car_coll_loan': 'Автомашин барьцаалсан',
  'cons_loan': 'Хэрэглээний зээл',
  'credit_card': 'Кредит карт',
  're_loan': 'Үл хөдлөх барьцаалсан',
  'line_loan': 'Шугмын зээл'
};

const AdminPanel = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('los');
  const [requests, setRequests] = useState([]); 
  const [trusts, setTrusts] = useState([]); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [researchSeed, setResearchSeed] = useState(null);
  const [selectedTrust, setSelectedTrust] = useState(null); 
  const [contactNote, setContactNote] = useState(''); 
  const [usersList, setUsersList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', roles: [] });
  const [editingUserRoles, setEditingUserRoles] = useState(null); // { userId, roles }

  const SCM_ROLES = [
    { key: 'admin',           label: 'Админ' },
    { key: 'director',        label: 'Захирал' },
    { key: 'loan_officer',    label: 'Зээлийн ажилтан' },
    { key: 'finance_manager', label: 'Санхүүгийн менежер' },
  ];
  const toggleNewRole = (rk) => setNewUser(p => {
    const has = p.roles.includes(rk);
    const updated = has ? p.roles.filter(r => r !== rk) : [...p.roles, rk].slice(0, 2);
    return { ...p, roles: updated };
  });
  const toggleEditRole = (rk) => setEditingUserRoles(p => {
    if (!p) return p;
    const has = p.roles.includes(rk);
    const updated = has ? p.roles.filter(r => r !== rk) : [...p.roles, rk].slice(0, 2);
    return { ...p, roles: updated };
  });
  const saveUserRoles = async () => {
    if (!editingUserRoles) return;
    try {
      await axios.put(`${API_URL}/api/users/${editingUserRoles.userId}`, { roles: editingUserRoles.roles });
      const userRes = await axios.get(`${API_URL}/api/users`);
      setUsersList(userRes.data);
      setEditingUserRoles(null);
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
  };
  
  // 🔐 2FA & FINANCE STATES
  const [qrCode, setQrCode] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [stats, setStats] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ title: '', category: 'policy', file: null });

  // 🗄️ CMS STATES
  const [cmsSubTab, setCmsSubTab] = useState('hero');
  const [siteConfig, setSiteConfig] = useState({});
  const [configEdits, setConfigEdits] = useState({});
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [newMember, setNewMember] = useState({ name: '', role: '', imagePath: '', experience: '', memberType: 'management', order: 99 });
  const [showNewMember, setShowNewMember] = useState(false);
  const [newMemberType, setNewMemberType] = useState('management');
  const [formConfigs, setFormConfigs] = useState({ loan: null, trust: null });
  const [blogPosts, setBlogPosts] = useState([]);
  const [newBlog, setNewBlog] = useState({ title: '', contentSnippet: '', imageUrl: '', link: '' });
  const [editingBlog, setEditingBlog] = useState(null);
  const [cmsSaving, setCmsSaving] = useState(false);

  // API URL
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

  useEffect(() => {
    if (!token) return undefined;
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    return () => {
      delete axios.defaults.headers.common.Authorization;
    };
  }, [token]);

  // 🛡️ DATA FETCHING LOGIC (401-ээс бүрэн сэргийлсэн)
  useEffect(() => {
    // Хэрэв хэрэглэгч бүрэн нэвтрээгүй (role байхгүй) бол ОГТ дата татахгүй
    if (!user || !user.role) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Бүх датаг зэрэг татах
        const [loanRes, trustRes, statsRes, policyRes] = await Promise.all([
          axios.get(`${API_URL}/api/loans`),
          axios.get(`${API_URL}/api/trusts`),
          axios.get(`${API_URL}/api/stats`),
          axios.get(`${API_URL}/api/policies`)
        ]);

        setRequests(loanRes.data || []);
        setTrusts(trustRes.data || []);
        setStats(normalizeFinancialStats(statsRes.data || []));
        setPolicies(policyRes.data || []);

        // Хариуцагч хуваарилах жагсаалт — бүх ажилтанд хэрэгтэй
        const usersListRes = await axios.get(`${API_URL}/api/users/list`).catch(() => ({ data: [] }));
        setUsersList(usersListRes.data || []);

        if (user.role === 'admin') {
          const [userRes, logRes] = await Promise.all([
            axios.get(`${API_URL}/api/users`),
            axios.get(`${API_URL}/api/logs`)
          ]);
          setUsersList(userRes.data || []);
          setLogs(logRes.data || []);
        }
      } catch (error) { 
        if (error?.response?.status === 401) {
          onLogout();
          return;
        }
        console.error("Fetch status: 401 avoided or caught"); 
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user, API_URL]);

  // --- 🔐 2FA FUNCTIONS ---
  const setup2FA = async () => {
    const userId = user?.id || user?._id;
    try {
        const res = await axios.post(`${API_URL}/api/auth/2fa/setup`, { userId });
        setQrCode(res.data.qrCode);
    } catch (e) { alert("2FA Setup error"); }
  };

  const verify2FA = async () => {
    const userId = user?.id || user?._id;
    if (!twoFACode || twoFACode.length !== 6) return alert("6 оронтой код оруулна уу");
    try {
        await axios.post(`${API_URL}/api/auth/2fa/verify`, { userId, token: twoFACode });
        alert("Амжилттай баталгаажлаа!");
        window.location.reload(); 
    } catch (e) { alert(e.response?.data?.message || "2FA код буруу"); }
  };

  // --- 🛠 ҮЙЛДЛҮҮД (Зээлийн төлөв, Тэмдэглэл, Устгах г.м) ---
  const handleStatusChange = async (id, newStatus) => {
      if(!window.confirm("Төлөв өөрчлөх үү?")) return;
      try {
          await axios.put(`${API_URL}/api/loans/${id}`, { status: newStatus, adminUser: user });
          const loanRes = await axios.get(`${API_URL}/api/loans`);
          setRequests(loanRes.data);
          setSelectedRequest(null);
      } catch (error) { alert("Алдаа гарлаа"); }
  };

  const saveContactNote = async () => {
      if(!contactNote) return alert("Тэмдэглэл бичнэ үү");
      try {
          await axios.put(`${API_URL}/api/trusts/${selectedTrust._id}`, { contactNote, adminUser: user });
          const trustRes = await axios.get(`${API_URL}/api/trusts`);
          setTrusts(trustRes.data);
          setSelectedTrust(null);
          setContactNote('');
          alert("Амжилттай!");
      } catch (e) { alert("Алдаа гарлаа"); }
  };

  const handleStatUpdate = async (id, newValue) => {
    try {
        await axios.put(`${API_URL}/api/stats/${id}`, { value: newValue });
        const statsRes = await axios.get(`${API_URL}/api/stats`);
        setStats(normalizeFinancialStats(statsRes.data || []));
        alert("Шинэчлэгдлээ!");
    } catch (err) { alert("Алдаа!"); }
  };

  const handlePolicyUpload = async (e, forcedCategory) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newPolicy.title);
    formData.append('category', forcedCategory || newPolicy.category);
    formData.append('file', newPolicy.file);
    try {
        await axios.post(`${API_URL}/api/policies`, formData);
        const policyRes = await axios.get(`${API_URL}/api/policies`);
        setPolicies(policyRes.data);
        setNewPolicy({ title: '', category: 'policy', file: null });
        alert("Файл амжилттай хуулагдлаа!");
    } catch (err) { alert("Алдаа!"); }
  };

  const deletePolicy = async (id) => {
    if (!window.confirm("Устгах уу?")) return;
    try {
      await axios.delete(`${API_URL}/api/policies/${id}`);
      const policyRes = await axios.get(`${API_URL}/api/policies`);
      setPolicies(policyRes.data);
    } catch (err) { alert("Алдаа!"); }
  };

  const deleteUser = async (id) => {
    if(!window.confirm("Хэрэглэгчийг устгах уу?")) return;
    try { await axios.delete(`${API_URL}/api/users/${id}`); const userRes = await axios.get(`${API_URL}/api/users`); setUsersList(userRes.data); } catch (e) { alert("Алдаа"); }
  };

  const getLoanStatusLabel = (status) => ({
    pending: 'Шинэ',
    studying: 'Судалж байна',
    rejected: 'Татгалзсан',
    resolved: 'Шийдсэн',
  }[status] || status || 'Шинэ');

  const getLoanStatusClass = (status) => ({
    pending: 'bg-orange-100 text-orange-700',
    studying: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    resolved: 'bg-green-100 text-green-700',
  }[status] || 'bg-gray-100 text-gray-600');

  const formatCurrency = (val) => new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(val);
  const formatDate = (dateString) => { const date = new Date(dateString); return date.toLocaleDateString('mn-MN') + ' ' + date.toLocaleTimeString('mn-MN'); };
  const handlePrint = () => { window.print(); };
  const openLoanResearch = async (request) => {
    let nextRequest = request;
    if (request?._id && request.status !== 'studying' && request.status !== 'resolved' && request.status !== 'rejected') {
      try {
        nextRequest = (await axios.put(`${API_URL}/api/loans/${request._id}`, { status: 'studying', adminUser: user })).data;
        setRequests(prev => prev.map(item => item._id === request._id ? nextRequest : item));
      } catch (error) {
        console.error('Study status update failed', error);
      }
    }
    setSelectedRequest(null);
    setResearchSeed({ ...nextRequest, seedKey: `${nextRequest._id}-${Date.now()}` });
    setActiveTab('loanResearch');
  };

  // ============================================================
  // 🗄️ CMS FUNCTIONS
  // ============================================================
  const fetchCMSData = async () => {
    const [cfgRes, prodRes, teamRes, loanFormRes, trustFormRes, blogRes] = await Promise.allSettled([
      axios.get(`${API_URL}/api/config`),
      axios.get(`${API_URL}/api/products/content`),
      axios.get(`${API_URL}/api/team/all`),
      axios.get(`${API_URL}/api/form-config/loan`),
      axios.get(`${API_URL}/api/form-config/trust`),
      axios.get(`${API_URL}/api/blogs?isCustom=true`),
    ]);
    if (cfgRes.status === 'fulfilled') {
      setSiteConfig(cfgRes.value.data);
      const flat = {};
      Object.values(cfgRes.value.data).forEach(group => {
        Object.entries(group).forEach(([key, obj]) => { flat[key] = obj.value; });
      });
      setConfigEdits(flat);
    }
    if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data);
    if (teamRes.status === 'fulfilled') setTeamMembers(teamRes.value.data);
    if (loanFormRes.status === 'fulfilled' && trustFormRes.status === 'fulfilled')
      setFormConfigs({ loan: loanFormRes.value.data, trust: trustFormRes.value.data });
    if (blogRes.status === 'fulfilled') setBlogPosts(blogRes.value.data || []);
  };

  useEffect(() => {
    if (activeTab === 'cms') fetchCMSData();
  }, [activeTab]);

  const saveBlog = async () => {
    setCmsSaving(true);
    try {
      if (editingBlog?._id) {
        await axios.put(`${API_URL}/api/blogs/${editingBlog._id}`, editingBlog);
        setEditingBlog(null);
      } else {
        await axios.post(`${API_URL}/api/blogs`, newBlog);
        setNewBlog({ title: '', contentSnippet: '', imageUrl: '', link: '' });
      }
      const blogRes = await axios.get(`${API_URL}/api/blogs?isCustom=true`);
      setBlogPosts(blogRes.data);
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const deleteBlog = async (id) => {
    if (!window.confirm('Устгах уу?')) return;
    try {
      await axios.delete(`${API_URL}/api/blogs/${id}`);
      setBlogPosts(prev => prev.filter(b => b._id !== id));
    } catch (e) { alert('Алдаа гарлаа'); }
  };

  const saveBulkConfig = async (group) => {
    setCmsSaving(true);
    try {
      const groupKeys = Object.keys(siteConfig[group] || {});
      const updates = {};
      groupKeys.forEach(k => { if (configEdits[k] !== undefined) updates[k] = configEdits[k]; });
      if (group === 'contact' && configEdits['contact_image'] !== undefined) {
        updates['contact_image'] = configEdits['contact_image'];
      }
      await axios.post(`${API_URL}/api/config/bulk`, updates);
      alert('Амжилттай хадгалагдлаа!');
      fetchCMSData();
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    setCmsSaving(true);
    try {
      await axios.put(`${API_URL}/api/products/content/${editingProduct.productKey}`, editingProduct);
      alert('Амжилттай хадгалагдлаа!');
      setEditingProduct(null);
      fetchCMSData();
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const saveChatbotSettings = async () => {
    setCmsSaving(true);
    try {
      const chatbotConfigKeys = [
        'contact_phone',
        'contact_email',
        'contact_address',
        'loan_rate_default',
        'trust_rate',
        'dti_individual',
        'dti_org'
      ];
      const updates = {};
      chatbotConfigKeys.forEach(key => {
        if (configEdits[key] !== undefined) updates[key] = configEdits[key];
      });

      await axios.post(`${API_URL}/api/config/bulk`, updates);
      await Promise.all(
        products
          .filter(product => product.productKey)
          .map(product => axios.put(`${API_URL}/api/products/content/${product.productKey}`, product))
      );

      alert('Чатботын мэдээлэл хадгалагдлаа!');
      fetchCMSData();
    } catch (e) { alert('Чатбот хадгалахад алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const saveMember = async (member) => {
    setCmsSaving(true);
    try {
      await axios.put(`${API_URL}/api/team/${member._id}`, member);
      fetchCMSData();
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const addMember = async () => {
    setCmsSaving(true);
    try {
      await axios.post(`${API_URL}/api/team`, { ...newMember, memberType: newMemberType });
      setNewMember({ name: '', role: '', imagePath: '', experience: '', memberType: newMemberType, order: 99 });
      setShowNewMember(false);
      fetchCMSData();
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Устгах уу?')) return;
    try {
      await axios.delete(`${API_URL}/api/team/${id}`);
      fetchCMSData();
    } catch (e) { alert('Алдаа гарлаа'); }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_URL}/api/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.url;
  };

  const saveFormConfig = async (formId) => {
    setCmsSaving(true);
    try {
      await axios.put(`${API_URL}/api/form-config/${formId}`, { fields: formConfigs[formId]?.fields });
      alert('Амжилттай хадгалагдлаа!');
    } catch (e) { alert('Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const updateFormField = (formId, idx, key, val) => {
    setFormConfigs(prev => {
      const fields = [...(prev[formId]?.fields || [])];
      fields[idx] = { ...fields[idx], [key]: val };
      return { ...prev, [formId]: { ...prev[formId], fields } };
    });
  };

  // Product condition/requirement засах helper
  const updateProductList = (field, userType, idx, val) => {
    setEditingProduct(prev => ({
      ...prev,
      [userType]: {
        ...prev[userType],
        [field]: prev[userType]?.[field]?.map((v, i) => i === idx ? val : v) || []
      }
    }));
  };
  const addProductListItem = (field, userType) => {
    setEditingProduct(prev => ({
      ...prev,
      [userType]: { ...prev[userType], [field]: [...(prev[userType]?.[field] || []), ''] }
    }));
  };
  const removeProductListItem = (field, userType, idx) => {
    setEditingProduct(prev => ({
      ...prev,
      [userType]: { ...prev[userType], [field]: prev[userType]?.[field]?.filter((_, i) => i !== idx) || [] }
    }));
  };

  const updateChatbotProductList = (productKey, userType, field, idx, val) => {
    setProducts(prev => prev.map(product => (
      product.productKey === productKey
        ? {
            ...product,
            [userType]: {
              ...(product[userType] || {}),
              [field]: (product[userType]?.[field] || []).map((item, itemIdx) => itemIdx === idx ? val : item)
            }
          }
        : product
    )));
  };

  const addChatbotProductListItem = (productKey, userType, field) => {
    setProducts(prev => prev.map(product => (
      product.productKey === productKey
        ? {
            ...product,
            [userType]: {
              ...(product[userType] || {}),
              [field]: [...(product[userType]?.[field] || []), '']
            }
          }
        : product
    )));
  };

  const removeChatbotProductListItem = (productKey, userType, field, idx) => {
    setProducts(prev => prev.map(product => (
      product.productKey === productKey
        ? {
            ...product,
            [userType]: {
              ...(product[userType] || {}),
              [field]: (product[userType]?.[field] || []).filter((_, itemIdx) => itemIdx !== idx)
            }
          }
        : product
    )));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      <style>{` @media print { @page { margin: 1cm; size: auto; } body * { visibility: hidden; } #printable-content, #printable-content * { visibility: visible; } #printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } `}</style>

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#003B5C] text-white flex flex-col fixed h-full z-20 no-print">
        <div className="p-6 border-b border-white/10 font-bold text-[#D4AF37] text-xl">SCM ADMIN</div>
        <nav className="flex-1 py-6 px-3 space-y-1 text-sm">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><LayoutDashboard size={18} /> Хянах самбар</button>
          <button onClick={() => setActiveTab('los')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'los' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><ClipboardList size={18} /> Зээлийн үйл явц</button>
          <button onClick={() => setActiveTab('trusts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'trusts' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Handshake size={18} /> Итгэлцэл</button>
          {user?.role === 'admin' && (<>
            <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'finance' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Activity size={18} /> Файл засах</button>
            <button onClick={() => setActiveTab('cms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'cms' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Globe size={18} /> Контент засах</button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'users' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Users size={18} /> Хэрэглэгчид</button>
            <button onClick={() => setActiveTab('permissions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'permissions' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Shield size={18} /> Эрхийн матриц</button>
          </>)}
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'settings' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Settings size={18} /> Тохиргоо</button>
        </nav>
        <div className="p-6 border-t border-white/10"><button onClick={onLogout} className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg font-bold text-xs hover:bg-red-500 hover:text-white transition">Гарах</button></div>
      </aside>

      <main className="flex-1 ml-64 p-8 no-print">
        {activeTab === 'los' && (
          <LoanOrigination
            apiUrl={API_URL}
            user={user}
            requests={requests}
            onRequestsChange={setRequests}
            usersList={usersList}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-[#003B5C]">Хянах самбар</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Нийт зээлийн хүсэлт', value: requests.length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Хүлээгдэж буй', value: requests.filter(r => r.status !== 'resolved').length, color: 'bg-orange-50 text-orange-700' },
                { label: 'Шийдвэрлэсэн', value: requests.filter(r => r.status === 'resolved').length, color: 'bg-green-50 text-green-700' },
                { label: 'Итгэлцлийн хүсэлт', value: trusts.length, color: 'bg-purple-50 text-purple-700' },
              ].map((s, i) => (
                <div key={i} className={`p-6 rounded-2xl border ${s.color}`}>
                  <p className="text-xs font-bold uppercase opacity-60 mb-2">{s.label}</p>
                  <p className="text-4xl font-black">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-bold text-[#003B5C] mb-4">Сүүлийн 5 хүсэлт</h3>
              <div className="space-y-3">
                {requests.slice(0, 5).map(req => (
                  <div key={req._id} className="flex justify-between items-center py-3 border-b last:border-0 text-sm">
                    <span className="font-bold">{req.lastname} {req.firstname || req.orgName}</span>
                    <span className="text-gray-400">{new Date(req.createdAt).toLocaleDateString('mn-MN')}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${req.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{req.status === 'resolved' ? 'Шийдсэн' : 'Хүлээгдэж байна'}</span>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-gray-400 text-sm">Хүсэлт байхгүй байна.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trusts' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-[#003B5C]">Итгэлцлийн хүсэлтүүд</h2>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase">
                  <tr><th className="p-4">Огноо</th><th>Нэр</th><th>Утас</th><th>Дүн</th><th>Төлөв</th><th>Үйлдэл</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {trusts.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="p-4">{new Date(t.createdAt).toLocaleDateString('mn-MN')}</td>
                      <td className="p-4 font-bold">{t.lastname} {t.firstname}</td>
                      <td className="p-4">{t.phone}</td>
                      <td className="p-4 font-bold">{t.amount}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.status === 'resolved' ? 'Шийдсэн' : 'Хүлээгдэж байна'}</span></td>
                      <td className="p-4"><button onClick={() => { setSelectedTrust(t); setContactNote(t.contactNote || ''); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Eye size={18}/></button></td>
                    </tr>
                  ))}
                  {trusts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Хүсэлт байхгүй байна.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {activeTab === 'users' && user?.role === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00A651]">Систем</p>
              <h2 className="text-2xl font-bold text-[#003B5C]">Хэрэглэгчид</h2>
            </div>

            {/* Role edit modal */}
            {editingUserRoles && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-[#003B5C]">Эрх тохируулах</h3>
                    <button onClick={() => setEditingUserRoles(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                  </div>
                  <p className="text-xs text-slate-500">Хамгийн ихдээ <strong>2</strong> эрх холбох боломжтой.</p>
                  <div className="space-y-2">
                    {SCM_ROLES.map(r => {
                      const sel = editingUserRoles.roles.includes(r.key);
                      const maxed = !sel && editingUserRoles.roles.length >= 2;
                      return (
                        <label key={r.key}
                          className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                            sel ? 'bg-[#003B5C]/5 border-[#003B5C]' : maxed ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-400'
                          }`}>
                          <input type="checkbox" checked={sel} disabled={maxed && !sel}
                            onChange={() => !maxed || sel ? toggleEditRole(r.key) : null}
                            className="w-4 h-4 accent-[#003B5C]" />
                          <span className="font-bold text-sm text-[#003B5C]">{r.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveUserRoles}
                      className="flex-1 bg-[#003B5C] text-white py-2.5 rounded-xl font-bold text-sm">Хадгалах</button>
                    <button onClick={() => setEditingUserRoles(null)}
                      className="flex-1 border rounded-xl py-2.5 font-bold text-sm text-slate-600">Болих</button>
                  </div>
                </div>
              </div>
            )}

            {/* Create new user */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
              <h3 className="font-black text-[#003B5C]">Шинэ хэрэглэгч нэмэх</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input placeholder="Нэр" value={newUser.name}
                  onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  className="p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]" />
                <input placeholder="И-мэйл" value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className="p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]" />
                <input type="password" placeholder="Нууц үг" value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className="p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]" />
              </div>
              {/* Role checkboxes */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Эрх (хамгийн ихдээ 2 сонгоно)
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCM_ROLES.map(r => {
                    const sel = newUser.roles.includes(r.key);
                    const maxed = !sel && newUser.roles.length >= 2;
                    return (
                      <label key={r.key}
                        className={`flex items-center gap-2 px-3 py-2 border-2 rounded-xl cursor-pointer text-sm font-bold transition-all ${
                          sel ? 'bg-[#003B5C] text-white border-[#003B5C]' : maxed ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400' : 'border-slate-200 text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C]'
                        }`}>
                        <input type="checkbox" checked={sel} disabled={maxed && !sel}
                          onChange={() => !maxed || sel ? toggleNewRole(r.key) : null}
                          className="sr-only" />
                        {r.label}
                      </label>
                    );
                  })}
                </div>
                {newUser.roles.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">Сонгогдсон: {newUser.roles.map(rk => SCM_ROLES.find(r => r.key === rk)?.label).join(', ')}</p>
                )}
              </div>
              <button onClick={async () => {
                try {
                  await axios.post(`${API_URL}/api/users`, { ...newUser, role: newUser.roles.includes('admin') ? 'admin' : 'employee' });
                  setNewUser({ name: '', email: '', password: '', role: 'employee', roles: [] });
                  const userRes = await axios.get(`${API_URL}/api/users`);
                  setUsersList(userRes.data);
                } catch (e) { alert(e.response?.data?.message || 'Алдаа гарлаа'); }
              }} className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-6 py-2.5 rounded-xl font-bold text-sm">
                <UserPlus size={15} /> Нэмэх
              </button>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="p-4">Нэр</th>
                    <th className="p-4">И-мэйл</th>
                    <th className="p-4">Эрх</th>
                    <th className="p-4">2FA</th>
                    <th className="p-4">Огноо</th>
                    <th className="p-4">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersList.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-[#003B5C]">{u.name}</td>
                      <td className="p-4 text-gray-500">{u.email}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {u.role === 'admin' && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-violet-100 text-violet-700">Админ</span>
                          )}
                          {(u.roles || []).map(rk => (
                            <span key={rk} className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700">
                              {SCM_ROLES.find(r => r.key === rk)?.label || rk}
                            </span>
                          ))}
                          {u.role !== 'admin' && (!u.roles || u.roles.length === 0) && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">Эрхгүй</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold ${u.isTwoFAEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {u.isTwoFAEnabled ? '✓ Идэвхтэй' : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('mn-MN')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {u.role !== 'admin' && (
                            <button onClick={() => setEditingUserRoles({ userId: u._id, roles: u.roles || [] })}
                              className="p-2 text-[#003B5C] bg-blue-50 rounded-lg hover:bg-blue-100" title="Эрх тохируулах">
                              <Shield size={14} />
                            </button>
                          )}
                          {u._id !== (user?.id || user?._id) && (
                            <button onClick={() => deleteUser(u._id)}
                              className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr><td colSpan={6} className="p-10 text-center text-gray-400">Хэрэглэгч байхгүй.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && user?.role === 'admin' && (
          <PermissionMatrix apiUrl={API_URL} />
        )}

        {activeTab === 'finance' && user?.role === 'admin' && (
          <div className="space-y-8 animate-fade-in">
             {/* Санхүүгийн үзүүлэлт */}
             <section className="bg-white p-8 rounded-2xl border shadow-sm">
               <h3 className="text-xl font-bold mb-6 text-[#003B5C]">📊 Санхүүгийн үзүүлэлт</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {stats.map(s => (
                   <div key={s._id} className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{s.label}</p>
                     <div className="flex gap-2">
                       <input id={`stat-${s._id}`} defaultValue={s.value} className="w-full p-2 border rounded-lg bg-white font-bold" />
                       <button onClick={() => handleStatUpdate(s._id, document.getElementById(`stat-${s._id}`).value)} className="bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-sm">Засах</button>
                     </div>
                   </div>
                 ))}
               </div>
             </section>

             {/* Санхүүгийн тайлан (report) */}
             <section className="bg-white p-8 rounded-2xl border shadow-sm">
               <h3 className="text-xl font-bold mb-6 text-[#003B5C]">📈 Санхүүгийн тайлан</h3>
               <form onSubmit={e => { e.preventDefault(); handlePolicyUpload(e, 'report'); }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <input placeholder="Тайлангийн гарчиг" value={newPolicy.category === 'report' ? newPolicy.title : ''} onChange={e => setNewPolicy({ title: e.target.value, category: 'report', file: newPolicy.file })} className="p-3 bg-slate-50 border rounded-xl text-sm" required />
                 <input type="file" accept=".pdf" onChange={e => setNewPolicy(p => ({ ...p, file: e.target.files[0], category: 'report' }))} className="py-2 text-xs" required />
                 <button type="submit" className="bg-[#003B5C] text-white font-bold rounded-xl text-sm px-4">Тайлан нэмэх</button>
               </form>
               <div className="space-y-3 border-t pt-6">
                 {policies.filter(p => p.category === 'report').map(p => (
                   <div key={p._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border text-sm">
                     <span className="font-bold text-slate-700">{p.title}</span>
                     <div className="flex gap-2">
                       <a href={p.fileUrl || `/policies/${p.fileName}`} target="_blank" rel="noreferrer" className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Eye size={16}/></a>
                       <button onClick={() => deletePolicy(p._id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                     </div>
                   </div>
                 ))}
                 {policies.filter(p => p.category === 'report').length === 0 && <p className="text-gray-400 text-sm">Тайлан байхгүй байна.</p>}
               </div>
             </section>

             {/* Бодлого журам (policy) */}
             <section className="bg-white p-8 rounded-2xl border shadow-sm">
               <h3 className="text-xl font-bold mb-6 text-[#00A651]">📁 Байгууллагын бодлого журам</h3>
               <form onSubmit={e => { e.preventDefault(); handlePolicyUpload(e, 'policy'); }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <input placeholder="Журамын гарчиг" value={newPolicy.category === 'policy' ? newPolicy.title : ''} onChange={e => setNewPolicy({ title: e.target.value, category: 'policy', file: newPolicy.file })} className="p-3 bg-slate-50 border rounded-xl text-sm" required />
                 <input type="file" accept=".pdf" onChange={e => setNewPolicy(p => ({ ...p, file: e.target.files[0], category: 'policy' }))} className="py-2 text-xs" required />
                 <button type="submit" className="bg-[#00A651] text-white font-bold rounded-xl text-sm px-4">Журам нэмэх</button>
               </form>
               <div className="space-y-3 border-t pt-6">
                 {policies.filter(p => p.category === 'policy').map(p => (
                   <div key={p._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border text-sm">
                     <span className="font-bold text-slate-700">{p.title}</span>
                     <div className="flex gap-2">
                       <a href={p.fileUrl || `/policies/${p.fileName}`} target="_blank" rel="noreferrer" className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Eye size={16}/></a>
                       <button onClick={() => deletePolicy(p._id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                     </div>
                   </div>
                 ))}
                 {policies.filter(p => p.category === 'policy').length === 0 && <p className="text-gray-400 text-sm">Журам байхгүй байна.</p>}
               </div>
             </section>
          </div>
        )}

        {activeTab === 'cms' && user?.role === 'admin' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <Globe size={24} className="text-[#003B5C]"/>
              <h2 className="text-2xl font-bold text-[#003B5C]">Контент засварлах</h2>
            </div>

            <div className="flex gap-0">
              {/* CMS SIDEBAR TABS */}
              <div className="w-52 shrink-0 flex flex-col gap-1 pr-4 border-r border-slate-200">
                {[
                  { id: 'theme', label: '🎨 Загвар & Өнгө' },
                  { id: 'hero', label: '🏠 Нүүр хуудас' },
                  { id: 'about', label: '🏢 Бид хэн бэ?' },
                  { id: 'financials', label: '📊 Санхүү' },
                  { id: 'products', label: '📦 Бүтээгдэхүүн' },
                  { id: 'chatbot', label: '💬 Чатбот' },
                  { id: 'calculator', label: '🧮 Тооцоолуур' },
                  { id: 'ceo', label: '👤 Захирлын мэндчилгээ' },
                  { id: 'board', label: '👥 ТУЗ' },
                  { id: 'management', label: '🏛 Удирдлагын баг' },
                  { id: 'shareholder', label: '💼 Хувьцаа эзэмшигч' },
                ].map(t => (
                  <button key={t.id} onClick={() => setCmsSubTab(t.id)}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition ${cmsSubTab === t.id ? 'bg-[#003B5C] text-white' : 'text-gray-500 hover:bg-slate-100'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* CMS CONTENT PANEL */}
              <div className="flex-1 pl-6 min-w-0">

                {/* 1. НҮҮР ХУУДАС — all page sections */}
                {cmsSubTab === 'hero' && (
                  <div className="space-y-6 max-w-2xl">
                    {['hero','about','financials','contact'].map(group => (
                      <div key={group} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                        <h4 className="font-bold text-sm text-[#003B5C] border-b pb-2">
                          {group==='hero'?'🏠 Hero хэсэг':group==='about'?'🏢 Бид хэн бэ':group==='financials'?'📊 Санхүүгийн үзүүлэлт':'📞 Холбоо барих'}
                        </h4>
                        {Object.entries(siteConfig[group] || {}).filter(([key]) => key !== 'contact_image').map(([key, obj]) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">{obj.label}</label>
                            {(obj.value?.length||0) > 80 ? (
                              <textarea rows={3} value={configEdits[key] ?? obj.value ?? ''}
                                onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                            ) : (
                              <input type="text" value={configEdits[key] ?? obj.value ?? ''}
                                onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                            )}
                          </div>
                        ))}
                        {group === 'contact' && (
                          <div className="space-y-2 pt-2 border-t">
                            <label className="text-xs font-bold text-gray-400 uppercase">Холбоо барих хэсгийн зураг</label>
                            {(configEdits['contact_image'] ?? siteConfig.contact?.contact_image?.value) && (
                              <img src={configEdits['contact_image'] ?? siteConfig.contact?.contact_image?.value} alt="" className="h-40 w-full rounded-xl object-cover border"/>
                            )}
                            <div className="flex gap-2">
                              <input type="text" value={configEdits['contact_image'] ?? siteConfig.contact?.contact_image?.value ?? ''} placeholder="URL эсвэл файл сонгоно уу"
                                onChange={e => setConfigEdits(p => ({ ...p, contact_image: e.target.value }))}
                                className="flex-1 p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                              <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1">
                                Зураг
                                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                  if (!e.target.files[0]) return;
                                  try {
                                    const url = await uploadImage(e.target.files[0]);
                                    setConfigEdits(p => ({ ...p, contact_image: url }));
                                  } catch { alert('Upload алдаа'); }
                                }}/>
                              </label>
                            </div>
                          </div>
                        )}
                        <button onClick={() => saveBulkConfig(group)} disabled={cmsSaving}
                          className="bg-[#003B5C] text-white px-6 py-2 rounded-xl font-bold text-sm">
                          {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. БИД ХЭН БЭ */}
                {cmsSubTab === 'about' && (
                  <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-5 max-w-2xl">
                    <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">🏢 Бид хэн бэ?</h3>
                    {Object.entries(siteConfig.about || {}).map(([key, obj]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">{obj.label}</label>
                        <textarea rows={(obj.value?.length||0) > 60 ? 3 : 1} value={configEdits[key] ?? obj.value ?? ''}
                          onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                      </div>
                    ))}
                    <button onClick={() => saveBulkConfig('about')} disabled={cmsSaving}
                      className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                      {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                    </button>
                  </div>
                )}

                {/* 3. САНХҮҮ */}
                {cmsSubTab === 'financials' && (
                  <div className="space-y-6 max-w-2xl">
                    <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-5">
                      <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">📊 Санхүүгийн хэсгийн текст</h3>
                      {Object.entries(siteConfig.financials || {}).map(([key, obj]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase">{obj.label}</label>
                          <textarea rows={(obj.value?.length||0) > 60 ? 3 : 1} value={configEdits[key] ?? obj.value ?? ''}
                            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                        </div>
                      ))}
                      <button onClick={() => saveBulkConfig('financials')} disabled={cmsSaving}
                        className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                        {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-4">
                      <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">📈 Тоон үзүүлэлтүүд</h3>
                      <p className="text-xs text-gray-400">Жишээ: "7 Тэрбум", "13.7%"</p>
                      {stats.map(s => (
                        <div key={s._id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border">
                          <span className="text-sm font-bold text-gray-600 w-52 shrink-0">{s.label}</span>
                          <div className="flex gap-2 flex-1">
                            <input id={`stat-${s._id}`} defaultValue={s.value} className="flex-1 p-2 border rounded-lg bg-white font-bold text-sm"/>
                            <button onClick={() => handleStatUpdate(s._id, document.getElementById(`stat-${s._id}`).value)}
                              className="bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap">Хадгалах</button>
                          </div>
                        </div>
                      ))}
                      {stats.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Серверийг дахин эхлүүлнэ үү.</p>}
                    </div>
                  </div>
                )}

                {/* 4. БҮТЭЭГДЭХҮҮН */}
                {cmsSubTab === 'products' && (
                  <div className="space-y-4">
                    {!editingProduct ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                          {products.map(p => (
                            <div key={p.productKey} className="bg-white rounded-2xl border shadow-sm p-5 flex justify-between items-start">
                              <div>
                                <p className="font-bold text-[#003B5C]">{p.title}</p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.shortDesc}</p>
                              </div>
                              <button onClick={() => setEditingProduct({ ...p })}
                                className="p-2 bg-slate-100 rounded-lg hover:bg-[#003B5C] hover:text-white transition ml-4 shrink-0">
                                <Pencil size={16}/>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setEditingProduct({ productKey: '', title: '', shortDesc: '', description: '', bgImageUrl: '', headerImageUrl: '', order: products.length + 1 })}
                          className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-[#003B5C] text-[#003B5C] rounded-2xl font-bold text-sm hover:bg-[#003B5C] hover:text-white transition">
                          <Plus size={18}/> Шинэ бүтээгдэхүүн нэмэх
                        </button>
                      </>
                    ) : (
                      <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-5 max-w-3xl">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-xl text-[#003B5C]">{editingProduct._id ? editingProduct.title : 'Шинэ бүтээгдэхүүн'}</h3>
                          <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-red-500"><X size={22}/></button>
                        </div>
                        {!editingProduct._id && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Бүтээгдэхүүний key (eng, жишээ: new_loan)</label>
                            <input value={editingProduct.productKey || ''}
                              onChange={e => setEditingProduct(p => ({ ...p, productKey: e.target.value }))}
                              className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                          </div>
                        )}
                        {[
                          { field: 'title', label: 'Гарчиг', multi: false },
                          { field: 'shortDesc', label: 'Богино тайлбар', multi: false },
                          { field: 'description', label: 'Дэлгэрэнгүй тайлбар', multi: true },
                        ].map(({ field, label, multi }) => (
                          <div key={field} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
                            {multi ? (
                              <textarea rows={3} value={editingProduct[field] || ''}
                                onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))}
                                className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                            ) : (
                              <input value={editingProduct[field] || ''}
                                onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))}
                                className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                            )}
                          </div>
                        ))}
                        {[
                          { field: 'bgImageUrl', label: 'Дэвсгэр зураг' },
                          { field: 'headerImageUrl', label: 'Дэлгэрэнгүй хуудсын зураг' },
                        ].map(({ field, label }) => (
                          <div key={field} className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
                            {editingProduct[field] && <img src={editingProduct[field]} alt="" className="h-24 rounded-xl object-cover border"/>}
                            <div className="flex gap-2">
                              <input value={editingProduct[field] || ''} placeholder="URL эсвэл доор файл сонгоно уу"
                                onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))}
                                className="flex-1 p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                              <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1">
                                Зураг
                                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                  if (!e.target.files[0]) return;
                                  try { const url = await uploadImage(e.target.files[0]); setEditingProduct(p => ({ ...p, [field]: url })); }
                                  catch { alert('Upload алдаа'); }
                                }}/>
                              </label>
                            </div>
                          </div>
                        ))}
                        {['individual', 'organization'].map(utype => (
                          editingProduct[utype] && (
                            <div key={utype} className="border rounded-2xl p-5 space-y-4">
                              <p className="font-bold text-sm text-gray-600 uppercase">{utype === 'individual' ? 'Иргэн' : 'Байгууллага'}</p>
                              {['conditions', 'requirements'].map(field => (
                                <div key={field} className="space-y-2">
                                  <p className="text-xs text-gray-400 font-bold">{field === 'conditions' ? 'Нөхцөл' : 'Шаардлага'}</p>
                                  {(editingProduct[utype]?.[field] || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input value={item} onChange={e => updateProductList(field, utype, idx, e.target.value)}
                                        className="flex-1 p-2 border rounded-lg text-sm bg-slate-50"/>
                                      <button onClick={() => removeProductListItem(field, utype, idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                    </div>
                                  ))}
                                  <button onClick={() => addProductListItem(field, utype)}
                                    className="flex items-center gap-1 text-xs text-[#003B5C] font-bold hover:underline">
                                    <Plus size={14}/> Нэмэх
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        ))}
                        <div className="flex gap-4 pt-2">
                          <button onClick={async () => {
                            setCmsSaving(true);
                            try {
                              if (editingProduct._id) {
                                await axios.put(`${API_URL}/api/products/content/${editingProduct.productKey}`, editingProduct);
                                alert('✅ Хадгалагдлаа!');
                              } else {
                                await axios.post(`${API_URL}/api/products/content`, editingProduct);
                                alert('✅ Нэмэгдлээ!');
                              }
                              setEditingProduct(null);
                              fetchCMSData();
                            } catch (e) { alert('❌ Алдаа: ' + (e.response?.data?.message || e.message || JSON.stringify(e))); }
                            finally { setCmsSaving(false); }
                          }} disabled={cmsSaving}
                            className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                            {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                          </button>
                          <button onClick={async () => {
                              if (!window.confirm(`"${editingProduct.title}" устгах уу?`)) return;
                              try {
                                await axios.delete(`${API_URL}/api/products/content/${editingProduct._id}`);
                                alert('✅ Устгагдлаа!');
                                setEditingProduct(null);
                                fetchCMSData();
                              } catch (e) { alert('❌ Устгах алдаа: ' + (e.response?.data?.message || e.message || JSON.stringify(e))); }
                            }} className="px-8 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-sm">Устгах</button>
                          <button onClick={() => setEditingProduct(null)} className="px-8 py-3 border rounded-xl font-bold text-sm text-gray-500">Болих</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ТООЦООЛУУР */}
                {cmsSubTab === 'calculator' && (
                  <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-6 max-w-2xl">
                    <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">🧮 Тооцоолуурын тохиргоо</h3>
                    <p className="text-xs text-gray-400">Зээл болон итгэлцлийн тооцоолуурын параметрүүд. Хадгалсны дараа вэбсайт дээр автоматаар шинэчлэгдэнэ.</p>
                    {Object.entries(siteConfig.rates || {}).map(([key, obj]) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="w-64 text-sm text-gray-600 font-medium shrink-0">{obj.label}</label>
                        <input type="number" step="0.1" value={configEdits[key] ?? obj.value ?? ''}
                          onChange={e => setConfigEdits(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                          className="flex-1 p-3 border rounded-xl text-sm font-bold bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                      </div>
                    ))}
                    <button onClick={() => saveBulkConfig('rates')} disabled={cmsSaving}
                      className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                      {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                    </button>
                  </div>
                )}

                {/* 6. ЗАХИРЛЫН МЭНДЧИЛГЭЭ */}
                {cmsSubTab === 'ceo' && (
                  <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-5 max-w-2xl">
                    <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">👤 Захирлын мэндчилгээ</h3>
                    {Object.entries(siteConfig.ceo || {}).map(([key, obj]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">{obj.label}</label>
                        {(key === 'ceo_image' || key === 'ceo_signature') ? (
                          <div className="space-y-2">
                            {configEdits[key] && <img src={configEdits[key]} alt="" className="h-24 rounded-xl object-cover border"/>}
                            <div className="flex gap-2">
                              <input value={configEdits[key] ?? obj.value ?? ''} placeholder="URL эсвэл файл сонгоно уу"
                                onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                className="flex-1 p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                              <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center">
                                Зураг
                                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                  if (!e.target.files[0]) return;
                                  try { const url = await uploadImage(e.target.files[0]); setConfigEdits(p => ({ ...p, [key]: url })); }
                                  catch { alert('Upload алдаа'); }
                                }}/>
                              </label>
                            </div>
                          </div>
                        ) : key === 'ceo_message' ? (
                          <textarea rows={8} value={configEdits[key] ?? obj.value ?? ''}
                            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                        ) : (
                          <input value={configEdits[key] ?? obj.value ?? ''}
                            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                        )}
                        {false && themeType === 'color' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Солонгын 7 өнгө</p>
                            <p className="text-sm text-gray-500">Section бүр автоматаар өөр өөр хатуу өнгөтэй болно. Тусдаа өнгө сонгох шаардлагагүй.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {RAINBOW_COLORS.map(c => (
                                <div key={c.hex} className="rounded-xl p-3 border border-gray-200 bg-white">
                                  <div className="w-full h-10 rounded-lg mb-2 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                  <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">{c.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {false && themeType === 'image' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Page бүрийн зураг</p>
                            <div className="space-y-4">
                              {SECTION_IMAGE_FIELDS.map(({ key, label }) => (
                                <div key={key} className="space-y-2 rounded-xl border p-4 bg-slate-50">
                                  <p className="text-sm font-bold text-[#003B5C]">{label}</p>
                                  {sectionThemeImages[key] && (
                                    <img src={sectionThemeImages[key]} alt={label} className="w-full h-28 object-cover rounded-xl border"/>
                                  )}
                                  <div className="flex gap-2">
                                    <input type="text" value={sectionThemeImages[key]} placeholder="URL эсвэл файл сонгоно уу"
                                      onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                      className="flex-1 p-3 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#003B5C]"/>
                                    <label className="cursor-pointer bg-white hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1 border">
                                      Зураг
                                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                        if (!e.target.files[0]) return;
                                        try {
                                          const url = await uploadImage(e.target.files[0]);
                                          setConfigEdits(p => ({ ...p, [key]: url }));
                                        } catch {
                                          alert('Upload алдаа');
                                        }
                                      }}/>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {false && themeType === 'color' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Солонгын 7 өнгө</p>
                            <p className="text-sm text-gray-500">Section бүр автоматаар өөр өөр хатуу өнгөтэй болно. Тусдаа өнгө сонгох шаардлагагүй.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {RAINBOW_COLORS.map(c => (
                                <div key={c.hex} className="rounded-xl p-3 border border-gray-200 bg-white">
                                  <div className="w-full h-10 rounded-lg mb-2 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                  <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">{c.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {false && themeType === 'image' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Page бүрийн зураг</p>
                            <div className="space-y-4">
                              {SECTION_IMAGE_FIELDS.map(({ key, label }) => (
                                <div key={key} className="space-y-2 rounded-xl border p-4 bg-slate-50">
                                  <p className="text-sm font-bold text-[#003B5C]">{label}</p>
                                  {sectionThemeImages[key] && (
                                    <img src={sectionThemeImages[key]} alt={label} className="w-full h-28 object-cover rounded-xl border"/>
                                  )}
                                  <div className="flex gap-2">
                                    <input type="text" value={sectionThemeImages[key]} placeholder="URL эсвэл файл сонгоно уу"
                                      onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                      className="flex-1 p-3 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#003B5C]"/>
                                    <label className="cursor-pointer bg-white hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1 border">
                                      Зураг
                                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                        if (!e.target.files[0]) return;
                                        try {
                                          const url = await uploadImage(e.target.files[0]);
                                          setConfigEdits(p => ({ ...p, [key]: url }));
                                        } catch {
                                          alert('Upload алдаа');
                                        }
                                      }}/>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button onClick={() => saveBulkConfig('ceo')} disabled={cmsSaving}
                      className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                      {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                    </button>
                  </div>
                )}

                {/* 7. ТУЗ */}
                {cmsSubTab === 'board' && (
                  <div className="space-y-4 max-w-3xl">
                    <h3 className="font-bold text-lg text-[#003B5C]">👥 Төлөөлөн удирдах зөвлөл</h3>
                    {teamMembers.filter(m => m.memberType === 'board').map(m => (
                      <div key={m._id} className="bg-white rounded-2xl border shadow-sm p-5">
                        {editingMember?._id === m._id ? (
                          <div className="space-y-3">
                            {[{ f:'name',l:'Нэр'},{f:'role',l:'Албан тушаал'},{f:'experience',l:'Туршлага'}].map(({ f, l }) => (
                              <div key={f} className="space-y-1">
                                <label className="text-xs font-bold text-gray-400">{l}</label>
                                <input value={editingMember[f]||''} onChange={e => setEditingMember(p => ({ ...p, [f]: e.target.value }))}
                                  className="w-full p-2 border rounded-lg text-sm bg-slate-50"/>
                              </div>
                            ))}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400">Зураг</label>
                              {editingMember.imagePath && <img src={editingMember.imagePath} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-[#003B5C]"/>}
                              <div className="flex gap-2">
                                <input value={editingMember.imagePath||''} placeholder="/board/name.jpg эсвэл URL"
                                  onChange={e => setEditingMember(p => ({ ...p, imagePath: e.target.value }))}
                                  className="flex-1 p-2 border rounded-lg text-sm bg-slate-50"/>
                                <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center">
                                  Зураг
                                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                    if (!e.target.files[0]) return;
                                    try { const url = await uploadImage(e.target.files[0]); setEditingMember(p => ({ ...p, imagePath: url })); }
                                    catch { alert('Upload алдаа'); }
                                  }}/>
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-gray-400">Идэвхтэй</label>
                              <input type="checkbox" checked={editingMember.isActive !== false}
                                onChange={e => setEditingMember(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4"/>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => { saveMember(editingMember); setEditingMember(null); }} disabled={cmsSaving}
                                className="bg-[#003B5C] text-white px-6 py-2 rounded-xl text-sm font-bold">Хадгалах</button>
                              <button onClick={() => setEditingMember(null)} className="px-6 py-2 border rounded-xl text-sm text-gray-500">Болих</button>
                              <button onClick={() => { deleteMember(m._id); setEditingMember(null); }} className="ml-auto px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold"><Trash2 size={15}/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <img src={m.imagePath} alt={m.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#003B5C]"
                                onError={e => { e.target.src='https://via.placeholder.com/60'; }}/>
                              <div>
                                <p className="font-bold text-[#003B5C] text-sm">{m.name}</p>
                                <p className="text-xs text-gray-400">{m.role}</p>
                              </div>
                            </div>
                            <button onClick={() => setEditingMember({ ...m })} className="p-2 bg-slate-100 rounded-lg hover:bg-[#003B5C] hover:text-white transition"><Pencil size={15}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {showNewMember && newMemberType === 'board' ? (
                      <div className="bg-white rounded-2xl border-2 border-dashed border-[#003B5C] p-6 space-y-3">
                        <p className="font-bold text-[#003B5C] text-sm">Шинэ ТУЗ гишүүн</p>
                        {[{f:'name',l:'Нэр'},{f:'role',l:'Албан тушаал'},{f:'imagePath',l:'Зургийн зам'},{f:'experience',l:'Туршлага'}].map(({ f, l }) => (
                          <div key={f} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400">{l}</label>
                            <input value={newMember[f]||''} onChange={e => setNewMember(p => ({ ...p, [f]: e.target.value }))}
                              className="w-full p-2 border rounded-lg text-sm bg-slate-50"/>
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <button onClick={() => { setNewMemberType('board'); addMember(); }} disabled={cmsSaving}
                            className="bg-[#003B5C] text-white px-6 py-2 rounded-xl text-sm font-bold">Нэмэх</button>
                          <button onClick={() => setShowNewMember(false)} className="px-6 py-2 border rounded-xl text-sm text-gray-500">Болих</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setNewMemberType('board'); setShowNewMember(true); setNewMember({ name:'', role:'', imagePath:'', experience:'', memberType:'board', order:99 }); }}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#003B5C] hover:text-[#003B5C] font-bold flex items-center justify-center gap-2 transition">
                        <Plus size={18}/> Шинэ гишүүн нэмэх
                      </button>
                    )}
                  </div>
                )}

                {/* 8. УДИРДЛАГЫН БАГ */}
                {cmsSubTab === 'management' && (
                  <div className="space-y-4 max-w-3xl">
                    <h3 className="font-bold text-lg text-[#003B5C]">🏛 Удирдлагын баг</h3>
                    {teamMembers.filter(m => m.memberType === 'management').map(m => (
                      <div key={m._id} className="bg-white rounded-2xl border shadow-sm p-5">
                        {editingMember?._id === m._id ? (
                          <div className="space-y-3">
                            {[{ f:'name',l:'Нэр'},{f:'role',l:'Албан тушаал'}].map(({ f, l }) => (
                              <div key={f} className="space-y-1">
                                <label className="text-xs font-bold text-gray-400">{l}</label>
                                <input value={editingMember[f]||''} onChange={e => setEditingMember(p => ({ ...p, [f]: e.target.value }))}
                                  className="w-full p-2 border rounded-lg text-sm bg-slate-50"/>
                              </div>
                            ))}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400">Зураг</label>
                              {editingMember.imagePath && <img src={editingMember.imagePath} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-[#003B5C]"/>}
                              <div className="flex gap-2">
                                <input value={editingMember.imagePath||''} placeholder="/board/name.jpg эсвэл URL"
                                  onChange={e => setEditingMember(p => ({ ...p, imagePath: e.target.value }))}
                                  className="flex-1 p-2 border rounded-lg text-sm bg-slate-50"/>
                                <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center">
                                  Зураг
                                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                    if (!e.target.files[0]) return;
                                    try { const url = await uploadImage(e.target.files[0]); setEditingMember(p => ({ ...p, imagePath: url })); }
                                    catch { alert('Upload алдаа'); }
                                  }}/>
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-gray-400">Идэвхтэй</label>
                              <input type="checkbox" checked={editingMember.isActive !== false}
                                onChange={e => setEditingMember(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4"/>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button onClick={() => { saveMember(editingMember); setEditingMember(null); }} disabled={cmsSaving}
                                className="bg-[#003B5C] text-white px-6 py-2 rounded-xl text-sm font-bold">Хадгалах</button>
                              <button onClick={() => setEditingMember(null)} className="px-6 py-2 border rounded-xl text-sm text-gray-500">Болих</button>
                              <button onClick={() => { deleteMember(m._id); setEditingMember(null); }} className="ml-auto px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold"><Trash2 size={15}/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <img src={m.imagePath} alt={m.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#003B5C]"
                                onError={e => { e.target.src='https://via.placeholder.com/60'; }}/>
                              <div>
                                <p className="font-bold text-[#003B5C] text-sm">{m.name}</p>
                                <p className="text-xs text-gray-400">{m.role}</p>
                              </div>
                            </div>
                            <button onClick={() => setEditingMember({ ...m })} className="p-2 bg-slate-100 rounded-lg hover:bg-[#003B5C] hover:text-white transition"><Pencil size={15}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {showNewMember && newMemberType === 'management' ? (
                      <div className="bg-white rounded-2xl border-2 border-dashed border-[#003B5C] p-6 space-y-3">
                        <p className="font-bold text-[#003B5C] text-sm">Шинэ удирдлагын гишүүн</p>
                        {[{f:'name',l:'Нэр'},{f:'role',l:'Албан тушаал'},{f:'imagePath',l:'Зургийн зам'}].map(({ f, l }) => (
                          <div key={f} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400">{l}</label>
                            <input value={newMember[f]||''} onChange={e => setNewMember(p => ({ ...p, [f]: e.target.value }))}
                              className="w-full p-2 border rounded-lg text-sm bg-slate-50"/>
                          </div>
                        ))}
                        <div className="flex gap-3">
                          <button onClick={() => { setNewMemberType('management'); addMember(); }} disabled={cmsSaving}
                            className="bg-[#003B5C] text-white px-6 py-2 rounded-xl text-sm font-bold">Нэмэх</button>
                          <button onClick={() => setShowNewMember(false)} className="px-6 py-2 border rounded-xl text-sm text-gray-500">Болих</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setNewMemberType('management'); setShowNewMember(true); setNewMember({ name:'', role:'', imagePath:'', experience:'', memberType:'management', order:99 }); }}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#003B5C] hover:text-[#003B5C] font-bold flex items-center justify-center gap-2 transition">
                        <Plus size={18}/> Шинэ гишүүн нэмэх
                      </button>
                    )}
                  </div>
                )}

                {/* 9. ХУВЬЦАА ЭЗЭМШИГЧ */}
                {cmsSubTab === 'shareholder' && (
                  <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-5 max-w-2xl">
                    <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">💼 Хувьцаа эзэмшигчийн мэдээлэл</h3>
                    {Object.entries(siteConfig.shareholder || {}).map(([key, obj]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase">{obj.label}</label>
                        {key === 'shareholder_description' ? (
                          <textarea rows={3} value={configEdits[key] ?? obj.value ?? ''}
                            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"/>
                        ) : (
                          <input type="text" value={configEdits[key] ?? obj.value ?? ''}
                            onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                        )}
                      </div>
                    ))}
                    <button onClick={() => saveBulkConfig('shareholder')} disabled={cmsSaving}
                      className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm">
                      {cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                    </button>
                  </div>
                )}

                {cmsSubTab === 'theme' && (() => {
                  const RAINBOW_COLORS = [
                    { hex: '#003B5C', name: 'Цэнхэр (үндсэн)' },
                    { hex: '#1a1a2e', name: 'Хар тэнгэр' },
                    { hex: '#2D1B69', name: 'Нил ягаан' },
                    { hex: '#C0392B', name: 'Улаан' },
                    { hex: '#E67E22', name: 'Улбар шар' },
                    { hex: '#27AE60', name: 'Ногоон' },
                    { hex: '#1ABC9C', name: 'Цайвар ногоон' },
                  ];
                  // Luminance-based text color for any hex
                  const getTextColor = (hex) => {
                    const h = hex.replace('#', '');
                    const r = parseInt(h.substring(0, 2), 16) / 255;
                    const g = parseInt(h.substring(2, 4), 16) / 255;
                    const b = parseInt(h.substring(4, 6), 16) / 255;
                    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    return lum > 0.45 ? '#1e293b' : '#ffffff';
                  };
                  const SECTION_IMAGE_FIELDS = [
                    { key: 'theme_image_home', label: 'Нүүр' },
                    { key: 'theme_image_about', label: 'Бид хэн бэ' },
                    { key: 'theme_image_financials', label: 'Санхүү' },
                    { key: 'theme_image_governance', label: 'Засаглал' },
                    { key: 'theme_image_products', label: 'Бүтээгдэхүүн' },
                    { key: 'theme_image_blog', label: 'Блог' },
                    { key: 'theme_image_contact', label: 'Холбоо барих' },
                  ];
                  const themeMode = configEdits['theme_mode'] ?? siteConfig.theme?.theme_mode?.value ?? 'dark';
                  const themeType = configEdits['theme_type'] ?? siteConfig.theme?.theme_type?.value ?? 'default';
                  const themeColor = configEdits['theme_color'] ?? siteConfig.theme?.theme_color?.value ?? '#003B5C';
                  const themeImage = configEdits['theme_image'] ?? siteConfig.theme?.theme_image?.value ?? '';
                  const sectionThemeImages = Object.fromEntries(
                    SECTION_IMAGE_FIELDS.map(({ key }) => [
                      key,
                      configEdits[key] ?? siteConfig.theme?.[key]?.value ?? '',
                    ])
                  );
                  const firstThemeImage = Object.values(sectionThemeImages).find(Boolean) || themeImage;

                  // Live preview styles
                  const previewBg = themeType === 'color'
                    ? { background: `linear-gradient(90deg, ${RAINBOW_COLORS.map(c => c.hex).join(', ')})` }
                    : themeType === 'image' && firstThemeImage
                      ? { backgroundImage: `url(${firstThemeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #003B5C 0%, #001f35 100%)' };
                  const previewOverlayOpacity = themeType === 'image' ? 0.5 : 0;
                  const previewTextColor = '#ffffff';

                  return (
                    <div className="space-y-6 max-w-2xl">
                      <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">🎨 Вэбийн загвар & Дэвсгэр</h3>

                      {/* Dark / Light */}
                      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase">Горим</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ val: 'dark', label: '🌙 Dark', desc: 'Харанхуй' }, { val: 'light', label: '☀️ Light', desc: 'Цайвар' }].map(m => (
                            <div key={m.val} onClick={() => setConfigEdits(p => ({ ...p, theme_mode: m.val }))}
                              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${themeMode === m.val ? 'border-[#003B5C] bg-[#003B5C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                              <p className="font-bold text-sm">{m.label}</p>
                              <p className="text-xs text-gray-400">{m.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Дэвсгэрийн төрөл */}
                      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase">Дэвсгэрийн төрөл</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[{ val: 'default', label: '🖼 Анхны зураг', desc: 'Одоогийн' }, { val: 'color', label: '🎨 Өнгө', desc: 'Хатуу өнгө' }, { val: 'image', label: '📷 Зураг', desc: 'Өөрийн зураг' }].map(t => (
                            <div key={t.val} onClick={() => setConfigEdits(p => ({ ...p, theme_type: t.val }))}
                              className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${themeType === t.val ? 'border-[#003B5C] bg-[#003B5C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                              <p className="font-bold text-sm">{t.label}</p>
                              <p className="text-xs text-gray-400">{t.desc}</p>
                            </div>
                          ))}
                        </div>

                        {/* Өнгө сонгох */}
                        {false && themeType === 'color' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Өнгө сонгох</p>
                            <div className="grid grid-cols-4 gap-3">
                              {RAINBOW_COLORS.map(c => (
                                <div key={c.hex} onClick={() => setConfigEdits(p => ({ ...p, theme_color: c.hex }))}
                                  className={`cursor-pointer rounded-xl p-3 border-2 transition-all ${themeColor === c.hex ? 'border-[#003B5C] scale-105 shadow-md' : 'border-transparent hover:border-gray-300'}`}>
                                  <div className="w-full h-10 rounded-lg mb-2 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                  <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">{c.name}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              <label className="text-xs font-bold text-gray-400 uppercase">Өөр өнгө:</label>
                              <input type="color" value={themeColor}
                                onChange={e => setConfigEdits(p => ({ ...p, theme_color: e.target.value }))}
                                className="w-10 h-10 rounded-lg border cursor-pointer"/>
                              <span className="text-sm font-mono text-gray-500">{themeColor}</span>
                            </div>
                          </div>
                        )}

                        {/* Зураг upload */}
                        {false && themeType === 'image' && (
                          <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">Дэвсгэр зураг</p>
                            {themeImage && (
                              <img src={themeImage} alt="bg" className="w-full h-32 object-cover rounded-xl border"/>
                            )}
                            <div className="flex gap-2">
                              <input type="text" value={themeImage} placeholder="URL эсвэл файл сонгоно уу"
                                onChange={e => setConfigEdits(p => ({ ...p, theme_image: e.target.value }))}
                                className="flex-1 p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"/>
                              <label className="cursor-pointer bg-slate-100 hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1">
                                Зураг
                                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                  if (!e.target.files[0]) return;
                                  try { const url = await uploadImage(e.target.files[0]); setConfigEdits(p => ({ ...p, theme_image: url })); }
                                  catch { alert('Upload алдаа'); }
                                }}/>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {themeType === 'color' && (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-bold text-gray-400 uppercase">Солонгын 7 өнгө</p>
                          <p className="text-sm text-gray-500">Section бүр автоматаар өөр өөр хатуу өнгөтэй болно. Тусдаа өнгө сонгох шаардлагагүй.</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {RAINBOW_COLORS.map(c => (
                              <div key={c.hex} className="rounded-xl p-3 border border-gray-200 bg-white">
                                <div className="w-full h-10 rounded-lg mb-2 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">{c.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {themeType === 'image' && (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-bold text-gray-400 uppercase">Page бүрийн зураг</p>
                          <div className="space-y-4">
                            {SECTION_IMAGE_FIELDS.map(({ key, label }) => (
                              <div key={key} className="space-y-2 rounded-xl border p-4 bg-slate-50">
                                <p className="text-sm font-bold text-[#003B5C]">{label}</p>
                                {sectionThemeImages[key] && (
                                  <img src={sectionThemeImages[key]} alt={label} className="w-full h-28 object-cover rounded-xl border"/>
                                )}
                                <div className="flex gap-2">
                                  <input type="text" value={sectionThemeImages[key]} placeholder="URL эсвэл файл сонгоно уу"
                                    onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))}
                                    className="flex-1 p-3 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#003B5C]"/>
                                  <label className="cursor-pointer bg-white hover:bg-[#003B5C] hover:text-white text-[#003B5C] px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1 border">
                                    Зураг
                                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                      if (!e.target.files[0]) return;
                                      try {
                                        const url = await uploadImage(e.target.files[0]);
                                        setConfigEdits(p => ({ ...p, [key]: url }));
                                      } catch {
                                        alert('Upload алдаа');
                                      }
                                    }}/>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Live Preview */}
                      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase">Урьдчилан харах</p>
                        <div className="rounded-xl overflow-hidden shadow-lg" style={previewBg}>
                          {previewOverlayOpacity > 0 && (
                            <div style={{ backgroundColor: `rgba(0,0,0,${previewOverlayOpacity})` }} className="absolute inset-0 rounded-xl pointer-events-none"/>
                          )}
                          <div className="relative p-6 space-y-3" style={{ color: previewTextColor }}>
                            {/* Mini navbar */}
                            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: `${previewTextColor}20` }}>
                              <div className="font-bold text-sm tracking-wide">Solongo Capital</div>
                              <div className="flex gap-3 text-xs opacity-70">
                                <span>Бүтээгдэхүүн</span>
                                <span>Засаглал</span>
                                <span>Холбоо</span>
                              </div>
                            </div>
                            {/* Mini hero */}
                            <div className="text-center py-4">
                              <div className="text-lg font-bold mb-1">Бизнесийн Өсөлтийг Дэмжинэ</div>
                              <div className="text-xs opacity-60">Санхүүгийн найдвартай түнш</div>
                              <div className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-semibold"
                                style={{ border: `1px solid ${previewTextColor}40`, color: previewTextColor }}>
                                Бүтээгдэхүүн үзэх
                              </div>
                            </div>
                            {/* Mode badge */}
                            <div className="text-center">
                              <span className="text-[10px] opacity-50 uppercase tracking-widest">
                                {themeMode === 'light' ? '☀️ Light горим' : '🌙 Dark горим'} · {themeType === 'color' ? `Өнгө: ${themeColor}` : themeType === 'image' ? 'Зураг дэвсгэр' : 'Анхны дэвсгэр'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button onClick={async () => {
                        setCmsSaving(true);
                        try {
                          await axios.post(`${API_URL}/api/config/bulk`, {
                            theme_mode: themeMode,
                            theme_type: themeType,
                            theme_color: themeColor,
                            theme_image: themeImage,
                            ...sectionThemeImages,
                          });
                          alert('✅ Хадгалагдлаа! Хуудсыг дахин ачааллах шаардлагатай.');
                          fetchCMSData();
                        } catch { alert('Алдаа гарлаа'); }
                        finally { setCmsSaving(false); }
                      }} disabled={cmsSaving} className="bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm w-full">
                        {cmsSaving ? 'Хадгалж байна...' : '💾 Хадгалах'}
                      </button>
                    </div>
                  );
                })()}

                {cmsSubTab === 'chatbot' && (
                  <div className="animate-fade-in space-y-6 max-w-5xl">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MessageCircle size={26} className="text-[#003B5C]"/>
                        <div>
                          <h2 className="text-2xl font-bold text-[#003B5C]">Чатботын мэдээлэл</h2>
                          <p className="text-sm text-gray-400">Чатботын холбоо барих мэдээлэл, тооцооллын хувь, бүтээгдэхүүний хариулт болон бүрдүүлэх баримтыг эндээс засна.</p>
                        </div>
                      </div>
                      <button
                        onClick={saveChatbotSettings}
                        disabled={cmsSaving}
                        className="bg-[#003B5C] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-[#002b43] disabled:opacity-50"
                      >
                        {cmsSaving ? 'Хадгалж байна...' : 'Бүгдийг хадгалах'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <section className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">Холбоо барих мэдээлэл</h3>
                        {[
                          { key: 'contact_phone', label: 'Утас', placeholder: '75991919' },
                          { key: 'contact_email', label: 'Имэйл', placeholder: 'info@scm.mn' },
                          { key: 'contact_address', label: 'Хаяг', placeholder: 'Хаяг оруулах' }
                        ].map(({ key, label, placeholder }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
                            <textarea
                              rows={key === 'contact_address' ? 3 : 1}
                              value={configEdits[key] ?? siteConfig.contact?.[key]?.value ?? ''}
                              placeholder={placeholder}
                              onChange={e => setConfigEdits(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"
                            />
                          </div>
                        ))}
                      </section>

                      <section className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-lg text-[#003B5C] border-b pb-3">Тооцооллын тохиргоо</h3>
                        {[
                          { key: 'loan_rate_default', label: 'Зээлийн сарын хүү (%)', step: '0.1' },
                          { key: 'trust_rate', label: 'Итгэлцлийн сарын хүү (%)', step: '0.1' },
                          { key: 'dti_individual', label: 'Иргэний ӨОХ (%)', step: '1' },
                          { key: 'dti_org', label: 'Байгууллагын ӨОХ (%)', step: '1' }
                        ].map(({ key, label, step }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
                            <input
                              type="number"
                              step={step}
                              value={configEdits[key] ?? siteConfig.rates?.[key]?.value ?? ''}
                              onChange={e => setConfigEdits(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
                            />
                          </div>
                        ))}
                      </section>
                    </div>

                    <section className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
                      <div className="flex items-start justify-between gap-4 border-b pb-4">
                        <div>
                          <h3 className="font-bold text-lg text-[#003B5C]">Бүтээгдэхүүний chatbot хариулт ба баримт бичиг</h3>
                          <p className="text-xs text-gray-400 mt-1">Хэрэглэгч бүтээгдэхүүн сонгоход харагдах текст болон иргэн/байгууллагын бүрдүүлэх баримт.</p>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 bg-slate-100 px-3 py-1 rounded-full">{products.length} бүтээгдэхүүн</span>
                      </div>

                      <div className="space-y-5">
                        {products.map(product => (
                          <div key={product._id || product.productKey} className="border rounded-2xl p-5 bg-slate-50/60 space-y-4">
                            <div>
                              <p className="font-bold text-[#003B5C]">{product.title || PRODUCT_NAMES[product.productKey] || product.productKey}</p>
                              <p className="text-[11px] text-gray-400 font-mono">{product.productKey}</p>
                            </div>
                            <textarea
                              rows={4}
                              value={product.chatbotText || ''}
                              placeholder="Жишээ: Зээлийн хэмжээ, хүү, хугацаа, гол нөхцөлийг товч бичнэ үү."
                              onChange={e => setProducts(prev => prev.map(item => (
                                item.productKey === product.productKey
                                  ? { ...item, chatbotText: e.target.value }
                                  : item
                              )))}
                              className="w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:border-[#003B5C] resize-none"
                            />

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {[
                                { type: 'individual', label: 'Иргэний бүрдүүлэх баримт' },
                                { type: 'organization', label: 'Байгууллагын бүрдүүлэх баримт' }
                              ].map(({ type, label }) => (
                                <div key={type} className="bg-white border rounded-2xl p-4 space-y-3">
                                  <p className="font-bold text-sm text-gray-600">{label}</p>
                                  {(product[type]?.requirements || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input
                                        value={item}
                                        onChange={e => updateChatbotProductList(product.productKey, type, 'requirements', idx, e.target.value)}
                                        className="flex-1 p-2 border rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
                                      />
                                      <button
                                        onClick={() => removeChatbotProductListItem(product.productKey, type, 'requirements', idx)}
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <X size={16}/>
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addChatbotProductListItem(product.productKey, type, 'requirements')}
                                    className="flex items-center gap-1 text-xs text-[#003B5C] font-bold hover:underline"
                                  >
                                    <Plus size={14}/> Баримт нэмэх
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {products.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Бүтээгдэхүүний мэдээлэл олдсонгүй. Backend server ажиллаж байгаа эсэхийг шалгана уу.</p>
                      )}

                      <button
                        onClick={saveChatbotSettings}
                        disabled={cmsSaving}
                        className="bg-[#00A651] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-[#008f46] disabled:opacity-50"
                      >
                        {cmsSaving ? 'Хадгалж байна...' : 'Чатботын мэдээлэл хадгалах'}
                      </button>
                    </section>
                  </div>
                )}

              </div>{/* end content panel */}
            </div>{/* end flex */}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl border shadow-sm max-w-2xl space-y-8 animate-fade-in">
             <h3 className="text-lg font-bold mb-6 text-green-600 uppercase tracking-wider flex items-center gap-2"><QrCode size={22}/> 2FA Тохиргоо</h3>
             <div className="flex flex-col gap-6">
                {!qrCode ? (
                  <button onClick={setup2FA} className="bg-[#003B5C] text-white px-8 py-4 rounded-2xl font-bold shadow-xl uppercase text-xs">2FA Идэвхжүүлэх</button>
                ) : (
                  <div className="space-y-6 animate-scale-up">
                    <div className="bg-white p-4 border rounded-[32px] inline-block shadow-inner"><img src={qrCode} alt="QR" className="w-48 h-48" /></div>
                    <input value={twoFACode} onChange={e=>setTwoFACode(e.target.value)} placeholder="000 000" className="w-full p-5 border-2 border-slate-100 rounded-3xl font-mono text-3xl tracking-[12px] text-center" maxLength={6}/>
                    <button onClick={verify2FA} className="w-full bg-[#00A651] text-white py-5 rounded-[24px] font-black shadow-xl uppercase tracking-widest">Баталгаажуулах</button>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* --- MODALS (SELECTED REQUEST БҮРЭН ӨГӨГДӨЛ) --- */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div id="printable-content" className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto relative animate-scale-up border border-white/20 p-12">
            <button onClick={() => setSelectedRequest(null)} className="absolute top-8 right-8 text-gray-400 no-print hover:text-red-500 transition duration-300"><XCircle size={36}/></button>
            <div className="space-y-12">
               <div className="flex items-center gap-10 border-b border-gray-100 pb-12">
                 {selectedRequest.selfieUrl ? (
                   <img src={selectedRequest.selfieUrl} alt="B" className="w-32 h-32 object-cover rounded-[40px] border-4 border-[#003B5C] shadow-2xl"/>
                 ) : (
                   <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center border-4 border-slate-100"><User size={48} className="text-slate-200"/></div>
                 )}
                 <div><h2 className="text-4xl font-black text-[#003B5C]">Хүсэлт №{selectedRequest._id.slice(-6).toUpperCase()}</h2><p className="text-gray-400 mt-3 font-bold flex items-center gap-3"><Calendar size={18}/> {formatDate(selectedRequest.createdAt)}</p></div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Дүн</p><p className="font-black text-2xl text-[#003B5C]">{formatCurrency(selectedRequest.amount)}</p></div>
                 <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Хугацаа</p><p className="font-black text-2xl text-[#003B5C]">{selectedRequest.term} сар</p></div>
                 <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Бүтээгдэхүүн</p><p className="font-bold text-xs text-[#003B5C]">{PRODUCT_NAMES[selectedRequest.selectedProduct] || selectedRequest.selectedProduct}</p></div>
                 <div className={`p-8 rounded-[32px] border text-center ${selectedRequest.status === 'resolved' ? 'bg-green-50' : selectedRequest.status === 'rejected' ? 'bg-red-50' : selectedRequest.status === 'studying' ? 'bg-blue-50' : 'bg-orange-50'}`}><p className="text-[10px] font-black text-gray-400 mb-2 uppercase">Төлөв</p><p className="font-black text-xs uppercase">{getLoanStatusLabel(selectedRequest.status)}</p></div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm border-t pt-10">
                 <section className="space-y-4">
                   <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-[#D4AF37] pl-4 tracking-widest">Мэдээлэл</h3>
                   <p>Нэр: <b>{selectedRequest.lastname} {selectedRequest.firstname || selectedRequest.orgName}</b></p>
                   <p>Регистр: <b>{selectedRequest.regNo || selectedRequest.orgRegNo}</b></p>
                   <p>Утас: <b className="text-green-600">{selectedRequest.phone}</b></p>
                   <p>Имэйл: <b>{selectedRequest.email}</b></p>
                 </section>

                 <section className="space-y-8">
                   <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-green-500 pl-4 tracking-widest">Баримтууд</h3>
                   {selectedRequest.fileNames?.map((file, idx) => (
                      <a key={idx} href={file} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-5 rounded-[24px] border-2 border-slate-50 hover:bg-slate-100 transition-all duration-300">
                         <div className="flex items-center gap-4"><FileText size={22} className="text-blue-500"/><span className="text-xs font-black text-slate-700 truncate max-w-[200px]">{file.split('/').pop()}</span></div>
                         <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Үзэх</span>
                      </a>
                   ))}
                 </section>
               </div>
            </div>

            <div className="mt-12 p-8 bg-slate-50/50 flex justify-between items-center border-t no-print rounded-b-[40px]">
              <div className="flex gap-3">
                <button onClick={handlePrint} className="flex items-center gap-4 px-10 py-5 border-2 border-[#003B5C] text-[#003B5C] rounded-[24px] font-black uppercase text-xs hover:bg-[#003B5C] hover:text-white transition-all shadow-xl"><Printer size={22}/> Хэвлэх</button>
                <button onClick={() => openLoanResearch(selectedRequest)} className="flex items-center gap-3 px-8 py-5 bg-amber-100 text-[#003B5C] rounded-[24px] font-black uppercase text-xs hover:bg-[#D4AF37] transition-all shadow-xl"><ClipboardList size={22}/> Судалгаа</button>
              </div>
              {selectedRequest.status !== 'resolved' && selectedRequest.status !== 'rejected' ? (
                <div className="flex gap-3">
                  <button onClick={() => handleStatusChange(selectedRequest._id, 'rejected')} className="px-8 py-5 bg-red-600 text-white rounded-[24px] font-black shadow-xl hover:bg-red-700 transition-all flex items-center gap-4 uppercase text-xs"><XCircle size={22}/> Татгалзах</button>
                  <button onClick={() => handleStatusChange(selectedRequest._id, 'resolved')} className="px-8 py-5 bg-[#00A651] text-white rounded-[24px] font-black shadow-xl hover:bg-green-700 transition-all flex items-center gap-4 uppercase text-xs"><CheckCircle size={22}/> Шийдсэн</button>
                </div>
              ) : (
                <div className="px-12 py-5 bg-gray-200 text-gray-500 rounded-[24px] font-black flex items-center gap-3 uppercase text-xs tracking-widest">{getLoanStatusLabel(selectedRequest.status)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TRUST MODAL --- */}
      {selectedTrust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg relative animate-scale-up border p-10">
            <button onClick={() => { setSelectedTrust(null); setContactNote(''); }} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><XCircle size={32}/></button>
            <h2 className="text-2xl font-black text-[#003B5C] mb-6">Итгэлцлийн хүсэлт</h2>
            <div className="space-y-3 text-sm mb-6">
              <p>Нэр: <b>{selectedTrust.lastname} {selectedTrust.firstname}</b></p>
              <p>Утас: <b className="text-green-600">{selectedTrust.phone}</b></p>
              <p>И-мэйл: <b>{selectedTrust.email}</b></p>
              <p>Дүн: <b>{selectedTrust.amount}</b></p>
              <p>Огноо: <b>{formatDate(selectedTrust.createdAt)}</b></p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Тэмдэглэл</label>
              <textarea rows={3} value={contactNote} onChange={e => setContactNote(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm bg-slate-50 resize-none focus:outline-none focus:border-[#003B5C]"
                placeholder="Холбоо барих тэмдэглэл..."/>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveContactNote} className="bg-[#003B5C] text-white px-6 py-3 rounded-xl font-bold text-sm flex-1">Хадгалах</button>
              {selectedTrust.status !== 'resolved' && (
                <button onClick={async () => {
                  await axios.put(`${API_URL}/api/trusts/${selectedTrust._id}`, { status: 'resolved' });
                  const trustRes = await axios.get(`${API_URL}/api/trusts`);
                  setTrusts(trustRes.data);
                  setSelectedTrust(null);
                }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex-1">Шийдсэн</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
