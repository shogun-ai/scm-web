import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, FileText, Settings, Shield, Users, Activity, Trash2, Handshake, Globe, UserCheck, ClipboardList, MessageCircle
} from 'lucide-react';
import LoanOrigination from './LoanOrigination';
import LoanTaskBoard from './loanTask/LoanTaskBoard';
import { fetchLoanTaskAvailability } from './loanTask/api';
import AdminShell from './admin/AdminShell';
import AdminDashboard from './admin/dashboard/AdminDashboard';
import { MODULE_HUES } from './admin/theme/spectrum';
import { DEFAULT_LOAN_APR_CONFIG, LOAN_APR_CONFIG_KEY, isValidLoanAprConfig, normalizeLoanAprConfig } from '../../../shared/loanAprConfig.js';
import { isValidHeroSliderInterval } from '../../../shared/heroSliderConfig.js';
import LoanTaskConfigTab from './admin/tabs/LoanTaskConfigTab';
import DocumentAiTab from './admin/tabs/DocumentAiTab';
import OnboardingTab from './admin/tabs/OnboardingTab';
import TrustsTab from './admin/tabs/TrustsTab';
import UsersTab from './admin/tabs/UsersTab';
import PermissionsTab from './admin/tabs/PermissionsTab';
import LogsTab from './admin/tabs/LogsTab';
import FinanceTab from './admin/tabs/FinanceTab';
import CmsTab from './admin/tabs/CmsTab';
import DeleteSettingsTab from './admin/tabs/DeleteSettingsTab';
import FacebookTab from './admin/tabs/FacebookTab';
import BotContentTab from './admin/tabs/BotContentTab';
import ProfileTab from './admin/tabs/ProfileTab';
import ProfileSecurityTab from './admin/tabs/ProfileSecurityTab';
import OnboardingDetailModal from './admin/tabs/OnboardingDetailModal';
import LegacyRequestModal from './admin/tabs/LegacyRequestModal';
import TrustDrawer from './admin/tabs/TrustDrawer';

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

