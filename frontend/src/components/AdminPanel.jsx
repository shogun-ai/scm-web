import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, Settings, LogOut, Eye, CheckCircle, XCircle, User, Calendar, Printer, Archive, Lock, Shield, Users, Activity, Trash2, UserPlus, Handshake, PhoneCall, Save, QrCode
} from 'lucide-react';

import logoColored from '../assets/logo-colored.png'; 

const PRODUCT_NAMES = {
  'biz_loan': 'Бизнесийн зээл',
  'car_purchase_loan': 'Автомашин худалдан авах',
  'car_coll_loan': 'Автомашин барьцаалсан',
  'cons_loan': 'Хэрэглээний зээл',
  'credit_card': 'Кредит карт',
  're_loan': 'Үл хөдлөх барьцаалсан',
  'line_loan': 'Шугмын зээл'
};

const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]); 
  const [trusts, setTrusts] = useState([]); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTrust, setSelectedTrust] = useState(null); 
  const [contactNote, setContactNote] = useState(''); 
  
  const [usersList, setUsersList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settings Forms
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' });

  // 2FA STATE
  const [qrCode, setQrCode] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]); 

  const fetchData = async () => {
    setLoading(true);
    try {
        const loanRes = await axios.get('https://scm-okjs.onrender.com/api/loans');
        setRequests(loanRes.data);
        const trustRes = await axios.get('https://scm-okjs.onrender.com/api/trusts');
        setTrusts(trustRes.data);

        // Админ бол хэрэглэгчдийг болон логуудыг татна
        if (user?.role === 'admin') {
            const userRes = await axios.get('https://scm-okjs.onrender.com/api/users');
            setUsersList(userRes.data);
            const logRes = await axios.get('https://scm-okjs.onrender.com/api/logs');
            setLogs(logRes.data);
        }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
      if(!window.confirm("Төлөв өөрчлөх үү?")) return;
      try {
          await axios.put(`https://scm-okjs.onrender.com/api/loans/${id}`, { status: newStatus, adminUser: user });
          setRequests(prev => prev.map(req => req._id === id ? { ...req, status: newStatus } : req));
          setSelectedRequest(null);
      } catch (error) { alert("Алдаа гарлаа"); }
  };

  const saveContactNote = async () => {
      if(!contactNote) return alert("Тэмдэглэл бичнэ үү");
      try {
          await axios.put(`https://scm-okjs.onrender.com/api/trusts/${selectedTrust._id}`, { contactNote, adminUser: user });
          setTrusts(prev => prev.map(t => t._id === selectedTrust._id ? { ...t, status: 'contacted', contactNote } : t));
          setSelectedTrust(null);
          setContactNote('');
          alert("Амжилттай хадгаллаа");
      } catch (e) { alert("Алдаа гарлаа"); }
  };

  const handlePrint = () => { window.print(); };

  // User Functions
  const handleCreateUser = async () => { if(!newUser.name || !newUser.email || !newUser.password) { alert("Дутуу байна"); return; } try { const response = await axios.post('https://scm-okjs.onrender.com/api/auth/register', { ...newUser, createdBy: user }); alert(response.data.message); setNewUser({ name: '', email: '', password: '', role: 'employee' }); fetchData(); } catch (error) { alert(error.response?.data?.message || "Алдаа"); } };
  const updateUserStatus = async (targetUserId, newRole, newStatus) => { try { await axios.put(`https://scm-okjs.onrender.com/api/users/${targetUserId}`, { role: newRole, isActive: newStatus, adminUser: user }); fetchData(); } catch (error) {} };
  const deleteUser = async (targetUserId) => { if(!window.confirm("Устгах уу?")) return; try { await axios.delete(`https://scm-okjs.onrender.com/api/users/${targetUserId}`); fetchData(); } catch (error) {} };
  const handleChangePassword = async () => { if (!oldPassword || !newPassword || !confirmPassword) return alert("Дутуу байна"); if (newPassword !== confirmPassword) return alert("Таарахгүй байна"); try { const userId = user.id || user._id; const response = await axios.put(`https://scm-okjs.onrender.com/api/auth/change-password/${userId}`, { oldPassword, newPassword }); alert(response.data.message); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); } catch (error) { alert(error.response?.data?.message || "Алдаа"); } };

  // 2FA Functions
  const setup2FA = async () => {
      try {
          const res = await axios.post('https://scm-okjs.onrender.com/api/auth/2fa/setup', { userId: user.id || user._id });
          setQrCode(res.data.qrCode);
      } catch (e) { alert("Алдаа гарлаа: " + e.message); }
  };

  const verify2FA = async () => {
      try {
          const res = await axios.post('https://scm-okjs.onrender.com/api/auth/2fa/verify', { userId: user.id || user._id, token: twoFACode });
          alert(res.data.message);
          setQrCode(null);
          setTwoFACode('');
      } catch (e) { alert(e.response?.data?.message || "Код буруу"); }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(val);
  const formatDate = (dateString) => { const date = new Date(dateString); return date.toLocaleDateString('mn-MN') + ' ' + date.toLocaleTimeString('mn-MN', {hour: '2-digit', minute:'2-digit'}); };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      <style>{` @media print { @page { margin: 1cm; size: auto; } body * { visibility: hidden; } #printable-content, #printable-content * { visibility: visible; } #printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; box-shadow: none !important; border: none !important; } .no-print { display: none !important; } .print-only-header { display: block !important; } } .print-only-header { display: none; } `}</style>

      <aside className="w-64 bg-[#003B5C] text-white flex flex-col fixed h-full z-20 no-print">
        <div className="p-6 border-b border-white/10"><h2 className="text-xl font-display font-bold tracking-widest text-[#D4AF37]">SCM ADMIN</h2><p className="text-xs text-white/50 mt-1">v1.4</p></div>
        <nav className="flex-1 py-6 space-y-2 px-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><LayoutDashboard size={20} /> Хянах самбар</button>
          <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><FileText size={20} /> Зээлийн хүсэлтүүд</button>
          <button onClick={() => setActiveTab('trusts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'trusts' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Handshake size={20} /> Итгэлцэл {trusts.filter(t=>t.status==='pending').length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{trusts.filter(t=>t.status==='pending').length}</span>}</button>
          
          {/* ✅ АДМИН ЦЭСНҮҮД */}
          {user?.role === 'admin' && (<>
                <div className="pt-4 pb-2 px-4 text-[10px] uppercase text-white/40 font-bold tracking-wider">Админ хэсэг</div>
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Users size={20} /> Хэрэглэгчид</button>
                <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Activity size={20} /> Систем лог</button>
          </>)}

          {/* ✅ ТОХИРГООГ БҮХ ХҮНД НЭЭЛТТЭЙ БОЛГОВ */}
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-[#D4AF37] text-[#003B5C]' : 'text-white/70 hover:bg-white/10'}`}><Settings size={20} /> Тохиргоо</button>
        </nav>
        <div className="p-6 border-t border-white/10 bg-[#002a42]">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#003B5C] font-bold text-lg shadow-md">{user?.name?.charAt(0) || 'A'}</div><div className="overflow-hidden"><p className="text-sm font-bold truncate">{user?.name}</p><p className="text-xs text-white/50 truncate capitalize">{user?.role}</p></div></div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/20 rounded-xl text-xs font-bold hover:bg-red-500 hover:border-red-500 hover:text-white transition-all"><LogOut size={16} /> Гарах</button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 no-print">
        <header className="flex justify-between items-center mb-8"><div><h1 className="text-2xl font-bold text-slate-800">{activeTab === 'dashboard' ? 'Хянах самбар' : activeTab === 'requests' ? 'Зээлийн хүсэлтүүд' : activeTab === 'trusts' ? 'Итгэлцлийн хүсэлтүүд' : activeTab === 'settings' ? 'Хувийн тохиргоо' : 'Админ хэсэг'}</h1><p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('mn-MN')}</p></div></header>

        {/* ... БУСАД ТАБУУД (DASHBOARD, REQUESTS, TRUSTS, USERS, LOGS) ХЭВЭЭРЭЭ ... */}
        {activeTab === 'dashboard' && (<div className="animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"><div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-500 text-xs font-bold uppercase">Нийт Зээл</p><p className="text-4xl font-bold text-[#003B5C] mt-2">{requests.length}</p></div><div className="p-4 bg-blue-50 rounded-full text-[#003B5C]"><FileText size={24}/></div></div><div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-500 text-xs font-bold uppercase">Итгэлцэл</p><p className="text-4xl font-bold text-[#003B5C] mt-2">{trusts.length}</p></div><div className="p-4 bg-teal-50 rounded-full text-teal-600"><Handshake size={24}/></div></div><div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-500 text-xs font-bold uppercase">Хүлээгдэж буй</p><p className="text-4xl font-bold text-orange-500 mt-2">{requests.filter(r => r.status === 'pending').length}</p></div><div className="p-4 bg-orange-50 rounded-full text-orange-500"><Calendar size={24}/></div></div><div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-500 text-xs font-bold uppercase">Шийдсэн</p><p className="text-4xl font-bold text-[#00A651] mt-2">{requests.filter(r => r.status === 'resolved').length}</p></div><div className="p-4 bg-green-50 rounded-full text-[#00A651]"><CheckCircle size={24}/></div></div></div>)}
        {activeTab === 'requests' && (<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase"><th className="p-4">Огноо</th><th className="p-4">Төрөл</th><th className="p-4">Зээлдэгч</th><th className="p-4">Бүтээгдэхүүн</th><th className="p-4">Дүн</th><th className="p-4">Төлөв</th><th className="p-4 text-center">Үйлдэл</th></tr></thead><tbody className="divide-y divide-gray-100">{requests.map((req) => (<tr key={req._id} className="hover:bg-slate-50 transition text-sm"><td className="p-4 whitespace-nowrap"><div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400"/> {new Date(req.createdAt).toLocaleDateString('mn-MN')}</div></td><td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${req.userType === 'organization' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{req.userType === 'organization' ? 'Байгууллага' : 'Иргэн'}</span></td><td className="p-4 font-medium text-[#003B5C]">{req.userType === 'individual' ? `${req.lastname?.charAt(0)}.${req.firstname}` : req.orgName}</td><td className="p-4 text-gray-600">{PRODUCT_NAMES[req.selectedProduct] || req.selectedProduct}</td><td className="p-4 font-bold text-slate-700">{formatCurrency(req.amount)}</td><td className="p-4">{req.status === 'resolved' ? <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> Шийдсэн</span> : <span className="text-yellow-600 font-bold text-xs flex items-center gap-1">Хүлээж буй</span>}</td><td className="p-4 text-center"><button onClick={() => setSelectedRequest(req)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button></td></tr>))}</tbody></table></div></div>)}
        {activeTab === 'trusts' && (<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase"><th className="p-4">Огноо</th><th className="p-4">Харилцагч</th><th className="p-4">Утас</th><th className="p-4">Имэйл</th><th className="p-4">Дүн (Ойролцоо)</th><th className="p-4">Төлөв</th><th className="p-4 text-center">Үйлдэл</th></tr></thead><tbody className="divide-y divide-gray-100">{trusts.map((req) => (<tr key={req._id} className="hover:bg-slate-50 transition text-sm"><td className="p-4 whitespace-nowrap text-gray-500">{new Date(req.createdAt).toLocaleDateString('mn-MN')}</td><td className="p-4 font-bold text-[#003B5C]">{req.lastname} {req.firstname}</td><td className="p-4">{req.phone}</td><td className="p-4 text-gray-600">{req.email}</td><td className="p-4 font-bold text-[#00A651]">{req.amount}</td><td className="p-4">{req.status === 'contacted' ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">Холбогдсон</span> : <span className="text-orange-500 font-bold text-xs bg-orange-50 px-2 py-1 rounded">Шинэ</span>}</td><td className="p-4 text-center"><button onClick={() => setSelectedTrust(req)} className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg"><Eye size={18} /></button></td></tr>))}</tbody></table></div></div>)}
        {activeTab === 'users' && user?.role === 'admin' && (<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase"><th className="p-4">Нэр</th><th className="p-4">Имэйл</th><th className="p-4">Эрх</th><th className="p-4">Төлөв</th><th className="p-4 text-right">Үйлдэл</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{usersList.map(u => (<tr key={u._id}><td className="p-4 font-bold">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4"><select value={u.role} onChange={(e) => updateUserStatus(u._id, e.target.value, u.isActive)} className="bg-slate-100 rounded p-1"><option value="employee">Ажилтан</option><option value="web_admin">Web Admin</option><option value="admin">Admin</option></select></td><td className="p-4"><button onClick={() => updateUserStatus(u._id, u.role, !u.isActive)} className={`px-2 py-1 rounded text-xs font-bold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}</button></td><td className="p-4 text-right">{user.id !== u._id && <button onClick={() => deleteUser(u._id)} className="text-red-500"><Trash2 size={16}/></button>}</td></tr>))}</tbody></table></div>)}
        {activeTab === 'logs' && user?.role === 'admin' && (<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase"><th className="p-4">Огноо</th><th className="p-4">Хэрэглэгч</th><th className="p-4">Үйлдэл</th><th className="p-4">Дэлгэрэнгүй</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{logs.map((log, idx) => (<tr key={idx}><td className="p-4 text-gray-500">{formatDate(log.date)}</td><td className="p-4 font-bold">{log.userName}</td><td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span></td><td className="p-4 text-gray-600">{log.details}</td></tr>))}</tbody></table></div>)}

        {/* ✅ SETTINGS TAB - БҮХ ХЭРЭГЛЭГЧИД ХАРАГДАНА */}
        {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6 animate-fade-in">
                
                {/* 1. PASSWORD CHANGE (БҮХ ХҮНД) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Lock size={20} className="text-[#003B5C]"/> Нууц үг солих</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Хуучин нууц үг</label><input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                        <div></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Шинэ нууц үг</label><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Давтах</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                    </div>
                    <div className="mt-4 flex justify-end"><button onClick={handleChangePassword} className="px-6 py-2 bg-[#003B5C] text-white rounded-lg font-bold">Хадгалах</button></div>
                </div>

                {/* ✅ 2. 2FA SETUP (БҮХ ХҮНД) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><QrCode size={20} className="text-[#003B5C]"/> 2FA (Google Authenticator)</h3>
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-4">Та нэвтрэхдээ нууц үгээс гадна гар утасны апп (Google Authenticator) ашиглан 6 оронтой код хийж нэвтрэх боломжтой.</p>
                            {!qrCode ? (
                                <button onClick={setup2FA} className="px-6 py-2 bg-[#003B5C] text-white rounded-lg font-bold text-sm">2FA Тохируулах (QR Харуулах)</button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-100 p-4 rounded-xl flex flex-col items-center">
                                        <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                                        <p className="text-xs text-gray-500 mt-2 text-center">Энэ QR кодыг Google Authenticator апп-аар уншуулна уу.</p>
                                    </div>
                                    <input type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} placeholder="6 оронтой код" className="w-full p-3 bg-slate-50 border rounded-xl text-center font-bold tracking-widest text-lg" maxLength={6}/>
                                    <button onClick={verify2FA} className="w-full px-6 py-3 bg-[#00A651] text-white rounded-xl font-bold">Баталгаажуулах</button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-center opacity-50 hidden md:block">
                            <Shield size={120} className="mx-auto text-gray-200"/>
                        </div>
                    </div>
                </div>

                {/* 3. CREATE USER (ЗӨВХӨН ADMIN-Д ХАРАГДАНА) */}
                {user?.role === 'admin' && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><UserPlus size={20} className="text-[#003B5C]"/> Шинэ хэрэглэгч үүсгэх</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Нэр</label><input type="text" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Имэйл</label><input type="email" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Нууц үг</label><input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl"/></div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Эрх</label>
                                <select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl">
                                    <option value="employee">Ажилтан</option>
                                    <option value="web_admin">Веб Админ</option>
                                    <option value="admin">Админ</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end"><button onClick={handleCreateUser} className="px-6 py-2 bg-[#00A651] text-white rounded-lg font-bold">Үүсгэх</button></div>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* MODALS (Trust Modal & Loan Modal - ХЭВЭЭРЭЭ) */}
      {selectedTrust && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm modal-overlay"><div id="printable-content" className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-y-auto animate-scale-up modal-content relative"><div className="print-only-header mb-8 border-b-2 border-[#003B5C] pb-4"><div className="flex flex-col items-center justify-center mb-6"><img src={logoColored} alt="Solongo Capital" className="h-20 object-contain" /></div><div className="text-center"><h1 className="text-2xl font-bold text-[#003B5C] uppercase">Итгэлцлийн Хүсэлт</h1></div></div><button onClick={() => setSelectedTrust(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 no-print"><XCircle size={24}/></button><div className="p-8"><h2 className="text-xl font-bold text-[#003B5C] mb-6 flex items-center gap-2"><Handshake size={24}/> Итгэлцлийн хүсэлт</h2><div className="space-y-4 text-sm"><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Огноо:</span><span className="font-bold">{formatDate(selectedTrust.createdAt)}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Харилцагч:</span><span className="font-bold">{selectedTrust.lastname} {selectedTrust.firstname}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Утас:</span><span className="font-bold">{selectedTrust.phone}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Имэйл:</span><span className="font-bold">{selectedTrust.email}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Дүн:</span><span className="font-bold text-[#00A651] text-lg">{selectedTrust.amount}</span></div>{selectedTrust.contactNote && (<div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-4"><p className="text-xs font-bold text-yellow-700 uppercase mb-1">Холбоо барьсан тэмдэглэл:</p><p className="text-gray-700">{selectedTrust.contactNote}</p></div>)}</div><div className="mt-8 no-print"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Холбоо барьсан тэмдэглэл</label><textarea rows="3" className="w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-[#003B5C]" placeholder="Уулзалтын/Ярианы товч утга..." value={contactNote} onChange={(e) => setContactNote(e.target.value)}></textarea></div></div><div className="p-6 bg-gray-50 rounded-b-2xl flex justify-between gap-3 no-print"><button onClick={handlePrint} className="px-4 py-2 border border-[#003B5C] text-[#003B5C] rounded-lg text-sm font-bold hover:bg-[#003B5C] hover:text-white transition flex items-center gap-2"><Printer size={16}/> Хэвлэх</button><button onClick={saveContactNote} className="px-6 py-2 bg-[#00A651] text-white rounded-lg text-sm font-bold hover:bg-[#008f45] transition shadow-lg flex items-center gap-2"><PhoneCall size={16}/> Холбоо барьсан гэж тэмдэглэх</button></div></div></div>)}
      {selectedRequest && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm modal-overlay"><div id="printable-content" className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-up modal-content"><div className="print-only-header mb-8 border-b-2 border-[#003B5C] pb-4"><div className="flex flex-col items-center justify-center mb-6"><img src={logoColored} alt="Solongo Capital" className="h-20 object-contain" /></div><div className="flex justify-between items-end w-full"><div className="flex items-center gap-4">{selectedRequest.selfieUrl && (<img src={selectedRequest.selfieUrl} alt="Borrower" className="w-24 h-24 object-cover rounded-xl border-2 border-[#003B5C] shadow-sm" />)}<div><h1 className="text-2xl font-bold text-[#003B5C] uppercase tracking-wider">Зээлийн Хүсэлт</h1></div></div><div className="text-right"><p className="text-xs text-gray-400">Хэвлэсэн огноо:</p><p className="font-bold mb-2">{new Date().toLocaleDateString('mn-MN')}</p><p className="text-xs text-gray-400">Хэвлэсэн ажилтан:</p><p className="font-bold text-[#003B5C]">{user?.name}</p></div></div></div><div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10 no-print"><div className="flex items-center gap-4">{selectedRequest.selfieUrl && (<img src={selectedRequest.selfieUrl} alt="Borrower" className="w-16 h-16 object-cover rounded-full border-2 border-[#003B5C]" />)}<div><h2 className="text-xl font-bold text-[#003B5C]">Зээлийн хүсэлт дэлгэрэнгүй</h2><p className="text-xs text-gray-500">{formatDate(selectedRequest.createdAt)}</p></div></div><button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><XCircle size={24}/></button></div><div className="p-6 space-y-8"><section><h3 className="text-sm font-bold text-[#00A651] uppercase mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">Зээлийн нөхцөл</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-200 print:bg-white print:border-0 print:p-0"><div><p className="text-xs text-gray-500">Бүтээгдэхүүн</p><p className="font-bold text-sm">{PRODUCT_NAMES[selectedRequest.selectedProduct] || selectedRequest.selectedProduct}</p></div><div><p className="text-xs text-gray-500">Хэмжээ</p><p className="font-bold text-sm text-[#003B5C]">{formatCurrency(selectedRequest.amount)}</p></div><div><p className="text-xs text-gray-500">Хугацаа</p><p className="font-bold text-sm">{selectedRequest.term} сар</p></div><div><p className="text-xs text-gray-500">Барьцаа</p><p className="font-bold text-sm capitalize">{selectedRequest.collateralType === 'real_estate' ? 'Үл хөдлөх' : 'Автомашин'}</p></div><div className="col-span-4 border-t border-gray-200 pt-2 mt-2"><p className="text-xs text-gray-500">Зориулалт</p><p className="text-sm text-gray-700">{selectedRequest.purpose}</p></div></div></section><section><h3 className="text-sm font-bold text-[#003B5C] uppercase mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">Зээлдэгчийн мэдээлэл</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm"><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Нэр / Байгууллага:</span><span className="font-medium">{selectedRequest.userType === 'individual' ? `${selectedRequest.lastname} ${selectedRequest.firstname}` : selectedRequest.orgName}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Регистр:</span><span className="font-medium">{selectedRequest.userType === 'individual' ? selectedRequest.regNo : selectedRequest.orgRegNo}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">Утас:</span><span className="font-medium">{selectedRequest.phone || selectedRequest.contactPhone}</span></div><div className="flex justify-between border-b pb-2"><span className="text-gray-500">И-мэйл:</span><span className="font-medium">{selectedRequest.email}</span></div><div className="flex justify-between border-b pb-2 md:col-span-2"><span className="text-gray-500">Хаяг:</span><span className="font-medium">{selectedRequest.address}</span></div></div></section><section className="mt-6 border-t border-gray-100 pt-4"> <h3 className="text-sm font-bold text-[#003B5C] uppercase mb-4">Хавсаргасан баримтууд</h3>{selectedRequest.fileNames && selectedRequest.fileNames.length > 0 ? (<ul className="space-y-2">{selectedRequest.fileNames.map((fileUrl, idx) => {const fileName = fileUrl.split('/').pop(); return (<li key={idx} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 hover:bg-gray-100 transition print:border-0 print:p-0"><div className="flex items-center gap-2 overflow-hidden"><FileText size={16} className="text-[#00A651] flex-shrink-0" /> <span className="truncate max-w-[200px] print:max-w-none" title={fileName}>{fileName}</span></div><a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex-shrink-0 print-hidden-link">Татах</a></li>);})}</ul>) : (<p className="text-sm text-gray-400 italic">Файл бүртгэгдээгүй.</p>)}</section></div><div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between gap-3 no-print"><button onClick={handlePrint} className="px-4 py-2 border border-[#003B5C] text-[#003B5C] rounded-lg text-sm font-bold hover:bg-[#003B5C] hover:text-white transition flex items-center gap-2"><Printer size={16}/> Хэвлэх</button>{selectedRequest.status !== 'resolved' ? (<button onClick={() => handleStatusChange(selectedRequest._id, 'resolved')} className="px-6 py-2 bg-[#00A651] text-white rounded-lg text-sm font-bold hover:bg-[#008f45] transition shadow-lg flex items-center gap-2"><CheckCircle size={16}/> Шийдсэн гэж тэмдэглэх</button>) : (<span className="px-6 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-bold flex items-center gap-2 cursor-not-allowed"><Archive size={16}/> Шийдвэрлэгдсэн</span>)}</div></div></div>)}
    </div>
  );
};

export default AdminPanel;