const DEFAULT_CHATBOT_CARDS = [
  { id: 'products', parentId: 'root', title: 'Бүтээгдэхүүн', subtitle: 'Зээл, итгэлцэл болон бусад үйлчилгээ', imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80', command: 'products', order: 1, isActive: true },
  { id: 'repayment', parentId: 'root', title: 'Эргэн төлөлт', subtitle: 'Зээлийн тооцоолол болон төлөлтийн мэдээлэл', imageUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80', command: 'repayment', order: 2, isActive: true },
  { id: 'contact', parentId: 'root', title: 'Холбоо барих', subtitle: 'Утас, имэйл, байршлын мэдээлэл', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', command: 'contact', order: 3, isActive: true },
  { id: 'loan', parentId: 'products', title: 'Зээл', subtitle: 'Манай зээлийн бүтээгдэхүүнүүд', imageUrl: 'https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=900&q=80', command: 'loan', order: 1, isActive: true },
  { id: 'trust', parentId: 'products', title: 'Итгэлцэл', subtitle: 'Хөрөнгөө өсгөх үйлчилгээ', imageUrl: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&w=900&q=80', command: 'trust', order: 2, isActive: true },
  { id: 'conditions', parentId: 'loan_actions', title: 'Үйлчилгээний нөхцөл', subtitle: 'Хүү, хугацаа, үндсэн нөхцөл', imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80', command: 'conditions', order: 1, isActive: true },
  { id: 'documents', parentId: 'loan_actions', title: 'Бүрдүүлэх баримт бичиг', subtitle: 'Шаардлагатай материалын жагсаалт', imageUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80', command: 'documents', order: 2, isActive: true },
  { id: 'calculate', parentId: 'loan_actions', title: 'Тооцоолуур', subtitle: 'Зээлийн жишээ төлөлт тооцох', imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80', command: 'calculate', order: 3, isActive: true },
  { id: 'online_request', parentId: 'loan_actions', title: 'Хүсэлт өгөх', subtitle: 'Онлайнаар хүсэлт илгээх', imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80', command: 'online_request', order: 4, isActive: true }
];

const withDefaultChatbotCards = (cards = []) => {
  const savedCards = Array.isArray(cards) ? cards : [];
  const savedIds = new Set(savedCards.map(card => card.id));
  return [...savedCards, ...DEFAULT_CHATBOT_CARDS.filter(card => !savedIds.has(card.id))];
};

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;

  const possibleKeys = ['data', 'items', 'submissions', 'onboarding', 'results'];
  const listKey = possibleKeys.find(key => Array.isArray(payload[key]));
  if (listKey) return payload[listKey];
  return payload.data && typeof payload.data === 'object' ? extractArrayPayload(payload.data) : null;
};

const extractObjectPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const possibleKeys = ['data', 'item', 'submission', 'onboarding', 'result'];
  const objectKey = possibleKeys.find(key => payload[key] && typeof payload[key] === 'object' && !Array.isArray(payload[key]));
  return objectKey ? payload[objectKey] : payload;
};

const getOnboardingId = (item = {}) => item._id || item.id || item.onboardingId;

const getOnboardingDateValue = (item = {}) => (
  item.createdAt || item.submittedAt || item.date || item.updatedAt || ''
);

const getOnboardingDisplayName = (item = {}) => {
  const personName = item.contact?.name
    || item.customerName
    || item.fullName
    || item.name
    || [item.personal?.lastName, item.personal?.firstName].filter(Boolean).join(' ')
    || [item.lastname, item.firstname].filter(Boolean).join(' ');
  const companyName = item.business?.name
    || item.companyName
    || item.company
    || item.orgName
    || item.businessName
    || item.organizationName;

  if (personName && companyName && personName !== companyName) return `${personName} / ${companyName}`;
  return personName || companyName || '-';
};

const getOnboardingCompanyName = (item = {}) => (
  item.business?.name || item.companyName || item.company || item.orgName || item.businessName || item.organizationName || '-'
);

const getOnboardingCustomerTypeLabel = (value) => ({
  personal: 'Иргэн',
  individual: 'Иргэн',
  person: 'Иргэн',
  citizen: 'Иргэн',
  organization: 'Байгууллага',
  company: 'Байгууллага',
  business: 'Байгууллага',
  corporate: 'Байгууллага',
}[value] || value || '-');

const getOnboardingCustomerType = (item = {}) => (
  item.customerType || item.type || item.entityType || item.clientType || item.customer?.type || ''
);

const formatOnboardingInterests = (value) => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map(item => item.trim())
      : value && typeof value === 'object'
        ? Object.values(value)
        : [];

  const labels = rawValues
    .flat()
    .filter(Boolean)
    .map(item => {
      if (typeof item === 'object') return item.label || item.name || item.title || item.productKey || item.key || '';
      return PRODUCT_NAMES[item] || item;
    })
    .filter(Boolean);

  return labels.length ? labels.join(', ') : '-';
};

const getOnboardingProductInterests = (item = {}) => (
  item.preferences?.productInterests
  || item.productInterests
  || item.interests
  || item.products
  || item.selectedProducts
  || item.productInterest
  || item.preferences?.product
  || item.selectedProduct
);

const getOnboardingStatusLabel = (status) => ({
  pending: 'Шинэ',
  new: 'Шинэ',
  contacted: 'Холбогдсон',
  in_review: 'Судалж байна',
  reviewing: 'Судалж байна',
  studying: 'Судалж байна',
  approved: 'Баталгаажсан',
  converted: 'Харилцагч болсон',
  archived: 'Архивласан',
  resolved: 'Шийдвэрлэсэн',
  completed: 'Шийдвэрлэсэн',
  rejected: 'Татгалзсан',
}[status] || status || 'Шинэ');

const getOnboardingStatusClass = (status) => ({
  pending: 'bg-orange-100 text-orange-700',
  new: 'bg-orange-100 text-orange-700',
  contacted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-indigo-100 text-indigo-700',
  reviewing: 'bg-indigo-100 text-indigo-700',
  studying: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  converted: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
  resolved: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}[status] || 'bg-gray-100 text-gray-600');

const getOnboardingAssigneeName = (item = {}) => (
  item.assignee?.name || item.assigneeName || item.reviewerName || item.ownerName || '-'
);

const normalizeOnboardingSubmissions = (items = []) => [...items]
  .filter(Boolean)
  .sort((a, b) => {
    const aDate = new Date(getOnboardingDateValue(a)).getTime() || 0;
    const bDate = new Date(getOnboardingDateValue(b)).getTime() || 0;
    return bDate - aDate;
  });

const buildOnboardingDraft = (submission = {}) => ({
  status: submission.status || 'pending',
  assigneeUserId: submission.assignee?.userId || submission.assigneeId || '',
  assigneeName: submission.assignee?.name || submission.assigneeName || '',
  contactNote: submission.contactNote || '',
  reviewerNote: submission.reviewerNote || '',
  tags: Array.isArray(submission.tags) ? submission.tags.join(', ') : submission.tags || '',
});

const ONBOARDING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Шинэ' },
  { value: 'contacted', label: 'Холбогдсон' },
  { value: 'in_review', label: 'Судалж байна' },
  { value: 'approved', label: 'Баталгаажсан' },
  { value: 'rejected', label: 'Татгалзсан' },
  { value: 'converted', label: 'Харилцагч болсон' },
  { value: 'archived', label: 'Архивласан' },
];

const ONBOARDING_ACCESS_ROLES = ['admin', 'director', 'loan_officer', 'finance_manager'];

const getAdminRoleKeys = (adminUser = {}) => [
  ...new Set([adminUser.role, ...(Array.isArray(adminUser.roles) ? adminUser.roles : [])].filter(Boolean)),
];

const NOTIFY_API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

const SHOW_ONBOARDING_NAV = false; // D16: Харилцагч бүртгэл цэсийг түр нууж, код хэвээр хадгална.

// Tabs restyled for the Prism Sky canvas render directly on the sky (no pearl sheet).
const SKY_TABS = new Set(['dashboard', 'trusts', 'users', 'permissions', 'logs', 'deleteSettings', 'facebook', 'profile', 'loanTaskConfig', 'finance', 'cms', 'botContent', 'documentAnalysis']);

const AdminPanel = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('los');
  const [requests, setRequests] = useState([]); 
  const [trusts, setTrusts] = useState([]); 
  const [onboardingSubmissions, setOnboardingSubmissions] = useState([]);
  const [onboardingError, setOnboardingError] = useState('');
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
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
  const [inviteNotice, setInviteNotice] = useState(null);
  const [myPerms, setMyPerms] = useState(null); // null = ачаалаагүй/алдаа → хуучин дүрмээр харуулна
  const [editingUserRoles, setEditingUserRoles] = useState(null); // { userId, roles }

  const SCM_ROLES = [
    { key: 'admin',           label: 'Админ' },
    { key: 'director',        label: 'Захирал' },
    { key: 'loan_officer',    label: 'Зээлийн ажилтан' },
    { key: 'finance_manager', label: 'Санхүүгийн менежер' },
  ];
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
  const defaultPolicyFlags = { displayOnWeb: true, useInComplianceAgent: true, useInLoanAgent: true };
  const [newPolicy, setNewPolicy] = useState({ title: '', category: 'policy', file: null, ...defaultPolicyFlags });

  // 🗄️ CMS STATES
  const [cmsSubTab, setCmsSubTab] = useState('hero');
  const [siteConfig, setSiteConfig] = useState({});
  const [configEdits, setConfigEdits] = useState({});
  const [cmsConfigStatus, setCmsConfigStatus] = useState('idle');
  const [chatbotCards, setChatbotCards] = useState(DEFAULT_CHATBOT_CARDS);
  const [facebookPosts, setFacebookPosts] = useState([]);
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
  const [promoSlides, setPromoSlides] = useState([]);
  const [editingPromo, setEditingPromo] = useState(null);
  const [cmsSaving, setCmsSaving] = useState(false);

  // API URL
  const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');
  const [loanTasksEnabled, setLoanTasksEnabled] = useState(false);
  const [showLegacyLos, setShowLegacyLos] = useState(false);
  useEffect(() => { let cancelled = false; fetchLoanTaskAvailability(API_URL).then(enabled => { if (!cancelled) setLoanTasksEnabled(enabled); }); return () => { cancelled = true; }; }, [API_URL]);
  const isLoanTaskAdmin = user?.role === 'admin' || (Array.isArray(user?.roles) && user.roles.includes('admin'));
  const canAccessOnboarding = getAdminRoleKeys(user).some(role => ONBOARDING_ACCESS_ROLES.includes(role));

  const fetchOnboardingSubmissions = useCallback(async () => {
    if (!canAccessOnboarding) {
      setOnboardingSubmissions([]);
      setOnboardingError('');
      return [];
    }

    try {
      const onboardingRes = await axios.get(`${API_URL}/api/onboarding`);
      const rawItems = extractArrayPayload(onboardingRes.data);

      if (!rawItems) {
        setOnboardingSubmissions([]);
        setOnboardingError('Харилцагч бүртгэлийн API жагсаалт биш хариу буцаалаа.');
        return [];
      }

      const normalizedItems = normalizeOnboardingSubmissions(rawItems);
      setOnboardingSubmissions(normalizedItems);
      setOnboardingError('');
      return normalizedItems;
    } catch (error) {
      if (error?.response?.status === 401) throw error;
      setOnboardingSubmissions([]);
      setOnboardingError(error.response?.data?.message || 'Харилцагч бүртгэлийн мэдээлэл татахад алдаа гарлаа.');
      return [];
    }
  }, [API_URL, canAccessOnboarding]);

  const refreshLogs = async () => {
    if (user?.role !== 'admin') return;
    const logRes = await axios.get(`${API_URL}/api/logs`);
    setLogs(logRes.data || []);
  };

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
        await fetchOnboardingSubmissions();

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
  }, [activeTab, user, API_URL, fetchOnboardingSubmissions, onLogout]);

  // --- 🔑 PASSWORD CHANGE ---
  const [pwMsg, setPwMsg] = useState({ text: '', ok: false });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    setPwMsg({ text: '', ok: false });
    if (!oldPassword || !newPassword || !confirmPassword) {
      return setPwMsg({ text: 'Бүх талбарыг бөглөнө үү', ok: false });
    }
    if (newPassword !== confirmPassword) {
      return setPwMsg({ text: 'Шинэ нууц үг таарахгүй байна', ok: false });
    }
    if (newPassword.length < 8) {
      return setPwMsg({ text: 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой', ok: false });
    }
    setPwLoading(true);
    try {
      await axios.put(`${API_URL}/api/auth/change-password`, { oldPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPwMsg({ text: 'Нууц үг амжилттай солигдлоо', ok: true });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) {
      setPwMsg({ text: e.response?.data?.message || 'Алдаа гарлаа', ok: false });
    } finally {
      setPwLoading(false);
    }
  };

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

  useEffect(() => {
    let alive = true;
    axios.get(`${API_URL}/api/me/permissions`, { timeout: 10000 })
      .then(res => { if (alive && Array.isArray(res.data?.keys)) setMyPerms(res.data.keys); })
      .catch(() => {});
    return () => { alive = false; };
  }, [API_URL]);

  const resendInvite = async (target) => {
    setInviteNotice(null);
    try {
      const res = await axios.post(`${API_URL}/api/users/${target._id}/invite`);
      const state = res.data?.invite?.email?.result || res.data?.email?.result;
      setInviteNotice(state === 'failed' || state === 'skipped'
        ? { ok: false, text: `Урилга ${target.email} руу илгээж чадсангүй.` }
        : { ok: true, text: `Урилга ${target.email} руу илгээгдлээ` });
    } catch (e) { setInviteNotice({ ok: false, text: e.response?.data?.message || `Урилга ${target.email} руу илгээж чадсангүй.` }); }
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
    formData.append('displayOnWeb', String(newPolicy.displayOnWeb !== false));
    formData.append('useInComplianceAgent', String(newPolicy.useInComplianceAgent !== false));
    formData.append('useInLoanAgent', String(newPolicy.useInLoanAgent !== false));
    try {
        await axios.post(`${API_URL}/api/policies`, formData);
        const policyRes = await axios.get(`${API_URL}/api/policies`);
        setPolicies(policyRes.data);
        setNewPolicy({ title: '', category: 'policy', file: null, ...defaultPolicyFlags });
        alert("Файл амжилттай хуулагдлаа!");
    } catch (err) { alert("Алдаа!"); }
  };

  const updatePolicyFlag = async (id, key, value) => {
    try {
      const res = await axios.patch(`${API_URL}/api/policies/${id}`, { [key]: value });
      setPolicies(prev => prev.map(p => p._id === id ? res.data : p));
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

  const policyFlagLabels = [
    { key: 'displayOnWeb', label: 'Вэб дээр харуулах' },
    { key: 'useInComplianceAgent', label: 'Хууль/комплаенс агент' },
    { key: 'useInLoanAgent', label: 'Зээлийн агент' },
  ];

  const renderPolicyFlagInputs = (value, onChange) => (
    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
      {policyFlagLabels.map(flag => (
        <label key={flag.key} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={value?.[flag.key] !== false}
            onChange={e => onChange(flag.key, e.target.checked)}
            className="h-4 w-4 accent-[#003B5C]"
          />
          {flag.label}
        </label>
      ))}
    </div>
  );

  const renderPolicyRowFlags = (policy) => (
    <div className="flex flex-wrap gap-2">
      {policyFlagLabels.map(flag => (
        <label key={flag.key} className="flex items-center gap-1 rounded-lg bg-white border px-2 py-1 text-[11px] font-bold text-slate-600">
          <input
            type="checkbox"
            checked={policy?.[flag.key] !== false}
            onChange={e => updatePolicyFlag(policy._id, flag.key, e.target.checked)}
            className="h-3.5 w-3.5 accent-[#003B5C]"
          />
          {flag.label}
        </label>
      ))}
    </div>
  );

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

  const formatSafeDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('mn-MN') + ' ' + date.toLocaleTimeString('mn-MN');
  };

  const openOnboardingDetail = async (submission) => {
    setSelectedOnboarding(submission);
    setOnboardingDraft(buildOnboardingDraft(submission));

    const onboardingId = getOnboardingId(submission);
    if (!onboardingId) return;

    try {
      const res = await axios.get(`${API_URL}/api/onboarding/${onboardingId}`);
      const detail = extractObjectPayload(res.data);
      if (detail && getOnboardingId(detail)) {
        setSelectedOnboarding(detail);
        setOnboardingDraft(buildOnboardingDraft(detail));
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        onLogout();
        return;
      }
      setOnboardingError(error.response?.data?.message || 'Харилцагч бүртгэлийн дэлгэрэнгүй мэдээлэл татахад алдаа гарлаа.');
    }
  };

  const closeOnboardingDetail = () => {
    setSelectedOnboarding(null);
    setOnboardingDraft(null);
  };

  const updateOnboardingDraft = (key, value) => {
    setOnboardingDraft(prev => ({ ...(prev || {}), [key]: value }));
  };

  const saveOnboardingSubmission = async () => {
    const onboardingId = getOnboardingId(selectedOnboarding);
    if (!onboardingId || !onboardingDraft) {
      alert('Харилцагч бүртгэлийн ID олдсонгүй.');
      return;
    }

    const selectableUsers = Array.isArray(usersList) ? usersList : [];
    const selectedAssignee = selectableUsers.find(item => item._id === onboardingDraft.assigneeUserId || item.id === onboardingDraft.assigneeUserId);
    const assigneeName = selectedAssignee?.name || onboardingDraft.assigneeName || '';
    const payload = {
      status: onboardingDraft.status || 'pending',
      assignee: onboardingDraft.assigneeUserId || assigneeName
        ? {
          userId: onboardingDraft.assigneeUserId || selectedAssignee?._id || '',
          name: assigneeName,
        }
        : null,
      contactNote: onboardingDraft.contactNote || '',
      reviewerNote: onboardingDraft.reviewerNote || '',
      tags: String(onboardingDraft.tags || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    };

    setOnboardingSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/onboarding/${onboardingId}`, payload);
      const responseSubmission = extractObjectPayload(res.data);
      const updatedSubmission = responseSubmission && getOnboardingId(responseSubmission)
        ? responseSubmission
        : { ...selectedOnboarding, ...payload };

      setOnboardingSubmissions(prev => normalizeOnboardingSubmissions(
        prev.map(item => getOnboardingId(item) === onboardingId ? updatedSubmission : item)
      ));
      closeOnboardingDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Харилцагч бүртгэл хадгалахад алдаа гарлаа.');
    } finally {
      setOnboardingSaving(false);
    }
  };

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
    setCmsConfigStatus('loading');
    const [cfgRes, prodRes, teamRes, loanFormRes, trustFormRes, blogRes, promoRes, fbPostRes] = await Promise.allSettled([
      axios.get(`${API_URL}/api/config`),
      axios.get(`${API_URL}/api/products/content`),
      axios.get(`${API_URL}/api/team/all`),
      axios.get(`${API_URL}/api/form-config/loan`),
      axios.get(`${API_URL}/api/form-config/trust`),
      axios.get(`${API_URL}/api/blogs?isCustom=true`),
      axios.get(`${API_URL}/api/promotions?all=true`),
      axios.get(`${API_URL}/api/facebook-post-knowledge`),
    ]);
    if (cfgRes.status === 'fulfilled' && cfgRes.value.data && typeof cfgRes.value.data === 'object' && !Array.isArray(cfgRes.value.data)) {
      setSiteConfig(cfgRes.value.data);
      const flat = {};
      Object.values(cfgRes.value.data).forEach(group => {
        Object.entries(group).forEach(([key, obj]) => { flat[key] = obj.value; });
      });
      flat[LOAN_APR_CONFIG_KEY] = normalizeLoanAprConfig(flat[LOAN_APR_CONFIG_KEY]);
      setConfigEdits(flat);
      setChatbotCards(withDefaultChatbotCards(flat.chatbot_cards));
      setCmsConfigStatus('ready');
    } else {
      setCmsConfigStatus('error');
    }
    if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data);
    if (teamRes.status === 'fulfilled') setTeamMembers(teamRes.value.data);
    if (loanFormRes.status === 'fulfilled' && trustFormRes.status === 'fulfilled')
      setFormConfigs({ loan: loanFormRes.value.data, trust: trustFormRes.value.data });
    if (blogRes.status === 'fulfilled') setBlogPosts(blogRes.value.data || []);
    if (promoRes.status === 'fulfilled') setPromoSlides(promoRes.value.data || []);
    if (fbPostRes.status === 'fulfilled') setFacebookPosts(fbPostRes.value.data || []);
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

  const createEmptyPromo = () => ({
    title: '',
    subtitle: 'Шинэ мэдээ',
    excerpt: '',
    body: '',
    slug: '',
    backgroundImageUrl: '',
    ctaLabel: 'Дэлгэрэнгүй',
    isActive: true,
    order: promoSlides.length + 1,
    widgets: []
  });

  const savePromo = async () => {
    if (!editingPromo?.title) return alert('Гарчиг оруулна уу');
    setCmsSaving(true);
    try {
      if (editingPromo._id) {
        await axios.put(`${API_URL}/api/promotions/${editingPromo._id}`, editingPromo);
      } else {
        await axios.post(`${API_URL}/api/promotions`, editingPromo);
      }
      setEditingPromo(null);
      fetchCMSData();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа гарлаа'); }
    finally { setCmsSaving(false); }
  };

  const deletePromo = async (id) => {
    if (!window.confirm('Устгах уу?')) return;
    try {
      await axios.delete(`${API_URL}/api/promotions/${id}`);
      setPromoSlides(prev => prev.filter(p => p._id !== id));
      setEditingPromo(null);
    } catch (e) { alert('Алдаа гарлаа'); }
  };

  const updatePromoWidget = (idx, field, value) => {
    setEditingPromo(p => ({
      ...p,
      widgets: (p.widgets || []).map((w, i) => i === idx ? { ...w, [field]: value } : w)
    }));
  };

  const saveBulkConfig = async (group) => {
    if (group === 'rates' && cmsConfigStatus !== 'ready') {
      alert('Тооцоолуурын тохиргоог амжилттай ачаалсны дараа хадгална уу.');
      return;
    }
    if (group === 'rates' && !isValidLoanAprConfig(configEdits[LOAN_APR_CONFIG_KEY] ?? DEFAULT_LOAN_APR_CONFIG)) {
      alert('Бодит өртгийн тохиргоог шалгана уу. Шимтгэлийн хоёр сонголт ялгаатай, зардлууд 0 буюу түүнээс их бүхэл төгрөг байна. Тайлбарын уртыг шалгана уу.');
      return;
    }
    if (group === 'hero' && configEdits.hero_slider_interval !== undefined && !isValidHeroSliderInterval(configEdits.hero_slider_interval)) {
      alert('Слайдын хугацааг 3–120 секундийн бүхэл тоогоор оруулна уу, эсвэл автомат солилтыг унтраана уу.');
      return;
    }
    setCmsSaving(true);
    try {
      const groupKeys = Object.keys(siteConfig[group] || {});
      const updates = {};
      groupKeys.forEach(k => { if (configEdits[k] !== undefined) updates[k] = configEdits[k]; });
      if (group === 'contact' && configEdits['contact_image'] !== undefined) {
        updates['contact_image'] = configEdits['contact_image'];
      }
      if (group === 'hero' && configEdits['hero_slider_interval'] !== undefined) {
        updates['hero_slider_interval'] = configEdits['hero_slider_interval'];
      }
      if (group === 'rates') {
        updates[LOAN_APR_CONFIG_KEY] = configEdits[LOAN_APR_CONFIG_KEY] ?? DEFAULT_LOAN_APR_CONFIG;
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
        'dti_org',
        'chatbot_repayment_title',
        'chatbot_repayment_text',
        'chatbot_repayment_image',
        'chatbot_ai_enabled',
        'chatbot_ai_scope_text',
        'chatbot_ai_fallback_text'
      ];
      const updates = {};
      chatbotConfigKeys.forEach(key => {
        if (configEdits[key] !== undefined) updates[key] = configEdits[key];
      });
      updates.chatbot_cards = chatbotCards
        .map((card, index) => ({
          ...card,
          id: card.id || `card_${Date.now()}_${index}`,
          order: Number(card.order || index + 1),
          isActive: card.isActive !== false
        }))
        .filter(card => card.title && card.command);

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

  const syncFacebookPosts = async () => {
    setCmsSaving(true);
    try {
      const res = await axios.post(`${API_URL}/api/facebook-post-knowledge/sync`);
      setFacebookPosts(res.data?.posts || []);
      alert(`${res.data?.synced || 0} Facebook пост sync хийгдлээ.`);
    } catch (e) {
      alert(e.response?.data?.message || 'Facebook пост sync хийхэд алдаа гарлаа');
    } finally {
      setCmsSaving(false);
    }
  };

  const updateFacebookPost = (postId, field, value) => {
    setFacebookPosts(prev => prev.map(post => (
      post._id === postId ? { ...post, [field]: value } : post
    )));
  };

  const saveFacebookPost = async (post) => {
    setCmsSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/facebook-post-knowledge/${post._id}`, {
        replyKnowledge: post.replyKnowledge || '',
        adminNotes: post.adminNotes || '',
        isActive: post.isActive !== false
      });
      setFacebookPosts(prev => prev.map(item => item._id === post._id ? res.data : item));
    } catch (e) {
      alert(e.response?.data?.message || 'Facebook пост хадгалахад алдаа гарлаа');
    } finally {
      setCmsSaving(false);
    }
  };

  const updateChatbotCard = (cardId, field, value) => {
    setChatbotCards(prev => prev.map(card => (
      card.id === cardId ? { ...card, [field]: value } : card
    )));
  };

  const addChatbotCard = (parentId = 'root') => {
    const nextOrder = chatbotCards.filter(card => card.parentId === parentId).length + 1;
    setChatbotCards(prev => [
      ...prev,
      {
        id: `card_${Date.now()}`,
        parentId,
        title: '',
        subtitle: '',
        imageUrl: '',
        command: '',
        order: nextOrder,
        isActive: true
      }
    ]);
  };

  const removeChatbotCard = (cardId) => {
    setChatbotCards(prev => prev.filter(card => card.id !== cardId));
  };

  // D17: backend эрхийн каталог өгвөл (user.permissions) харуулна, үгүй бол хуучнаар зөвшөөрнө.
  const can = (key) => user?.role === 'admin' || !myPerms || myPerms.includes(key);
  const trustCanMessage = can('trusts.message');
  const showEditGroup = user?.role === 'admin' || (loanTasksEnabled && isLoanTaskAdmin);

  // Sidebar цэс — эрхийн нөхцөл өмнөхтэй яг ижил.
  const navItem = (key, icon, label) => ({ key, icon, label, hue: MODULE_HUES[key], active: activeTab === key, onSelect: () => setActiveTab(key) });
  const navGroups = [
    { id: 'main', items: [
      navItem('dashboard', LayoutDashboard, 'Хянах самбар'),
      navItem('los', ClipboardList, loanTasksEnabled ? 'Зээлийн хүсэлт' : 'Зээлийн үйл явц'),
      can('trusts.view') && navItem('trusts', Handshake, 'Итгэлцлийн хүсэлт'),
      can('document_ai.use') && navItem('documentAnalysis', FileText, 'Баримт AI уншилт'),
      SHOW_ONBOARDING_NAV && canAccessOnboarding && navItem('onboarding', UserCheck, 'Харилцагч бүртгэл'),
    ].filter(Boolean) },
    showEditGroup && { id: 'edit', heading: 'Админ панел засвар', items: [
      loanTasksEnabled && isLoanTaskAdmin && navItem('loanTaskConfig', Settings, 'Хүсэлтийн маягт'),
      ...(user?.role === 'admin' ? [
        navItem('finance', Activity, 'Файл засах'),
        { key: 'cms', icon: Globe, label: 'Контент засах', hue: MODULE_HUES.cms, active: activeTab === 'cms' && cmsSubTab !== 'chatbot', onSelect: () => { setActiveTab('cms'); setCmsSubTab(prev => (prev === 'chatbot' ? 'hero' : prev)); } },
        { key: 'chatbot', icon: MessageCircle, label: 'Чатбот', hue: MODULE_HUES.chatbot, active: activeTab === 'cms' && cmsSubTab === 'chatbot', onSelect: () => { setActiveTab('cms'); setCmsSubTab('chatbot'); } },
        navItem('botContent', Settings, 'Ботын агуулга'),
      ] : []),
    ].filter(Boolean) },
    user?.role === 'admin' && { id: 'settings', heading: 'Тохиргоо', items: [
      navItem('users', Users, 'Хэрэглэгчид'),
      navItem('permissions', Shield, 'Эрхийн матриц'),
      navItem('logs', Activity, 'Үйлдлийн лог'),
      navItem('deleteSettings', Trash2, 'Устгах тохиргоо'),
      navItem('facebook', MessageCircle, 'Facebook холболт'),
    ] },
  ].filter(group => group && group.items.length > 0);
  const activeNav = navGroups.flatMap(group => group.items).find(item => item.active);
  const shellTitle = activeTab === 'profile' ? 'Миний профайл' : (activeNav?.label || 'Админ');
  const shellHue = activeTab === 'profile' ? MODULE_HUES.profile : (activeNav?.hue || MODULE_HUES.dashboard);

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-800 font-sans [color-scheme:light] [forced-color-adjust:none]">
      <style>{` @media print { @page { margin: 1cm; size: auto; } body * { visibility: hidden; } #printable-content, #printable-content * { visibility: visible; } #printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; } .no-print { display: none !important; } } `}</style>

      <AdminShell groups={navGroups} title={shellTitle} hue={shellHue} sheet={!(SKY_TABS.has(activeTab) || (activeTab === 'los' && loanTasksEnabled))} user={user} onOpenProfile={() => setActiveTab('profile')} onLogout={onLogout}>
        {activeTab === 'los' && loanTasksEnabled && !showLegacyLos && (
          <LoanTaskBoard apiUrl={API_URL} user={user} />
        )}

        {activeTab === 'loanTaskConfig' && loanTasksEnabled && isLoanTaskAdmin && (
          <LoanTaskConfigTab API_URL={API_URL} />
        )}

        {activeTab === 'los' && loanTasksEnabled && showLegacyLos && (
          <button type="button" onClick={() => setShowLegacyLos(false)} className="mb-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#003B5C] shadow-sm">← Шинэ хүсэлтийн самбар руу буцах</button>
        )}

        {activeTab === 'los' && (!loanTasksEnabled || showLegacyLos) && (
          <LoanOrigination
            apiUrl={API_URL}
            user={user}
            requests={requests}
            onRequestsChange={setRequests}
            usersList={usersList}
          />
        )}

        {activeTab === 'documentAnalysis' && (
          <DocumentAiTab API_URL={API_URL} />
        )}

        {activeTab === 'dashboard' && (
          <AdminDashboard
            user={user}
            requests={requests}
            trusts={trusts}
            onboardingCount={onboardingSubmissions.length}
            showOnboarding={SHOW_ONBOARDING_NAV && canAccessOnboarding}
            loading={loading}
            apiUrl={API_URL}
            loanTasksEnabled={loanTasksEnabled}
            productNames={PRODUCT_NAMES}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'onboarding' && canAccessOnboarding && (
          <OnboardingTab fetchOnboardingSubmissions={fetchOnboardingSubmissions} formatOnboardingInterests={formatOnboardingInterests} formatSafeDate={formatSafeDate} getOnboardingAssigneeName={getOnboardingAssigneeName} getOnboardingCompanyName={getOnboardingCompanyName} getOnboardingCustomerType={getOnboardingCustomerType} getOnboardingCustomerTypeLabel={getOnboardingCustomerTypeLabel} getOnboardingDateValue={getOnboardingDateValue} getOnboardingDisplayName={getOnboardingDisplayName} getOnboardingId={getOnboardingId} getOnboardingProductInterests={getOnboardingProductInterests} getOnboardingStatusClass={getOnboardingStatusClass} getOnboardingStatusLabel={getOnboardingStatusLabel} loading={loading} onboardingError={onboardingError} onboardingSubmissions={onboardingSubmissions} openOnboardingDetail={openOnboardingDetail} />
        )}

        {activeTab === 'trusts' && (
          <TrustsTab setContactNote={setContactNote} setSelectedTrust={setSelectedTrust} trusts={trusts} />
        )}


        {activeTab === 'users' && user?.role === 'admin' && (
          <UsersTab API_URL={API_URL} NOTIFY_API_URL={NOTIFY_API_URL} SCM_ROLES={SCM_ROLES} deleteUser={deleteUser} editingUserRoles={editingUserRoles} inviteNotice={inviteNotice} resendInvite={resendInvite} saveUserRoles={saveUserRoles} setEditingUserRoles={setEditingUserRoles} setUsersList={setUsersList} toggleEditRole={toggleEditRole} user={user} usersList={usersList} />
        )}

        {activeTab === 'permissions' && user?.role === 'admin' && (
          <PermissionsTab API_URL={API_URL} />
        )}

        {activeTab === 'logs' && user?.role === 'admin' && (
          <LogsTab logs={logs} refreshLogs={refreshLogs} />
        )}

        {activeTab === 'finance' && user?.role === 'admin' && (
          <FinanceTab deletePolicy={deletePolicy} handlePolicyUpload={handlePolicyUpload} handleStatUpdate={handleStatUpdate} newPolicy={newPolicy} policies={policies} renderPolicyFlagInputs={renderPolicyFlagInputs} renderPolicyRowFlags={renderPolicyRowFlags} setNewPolicy={setNewPolicy} stats={stats} />
        )}

        {activeTab === 'cms' && user?.role === 'admin' && (
          <CmsTab API_URL={API_URL} PRODUCT_NAMES={PRODUCT_NAMES} addChatbotCard={addChatbotCard} addChatbotProductListItem={addChatbotProductListItem} addMember={addMember} chatbotCards={chatbotCards} cmsConfigStatus={cmsConfigStatus} cmsSaving={cmsSaving} cmsSubTab={cmsSubTab} configEdits={configEdits} createEmptyPromo={createEmptyPromo} deleteMember={deleteMember} deletePromo={deletePromo} editingMember={editingMember} editingProduct={editingProduct} editingPromo={editingPromo} facebookPosts={facebookPosts} fetchCMSData={fetchCMSData} handleStatUpdate={handleStatUpdate} newMember={newMember} newMemberType={newMemberType} products={products} promoSlides={promoSlides} removeChatbotCard={removeChatbotCard} removeChatbotProductListItem={removeChatbotProductListItem} saveBulkConfig={saveBulkConfig} saveChatbotSettings={saveChatbotSettings} saveFacebookPost={saveFacebookPost} saveMember={saveMember} savePromo={savePromo} setCmsSaving={setCmsSaving} setCmsSubTab={setCmsSubTab} setConfigEdits={setConfigEdits} setEditingMember={setEditingMember} setEditingProduct={setEditingProduct} setEditingPromo={setEditingPromo} setNewMember={setNewMember} setNewMemberType={setNewMemberType} setProducts={setProducts} setShowNewMember={setShowNewMember} showNewMember={showNewMember} siteConfig={siteConfig} stats={stats} syncFacebookPosts={syncFacebookPosts} teamMembers={teamMembers} token={token} updateChatbotCard={updateChatbotCard} updateChatbotProductList={updateChatbotProductList} updateFacebookPost={updateFacebookPost} updatePromoWidget={updatePromoWidget} uploadImage={uploadImage} />
        )}

        {activeTab === 'deleteSettings' && user?.role === 'admin' && (
          <DeleteSettingsTab API_URL={API_URL} />
        )}

        {activeTab === 'facebook' && user?.role === 'admin' && (
          <FacebookTab API_URL={API_URL} />
        )}

        {activeTab === 'botContent' && user?.role === 'admin' && (
          <BotContentTab API_URL={API_URL} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab API_URL={API_URL} user={user} />
        )}

        {activeTab === 'profile' && (
          <ProfileSecurityTab cmsSaving={cmsSaving} configEdits={configEdits} confirmPassword={confirmPassword} handleChangePassword={handleChangePassword} newPassword={newPassword} oldPassword={oldPassword} pwLoading={pwLoading} pwMsg={pwMsg} qrCode={qrCode} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} setConfirmPassword={setConfirmPassword} setNewPassword={setNewPassword} setOldPassword={setOldPassword} setTwoFACode={setTwoFACode} setup2FA={setup2FA} siteConfig={siteConfig} twoFACode={twoFACode} verify2FA={verify2FA} />
        )}
      </AdminShell>

      {/* --- ONBOARDING MODAL --- */}
      {selectedOnboarding && onboardingDraft && (
        <OnboardingDetailModal ONBOARDING_STATUS_OPTIONS={ONBOARDING_STATUS_OPTIONS} closeOnboardingDetail={closeOnboardingDetail} formatOnboardingInterests={formatOnboardingInterests} formatSafeDate={formatSafeDate} getOnboardingCompanyName={getOnboardingCompanyName} getOnboardingCustomerType={getOnboardingCustomerType} getOnboardingCustomerTypeLabel={getOnboardingCustomerTypeLabel} getOnboardingDateValue={getOnboardingDateValue} getOnboardingDisplayName={getOnboardingDisplayName} getOnboardingId={getOnboardingId} getOnboardingProductInterests={getOnboardingProductInterests} getOnboardingStatusClass={getOnboardingStatusClass} getOnboardingStatusLabel={getOnboardingStatusLabel} onboardingDraft={onboardingDraft} onboardingSaving={onboardingSaving} saveOnboardingSubmission={saveOnboardingSubmission} selectedOnboarding={selectedOnboarding} setOnboardingDraft={setOnboardingDraft} updateOnboardingDraft={updateOnboardingDraft} usersList={usersList} />
      )}

      {/* --- MODALS (SELECTED REQUEST БҮРЭН ӨГӨГДӨЛ) --- */}
      {selectedRequest && (
        <LegacyRequestModal PRODUCT_NAMES={PRODUCT_NAMES} formatCurrency={formatCurrency} formatDate={formatDate} getLoanStatusLabel={getLoanStatusLabel} handlePrint={handlePrint} handleStatusChange={handleStatusChange} openLoanResearch={openLoanResearch} selectedRequest={selectedRequest} setSelectedRequest={setSelectedRequest} />
      )}

      {/* --- TRUST MODAL --- */}
      {selectedTrust && (
        <TrustDrawer key={selectedTrust._id} API_URL={API_URL} contactNote={contactNote} formatDate={formatDate} saveContactNote={saveContactNote} selectedTrust={selectedTrust} setContactNote={setContactNote} setSelectedTrust={setSelectedTrust} setTrusts={setTrusts} trustCanMessage={trustCanMessage} />
      )}
    </div>
  );
};

export default AdminPanel;
