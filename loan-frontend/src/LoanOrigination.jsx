import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Activity, AlertCircle, BadgeCheck, BarChart2, CheckCircle2, ChevronRight, Clock,
  ClipboardList, CreditCard, Eye, FileText, Loader2,
  Plus, Printer, RotateCcw, Search, Sparkles, ThumbsDown, ThumbsUp, User,
  UserCheck, X, XCircle, Home, Users, Trash2,
} from 'lucide-react';
import LoanResearch from './LoanResearch';
import LoanApplicationDetail from './LoanApplicationDetail';
import LoanExposureMonitor from './LoanExposureMonitor';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const LOS_STEPS = [
  { key: 'application',  label: 'Аппликэйшн',      icon: FileText    },
  { key: 'assessment',   label: 'Зээлийн үнэлгээ',  icon: BarChart2   },
  { key: 'committee',    label: 'Зээлийн хороо',    icon: BadgeCheck  },
  { key: 'disbursement', label: 'Олголт',            icon: CreditCard  },
];

const STATUS_META = {
  pending:         { label: 'Онлайн/Шинэ',         color: 'bg-sky-100 text-sky-700'        },
  created:         { label: 'Ажилтан үүсгэсэн',    color: 'bg-slate-100 text-slate-600'    },
  assigned:        { label: 'Хариуцагч томилогдсон',color: 'bg-indigo-100 text-indigo-700'  },
  data_collection: { label: 'Дата цуглуулга',       color: 'bg-purple-100 text-purple-700'  },
  assessment:      { label: 'Зээлийн үнэлгээ',      color: 'bg-amber-100 text-amber-700'    },
  studying:        { label: 'Судалж байна',          color: 'bg-blue-100 text-blue-700'      },
  committee:       { label: 'Зээлийн хороо',          color: 'bg-orange-100 text-orange-700'  },
  approved:        { label: 'Зөвшөөрөгдсөн',        color: 'bg-green-100 text-green-700'    },
  rejected:        { label: 'Татгалзсан',            color: 'bg-red-100 text-red-700'        },
  resolved:        { label: 'Шийдсэн',              color: 'bg-green-100 text-green-700'    },
  disbursed:       { label: 'Зээл олгосон',         color: 'bg-emerald-100 text-emerald-700'},
};

const PERMISSION_RANK = { none: 0, view: 1, partial: 2, full: 3 };
const COMMITTEE_PERMISSION_DEFAULTS = {
  'Зөвшөөрөх': { admin: 'full', director: 'full', loan_officer: 'none', finance_manager: 'none' },
  'Татгалзах': { admin: 'full', director: 'full', loan_officer: 'none', finance_manager: 'none' },
  'Нөхцөлтэй зөвшөөрөх': { admin: 'full', director: 'full', loan_officer: 'none', finance_manager: 'none' },
  'Дахин шийдэх (цуцлах)': { admin: 'full', director: 'full', loan_officer: 'none', finance_manager: 'none' },
};

const getUserRoleKeys = (user) => [...new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean))];

const hasCommitteePermission = (user, permissionMap, action, minimum = 'full') => {
  const roles = getUserRoleKeys(user);
  if (roles.includes('admin')) return true;
  const matrixKey = `los_committee:${action}`;
  const requiredRank = PERMISSION_RANK[minimum] ?? PERMISSION_RANK.full;
  return roles.some((role) => {
    const savedLevel = permissionMap?.[role]?.[matrixKey];
    const defaultLevel = COMMITTEE_PERMISSION_DEFAULTS[action]?.[role];
    const level = savedLevel || defaultLevel || 'none';
    return (PERMISSION_RANK[level] || 0) >= requiredRank;
  });
};

const PRODUCTS = {
  biz_loan: 'Бизнесийн зээл', car_purchase_loan: 'Автомашин худалдан авах',
  car_coll_loan: 'Автомашин барьцаалсан', cons_loan: 'Хэрэглээний зээл',
  credit_card: 'Кредит карт', re_loan: 'Үл хөдлөх барьцаалсан', line_loan: 'Шугмын зээл',
};

const UI_TEXT = {
  mn: {
    steps: {
      application: 'Аппликэйшн',
      assessment: 'Зээлийн үнэлгээ',
      committee: 'Зээлийн хороо',
      disbursement: 'Олголт',
    },
    loanRequests: 'Зээлийн хүсэлтүүд',
    exposureMonitor: 'Эрсдэлийн хяналт',
    stats: {
      total: 'Нийт хүсэлт',
      pending: 'Онлайн / шинэ',
      created: 'Ажилтан үүсгэсэн',
      assigned: 'Хариуцагчтай',
      assessment: 'Үнэлгээ / судалгаа',
      committee: 'Хороонд',
      approved: 'Зөвшөөрсөн',
      rejected: 'Татгалзсан',
      resolved: 'Нөхцөлтэй',
      disbursed: 'Олгосон',
    },
    view: 'Харах',
    searchPlaceholder: 'Нэр, РД, утас, бүтээгдэхүүн, хариуцагчаар хайх...',
    showing: 'харагдаж байна',
    filters: {
      all: 'Бүгд',
      pending: 'Онлайн',
      created: 'Ажилтан үүсгэсэн',
      assigned: 'Хариуцагч томилогдсон',
      approved: 'Зөвшөөрөгдсөн',
      rejected: 'Татгалзсан',
      disbursed: 'Олгосон',
    },
    createNew: 'Шинэ хүсэлт үүсгэх',
    newTitle: 'Шинэ зээлийн хүсэлт үүсгэх',
    table: {
      date: 'Огноо',
      name: 'Нэр',
      product: 'Зээлийн төрөл',
      amount: 'Дүн',
      status: 'Статус',
      assignee: 'Хариуцагч',
      action: 'Үйлдэл',
    },
    select: 'сонгох',
    web: 'ВЭБ',
    empty: 'Хүсэлт байхгүй байна.',
    ai: {
      locale: 'mn',
      startEvaluation: 'AI үнэлгээ эхлүүлэх',
      queuedToast: (count) => `${count} хүсэлтийн AI дүгнэлт дараалалд орлоо.`,
      noneQueued: 'Дүгнэлтгүй хуучин хүсэлт олдсонгүй.',
      queueError: 'AI дүгнэлтүүдийг дараалалд оруулахад алдаа гарлаа.',
      pendingNote: 'AI дүгнэлт дараалалд орлоо.',
      statuses: {
        not_started: 'AI хүлээгдэж байна',
        pending: 'AI дараалалд',
        running: 'AI дүгнэж байна',
        completed: 'AI дүгнэсэн',
        failed: 'AI алдаа',
      },
      cardTitle: 'Зээлийн агентын дүгнэлт',
      defaultSubtitle: 'Аппликэйшний мэдээлэлд суурилсан урьдчилсан санал',
      ruleBased: 'Дүрмийн суурьтай',
      risk: 'Эрсдэл',
      legal: 'Хууль / баримт',
      recommendation: 'Олголтын санал',
      policyCompliance: 'Журмын нийцэл',
      policyClause: 'Журмын заалт',
      policySource: 'Эх сурвалж',
      policyEvidence: 'Хүсэлтийн нотолгоо',
      confidence: 'Итгэлцүүр',
      recLabels: {
        approve: 'Олгох боломжтой',
        conditional: 'Нөхцөлтэй судлах',
        manual_review: 'Гараар нягтлах',
        reject: 'Олгохгүй санал',
        empty: 'Дүгнэлт хүлээгдэж байна',
      },
      approvalReasons: 'Зөвшөөрөх үндэслэл',
      conditions: 'Нөхцөл',
      rejectionRisks: 'Татгалзах эрсдэл',
      pendingMessage: 'AI дүгнэлт дараалалд орсон байна.',
      runningMessage: 'Зээлийн агент дүгнэлт боловсруулж байна.',
      failedMessage: 'AI дүгнэлт гаргахад алдаа гарсан байна.',
      emptyMessage: 'Энэ хүсэлт дээр AI дүгнэлт хараахан үүсээгүй байна.',
      disclaimer: 'AI санал нь урьдчилсан туслах дүгнэлт бөгөөд эцсийн шийдвэрийг хүний ажилтан/хороо гаргана.',
      decisionEngine: 'AI шийдвэрийн тайлбар',
      preview: 'тайлбарлагдах үнэлгээний урьдчилсан харагдац',
      factorContribution: 'Нөлөөлсөн хүчин зүйлс',
      decisionRationale: 'Шийдвэрийн үндэслэл',
      decisionFactors: 'Шийдвэрийн хүчин зүйл',
      processing: 'Боловсруулалт',
      realTime: 'Шууд',
      rerun: 'Дахин дүгнэх',
      rerunning: 'Дүгнэж байна...',
      rerunSuccess: 'AI дүгнэлт шинэчлэгдлээ.',
      rerunError: 'AI дүгнэлт шинэчлэхэд алдаа гарлаа.',
      englishDetected: 'AI дүгнэлт англиар хадгалагдсан байна. Дахин дүгнэх дарж Монгол хэлээр шинэчилнэ үү.',
    },
  },
  en: {
    steps: {
      application: 'Application',
      assessment: 'Assessment',
      committee: 'Committee',
      disbursement: 'Disbursement',
    },
    loanRequests: 'Loan requests',
    exposureMonitor: 'Exposure monitor',
    stats: {
      total: 'Total requests',
      pending: 'Online / new',
      created: 'Created by staff',
      assigned: 'Assigned',
      assessment: 'Assessment',
      committee: 'Committee',
      approved: 'Approved',
      rejected: 'Rejected',
      resolved: 'Conditional',
      disbursed: 'Disbursed',
    },
    view: 'View',
    searchPlaceholder: 'Search by name, register, phone, product, assignee...',
    showing: 'showing',
    filters: {
      all: 'All',
      pending: 'Online',
      created: 'Created by staff',
      assigned: 'Assigned',
      approved: 'Approved',
      rejected: 'Rejected',
      disbursed: 'Disbursed',
    },
    createNew: 'Create new request',
    newTitle: 'Create new loan request',
    table: {
      date: 'Date',
      name: 'Name',
      product: 'Product',
      amount: 'Amount',
      status: 'Status',
      assignee: 'Assignee',
      action: 'Action',
    },
    select: 'select',
    web: 'WEB',
    empty: 'No requests found.',
    ai: {
      locale: 'en',
      startEvaluation: 'Start AI evaluation',
      queuedToast: (count) => `${count} request(s) queued for AI review.`,
      noneQueued: 'No existing requests without AI review were found.',
      queueError: 'Failed to queue AI reviews.',
      pendingNote: 'AI review queued.',
      statuses: {
        not_started: 'AI pending',
        pending: 'AI queued',
        running: 'AI reviewing',
        completed: 'AI reviewed',
        failed: 'AI error',
      },
      cardTitle: 'Loan agent review',
      defaultSubtitle: 'Preliminary assessment based on application data',
      ruleBased: 'Rule-based',
      risk: 'Risk',
      legal: 'Legal / documents',
      recommendation: 'Credit recommendation',
      policyCompliance: 'Policy compliance',
      policyClause: 'Policy clause',
      policySource: 'Source',
      policyEvidence: 'Request evidence',
      confidence: 'Confidence',
      recLabels: {
        approve: 'Eligible to approve',
        conditional: 'Conditional review',
        manual_review: 'Manual review',
        reject: 'Reject recommendation',
        empty: 'Review pending',
      },
      approvalReasons: 'Approval reasons',
      conditions: 'Conditions',
      rejectionRisks: 'Rejection risks',
      pendingMessage: 'AI review is queued.',
      runningMessage: 'Loan agent is reviewing the application.',
      failedMessage: 'AI review failed.',
      emptyMessage: 'No AI review has been generated for this request yet.',
      disclaimer: 'AI output is a preliminary assistant review; the final decision is made by a human officer/committee.',
      decisionEngine: 'AI decision engine',
      preview: 'explainable assessment preview',
      factorContribution: 'Factor contribution',
      decisionRationale: 'Decision rationale',
      decisionFactors: 'Decision factors',
      processing: 'Processing',
      realTime: 'Real-time',
      rerun: 'Run again',
      rerunning: 'Reviewing...',
      rerunSuccess: 'AI review updated.',
      rerunError: 'Failed to update AI review.',
      englishDetected: 'The stored AI review language does not match the selected language. Run it again to refresh.',
    },
  },
};

const COMPLIANCE_TEXT = {
  mn: {
    cardTitle: 'Комплианс, хуулийн агентын дүгнэлт',
    defaultSubtitle: 'Компанийн бодлого, журмын дагуу нийцэл шалгана',
    run: 'Комплаенс шалгах',
    rerun: 'Дахин шалгах',
    running: 'Шалгаж байна...',
    success: 'Комплаенс дүгнэлт шинэчлэгдлээ.',
    error: 'Комплаенс дүгнэлт гаргахад алдаа гарлаа.',
    source: 'Эх сурвалж',
    summary: 'Ерөнхий дүгнэлт',
    checks: 'Шалгалтын задаргаа',
    policyClause: 'Журмын заалт',
    policyRequirement: 'Журмын шаардлага',
    evidence: 'Хүсэлтийн нотолгоо',
    conflictReason: 'Нийцэл / зөрчлийн үндэслэл',
    requiredActions: 'Заавал хийх алхам',
    missingDocuments: 'Дутуу баримт',
    noReview: 'Энэ хүсэлт дээр комплаенс дүгнэлт хараахан үүсээгүй байна.',
    noPolicies: 'Компанийн бодлогын файл олдоогүй байна.',
    statuses: {
      not_started: 'Дүгнэлтгүй',
      running: 'Шалгаж байна',
      completed: 'Шалгасан',
      no_policies: 'Журам олдсонгүй',
      failed: 'Алдаа',
    },
    overall: {
      compliant: 'Нийцэлтэй',
      needs_review: 'Нягтлах шаардлагатай',
      non_compliant: 'Нийцэлгүй',
      insufficient_information: 'Мэдээлэл дутуу',
    },
  },
  en: {
    cardTitle: 'Compliance and legal agent review',
    defaultSubtitle: 'Checks the request against company policies',
    run: 'Run compliance',
    rerun: 'Run again',
    running: 'Checking...',
    success: 'Compliance review updated.',
    error: 'Failed to run compliance review.',
    source: 'Source',
    summary: 'Summary',
    checks: 'Check details',
    policyClause: 'Policy clause',
    policyRequirement: 'Policy requirement',
    evidence: 'Request evidence',
    conflictReason: 'Compliance rationale',
    requiredActions: 'Required actions',
    missingDocuments: 'Missing documents',
    noReview: 'No compliance review has been generated for this request yet.',
    noPolicies: 'No company policy files were found.',
    statuses: {
      not_started: 'No review',
      running: 'Checking',
      completed: 'Reviewed',
      no_policies: 'No policies',
      failed: 'Error',
    },
    overall: {
      compliant: 'Compliant',
      needs_review: 'Needs review',
      non_compliant: 'Non-compliant',
      insufficient_information: 'Insufficient information',
    },
  },
};


const fmt = (v) => new Intl.NumberFormat('mn-MN').format(v || 0) + ' ₮';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('mn-MN') : '-';
const borrowerName = (r) => r?.userType === 'organization'
  ? (r.orgName || '-') : [r?.lastname, r?.firstname].filter(Boolean).join(' ') || '-';

const aiNarrativeStrings = (assessment = {}) => [
  assessment.risk?.summary,
  ...(assessment.risk?.flags || []),
  assessment.legal?.summary,
  ...(assessment.legal?.flags || []),
  assessment.credit?.summary,
  ...(assessment.credit?.conditions || []),
  assessment.policyCompliance?.summary,
  ...((assessment.policyCompliance?.checks || []).flatMap(check => [
    check.area,
    check.policyClause,
    check.evidence,
    check.finding,
    check.recommendation,
  ])),
  assessment.decision?.reason,
  ...(assessment.decision?.approvalReasons || []),
  ...(assessment.decision?.conditionalReasons || []),
  ...(assessment.decision?.rejectionReasons || []),
  ...(assessment.nextSteps || []),
].filter(v => typeof v === 'string' && v.trim());

const hasEnglishNarrative = (assessment) => aiNarrativeStrings(assessment).some(text => {
  const allowed = new Set(['ai', 'api', 'dti', 'ltv', 'fico', 'openai', 'sainscore']);
  return (text.match(/[A-Za-z]{3,}/g) || []).some(word => !allowed.has(word.toLowerCase()));
});

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status || 'Шинэ', color: 'bg-gray-100 text-gray-600' };
  return <span className={`status-badge px-2.5 py-1 rounded-full text-[11px] font-black ${m.color}`}>{m.label}</span>;
};

const AiLoanOfficerBadge = ({ assessment, labels = UI_TEXT.mn.ai }) => {
  const status = assessment?.status || 'not_started';
  const meta = {
    not_started: { label: labels.statuses.not_started, cls: 'bg-slate-100 text-slate-600', icon: Sparkles },
    pending: { label: labels.statuses.pending, cls: 'bg-amber-100 text-amber-700', icon: Clock },
    running: { label: labels.statuses.running, cls: 'bg-blue-100 text-blue-700', icon: Loader2, spin: true },
    completed: { label: labels.statuses.completed, cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    failed: { label: labels.statuses.failed, cls: 'bg-red-100 text-red-700', icon: XCircle },
  }[status] || { label: status, cls: 'bg-slate-100 text-slate-600', icon: Sparkles };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${meta.cls}`} title={assessment?.note || assessment?.warning || ''}>
      <Icon size={12} className={meta.spin ? 'animate-spin' : ''} />
      {meta.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LoanOrigination = ({
  apiUrl,
  user,
  requests = [],
  onRequestsChange,
  usersList = [],
  language = 'mn',
  theme = 'dark',
  navigationView,
  onNavigationViewChange,
  showApplicationSwitch = true,
  permissionMap = {},
}) => {
  const [activeStep, setActiveStep] = useState('application');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [localApplicationView, setLocalApplicationView] = useState('requests');
  const applicationView = navigationView || localApplicationView;
  const setApplicationView = (view) => {
    setLocalApplicationView(view);
    onNavigationViewChange?.(view);
  };
  const text = UI_TEXT[language] || UI_TEXT.mn;

  // Tab 1 state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [viewLoan, setViewLoan] = useState(null); // modal-д харуулах зээл
  const [aiBackfillLoading, setAiBackfillLoading] = useState(false);
  const [aiReviewingId, setAiReviewingId] = useState(null);
  const [complianceReviewingId, setComplianceReviewingId] = useState(null);

  useEffect(() => {
    if (!navigationView) return;
    setActiveStep('application');
    if (navigationView === 'exposure') {
      setSelectedLoan(null);
    }
  }, [navigationView]);

  // Tab 2 — research seed
  const [researchSeed, setResearchSeed] = useState(null);

  // Зээлийн хороо
  const [latestResearch, setLatestResearch] = useState(null);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // When loan changes, reset downstream state
  useEffect(() => {
    if (!selectedLoan) return;
    setResearchSeed({ ...selectedLoan, seedKey: `${selectedLoan._id}-${Date.now()}` });
    setLatestResearch(null);
    setApprovalNote('');
  }, [selectedLoan?._id]);

  // Fetch latest research when on committee tab
  useEffect(() => {
    if (activeStep === 'committee' && selectedLoan?._id && !latestResearch) {
      setLoadingResearch(true);
      axios.get(`${apiUrl}/api/loan-research/by-request/${selectedLoan._id}`, authHeaders())
        .then(res => setLatestResearch(res.data))
        .catch(() => {})
        .finally(() => setLoadingResearch(false));
    }
  }, [activeStep, selectedLoan?._id]);

  // ── helpers ──────────────────────────────
  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('loan_token') || ''}` } });
  const isAdmin = getUserRoleKeys(user).includes('admin');
  const committeePermissions = {
    approve: hasCommitteePermission(user, permissionMap, 'Зөвшөөрөх'),
    reject: hasCommitteePermission(user, permissionMap, 'Татгалзах'),
    conditional: hasCommitteePermission(user, permissionMap, 'Нөхцөлтэй зөвшөөрөх'),
    revert: hasCommitteePermission(user, permissionMap, 'Дахин шийдэх (цуцлах)'),
  };

  const updateStatus = async (loan, status) => {
    try {
      const res = await axios.put(`${apiUrl}/api/loans/${loan._id}`, { status }, authHeaders());
      onRequestsChange(requests.map(r => r._id === loan._id ? res.data : r));
      setSelectedLoan(res.data);
      showToast('Статус шинэчлэгдлээ.');
    } catch { showToast('Статус шинэчлэхэд алдаа гарлаа.', 'error'); }
  };

  const assignUser = async (loan, userId, userName) => {
    try {
      const res = await axios.put(`${apiUrl}/api/loans/${loan._id}`, {
        assignee: { userId, name: userName },
        status: loan.status === 'pending' || loan.status === 'created' ? 'assigned' : loan.status,
      }, authHeaders());
      onRequestsChange(requests.map(r => r._id === loan._id ? res.data : r));
      if (selectedLoan?._id === loan._id) setSelectedLoan(res.data);
    } catch { showToast('Хариуцагч хуваарилахад алдаа гарлаа.', 'error'); }
  };

  const deleteLoanRequest = async (loan) => {
    if (!isAdmin || !loan?._id) return;
    const name = borrowerName(loan);
    const ok = window.confirm(`${name} хүсэлтийг DB-ээс бүр мөсөн устгах уу?\n\nХолбоотой зээлийн судалгаа байвал хамт устгана.`);
    if (!ok) return;
    try {
      const res = await axios.delete(`${apiUrl}/api/loans/${loan._id}`, authHeaders());
      onRequestsChange(requests.filter(r => r._id !== loan._id));
      if (selectedLoan?._id === loan._id) {
        setSelectedLoan(null);
        setActiveStep('application');
      }
      if (viewLoan?._id === loan._id) setViewLoan(null);
      showToast(`Хүсэлт устлаа. Холбоотой судалгаа: ${res.data?.deletedLinkedLoanResearch || 0}`);
    } catch (e) {
      showToast(e.response?.data?.message || 'Хүсэлт устгахад алдаа гарлаа.', 'error');
    }
  };

  const selectAndGo = (loan, step) => {
    setApplicationView('requests');
    setSelectedLoan(loan);
    setActiveStep(step || 'application');
  };

  // ── Committee decision ────────────────────
  const backfillAiLoanOfficer = async () => {
    setAiBackfillLoading(true);
    try {
      const res = await axios.post(`${apiUrl}/api/loans/ai-loan-officer/backfill`, { limit: 100 }, authHeaders());
      const ids = res.data?.ids || [];
      if (ids.length) {
        const idSet = new Set(ids);
        const queuedAt = new Date().toISOString();
        onRequestsChange(requests.map(r => idSet.has(r._id)
          ? { ...r, aiLoanOfficer: { status: 'pending', queuedAt, note: text.ai.pendingNote } }
          : r));
      }
      showToast(ids.length ? text.ai.queuedToast(ids.length) : text.ai.noneQueued);
    } catch (e) {
      showToast(e.response?.data?.message || text.ai.queueError, 'error');
    } finally {
      setAiBackfillLoading(false);
    }
  };

  const runAiLoanOfficer = async (loan) => {
    if (!loan?._id) return;
    setAiReviewingId(loan._id);
    try {
      const res = await axios.post(`${apiUrl}/api/loans/${loan._id}/ai-loan-officer`, {}, authHeaders());
      onRequestsChange(requests.map(r => r._id === res.data._id ? res.data : r));
      if (selectedLoan?._id === res.data._id) setSelectedLoan(res.data);
      if (viewLoan?._id === res.data._id) setViewLoan(res.data);
      showToast(text.ai.rerunSuccess);
    } catch (e) {
      showToast(e.response?.data?.message || text.ai.rerunError, 'error');
    } finally {
      setAiReviewingId(null);
    }
  };

  const runComplianceReview = async (loan) => {
    if (!loan?._id) return;
    const labels = COMPLIANCE_TEXT[language] || COMPLIANCE_TEXT.mn;
    setComplianceReviewingId(loan._id);
    try {
      const res = await axios.post(`${apiUrl}/api/loans/${loan._id}/compliance-review`, {}, authHeaders());
      onRequestsChange(requests.map(r => r._id === res.data._id ? res.data : r));
      if (selectedLoan?._id === res.data._id) setSelectedLoan(res.data);
      if (viewLoan?._id === res.data._id) setViewLoan(res.data);
      showToast(labels.success);
    } catch (e) {
      showToast(e.response?.data?.message || labels.error, 'error');
    } finally {
      setComplianceReviewingId(null);
    }
  };

  const makeDecision = async (decision) => {
    if (!selectedLoan) return;
    if (!committeePermissions[decision]) {
      showToast('Танд зээлийн хорооны шийдвэр гаргах эрх байхгүй байна.', 'error');
      return;
    }
    setSavingDecision(true);
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'resolved';
    try {
      const res = await axios.put(`${apiUrl}/api/loans/${selectedLoan._id}`, { status, approvalNote }, authHeaders());
      onRequestsChange(requests.map(r => r._id === res.data._id ? res.data : r));
      setSelectedLoan(res.data);
      const msg = status === 'approved' ? 'Зээл зөвшөөрөгдлөө.' : status === 'rejected' ? 'Зээл татгалзагдлаа.' : 'Нөхцөлтэй шийдвэр хадгалагдлаа.';
      showToast(msg);
      if (status === 'approved') setActiveStep('disbursement');
    } catch { showToast('Шийдвэр хадгалахад алдаа гарлаа.', 'error'); }
    finally { setSavingDecision(false); }
  };

  const revertDecision = async (reason) => {
    if (!selectedLoan) return;
    if (!committeePermissions.revert) {
      showToast('Танд шийдвэр цуцлах эрх байхгүй байна.', 'error');
      return;
    }
    try {
      const res = await axios.put(`${apiUrl}/api/loans/${selectedLoan._id}`, { status: 'committee', approvalNote: reason }, authHeaders());
      onRequestsChange(requests.map(r => r._id === res.data._id ? res.data : r));
      setSelectedLoan(res.data);
      showToast('Шийдвэр цуцлагдлаа. Хүсэлт хороонд буцаалаа.');
    } catch { showToast('Алдаа гарлаа.', 'error'); }
  };

  // ─────────────────────────────────────────
  // FILTERED REQUESTS
  // ─────────────────────────────────────────
  const isFilterActive = (value) => (
    Array.isArray(statusFilter) ? statusFilter.includes(value) : statusFilter === value
  );

  const totalAmount = requests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const maxCount = (rows) => Math.max(1, ...rows.map(row => row.count));
  const toRows = (map, total = requests.length) => Object.entries(map)
    .map(([label, value]) => ({
      label,
      count: value.count,
      amount: value.amount || 0,
      percent: total ? Math.round((value.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const productRows = toRows(requests.reduce((acc, r) => {
    const key = PRODUCTS[r.selectedProduct] || r.selectedProduct || 'Тодорхойгүй';
    acc[key] = acc[key] || { count: 0, amount: 0 };
    acc[key].count += 1;
    acc[key].amount += Number(r.amount) || 0;
    return acc;
  }, {})).slice(0, 5);

  const amountBuckets = [
    { label: '≤ 20 сая', test: v => v <= 20000000 },
    { label: '20-50 сая', test: v => v > 20000000 && v <= 50000000 },
    { label: '50-100 сая', test: v => v > 50000000 && v <= 100000000 },
    { label: '100 сая+', test: v => v > 100000000 },
  ].map(bucket => {
    const rows = requests.filter(r => bucket.test(Number(r.amount) || 0));
    return {
      label: bucket.label,
      count: rows.length,
      amount: rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
      percent: requests.length ? Math.round((rows.length / requests.length) * 100) : 0,
    };
  });

  const termBuckets = [
    { label: '≤ 12 сар', test: v => v <= 12 },
    { label: '13-24 сар', test: v => v > 12 && v <= 24 },
    { label: '25-36 сар', test: v => v > 24 && v <= 36 },
    { label: '36+ сар', test: v => v > 36 },
  ].map(bucket => {
    const rows = requests.filter(r => bucket.test(Number(r.term || r.termMonths) || 0));
    return {
      label: bucket.label,
      count: rows.length,
      percent: requests.length ? Math.round((rows.length / requests.length) * 100) : 0,
    };
  });

  const borrowerTypeRows = [
    { label: 'Иргэн', count: requests.filter(r => r.userType !== 'organization').length },
    { label: 'Байгууллага', count: requests.filter(r => r.userType === 'organization').length },
  ].map(row => ({
    ...row,
    percent: requests.length ? Math.round((row.count / requests.length) * 100) : 0,
  }));
  const pipelineStats = [
    { label: text.stats.total, value: requests.length, tone: 'blue' },
    { label: text.stats.assessment, value: requests.filter(r => ['assessment', 'studying'].includes(r.status)).length, tone: 'amber' },
    { label: text.stats.committee, value: requests.filter(r => r.status === 'committee').length, tone: 'indigo' },
    { label: text.stats.disbursed, value: requests.filter(r => r.status === 'disbursed').length, tone: 'green' },
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all'
      || (Array.isArray(statusFilter) ? statusFilter.includes(r.status) : r.status === statusFilter);
    if (!matchesStatus) return false;
    if (!normalizedSearch) return true;
    const searchable = [
      borrowerName(r),
      r.firstname,
      r.lastname,
      r.orgName,
      r.regNo,
      r.phone,
      r.selectedProduct,
      PRODUCTS[r.selectedProduct],
      r.assignee?.name,
      r.status,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(normalizedSearch);
  });

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl font-bold text-sm ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#003B5C] text-white'}`}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
        </div>
      )}

      {/* Context strip */}
      <div className="loan-workspace-hero">
        <div>
          <p className="loan-eyebrow">{text.loanRequests}</p>
          <h2>{applicationView === 'exposure' ? text.exposureMonitor : text.loanRequests}</h2>
          <p className="loan-hero-subtitle">{requests.length} хүсэлт · {fmt(totalAmount)} нийт дүн</p>
        </div>
        <div className="loan-pipeline-strip">
          {pipelineStats.map(item => (
            <div key={item.label} className={`loan-pipeline-pill ${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        {selectedLoan && (
          <div className="loan-selected-pill">
            <User size={15} className="text-[#003B5C]" />
            <span className="font-black text-[#003B5C]">{borrowerName(selectedLoan)}</span>
            <StatusBadge status={selectedLoan.status} />
            {isAdmin && (
              <button onClick={() => deleteLoanRequest(selectedLoan)}
                className="ml-2 text-red-500 hover:text-red-700" title="Хүсэлт устгах">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={() => { setSelectedLoan(null); setActiveStep('application'); }}
              className="ml-2 text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Step nav */}
      <div className="loan-stepper">
        <div className="flex overflow-x-auto">
          {LOS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === step.key;
            const isDone = selectedLoan && LOS_STEPS.findIndex(s => s.key === activeStep) > idx;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={`loan-stepper-item flex-1 min-w-[130px] flex flex-col items-center gap-1.5 py-5 px-3 border-b-[3px] text-xs font-bold transition-all relative ${
                  isActive
                    ? 'border-[#003B5C] text-[#003B5C] bg-blue-50'
                    : isDone
                      ? 'border-[#00A651] text-[#00A651] bg-green-50'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black shadow-sm ${
                  isActive ? 'bg-[#003B5C] text-white shadow-md' : isDone ? 'bg-[#00A651] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </div>
                <span className={`leading-tight text-center ${isActive ? 'text-[13px] font-black' : 'text-[12px]'}`}>{text.steps[step.key] || step.label}</span>
                {idx < LOS_STEPS.length - 1 && (
                  <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-200" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
          TAB 1 — АППЛИКЭЙШН
      ══════════════════════════════════════ */}
      {activeStep === 'application' && (
        <div className="space-y-4">
          {showApplicationSwitch && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-1.5 inline-flex gap-1 shadow-sm">
              <button
                onClick={() => setApplicationView('requests')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  applicationView === 'requests'
                    ? 'bg-[#003B5C] text-white shadow-md'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                {text.loanRequests}
              </button>
              <button
                onClick={() => {
                  setApplicationView('exposure');
                  setSelectedLoan(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  applicationView === 'exposure'
                    ? 'bg-[#003B5C] text-white shadow-md'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                {text.exposureMonitor}
              </button>
            </div>
          )}

          {applicationView === 'exposure' ? (
            <LoanExposureMonitor apiUrl={apiUrl} usersList={usersList} />
          ) : (
            <>
          <div className="loan-analytics-grid">
            <div className="loan-chart-card loan-chart-card-wide">
              <div className="loan-chart-head">
                <span>Бүтээгдэхүүний төрөл</span>
                <strong>{requests.length}</strong>
              </div>
              <div className="loan-chart-list">
                {productRows.map(row => (
                  <div key={row.label} className="loan-chart-row">
                    <div className="loan-chart-row-top">
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </div>
                    <div className="loan-chart-track">
                      <div style={{ width: `${Math.max(8, (row.count / maxCount(productRows)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {!productRows.length && <p className="loan-chart-empty">Мэдээлэл байхгүй</p>}
              </div>
            </div>

            <div className="loan-chart-card">
              <div className="loan-chart-head">
                <span>Дүнгийн бүтэц</span>
                <strong>{fmt(totalAmount)}</strong>
              </div>
              <div className="loan-chart-list">
                {amountBuckets.map(row => (
                  <div key={row.label} className="loan-chart-row">
                    <div className="loan-chart-row-top">
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </div>
                    <div className="loan-chart-track amber">
                      <div style={{ width: `${Math.max(6, row.percent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="loan-chart-card">
              <div className="loan-chart-head">
                <span>Хугацаа</span>
                <strong>{requests.length}</strong>
              </div>
              <div className="loan-chart-list">
                {termBuckets.map(row => (
                  <div key={row.label} className="loan-chart-row">
                    <div className="loan-chart-row-top">
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </div>
                    <div className="loan-chart-track green">
                      <div style={{ width: `${Math.max(6, row.percent)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="loan-chart-card">
              <div className="loan-chart-head">
                <span>Зээлдэгчийн төрөл</span>
                <strong>{requests.length}</strong>
              </div>
              <div className="loan-donut-wrap">
                <div
                  className="loan-donut"
                  style={{ '--org': `${borrowerTypeRows[1]?.percent || 0}%` }}
                >
                  <span>{borrowerTypeRows[0]?.percent || 0}%</span>
                </div>
                <div className="loan-donut-legend">
                  {borrowerTypeRows.map(row => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="loan-toolbar">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={text.searchPlaceholder}
                  className="loan-search-input"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">{filteredRequests.length} / {requests.length}</span>
                <span>{text.showing}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: text.filters.all },
                  { value: 'pending', label: text.filters.pending },
                  { value: 'created', label: text.filters.created },
                  { value: 'assigned', label: text.filters.assigned },
                  { value: 'approved', label: text.filters.approved },
                  { value: 'rejected', label: text.filters.rejected },
                  { value: 'disbursed', label: text.filters.disbursed },
                ].map(f => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value)}
                    className={`loan-filter-chip ${
                      isFilterActive(f.value) ? 'is-active' : ''
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            <div className="flex items-center gap-2">
              <button onClick={backfillAiLoanOfficer} disabled={aiBackfillLoading}
                className="loan-secondary-action">
                {aiBackfillLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {text.ai.startEvaluation}
              </button>
              <button onClick={() => setShowNewForm(v => !v)}
                className="loan-primary-action">
                <Plus size={15} /> {text.createNew}
              </button>
            </div>
            </div>
          </div>

          {/* New loan form — full application detail */}
          {showNewForm && (
            <div className="bg-white border-2 border-[#003B5C] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#003B5C] text-base">{text.newTitle}</h4>
                <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
              </div>
              <LoanApplicationDetail
                loan={null}
                apiUrl={apiUrl}
                language={language}
                createMode={true}
                onCancel={() => setShowNewForm(false)}
                onCreated={async (newLoan) => {
                  const token = localStorage.getItem('loan_token') || '';
                  const res = await axios.get(`${apiUrl}/api/loans`, { headers: { Authorization: `Bearer ${token}` } });
                  onRequestsChange(res.data || []);
                  setShowNewForm(false);
                  setSelectedLoan(newLoan);
                }}
              />
            </div>
          )}

          {/* Table */}
          <div className="loan-request-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="border-b text-[11px] font-black uppercase">
                  <tr>
                    <th className="p-3 text-left">{text.table.date}</th>
                    <th className="p-3 text-left">{text.table.name}</th>
                    <th className="p-3 text-left">{text.table.product}</th>
                    <th className="p-3 text-right">{text.table.amount}</th>
                    <th className="p-3 text-center">{text.table.status}</th>
                    <th className="p-3 text-left">{text.table.assignee}</th>
                    <th className="p-3 text-center">{text.table.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.map(req => (
                    <tr key={req._id} className={`cursor-pointer ${selectedLoan?._id === req._id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedLoan(req)}>
                      <td className="p-3 text-slate-600 text-xs font-semibold">{fmtDate(req.createdAt)}</td>
                      <td className="p-3 font-black text-[#003B5C]">
                        {borrowerName(req)}
                        {req.source === 'web' && !req.createdByStaff && (
                          <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{text.web}</span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="product-chip bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-black">
                          {PRODUCTS[req.selectedProduct] || req.selectedProduct || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-800">{fmt(req.amount)}</td>
                      <td className="p-3 text-center"><StatusBadge status={req.status} /></td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={req.assignee?.userId || ''}
                          onChange={e => {
                            const u = usersList.find(u => u._id === e.target.value);
                            if (u) assignUser(req, u._id, u.name);
                          }}
                          className="assignee-select text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-bold shadow-sm focus:outline-none focus:border-[#003B5C] max-w-[150px]"
                        >
                          <option value="">- {text.select} -</option>
                          {usersList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                        {req.assignee?.name && (
                          <span className="block text-[11px] text-[#003B5C] font-black mt-1">{req.assignee.name}</span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewLoan(req)}
                            className="action-icon p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200" title="Харилцагчийн дэлгэрэнгүй">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => selectAndGo(req, 'assessment')}
                            className="action-icon p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100" title="Зээлийн үнэлгээ">
                            <BarChart2 size={14} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => deleteLoanRequest(req)}
                              className="action-icon p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Хүсэлт устгах">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredRequests.length && (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400">{text.empty}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          ХАРИЛЦАГЧИЙН ДЭЛГЭРЭНГҮЙ MODAL
      ══════════════════════════════════════ */}
      {viewLoan && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-xs font-bold text-[#00A651] uppercase tracking-widest">Аппликэйшн</p>
                <h3 className="text-lg font-black text-[#003B5C]">{borrowerName(viewLoan)}</h3>
              </div>
              <button onClick={() => setViewLoan(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <LoanApplicationDetail
                loan={viewLoan}
                apiUrl={apiUrl}
                language={language}
                user={user}
                onSaved={(updated) => {
                  onRequestsChange(requests.map(r => r._id === updated._id ? updated : r));
                  setViewLoan(updated);
                  if (selectedLoan?._id === updated._id) setSelectedLoan(updated);
                }}
                onGoToResearch={(targetLoan) => {
                  setViewLoan(null);
                  setSelectedLoan(targetLoan);
                  setResearchSeed({ ...targetLoan, seedKey: `${targetLoan._id}-${Date.now()}` });
                  setActiveStep('assessment');
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB 2 — ЗЭЭЛИЙН ҮНЭЛГЭЭ
      ══════════════════════════════════════ */}
      {activeStep === 'assessment' && (
        !selectedLoan ? (
          <NoSelection onBack={() => setActiveStep('application')} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <LoanHeader loan={selectedLoan} />
              <button onClick={() => { updateStatus(selectedLoan, 'committee'); setActiveStep('committee'); }}
                className="inline-flex items-center gap-2 bg-[#003B5C] hover:bg-[#002d47] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all">
                <BadgeCheck size={15} /> Зээлийн хороо руу шилжих
              </button>
            </div>
            <AiLoanOfficerCard
              loan={selectedLoan}
              labels={text.ai}
              onRun={runAiLoanOfficer}
              loading={aiReviewingId === selectedLoan._id}
            />
            <ComplianceReviewCard
              loan={selectedLoan}
              labels={COMPLIANCE_TEXT[language] || COMPLIANCE_TEXT.mn}
              onRun={runComplianceReview}
              loading={complianceReviewingId === selectedLoan._id}
            />
            <LoanResearch
              apiUrl={apiUrl}
              prefillRequest={researchSeed}
              studyRequests={requests}
              onSelectStudyRequest={(req) => { setSelectedLoan(req); setResearchSeed({ ...req, seedKey: `${req._id}-${Date.now()}` }); }}
              embeddedMode={true}
            />
          </div>
        )
      )}

      {/* ══════════════════════════════════════
          TAB 3 — ЗЭЭЛИЙН ХОРОО
      ══════════════════════════════════════ */}
      {activeStep === 'committee' && (
        !selectedLoan ? (
          <NoSelection onBack={() => setActiveStep('application')} />
        ) : (
          <CommitteePanel
            loan={selectedLoan}
            latestResearch={latestResearch}
            loadingResearch={loadingResearch}
            approvalNote={approvalNote}
            setApprovalNote={setApprovalNote}
            savingDecision={savingDecision}
            makeDecision={makeDecision}
            revertDecision={revertDecision}
            canDecide={committeePermissions}
            onGoAssessment={() => setActiveStep('assessment')}
            labels={text.ai}
            complianceLabels={COMPLIANCE_TEXT[language] || COMPLIANCE_TEXT.mn}
            onRunAi={runAiLoanOfficer}
            aiLoading={aiReviewingId === selectedLoan._id}
            onRunCompliance={runComplianceReview}
            complianceLoading={complianceReviewingId === selectedLoan._id}
          />
        )
      )}

      {/* ══════════════════════════════════════
          TAB 6 — ОЛГОЛТ
      ══════════════════════════════════════ */}
      {activeStep === 'disbursement' && (
        !selectedLoan ? (
          <NoSelection onBack={() => setActiveStep('application')} />
        ) : (
          <div className="space-y-5">
            <LoanHeader loan={selectedLoan} />

            {/* Loan terms card */}
            <div className="bg-white border rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold uppercase text-slate-500">Зээлийн нөхцөл</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Харилцагч', borrowerName(selectedLoan)],
                  ['Зээлийн төрөл', PRODUCTS[selectedLoan.selectedProduct] || '-'],
                  ['Зээлийн дүн', fmt(selectedLoan.amount)],
                  ['Хугацаа', `${selectedLoan.term || '-'} сар`],
                  ['Зориулалт', selectedLoan.purpose || '-'],
                  ['Утас', selectedLoan.phone || selectedLoan.contactPhone || '-'],
                  ['Статус', STATUS_META[selectedLoan.status]?.label || selectedLoan.status],
                  ['Огноо', fmtDate(selectedLoan.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="border rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">{label}</p>
                    <p className="font-bold text-[#003B5C] text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedLoan.status === 'disbursed' ? (
              <div className="flex items-center gap-3 p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-700 font-bold">
                <CheckCircle2 size={22} /> Зээл амжилттай олгогдсон байна.
              </div>
            ) : !['approved', 'resolved'].includes(selectedLoan.status) ? (
              <div className="flex items-center gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
                <AlertCircle size={18} />
                Зээл олгохын өмнө эхлээд <button onClick={() => setActiveStep('committee')} className="underline font-bold">Зээлийн хороо</button> шатыг дуусгана уу. Одоогийн статус: <StatusBadge status={selectedLoan.status} />
              </div>
            ) : (
              <div className="bg-white border-2 border-emerald-400 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> Зөвшөөрөгдсөн — олголтод бэлэн</p>
                <p className="text-xs text-slate-500">Гэрээлэлт болон баримт бэлдсэний дараа зээл олгосон гэж бүртгэнэ.</p>
                <button onClick={() => updateStatus(selectedLoan, 'disbursed')}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all">
                  <CreditCard size={16} /> Зээл олгов гэж бүртгэх
                </button>
              </div>
            )}
          </div>
        )
      )}
      {/* ── Universal prev/next step navigation ── */}
      {selectedLoan && (() => {
        const currentIdx = LOS_STEPS.findIndex(s => s.key === activeStep);
        if (currentIdx < 0) return null;
        const prev = LOS_STEPS[currentIdx - 1];
        const next = LOS_STEPS[currentIdx + 1];
        return (
          <div className="flex items-center justify-between pt-2">
            {prev ? (
              <button onClick={() => setActiveStep(prev.key)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                ← {prev.label}
              </button>
            ) : <span />}
            {next ? (
              <button onClick={() => setActiveStep(next.key)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003B5C] text-white rounded-xl text-sm font-bold hover:bg-[#002d47] transition-all">
                {next.label} →
              </button>
            ) : <span />}
          </div>
        );
      })()}
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
const NoSelection = ({ onBack }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20 bg-white border rounded-2xl text-slate-400">
    <ClipboardList size={40} />
    <p className="font-bold text-slate-500">Зээлийн хүсэлт сонгоогүй байна.</p>
    <button onClick={onBack} className="text-sm font-bold text-[#003B5C] underline">← Жагсаалт руу буцах</button>
  </div>
);

const LoanHeader = ({ loan }) => (
  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm">
    <User size={15} className="text-[#003B5C]" />
    <span className="font-black text-[#003B5C]">{borrowerName(loan)}</span>
    <span className="text-slate-400">·</span>
    <span className="text-slate-600">{new Intl.NumberFormat('mn-MN').format(loan.amount || 0)} ₮</span>
    <span className="text-slate-400">·</span>
    <StatusBadge status={loan.status} />
  </div>
);

const AiLoanOfficerCard = ({ loan, labels = UI_TEXT.mn.ai, onRun, loading = false }) => {
  const assessment = loan?.aiLoanOfficer;
  const decision = assessment?.decision || {};
  const risk = assessment?.risk || {};
  const legal = assessment?.legal || {};
  const credit = assessment?.credit || {};
  const policyCompliance = assessment?.policyCompliance || {};
  const policyChecks = Array.isArray(policyCompliance.checks) ? policyCompliance.checks : [];
  const recommendation = decision.recommendation || credit.recommendation;
  const recLabel = {
    approve: labels.recLabels.approve,
    conditional: labels.recLabels.conditional,
    manual_review: labels.recLabels.manual_review,
    reject: labels.recLabels.reject,
  }[recommendation] || labels.recLabels.empty;
  const generatedAt = assessment?.generatedAt ? new Date(assessment.generatedAt).toLocaleString('mn-MN') : null;
  const languageMismatch = labels.locale === 'mn' && assessment?.status === 'completed' && hasEnglishNarrative(assessment);
  const confidenceValue = Number(decision.confidence);
  const confidencePct = Number.isFinite(confidenceValue) ? Math.round(confidenceValue * 100) : null;
  const rationaleGroups = [
    { title: labels.approvalReasons, items: decision.approvalReasons || [], cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { title: labels.conditions, items: decision.conditionalReasons || credit.conditions || [], cls: 'border-amber-200 bg-amber-50 text-amber-800' },
    { title: labels.rejectionRisks, items: decision.rejectionReasons || [], cls: 'border-red-200 bg-red-50 text-red-800' },
  ].filter(group => Array.isArray(group.items) && group.items.length);

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#003B5C] text-white flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-[#003B5C]">{labels.cardTitle}</p>
            <p className="text-xs font-semibold text-slate-500">
              {generatedAt ? `${generatedAt} - ${assessment?.source === 'openai' ? 'OpenAI' : labels.ruleBased}` : assessment?.note || labels.defaultSubtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiLoanOfficerBadge assessment={assessment} labels={labels} />
          {onRun && (
            <button
              type="button"
              onClick={() => onRun(loan)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C] disabled:opacity-60"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? labels.rerunning : labels.rerun}
            </button>
          )}
        </div>
      </div>

      {languageMismatch ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {labels.englishDetected}
        </div>
      ) : assessment?.status === 'completed' ? (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-500">{labels.risk}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{risk.summary || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-500">{labels.legal}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{legal.summary || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-500">{labels.recommendation}</p>
              <p className="mt-1 text-sm font-black text-[#003B5C]">{recLabel}</p>
              {confidencePct != null && <p className="text-xs font-semibold text-slate-500 mt-1">{labels.confidence} {confidencePct}%</p>}
            </div>
          </div>
          {rationaleGroups.length > 0 && (
            <div className="grid md:grid-cols-3 gap-3">
              {rationaleGroups.map(group => (
                <div key={group.title} className={`rounded-xl border p-3 ${group.cls}`}>
                  <p className="text-[10px] font-black uppercase mb-2">{group.title}</p>
                  <ul className="space-y-1.5 text-xs font-bold leading-5">
                    {group.items.slice(0, 4).map((item, idx) => <li key={idx}>- {item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {(policyCompliance.summary || policyChecks.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">{labels.policyCompliance}</p>
                {policyCompliance.summary && (
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-800">{policyCompliance.summary}</p>
                )}
              </div>
              {policyChecks.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                  {policyChecks.slice(0, 4).map((item, idx) => (
                    <div key={`${item.area}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-black uppercase text-slate-500">{item.area}</p>
                        <span className="text-[10px] font-black text-[#003B5C]">{item.status}</span>
                      </div>
                      {item.policyClause && (
                        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2">
                          <p className="text-[9px] font-black uppercase text-blue-700">{labels.policyClause}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-blue-900">{item.policyClause}</p>
                        </div>
                      )}
                      {item.evidence && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-[9px] font-black uppercase text-slate-500">{labels.policyEvidence}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{item.evidence}</p>
                        </div>
                      )}
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-800">{item.finding}</p>
                      {item.recommendation && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.recommendation}</p>}
                      {item.policyRef && <p className="mt-2 text-[11px] font-bold text-[#003B5C]">{labels.policySource}: {item.policyRef}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm font-semibold text-slate-600">
          {assessment?.status === 'pending'
            ? labels.pendingMessage
            : assessment?.status === 'running'
              ? labels.runningMessage
              : assessment?.status === 'failed'
                ? (assessment.note || labels.failedMessage)
                : labels.emptyMessage}
        </p>
      )}
      <p className="text-[11px] font-semibold text-slate-500">{labels.disclaimer}</p>
    </div>
  );
};


// ─────────────────────────────────────────────
const ComplianceReviewCard = ({ loan, labels = COMPLIANCE_TEXT.mn, onRun, loading = false }) => {
  const review = loan?.complianceReview;
  const status = review?.status || 'not_started';
  const overall = review?.overallStatus || 'insufficient_information';
  const generatedAt = review?.generatedAt ? new Date(review.generatedAt).toLocaleString('mn-MN') : null;
  const statusMeta = {
    not_started: 'bg-slate-100 text-slate-600',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    no_policies: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  }[status] || 'bg-slate-100 text-slate-600';
  const overallMeta = {
    compliant: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    needs_review: 'border-amber-200 bg-amber-50 text-amber-800',
    non_compliant: 'border-red-200 bg-red-50 text-red-800',
    insufficient_information: 'border-slate-200 bg-slate-50 text-slate-700',
  }[overall] || 'border-slate-200 bg-slate-50 text-slate-700';
  const checks = Array.isArray(review?.checks) ? review.checks : [];
  const requiredActions = Array.isArray(review?.requiredActions) ? review.requiredActions : [];
  const missingDocuments = Array.isArray(review?.missingDocuments) ? review.missingDocuments : [];
  const policySources = Array.isArray(review?.policySources) ? review.policySources : [];
  const hasReview = ['completed', 'no_policies', 'failed'].includes(status);

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#0f766e] text-white flex items-center justify-center">
            <BadgeCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-[#003B5C]">{labels.cardTitle}</p>
            <p className="text-xs font-semibold text-slate-500">
              {generatedAt ? `${generatedAt} - ${review?.source === 'openai' ? 'OpenAI' : 'Rules'}` : review?.note || labels.defaultSubtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${statusMeta}`}>
            {status === 'running' ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
            {labels.statuses[status] || status}
          </span>
          {onRun && (
            <button
              type="button"
              onClick={() => onRun(loan)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C] disabled:opacity-60"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? labels.running : (hasReview ? labels.rerun : labels.run)}
            </button>
          )}
        </div>
      </div>

      {status === 'not_started' ? (
        <p className="text-sm font-semibold text-slate-600">{labels.noReview}</p>
      ) : status === 'running' ? (
        <p className="text-sm font-semibold text-slate-600">{review?.note || labels.running}</p>
      ) : status === 'failed' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {review?.note || labels.error}
        </div>
      ) : (
        <>
          <div className={`rounded-xl border p-4 ${overallMeta}`}>
            <p className="text-[10px] font-black uppercase opacity-75">{labels.summary}</p>
            <p className="mt-1 text-sm font-bold leading-6">{review?.summary || labels.noReview}</p>
            <p className="mt-2 text-xs font-black">{labels.overall[overall] || overall}</p>
          </div>

          {checks.length > 0 && (
            <div className="grid lg:grid-cols-3 gap-3">
              {checks.slice(0, 6).map((item, idx) => (
                <div key={`${item.area}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">{item.area}</p>
                    <span className="text-[10px] font-black text-slate-500">{item.severity}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-5 text-slate-800">{item.finding}</p>
                  {item.policyClause && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[9px] font-black uppercase text-slate-500">{labels.policyClause}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">{item.policyClause}</p>
                    </div>
                  )}
                  {item.policyRequirement && (
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2">
                      <p className="text-[9px] font-black uppercase text-blue-700">{labels.policyRequirement}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-blue-900">{item.policyRequirement}</p>
                    </div>
                  )}
                  {item.evidence && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[9px] font-black uppercase text-slate-500">{labels.evidence}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{item.evidence}</p>
                    </div>
                  )}
                  {item.conflictReason && (
                    <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-2">
                      <p className="text-[9px] font-black uppercase text-amber-700">{labels.conflictReason}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-amber-900">{item.conflictReason}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.recommendation}</p>
                  {item.policyRef && <p className="mt-2 text-[11px] font-bold text-[#003B5C]">{labels.source}: {item.policyRef}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-2">{labels.requiredActions}</p>
              {requiredActions.length ? (
                <ul className="space-y-1.5 text-xs font-bold leading-5 text-slate-700">
                  {requiredActions.slice(0, 5).map((item, idx) => <li key={idx}>- {item}</li>)}
                </ul>
              ) : <p className="text-xs font-semibold text-slate-400">-</p>}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-2">{labels.missingDocuments}</p>
              {missingDocuments.length ? (
                <ul className="space-y-1.5 text-xs font-bold leading-5 text-slate-700">
                  {missingDocuments.slice(0, 5).map((item, idx) => <li key={idx}>- {item}</li>)}
                </ul>
              ) : <p className="text-xs font-semibold text-slate-400">-</p>}
            </div>
          </div>

          {policySources.length > 0 && (
            <p className="text-[11px] font-semibold text-slate-500">
              {labels.source}: {policySources.slice(0, 3).map(p => p.title).join(', ')}{policySources.length > 3 ? ` +${policySources.length - 3}` : ''}
            </p>
          )}
        </>
      )}
      <p className="text-[11px] font-semibold text-slate-500">{review?.disclaimer}</p>
    </div>
  );
};

// COMMITTEE PANEL
// ─────────────────────────────────────────────
const ANALYST_DECISION_LABELS = {
  approve: 'Зөвшөөрөх',
  conditional: 'Нөхцөлтэй зөвшөөрөх',
  reject: 'Татгалзах',
};

const CommitteePanel = ({ loan, latestResearch, loadingResearch, approvalNote, setApprovalNote, savingDecision, makeDecision, revertDecision, canDecide = {}, onGoAssessment, labels = UI_TEXT.mn.ai, complianceLabels = COMPLIANCE_TEXT.mn, onRunAi, aiLoading = false, onRunCompliance, complianceLoading = false }) => {
  const nfmt = v => new Intl.NumberFormat('mn-MN').format(Math.round(v || 0));
  const [revertMode, setRevertMode] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);
  const printContentRef = useRef(null);

  if (loadingResearch) return (
    <div className="flex items-center justify-center py-24 bg-white border rounded-2xl gap-3 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="font-bold">Зээлийн судалгаа уншиж байна...</span>
    </div>
  );

  if (!latestResearch) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 bg-white border rounded-2xl text-slate-400">
      <BarChart2 size={44} />
      <p className="font-bold text-slate-500 text-base">Зээлийн судалгаа хийгдээгүй байна.</p>
      <p className="text-sm text-slate-400">Эхлээд зээлийн үнэлгээ хийнэ үү.</p>
      <button onClick={onGoAssessment}
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#003B5C] text-white rounded-xl font-bold text-sm">
        ← Зээлийн үнэлгээ рүү буцах
      </button>
    </div>
  );

  const b = latestResearch.borrower || {};
  const outputs = latestResearch.outputs || {};
  const cs = outputs.creditScore || {};
  const ie = outputs.incomeExpense || {};
  const col = outputs.collateral || {};
  const financial = outputs.financialStatementAnalysis || null;
  const financialBalance = financial?.balanceSheet || {};
  const financialIncome = financial?.incomeStatement || {};
  const financialRatios = financial?.ratios || {};
  const financialCurrency = String(financial?.currency || 'MNT').toUpperCase();
  const financialConversion = outputs.financialConversion || null;
  const formatFinancialAmount = value => {
    const native = `${nfmt(value)} ${financialCurrency === 'MNT' ? '₮' : financialCurrency}`;
    return financialConversion?.rate && financialCurrency !== 'MNT'
      ? `${native} / ${nfmt(Number(value || 0) * financialConversion.rate)} ₮`
      : native;
  };
  const collaterals = b.collaterals || [];
  const projectedRevenueCollaterals = collaterals.filter(c => c.collateralType === 'account_revenue' && c.projectedRevenueAnalysis);
  const formatProjectedRevenueAmount = (collateral, value) => {
    const plan = collateral.projectedRevenueAnalysis || {};
    const currency = String(plan.currency || 'UNKNOWN').toUpperCase();
    const native = `${nfmt(value)} ${currency === 'MNT' ? '₮' : currency}`;
    const rate = Number(collateral.projectedRevenueExchangeRate || 0);
    return rate > 0 && currency !== 'MNT' && currency !== 'UNKNOWN'
      ? `${native} / ${nfmt(Number(value || 0) * rate)} ₮`
      : native;
  };
  const guarantors = b.guarantors || [];
  const riskFlags = b.riskFlags || b.analystRisks || [];
  const scoreBreakdown = cs.scoreBreakdown || [];

  const displayName = b.borrowerType === 'organization'
    ? (b.orgName || b.borrowerName || '-')
    : ([b.firstName, b.fatherName].filter(Boolean).join(' ') || b.lastName || b.borrowerName || '-');

  const score = cs.calculatedScore || 0;
  const grade = cs.grade || '?';
  const gradeColor = { A: 'text-green-700 bg-green-100', B: 'text-teal-700 bg-teal-100', C: 'text-amber-700 bg-amber-100', D: 'text-orange-700 bg-orange-100', E: 'text-red-700 bg-red-100' }[grade] || 'text-slate-600 bg-slate-100';
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  const kpis = [
    { detail: 'Credit Score', label: 'Оноо', display: `${score}/100`, pass: score >= 50 },
    { detail: 'Grade', label: 'Зэрэглэл', display: grade, pass: !['D', 'E'].includes(grade) },
    { detail: 'Debt-to-Income', label: 'DTI', display: `${(ie.dti || 0).toFixed(1)}%`, pass: (ie.dti || 0) <= 55 },
    { detail: 'Free Cash Flow', label: 'Чөлөөт урсгал', display: nfmt(ie.freeCashFlow) + ' ₮', pass: (ie.freeCashFlow || 0) > 0 },
    { detail: 'Loan-to-Value', label: 'LTV', display: col.ltvRatio != null ? `${col.ltvRatio.toFixed(1)}%` : '—', pass: col.ltvRatio == null || col.ltvRatio <= 80 },
    ...(financial ? [{ detail: 'Financial Report', label: 'Цэвэр ашиг', display: formatFinancialAmount(financialIncome.netProfit), pass: Number(financialIncome.netProfit || 0) >= 0 && Number(financialRatios.currentRatio || 0) >= 1 }] : []),
  ];
  const passCount = kpis.filter(k => k.pass).length;
  const failedKpis = kpis.filter(k => !k.pass);
  const passedKpis = kpis.filter(k => k.pass);
  const autoVerdict = passCount >= 4 ? 'approve' : passCount >= 2 ? 'conditional' : 'reject';
  const verdictStyle = { approve: 'bg-green-50 border-green-300 text-green-700', conditional: 'bg-amber-50 border-amber-300 text-amber-700', reject: 'bg-red-50 border-red-300 text-red-700' }[autoVerdict];
  const confidence = Math.min(96, Math.max(42, Math.round((passCount / kpis.length) * 72 + Math.min(score, 100) * 0.24)));
  const aiDecisionLabel = autoVerdict === 'approve'
    ? 'Approve recommended'
    : autoVerdict === 'conditional'
      ? 'Conditional approval'
      : 'Reject recommended';
  const aiDecisionMn = autoVerdict === 'approve'
    ? 'Олгох саналтай'
    : autoVerdict === 'conditional'
      ? 'Нөхцөлтэй олгох саналтай'
      : 'Татгалзах саналтай';
  const decisionTone = {
    approve: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/30',
    conditional: 'text-amber-300 bg-amber-400/10 border-amber-300/30',
    reject: 'text-red-300 bg-red-400/10 border-red-300/30',
  }[autoVerdict];
  const factorContributions = [
    { label: 'Credit score', value: Math.min(100, Math.max(0, score)), positive: score >= 50 },
    { label: 'DTI', value: Math.min(100, Math.max(0, 100 - (ie.dti || 0))), positive: (ie.dti || 0) <= 55 },
    { label: 'Cash flow', value: Math.min(100, Math.max(12, (ie.freeCashFlow || 0) > 0 ? 82 : 28)), positive: (ie.freeCashFlow || 0) > 0 },
    { label: 'Collateral / LTV', value: col.ltvRatio == null ? 52 : Math.min(100, Math.max(0, 100 - col.ltvRatio)), positive: col.ltvRatio == null || col.ltvRatio <= 80 },
  ];
  const approvalReasons = passedKpis.map(k => {
    if (k.detail === 'Credit Score') return `Кредит оноо ${score}/100 байгаа нь доод босго 50-аас дээш байна.`;
    if (k.detail === 'Grade') return `Зээлийн зэрэглэл ${grade}; D/E өндөр эрсдэлийн ангилалд ороогүй.`;
    if (k.detail === 'Debt-to-Income') return `DTI ${(ie.dti || 0).toFixed(1)}% байгаа нь 55%-ийн дээд босгоос хэтрээгүй.`;
    if (k.detail === 'Free Cash Flow') return `Шинэ төлбөрийн дараах чөлөөт мөнгөн урсгал ${nfmt(ie.freeCashFlow)} ₮ эерэг байна.`;
    if (k.detail === 'Loan-to-Value') return col.ltvRatio == null ? 'LTV тооцоолох барьцаа бүртгэгдээгүй тул энэ шалгуур саад болоогүй.' : `LTV ${col.ltvRatio.toFixed(1)}% байгаа нь 80%-ийн босгоос хэтрээгүй.`;
    return `${k.label} шалгуур хангагдсан.`;
  });
  const conditionItems = [];
  const rejectionReasons = [];

  if (score < 50) {
    conditionItems.push('Кредит оноог сайжруулах нэмэлт тайлбар, зээлийн түүхийн лавлагаа, муу түүхийн шалтгааныг баталгаажуулах.');
    rejectionReasons.push(`Кредит оноо ${score}/100 тул доод босго 50-аас доогуур байна.`);
  }
  if (['D', 'E'].includes(grade)) {
    conditionItems.push(`Зээлийн зэрэглэл ${grade} тул батлан даагч, нэмэлт барьцаа эсвэл дүн бууруулах хувилбар шаардана.`);
    rejectionReasons.push(`Зээлийн зэрэглэл ${grade} нь өндөр эрсдэлийн ангилалд байна.`);
  }
  if ((ie.dti || 0) > 55) {
    conditionItems.push(`DTI ${(ie.dti || 0).toFixed(1)}%-ийг 55%-иас доош буулгах: зээлийн дүн бууруулах, хугацаа сунгах эсвэл бусад өр төлбөр хаах.`);
    rejectionReasons.push(`DTI ${(ie.dti || 0).toFixed(1)}% тул өрийн ачаалал зөвшөөрөх босгоос давсан.`);
  }
  if ((ie.freeCashFlow || 0) <= 0) {
    conditionItems.push(`Чөлөөт мөнгөн урсгалыг эерэг болгох: баталгаажсан нэмэлт орлого, хамтран зээлдэгч эсвэл сарын төлбөр бууруулах нөхцөл шаардана.`);
    rejectionReasons.push(`Чөлөөт мөнгөн урсгал ${nfmt(ie.freeCashFlow)} ₮ буюу шинэ төлбөр даах чадвар сул байна.`);
  }
  if (col.ltvRatio != null && col.ltvRatio > 80) {
    conditionItems.push(`LTV ${col.ltvRatio.toFixed(1)}%-ийг 80%-иас доош буулгах: нэмэлт барьцаа авах эсвэл зээлийн дүн бууруулах.`);
    rejectionReasons.push(`LTV ${col.ltvRatio.toFixed(1)}% тул барьцааны хамгаалалт сул байна.`);
  }
  if (col.ltvRatio == null) {
    conditionItems.push('Барьцааны үнэлгээ/LTV-г албан ёсоор тооцож баталгаажуулах.');
  }
  if (riskFlags.length) {
    conditionItems.push(...riskFlags.slice(0, 3).map(r => `Эрсдэлийн тэмдэглэл баталгаажуулах: ${r}`));
  }
  if (!conditionItems.length && autoVerdict === 'conditional') {
    conditionItems.push('Дутуу баримт, орлого, барьцааны нотолгоог хүний ажилтан давхар шалгаж баталгаажуулах.');
  }

  const decisionSummary = autoVerdict === 'approve'
    ? `Гол ${passCount}/${kpis.length} шалгуур хангагдсан тул урьдчилсан байдлаар олгох боломжтой.`
    : autoVerdict === 'conditional'
      ? `${failedKpis.length} шалгуур хангагдаагүй тул зөвхөн доорх нөхцөлийг биелүүлсний дараа олгох саналтай.`
      : `${failedKpis.length} гол шалгуур хангагдаагүй тул одоогийн мэдээллээр татгалзах саналтай.`;
  const reasoningSteps = [
    `${passCount}/${kpis.length} гол шалгуур хангагдсан.`,
    `Кредит оноо ${score}/100, зэрэглэл ${grade}.`,
    `DTI ${(ie.dti || 0).toFixed(1)}%, чөлөөт мөнгөн урсгал ${nfmt(ie.freeCashFlow)} ₮.`,
    col.ltvRatio != null ? `LTV ${col.ltvRatio.toFixed(1)}% байна.` : 'Барьцааны LTV тооцоологдоогүй байна.',
  ];

  const isDecided = ['approved', 'rejected', 'resolved', 'disbursed'].includes(loan.status);
  const hasAnyDecisionPermission = !!(canDecide.approve || canDecide.conditional || canDecide.reject);

  const decidedMeta = {
    approved:  { label: 'Зөвшөөрөгдсөн',      cls: 'bg-green-50 border-green-400 text-green-700',   icon: <ThumbsUp size={20} /> },
    rejected:  { label: 'Татгалзсан',           cls: 'bg-red-50 border-red-400 text-red-700',         icon: <ThumbsDown size={20} /> },
    resolved:  { label: 'Нөхцөлтэй зөвшөөрөв', cls: 'bg-amber-50 border-amber-400 text-amber-700',  icon: <BadgeCheck size={20} /> },
    disbursed: { label: 'Зөвшөөрөгдсөн — Олгогдсон', cls: 'bg-emerald-50 border-emerald-400 text-emerald-700', icon: <ThumbsUp size={20} /> },
  }[loan.status] || null;

  const handleRevert = async () => {
    if (!revertReason.trim()) return;
    setReverting(true);
    await revertDecision(revertReason);
    setReverting(false);
    setRevertMode(false);
    setRevertReason('');
  };

  const printCommittee = () => {
    if (printContentRef.current) {
      const clone = printContentRef.current.cloneNode(true);

      clone.querySelectorAll('textarea').forEach((textarea) => {
        const value = textarea.value || textarea.getAttribute('placeholder') || '';
        const div = document.createElement('div');
        div.textContent = value;
        div.style.cssText = 'border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:12px;line-height:1.6;color:#334155;white-space:pre-wrap;background:#f8fafc;';
        textarea.replaceWith(div);
      });
      clone.querySelectorAll('button,[data-print-hidden]').forEach((el) => el.remove());

      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join('\n');
      const today = new Date().toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric' });
      const safeDisplayName = String(displayName ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const w = window.open('', '_blank', 'width=1100,height=800');
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Зээлийн хорооны дүгнэлт — ${safeDisplayName}</title>
        ${styles}
        <style>
          *{box-sizing:border-box}
          body{margin:0;background:#fff;color:#1e293b;font-family:'Segoe UI',Arial,sans-serif}
          @page{size:A4;margin:14mm}
          @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-page{box-shadow:none!important;margin:0!important;width:auto!important}.print-avoid-break{break-inside:avoid}}
          .print-page{max-width:980px;margin:0 auto;padding:24px;background:#fff}
          .print-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #003B5C}
          .print-brand{font-size:10px;font-weight:900;color:#00A651;text-transform:uppercase;letter-spacing:.16em}
          .print-title{font-size:24px;font-weight:900;color:#003B5C;line-height:1.1;margin-top:2px}
          .print-meta{font-size:12px;font-weight:700;color:#64748b;margin-top:5px}
          .print-signatures{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}
          .print-signature{text-align:center;border-top:1px solid #cbd5e1;padding-top:8px;font-size:11px;font-weight:700;color:#64748b}
          .print-page button,.print-page .no-print{display:none!important}
          .print-page .fixed,.print-page .sticky{position:static!important}
          .print-page .shadow-2xl,.print-page .shadow-xl,.print-page .shadow-lg,.print-page .shadow-md,.print-page .shadow-sm{box-shadow:none!important}
        </style>
      </head><body>
        <main class="print-page">
          <header class="print-header">
            <div>
              <div class="print-brand">Solongo Capital</div>
              <div class="print-title">Зээлийн хорооны дүгнэлт</div>
              <div class="print-meta">Огноо: ${today}</div>
            </div>
            <div style="text-align:right">
              <div class="print-meta">Зээлдэгч</div>
              <div style="font-size:18px;font-weight:900;color:#003B5C">${safeDisplayName}</div>
            </div>
          </header>
          <section class="space-y-5">${clone.innerHTML}</section>
          <footer class="print-signatures">
            ${['Зээлийн ажилтан','Хорооны гишүүн','Хорооны дарга'].map(role => `<div><div class="print-signature">${role}</div><div style="text-align:center;font-size:10px;color:#cbd5e1;margin-top:3px">Гарын үсэг / огноо</div></div>`).join('')}
          </footer>
        </main>
      </body></html>`);
      w.document.close();
      w.onload = () => { w.focus(); w.print(); };
      return;
    }

    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fmtM = v => new Intl.NumberFormat('mn-MN').format(Math.round(v || 0));
    const today = new Date().toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric' });

    const gradeHex = { A:'#15803d', B:'#0f766e', C:'#d97706', D:'#ea580c', E:'#dc2626' }[grade] || '#64748b';
    const scoreHex = score >= 70 ? '#15803d' : score >= 50 ? '#d97706' : '#dc2626';

    const kpiHtml = kpis.map(k => `
      <div style="border:2px solid ${k.pass?'#86efac':'#fca5a5'};border-radius:12px;padding:14px 10px;text-align:center;background:${k.pass?'#f0fdf4':'#fff1f2'}">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${esc(k.detail)}</div>
        <div style="font-size:18px;font-weight:900;color:${k.pass?'#15803d':'#dc2626'};margin-bottom:2px">${esc(k.display)}</div>
        <div style="font-size:10px;color:#64748b;font-weight:600">${esc(k.label)}</div>
        <div style="margin-top:6px;font-size:11px;font-weight:800;color:${k.pass?'#15803d':'#dc2626'}">${k.pass?'✓ Хангасан':'✗ Хангаагүй'}</div>
      </div>`).join('');

    const sbHtml = scoreBreakdown.length ? scoreBreakdown.map(f => {
      const pct = f.max > 0 ? Math.round((Math.max(0,f.value)/f.max)*100) : 0;
      const c = pct>=70?'#22c55e':pct>=40?'#f59e0b':'#ef4444';
      return `<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:3px">
          <span style="font-size:11px;color:#475569;width:130px;flex-shrink:0">${esc(f.label)}</span>
          <div style="flex:1;background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden">
            <div style="height:100%;border-radius:99px;background:${c};width:${pct}%"></div>
          </div>
          <span style="font-size:11px;font-weight:800;color:#1e293b;width:40px;text-align:right">${f.value}/${f.max}</span>
        </div>
        ${f.reason?`<div style="font-size:9.5px;color:#94a3b8;margin-left:140px;line-height:1.4">${esc(f.reason)}</div>`:''}
      </div>`;}).join('') : '';

    const collHtml = collaterals.length ? collaterals.map((c,i)=>`
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 10px;font-size:11px">${i+1}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:600">${esc({'real_estate':'Үл хөдлөх','vehicle':'Тээврийн хэрэгсэл','account_revenue':'Дансны орлого','equipment':'Тоног төхөөрөмж','deposit':'Хадгаламж'}[c.collateralType]||c.collateralType||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.description||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.plateNumber||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.ownerName||'-')}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:800;color:#15803d;text-align:right">${fmtM(c.estimatedValue)} ₮</td>
      </tr>`).join('') : `<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px">Барьцаа байхгүй</td></tr>`;
    const projectedRevenueHtml = projectedRevenueCollaterals.length ? `
      <div style="margin-top:10px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;padding:10px">
        <div style="font-size:9px;font-weight:900;color:#003B5C;text-transform:uppercase;margin-bottom:7px">Дансны орлогын 3 жилийн төлөвлөгөө</div>
        ${projectedRevenueCollaterals.map(c => {
          const plan = c.projectedRevenueAnalysis || {};
          const rate = Number(c.projectedRevenueExchangeRate || 0);
          return `<div style="font-size:10.5px;color:#334155;margin-bottom:6px">
            <strong>${esc(plan.entityName || 'Байгууллага')}</strong> · ${esc(plan.currency || 'UNKNOWN')}${rate > 0 ? ` · 1 ${esc(plan.currency)} = ${nfmt(rate)} ₮` : ''}
            <div style="margin-top:3px">3 жилийн нийт урсгал: <strong style="color:#15803d">${esc(formatProjectedRevenueAmount(c, plan.threeYearTotalInflow))}</strong> · Сарын дундаж: <strong>${esc(formatProjectedRevenueAmount(c, plan.averageMonthlyInflow))}</strong></div>
          </div>`;
        }).join('')}
      </div>` : '';

    const gHtml = guarantors.length ? guarantors.map((g,i)=>`
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:8px 10px;font-size:11px;font-weight:600">${esc(g.name||`Батлан даагч ${i+1}`)}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(g.regNo||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(g.relationship||'-')}</td>
        <td style="padding:8px 10px;font-size:11px;color:#15803d;font-weight:700;text-align:right">${g.monthlyIncome?fmtM(g.monthlyIncome)+' ₮':'-'}</td>
        <td style="padding:8px 10px;font-size:11px;text-align:right">${esc(g.creditScore||'-')}</td>
      </tr>`).join('') : '';

    const rfHtml = riskFlags.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
      ${riskFlags.map(r=>`<span style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px">⚠ ${esc(r)}</span>`).join('')}
    </div>` : '<p style="font-size:11px;color:#94a3b8">Тэмдэглэгдсэн эрсдэл байхгүй</p>';

    const committeeDecisionMeta = {
      approved: { label: 'ЗӨВШӨӨРӨГДСӨН', hex: '#15803d', bg: '#f0fdf4', note: '' },
      disbursed: { label: 'ЗӨВШӨӨРӨГДСӨН - ОЛГОГДСОН', hex: '#15803d', bg: '#f0fdf4', note: '' },
      rejected: { label: 'ТАТГАЛЗСАН', hex: '#dc2626', bg: '#fff1f2', note: '' },
      resolved: { label: 'НӨХЦӨЛТЭЙ ЗӨВШӨӨРӨВ', hex: '#d97706', bg: '#fffbeb', note: '' },
    };
    const printDecision = committeeDecisionMeta[loan.status] || {
      label: 'ШИЙДВЭР ГАРААГҮЙ',
      hex: '#64748b',
      bg: '#f8fafc',
      note: 'Зээлийн хорооны шийдвэр хадгалагдаагүй байна.',
    };
    const decisionHex = printDecision.hex;
    const decisionLabel = printDecision.label;
    const decisionBg = printDecision.bg;
    const decisionNote = printDecision.note;
    const ai = loan.aiLoanOfficer || {};
    const aiDecision = ai.decision || {};
    const aiRisk = ai.risk || {};
    const aiLegal = ai.legal || {};
    const aiCredit = ai.credit || {};
    const aiPolicyCompliance = ai.policyCompliance || {};
    const aiPolicyChecks = Array.isArray(aiPolicyCompliance.checks) ? aiPolicyCompliance.checks : [];
    const aiStatusLabel = {
      pending: labels.statuses.pending,
      running: labels.statuses.running,
      completed: labels.statuses.completed,
      failed: labels.statuses.failed,
    }[ai.status] || labels.statuses.not_started;
    const aiRecLabel = {
      approve: labels.recLabels.approve,
      conditional: labels.recLabels.conditional,
      manual_review: labels.recLabels.manual_review,
      reject: labels.recLabels.reject,
    }[aiDecision.recommendation || aiCredit.recommendation] || '-';
    const aiGeneratedAt = ai.generatedAt ? new Date(ai.generatedAt).toLocaleString('mn-MN') : '';
    const aiConfidence = Number(aiDecision.confidence);
    const aiConfidencePct = Number.isFinite(aiConfidence) ? Math.round(aiConfidence * 100) : null;
    const aiList = (items = []) => (items || []).length
      ? `<ul style="margin:0;padding-left:14px;line-height:1.55">${items.slice(0,5).map(item => `<li style="font-size:10.5px;margin-bottom:3px">${esc(item)}</li>`).join('')}</ul>`
      : '<div style="font-size:10.5px;color:#94a3b8">-</div>';
    const aiPolicyHtml = (aiPolicyCompliance.summary || aiPolicyChecks.length) ? `
      <div style="margin-top:10px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:10px">
        <div style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:5px">${esc(labels.policyCompliance)}</div>
        ${aiPolicyCompliance.summary ? `<div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.5;margin-bottom:8px">${esc(aiPolicyCompliance.summary)}</div>` : ''}
        ${aiPolicyChecks.length ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${aiPolicyChecks.slice(0,4).map(check => `
            <div style="border:1px solid #e2e8f0;border-radius:9px;padding:8px;background:#f8fafc">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:5px">
                <div style="font-size:9px;font-weight:900;color:#475569;text-transform:uppercase">${esc(check.area || '-')}</div>
                <div style="font-size:9px;font-weight:900;color:#003B5C">${esc(check.status || '')}</div>
              </div>
              ${check.policyClause ? `<div style="font-size:9px;font-weight:800;color:#1d4ed8;margin-bottom:4px">${esc(labels.policyClause)}: ${esc(check.policyClause)}</div>` : ''}
              ${check.evidence ? `<div style="font-size:10px;color:#475569;line-height:1.45;margin-bottom:4px">${esc(labels.policyEvidence)}: ${esc(check.evidence)}</div>` : ''}
              ${check.finding ? `<div style="font-size:10.5px;font-weight:700;color:#1e293b;line-height:1.45">${esc(check.finding)}</div>` : ''}
              ${check.recommendation ? `<div style="font-size:10px;color:#64748b;line-height:1.45;margin-top:3px">${esc(check.recommendation)}</div>` : ''}
              ${check.policyRef ? `<div style="font-size:9.5px;font-weight:800;color:#003B5C;margin-top:5px">${esc(labels.policySource)}: ${esc(check.policyRef)}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
      </div>` : '';
    const aiSection = ai.status === 'completed' ? `
    <div class="section" style="border:1px solid #cbd5e1;border-radius:14px;padding:14px 16px;background:#f8fafc">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:10px;font-weight:900;color:#003B5C;text-transform:uppercase;letter-spacing:.08em">${esc(labels.cardTitle)}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px">${esc(aiGeneratedAt || ai.note || labels.defaultSubtitle)}</div>
        </div>
        <div style="font-size:10px;font-weight:900;color:#003B5C;background:#e0f2fe;border:1px solid #bae6fd;border-radius:99px;padding:4px 10px">${esc(aiStatusLabel)}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
          <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:4px">${esc(labels.risk)}</div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.45">${esc(aiRisk.summary || '-')}</div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
          <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:4px">${esc(labels.legal)}</div>
          <div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.45">${esc(aiLegal.summary || '-')}</div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
          <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:4px">${esc(labels.recommendation)}</div>
          <div style="font-size:12px;font-weight:900;color:#003B5C">${esc(aiRecLabel)}</div>
          ${aiConfidencePct != null ? `<div style="font-size:10px;color:#64748b;margin-top:3px">${esc(labels.confidence)} ${aiConfidencePct}%</div>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="border:1px solid #86efac;background:#f0fdf4;border-radius:10px;padding:10px;color:#14532d">
          <div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:5px">${esc(labels.approvalReasons)}</div>
          ${aiList(aiDecision.approvalReasons)}
        </div>
        <div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:10px;color:#92400e">
          <div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:5px">${esc(labels.conditions)}</div>
          ${aiList(aiDecision.conditionalReasons || aiCredit.conditions)}
        </div>
        <div style="border:1px solid #fca5a5;background:#fff1f2;border-radius:10px;padding:10px;color:#991b1b">
          <div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:5px">${esc(labels.rejectionRisks)}</div>
          ${aiList(aiDecision.rejectionReasons)}
        </div>
      </div>
      ${aiPolicyHtml}
      <div style="font-size:9.5px;color:#64748b;margin-top:10px">${esc(labels.disclaimer)}</div>
    </div>` : `
    <div class="section" style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#f8fafc">
      <div style="font-size:10px;font-weight:900;color:#003B5C;text-transform:uppercase;letter-spacing:.08em">${esc(labels.cardTitle)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:5px">${esc(ai.note || aiStatusLabel)}</div>
    </div>`;

    const frontSheet = outputs.frontSheet || {};
    const repaymentTypeLabel = {
      equal: 'Тэнцүү төлөлт',
      declining: 'Үндсэн төлбөр тэнцүү',
      interest_only_bullet: 'Хүү төлөөд эцэст нь үндсэн дүн',
    }[frontSheet.repaymentType || b.repaymentType] || (frontSheet.repaymentType || b.repaymentType || '-');
    const loanTerms = [
      ['Бүтээгдэхүүн', PRODUCTS[loan.selectedProduct || b.sourceProduct] || loan.selectedProduct || b.sourceProduct || '-'],
      ['Зориулалт', frontSheet.purpose || b.purpose || loan.purpose || '-'],
      ['Эргэн төлөлтийн эх үүсвэр', b.repaymentSource || loan.repaymentSource || '-'],
      ['Зээл эхлэх огноо', frontSheet.loanStartDate || b.loanStartDate || '-'],
      ['Төлөлт эхлэх огноо', frontSheet.repaymentStartDate || b.repaymentStartDate || '-'],
      ['Төлөлтийн төрөл', repaymentTypeLabel],
    ];
    const loanTermsHtml = `
    <div class="section">
      <div class="section-title">Зээлийн нөхцөл ба эх үүсвэр</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${loanTerms.map(([l,v])=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;background:#f8fafc">
          <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">${esc(l)}</div>
          <div style="font-size:11.5px;font-weight:800;color:#1e293b;line-height:1.45">${esc(v)}</div>
        </div>`).join('')}
      </div>
    </div>`;
    const insuranceHtml = (frontSheet.hasInsurance || frontSheet.insuranceAmount || ie.totalInsurance) ? `
    <div class="section">
      <div class="section-title">Даатгал ба төлөлтийн тооцоо</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${[
          ['Даатгалын дүн', fmtM(frontSheet.insuranceAmount || 0) + ' ₮'],
          ['Даатгалын горим', frontSheet.insurancePaymentMode === 'monthly' ? 'Сараар' : 'Жилээр'],
          ['Нийт даатгал', fmtM(ie.totalInsurance || 0) + ' ₮'],
          ['Сарын дундаж даатгал', fmtM(ie.averageInsuranceMonthly || 0) + ' ₮'],
        ].map(([l,v])=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:9px 10px;background:#fff">
          <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">${esc(l)}</div>
          <div style="font-size:12px;font-weight:900;color:#003B5C">${esc(v)}</div>
        </div>`).join('')}
      </div>
    </div>` : '';
    const amortizationRows = Array.isArray(outputs.amortizationRows) ? outputs.amortizationRows : [];
    const amortizationHtml = amortizationRows.length ? `
    <div class="section">
      <div class="section-title">Төлөлтийн хуваарийн товч</div>
      <table>
        <thead><tr><th>Сар</th><th>Огноо</th><th style="text-align:right">Төлбөр</th><th style="text-align:right">Үндсэн</th><th style="text-align:right">Хүү</th><th style="text-align:right">Үлдэгдэл</th></tr></thead>
        <tbody>
          ${amortizationRows.slice(0, 6).map(row => `<tr style="border-bottom:1px solid #f1f5f9">
            <td style="padding:7px 10px;font-size:10.5px;font-weight:700">${esc(row.month || row.period || '-')}</td>
            <td style="padding:7px 10px;font-size:10.5px">${esc(row.date || '-')}</td>
            <td style="padding:7px 10px;font-size:10.5px;text-align:right;font-weight:800">${fmtM(row.payment)} ₮</td>
            <td style="padding:7px 10px;font-size:10.5px;text-align:right">${fmtM(row.principal)} ₮</td>
            <td style="padding:7px 10px;font-size:10.5px;text-align:right">${fmtM(row.interest)} ₮</td>
            <td style="padding:7px 10px;font-size:10.5px;text-align:right">${fmtM(row.closingBalance ?? row.balance)} ₮</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="font-size:10px;color:#64748b;margin-top:6px">Эхний ${Math.min(6, amortizationRows.length)} сар харуулав. Нийт хугацаа: ${esc(frontSheet.termMonths || b.termMonths || amortizationRows.length)} сар.</div>
    </div>` : '';
    const compliance = loan.complianceReview || {};
    const complianceChecks = Array.isArray(compliance.checks) ? compliance.checks : [];
    const complianceActions = Array.isArray(compliance.requiredActions) ? compliance.requiredActions : [];
    const complianceMissing = Array.isArray(compliance.missingDocuments) ? compliance.missingDocuments : [];
    const complianceSources = Array.isArray(compliance.policySources) ? compliance.policySources : [];
    const complianceOverall = complianceLabels.overall?.[compliance.overallStatus] || compliance.overallStatus || '-';
    const complianceStatus = complianceLabels.statuses?.[compliance.status] || compliance.status || complianceLabels.statuses?.not_started || '-';
    const complianceSection = `
    <div class="section" style="border:1px solid #cbd5e1;border-radius:14px;padding:14px 16px;background:#f8fafc">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px">
        <div>
          <div style="font-size:10px;font-weight:900;color:#003B5C;text-transform:uppercase;letter-spacing:.08em">${esc(complianceLabels.cardTitle)}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px">${esc(compliance.generatedAt ? new Date(compliance.generatedAt).toLocaleString('mn-MN') : (compliance.note || complianceLabels.defaultSubtitle))}</div>
        </div>
        <div style="font-size:10px;font-weight:900;color:#0f766e;background:#ccfbf1;border:1px solid #99f6e4;border-radius:99px;padding:4px 10px">${esc(complianceStatus)}</div>
      </div>
      <div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:10px;margin-bottom:10px">
        <div style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:4px">${esc(complianceLabels.summary)}</div>
        <div style="font-size:11.5px;font-weight:800;color:#1e293b;line-height:1.55">${esc(compliance.summary || compliance.note || complianceLabels.noReview)}</div>
        <div style="font-size:10px;font-weight:900;color:#003B5C;margin-top:5px">${esc(complianceOverall)}</div>
      </div>
      ${complianceChecks.length ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
        ${complianceChecks.slice(0,4).map(check => `<div style="border:1px solid #e2e8f0;border-radius:9px;padding:8px;background:#fff">
          <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
            <div style="font-size:9px;font-weight:900;color:#475569;text-transform:uppercase">${esc(check.area || '-')}</div>
            <div style="font-size:9px;font-weight:900;color:#64748b">${esc(check.severity || check.status || '')}</div>
          </div>
          <div style="font-size:10.5px;font-weight:800;color:#1e293b;line-height:1.45">${esc(check.finding || '-')}</div>
          ${check.policyClause ? `<div style="font-size:9.5px;color:#003B5C;font-weight:800;margin-top:4px">${esc(complianceLabels.policyClause)}: ${esc(check.policyClause)}</div>` : ''}
          ${check.recommendation ? `<div style="font-size:9.5px;color:#64748b;line-height:1.4;margin-top:3px">${esc(check.recommendation)}</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        <div style="border:1px solid #e2e8f0;border-radius:9px;padding:8px;background:#fff">
          <div style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:5px">${esc(complianceLabels.requiredActions)}</div>
          ${aiList(complianceActions)}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:9px;padding:8px;background:#fff">
          <div style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:5px">${esc(complianceLabels.missingDocuments)}</div>
          ${aiList(complianceMissing)}
        </div>
      </div>
      ${complianceSources.length ? `<div style="font-size:9.5px;color:#64748b;margin-top:8px">${esc(complianceLabels.source)}: ${esc(complianceSources.slice(0,3).map(p => p.title).join(', '))}${complianceSources.length > 3 ? ` +${complianceSources.length - 3}` : ''}</div>` : ''}
      ${compliance.disclaimer ? `<div style="font-size:9.5px;color:#64748b;margin-top:8px">${esc(compliance.disclaimer)}</div>` : ''}
    </div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Зээлийн хорооны дүгнэлт — ${esc(displayName)}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff;font-size:12px}
      @page{size:A4;margin:18mm 16mm}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      .page{max-width:780px;margin:0 auto;padding:0}
      .section{margin-bottom:20px}
      .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b;border-bottom:2px solid #e2e8f0;padding-bottom:5px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th{background:#f8fafc;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0}
      .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:6px}
      .verdict{display:inline-block;padding:4px 14px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;border:2px solid ${decisionHex};color:${decisionHex};background:${decisionBg}}
    </style></head><body><div class="page">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #003B5C">
      <div>
        <div style="font-size:9px;font-weight:800;color:#00A651;text-transform:uppercase;letter-spacing:.15em;margin-bottom:2px">Solongo Capital</div>
        <div style="font-size:20px;font-weight:900;color:#003B5C;line-height:1.1">Зээлийн хорооны дүгнэлт</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Огноо: ${today}</div>
      </div>
      <div style="text-align:right">
        <div class="verdict">${decisionLabel}</div>
        ${decisionNote?`<div style="font-size:10px;color:#64748b;margin-top:6px;max-width:200px;text-align:right">${esc(decisionNote)}</div>`:''}
        ${loan.approvalNote?`<div style="font-size:10px;color:#64748b;margin-top:6px;max-width:200px;text-align:right">${esc(loan.approvalNote)}</div>`:''}
      </div>
    </div>

    <!-- BORROWER HERO -->
    <div style="display:flex;gap:16px;align-items:center;background:#f8fafc;border:2px solid #003B5C;border-radius:14px;padding:16px 20px;margin-bottom:20px">
      <div style="width:72px;height:72px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:${gradeHex};background:${gradeHex}18;flex-shrink:0">${esc(grade)}</div>
      <div style="flex:1">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">Зээлдэгч</div>
        <div style="font-size:18px;font-weight:900;color:#003B5C">${esc(displayName)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px">
          ${b.regNo?`РД: ${esc(b.regNo)} &nbsp;·&nbsp; `:''}
          ${b.requestedAmount?`${fmtM(b.requestedAmount)} ₮`:''}
          ${b.termMonths?` · ${b.termMonths} сар`:''}
          ${b.monthlyRate?` · ${b.monthlyRate}% сарын хүү`:''}
        </div>
        ${b.analystDecision?`<div style="margin-top:6px;font-size:10px;font-weight:700;color:#003B5C">Ажилтны санал: ${esc(ANALYST_DECISION_LABELS[b.analystDecision]||b.analystDecision)}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Нийт оноо</div>
        <div style="font-size:48px;font-weight:900;color:${scoreHex};line-height:1">${score}</div>
        <div style="font-size:10px;color:#94a3b8">/100</div>
      </div>
    </div>

    ${aiSection}
    ${complianceSection}
    ${loanTermsHtml}

    <!-- KPI -->
    <div class="section">
      <div class="section-title">Шийдвэрийн шалгуур үзүүлэлт</div>
      <div class="kpi-grid">${kpiHtml}</div>
      <div style="font-size:10px;color:#64748b;margin-top:6px">${passCount}/${kpis.length} шалгуур хангасан · Автомат үнэлгээ: <strong>${autoVerdict==='approve'?'Олгоход тохиромжтой':autoVerdict==='conditional'?'Нөхцөлтэй зөвшөөрөл':'Эрсдэлтэй — татгалзах санал'}</strong></div>
    </div>

    <!-- INCOME -->
    <div class="section">
      <div class="section-title">Орлого / Зарлагын шинжилгээ</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[
          ['Сарын орлого', fmtM(ie.income)+' ₮', '#15803d'],
          ['Сарын зарлага', fmtM(ie.cost)+' ₮', '#dc2626'],
          ['Бусад зээлийн төлбөр', fmtM(ie.monthlyDebt)+' ₮', '#dc2626'],
          ['Шинэ зээлийн төлбөр', fmtM(ie.monthlyPayment)+' ₮', '#dc2626'],
          ['Чөлөөт урсгал (FCF)', fmtM(ie.freeCashFlow)+' ₮', (ie.freeCashFlow||0)>0?'#15803d':'#dc2626'],
          ['DTI харьцаа', ((ie.dti||0).toFixed(1))+'%', (ie.dti||0)<=40?'#15803d':(ie.dti||0)<=55?'#d97706':'#dc2626'],
        ].map(([l,v,c])=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px">${esc(l)}</div>
          <div style="font-size:14px;font-weight:900;color:${c}">${esc(v)}</div>
        </div>`).join('')}
      </div>
    </div>
    ${insuranceHtml}
    ${amortizationHtml}

    <!-- COLLATERAL -->
    <div class="section">
      <div class="section-title">Барьцаа хөрөнгө ${col.combinedValue?`· Нийлсэн: ${fmtM(col.combinedValue)} ₮`:col.totalValue?`· Нийт: ${fmtM(col.totalValue)} ₮`:''}${col.combinedValue && b.requestedAmount?` · LTV: ${(Number(b.requestedAmount || 0) / Number(col.combinedValue || 1) * 100).toFixed(1)}%`:col.ltvRatio!=null?` · LTV: ${col.ltvRatio.toFixed(1)}%`:''}</div>
      <table><thead><tr><th>#</th><th>Төрөл</th><th>Тайлбар</th><th>Дугаар</th><th>Өмчлөгч</th><th style="text-align:right">Үнэлгээ</th></tr></thead>
      <tbody>${collHtml}</tbody></table>
      ${col.guarantorCollateralValue ? `<div style="font-size:10.5px;color:#64748b;margin-top:6px">Батлан даагчийн барьцаа: <strong>${fmtM(col.guarantorCollateralValue)} ₮</strong></div>` : ''}
      ${projectedRevenueHtml}
    </div>

    ${guarantors.length?`<!-- GUARANTORS -->
    <div class="section">
      <div class="section-title">Батлан даагч (${guarantors.length})</div>
      <table><thead><tr><th>Нэр</th><th>РД</th><th>Холбоо</th><th style="text-align:right">Сарын орлого</th><th style="text-align:right">Кредит скор</th></tr></thead>
      <tbody>${gHtml}</tbody></table>
    </div>`:''}

    <!-- SCORE BREAKDOWN -->
    ${scoreBreakdown.length?`<div class="section">
      <div class="section-title">Онооны задаргаа</div>
      ${sbHtml}
    </div>`:''}

    <!-- RISK FLAGS -->
    <div class="section">
      <div class="section-title">Эрсдэлийн дохио</div>
      ${rfHtml}
    </div>

    <!-- ANALYST OPINION -->
    ${b.analystOpinion||b.conditions?`<div class="section">
      <div class="section-title">Ажилтны дүгнэлт</div>
      ${b.analystOpinion?`<p style="font-size:12px;line-height:1.7;color:#334155;white-space:pre-wrap;margin-bottom:8px">${esc(b.analystOpinion)}</p>`:''}
      ${b.conditions?`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px">
        <div style="font-size:10px;font-weight:700;color:#14532d;margin-bottom:2px">Нөхцөл</div>
        <div style="font-size:11px;color:#166534">${esc(b.conditions)}</div>
      </div>`:''}
    </div>`:''}

    <!-- COMMITTEE DECISION -->
    <div class="section" style="border:2px solid #003B5C;border-radius:14px;padding:18px 20px">
      <div class="section-title" style="color:#003B5C;border-bottom-color:#003B5C">Зээлийн хорооны шийдвэр</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:22px;font-weight:900;color:${decisionHex}">${decisionLabel}</div>
          ${decisionNote?`<div style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.6">${esc(decisionNote)}</div>`:''}
          ${loan.approvalNote?`<div style="font-size:12px;color:#475569;margin-top:6px;line-height:1.6">${esc(loan.approvalNote)}</div>`:''}
        </div>
        <div style="font-size:11px;color:#94a3b8">Огноо: ${today}</div>
      </div>
    </div>

    <!-- SIGNATURES -->
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
      ${['Зээлийн ажилтан','Хорооны гишүүн','Хорооны дарга'].map(r=>`
        <div style="text-align:center">
          <div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#64748b;font-weight:600">${r}</div>
          <div style="font-size:9px;color:#cbd5e1;margin-top:2px">Гарын үсэг / огноо</div>
        </div>`).join('')}
    </div>

    </div></body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <LoanHeader loan={loan} />
        <div className="flex items-center gap-2">
          {latestResearch && (
            <button onClick={printCommittee}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all">
              <Printer size={15} /> Хэвлэх
            </button>
          )}
          <button onClick={onGoAssessment}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#003B5C] text-[#003B5C] rounded-xl text-sm font-bold hover:bg-blue-50 transition-all">
            ← Судалгаа харах
          </button>
        </div>
      </div>

      <div ref={printContentRef} className="space-y-5">
      {/* Hero — grade + score + borrower */}
      <AiLoanOfficerCard loan={loan} labels={labels} onRun={onRunAi} loading={aiLoading} />
      <ComplianceReviewCard
        loan={loan}
        labels={complianceLabels}
        onRun={onRunCompliance}
        loading={complianceLoading}
      />

      <div className="bg-white border-2 border-[#003B5C] rounded-2xl p-5 flex items-center gap-5">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0 ${gradeColor}`}>
          {grade}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-0.5">Зээлийн судалгааны дүгнэлт</p>
          <p className="font-black text-xl text-[#003B5C] truncate">{displayName}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {b.requestedAmount ? nfmt(b.requestedAmount) + ' ₮' : ''}
            {b.termMonths ? ` · ${b.termMonths} сар` : ''}
            {b.monthlyRate ? ` · ${b.monthlyRate}% сар` : ''}
          </p>
          {b.analystDecision && (
            <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border ${b.analystDecision === 'approve' ? 'bg-green-50 border-green-300 text-green-700' : b.analystDecision === 'reject' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>
              <UserCheck size={12} /> Ажилтны санал: {ANALYST_DECISION_LABELS[b.analystDecision] || b.analystDecision}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Нийт оноо</p>
          <p className={`text-5xl font-black ${scoreColor}`}>{score}</p>
          <p className="text-xs text-slate-400 mt-0.5">/100 оноо</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className={`grid grid-cols-2 ${financial ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-3`}>
        {kpis.map(k => (
          <div key={k.detail} className={`border-2 rounded-2xl p-4 text-center flex flex-col items-center gap-1 ${k.pass ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{k.detail}</p>
            <p className={`text-lg font-black leading-tight ${k.pass ? 'text-green-700' : 'text-red-600'}`}>{k.display}</p>
            <p className="text-[11px] font-semibold text-slate-500">{k.label}</p>
            {k.pass
              ? <CheckCircle2 size={14} className="text-green-500 mt-0.5" />
              : <XCircle size={14} className="text-red-500 mt-0.5" />}
          </div>
        ))}
      </div>

      {/* Auto verdict */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border-2 text-sm font-bold ${verdictStyle}`}>
        {autoVerdict === 'approve' ? <ThumbsUp size={18} /> : autoVerdict === 'conditional' ? <AlertCircle size={18} /> : <ThumbsDown size={18} />}
        Автомат үнэлгээ ({passCount}/{kpis.length} шалгуур хангасан):&nbsp;
        {decisionSummary}
      </div>

      {/* AI decision engine */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-[#020309] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(82,76,202,0.35),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(2,119,55,0.24),_transparent_30%)]" />
        <div className="relative grid gap-5 p-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#9BB2C1]">
                  <Sparkles size={14} className="text-[#524CCA]" /> {labels.decisionEngine}
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-normal text-white">{aiDecisionMn}</h3>
                <p className="mt-1 text-sm font-semibold text-[#9BB2C1]">{aiDecisionLabel} · {labels.preview}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 text-right ${decisionTone}`}>
                <p className="text-[10px] font-black uppercase tracking-wide opacity-80">Confidence</p>
                <p className="text-2xl font-black leading-none">{confidence}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Risk score', value: `${score}/100` },
                { label: labels.decisionFactors, value: factorContributions.length },
                { label: 'Policy checks', value: `${passCount}/${kpis.length}` },
                { label: labels.processing, value: labels.realTime },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#9BB2C1]">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#9BB2C1]">{labels.decisionRationale}</p>
              <p className="text-sm font-semibold leading-6 text-slate-200">{decisionSummary}</p>
              {autoVerdict === 'conditional' && (
                <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-amber-200">{labels.conditions}</p>
                  <ul className="space-y-1.5 text-xs font-semibold leading-5 text-amber-50">
                    {conditionItems.slice(0, 5).map((item, idx) => <li key={idx}>- {item}</li>)}
                  </ul>
                </div>
              )}
              {autoVerdict === 'approve' && (
                <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-emerald-200">{labels.approvalReasons}</p>
                  <ul className="space-y-1.5 text-xs font-semibold leading-5 text-emerald-50">
                    {approvalReasons.slice(0, 5).map((item, idx) => <li key={idx}>- {item}</li>)}
                  </ul>
                </div>
              )}
              {autoVerdict === 'reject' && (
                <div className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-3">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-red-200">{labels.rejectionRisks}</p>
                  <ul className="space-y-1.5 text-xs font-semibold leading-5 text-red-50">
                    {(rejectionReasons.length ? rejectionReasons : failedKpis.map(k => `${k.label} шалгуур хангагдаагүй.`)).slice(0, 5).map((item, idx) => <li key={idx}>- {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#9BB2C1]">
                <Activity size={14} /> Factor contribution
              </p>
              <div className="space-y-3">
                {factorContributions.map(item => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-200">{item.label}</span>
                      <span className={item.positive ? 'text-emerald-300' : 'text-red-300'}>{item.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${item.positive ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#9BB2C1]">Reasoning trail</p>
              <div className="space-y-2">
                {reasoningSteps.map((step, idx) => (
                  <div key={step} className="flex gap-3 text-xs font-semibold text-slate-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0C20DF] text-[10px] font-black text-white">{idx + 1}</span>
                    <span className="leading-5">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income / Collateral row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Income & Expense */}
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <BarChart2 size={13} /> Орлого / Зарлагын шинжилгээ
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Сарын орлого', value: nfmt(ie.income) + ' ₮', cls: 'text-green-700' },
              { label: 'Сарын зарлага', value: nfmt(ie.cost) + ' ₮', cls: 'text-red-600' },
              { label: 'Бусад зээлийн төлбөр', value: nfmt(ie.monthlyDebt) + ' ₮', cls: 'text-red-600' },
              { label: 'Шинэ зээлийн төлбөр', value: nfmt(ie.monthlyPayment) + ' ₮', cls: 'text-red-600' },
              { label: 'Чөлөөт урсгал (FCF)', value: nfmt(ie.freeCashFlow) + ' ₮', cls: (ie.freeCashFlow || 0) > 0 ? 'text-green-700' : 'text-red-600' },
              { label: 'DTI харьцаа', value: `${(ie.dti || 0).toFixed(1)}%`, cls: (ie.dti || 0) <= 40 ? 'text-green-700' : (ie.dti || 0) <= 55 ? 'text-amber-600' : 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="border rounded-xl p-2.5 bg-slate-50">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{item.label}</p>
                <p className={`font-black text-sm ${item.cls}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Collateral */}
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <Home size={13} /> Барьцаа хөрөнгө
          </p>
          {collaterals.length > 0 ? (
            <div className="space-y-2">
              {collaterals.map((c, i) => (
                <div key={i} className="border rounded-xl p-3 bg-slate-50 text-xs space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#003B5C]">
                      {{ real_estate: 'Үл хөдлөх', vehicle: 'Тээврийн хэрэгсэл', account_revenue: 'Дансны орлого', equipment: 'Тоног төхөөрөмж', deposit: 'Хадгаламж' }[c.collateralType] || c.collateralType || 'Барьцаа'}
                    </span>
                    <span className="font-black text-green-700">{nfmt(c.estimatedValue)} ₮</span>
                  </div>
                  {c.description && <p className="text-slate-500">{c.description}</p>}
                  {c.collateralType === 'account_revenue' && c.projectedRevenueAnalysis && (
                    <div className="mt-2 border-t pt-2 space-y-1 text-slate-600">
                      <p>3 жилийн нийт урсгал: <b className="text-green-700">{formatProjectedRevenueAmount(c, c.projectedRevenueAnalysis.threeYearTotalInflow)}</b></p>
                      <p>Сарын дундаж: <b>{formatProjectedRevenueAmount(c, c.projectedRevenueAnalysis.averageMonthlyInflow)}</b></p>
                      {Number(c.projectedRevenueExchangeRate || 0) > 0 && <p>Ханш: 1 {c.projectedRevenueAnalysis.currency} = {nfmt(c.projectedRevenueExchangeRate)} ₮</p>}
                      {Array.isArray(c.projectedRevenueAnalysis.planYears) && c.projectedRevenueAnalysis.planYears.length > 0 && (
                        <table className="w-full mt-2 text-[11px]">
                          <thead><tr className="text-slate-400"><th className="text-left">Он</th><th className="text-right">Дансаар орох урсгал</th></tr></thead>
                          <tbody>
                            {c.projectedRevenueAnalysis.planYears.map((year, yearIndex) => (
                              <tr key={`${year.year}-${yearIndex}`} className="border-t border-slate-200">
                                <td className="py-1">{year.year || '—'}</td>
                                <td className="py-1 text-right font-bold text-green-700">{formatProjectedRevenueAmount(c, year.bankAccountInflow)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                  {c.plateNumber && <p className="text-slate-500">Дугаар: {c.plateNumber}</p>}
                  {c.ownerName && <p className="text-slate-400">Өмчлөгч: {c.ownerName}{c.ownerRelation ? ` (${c.ownerRelation})` : ''}</p>}
                </div>
              ))}
              <div className="flex justify-between text-xs font-black pt-1 border-t">
                <span className="text-slate-500">Нийт үнэлгээ</span>
                <span className="text-[#003B5C]">{nfmt(col.totalValue)} ₮</span>
              </div>
              {col.ltvRatio != null && (
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-500">LTV харьцаа</span>
                  <span className={col.ltvRatio <= 80 ? 'text-green-700' : 'text-red-600'}>{col.ltvRatio.toFixed(1)}%</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">Барьцаа хөрөнгө байхгүй</p>
          )}
        </div>
      </div>

      {financial && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <BarChart2 size={13} /> Санхүүгийн тайлангийн шинжилгээ
          </p>
          <p className="text-xs text-slate-500">
            {financial.entityName || 'Байгууллага'} · {financial.periodStart || financial.reportingDate || '—'}{financial.periodEnd ? ` - ${financial.periodEnd}` : ''} · {financialCurrency}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              ['Нийт хөрөнгө', financialBalance.totalAssets],
              ['Нийт өр төлбөр', financialBalance.totalLiabilities],
              ['Эздийн өмч', financialBalance.equity],
              ['Цэвэр ашиг', financialIncome.netProfit],
            ].map(([label, value]) => (
              <div key={label} className="border rounded-xl p-3 bg-slate-50">
                <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                <p className={`text-sm font-black ${label === 'Цэвэр ашиг' && Number(value) < 0 ? 'text-red-600' : 'text-[#003B5C]'}`}>{formatFinancialAmount(value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Current ratio: <b>{Number(financialRatios.currentRatio || 0).toFixed(2)}</b> · Debt / Equity: <b>{Number(financialRatios.debtToEquity || 0).toFixed(2)}</b>
          </p>
          {financial.analysis && <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{financial.analysis}</p>}
          {financial.riskFlags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {financial.riskFlags.map((risk, index) => <span key={index} className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-2.5 py-1 text-xs font-semibold">{risk}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Score breakdown */}
      {scoreBreakdown.length > 0 && (
        <div className="bg-white border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold uppercase text-slate-500">Онооны задаргаа</p>
          <div className="space-y-3">
            {scoreBreakdown.map(f => {
              const pct = f.max > 0 ? Math.round((Math.max(0, f.value) / f.max) * 100) : 0;
              const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={f.label}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-slate-600 w-36 shrink-0">{f.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-700 w-12 text-right shrink-0">{f.value}/{f.max}</span>
                  </div>
                  {f.reason && <p className="text-[10px] text-slate-400 ml-[9.5rem] leading-snug">{f.reason}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guarantors */}
      {guarantors.length > 0 && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <Users size={13} /> Батлан даагч ({guarantors.length})
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {guarantors.map((g, i) => (
              <div key={i} className="border rounded-xl p-3 bg-slate-50 text-xs space-y-1">
                <p className="font-bold text-[#003B5C]">{g.name || `Батлан даагч ${i + 1}`}</p>
                {g.regNo && <p className="text-slate-500">РД: {g.regNo}</p>}
                {g.phone && <p className="text-slate-500">Утас: {g.phone}</p>}
                {g.relationship && <p className="text-slate-400">Холбоо: {g.relationship}</p>}
                {g.monthlyIncome && <p className="text-green-700 font-bold">Сарын орлого: {nfmt(g.monthlyIncome)} ₮</p>}
                {g.creditScore && <p className="text-[#003B5C] font-bold">Кредит скор: {g.creditScore}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk flags */}
      {riskFlags.length > 0 && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <AlertCircle size={13} className="text-red-500" /> Эрсдэлийн дохио ({riskFlags.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {riskFlags.map(r => (
              <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                <AlertCircle size={11} /> {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analyst opinion */}
      {(b.analystOpinion || b.conditions) && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
            <FileText size={13} /> Ажилтны дүгнэлт
          </p>
          {b.analystOpinion && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{b.analystOpinion}</p>
          )}
          {b.conditions && (
            <div className="bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-600">
              <span className="font-bold text-[#003B5C] block mb-1">Нөхцөл:</span>
              {b.conditions}
            </div>
          )}
        </div>
      )}

      {/* Committee decision */}
      <div className="bg-white border-2 border-[#003B5C] rounded-2xl p-5 space-y-4">
        <p className="text-sm font-black text-[#003B5C] flex items-center gap-2">
          <BadgeCheck size={16} /> Зээлийн хорооны шийдвэр
        </p>

        {isDecided ? (
          <div className="space-y-4">
            {/* Decision result banner */}
            <div className={`flex items-center gap-4 p-5 border-2 rounded-2xl ${decidedMeta.cls}`}>
              <div className="shrink-0">{decidedMeta.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base">{decidedMeta.label}</p>
                {loan.approvalNote && (
                  <p className="text-sm font-normal mt-0.5 opacity-80 leading-snug">{loan.approvalNote}</p>
                )}
              </div>
            </div>

            {/* Re-decide — not available after disbursement */}
            {loan.status !== 'disbursed' && canDecide.revert && (
              revertMode ? (
                <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Дахин шийдэх шалтгаан</p>
                  <textarea
                    rows={3}
                    value={revertReason}
                    onChange={e => setRevertReason(e.target.value)}
                    placeholder="Шийдвэрийг цуцлах шалтгаанаа бичнэ үү..."
                    className="w-full p-3 border border-amber-300 rounded-xl text-sm bg-white focus:outline-none focus:border-[#003B5C] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRevert}
                      disabled={reverting || !revertReason.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#003B5C] text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-[#002d47] transition-all"
                    >
                      {reverting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Цуцлаж, хүсэлт рүү буцаах
                    </button>
                    <button
                      onClick={() => { setRevertMode(false); setRevertReason(''); }}
                      className="px-4 py-2.5 border rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Болих
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRevertMode(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C] transition-all"
                >
                  <RotateCcw size={14} /> Дахин шийдэх
                </button>
              )
            )}
          </div>
        ) : !hasAnyDecisionPermission ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Танд зээлийн хорооны шийдвэр гаргах эрх байхгүй байна.
          </div>
        ) : (
          <>
            <textarea
              rows={3}
              value={approvalNote}
              onChange={e => setApprovalNote(e.target.value)}
              placeholder="Шийдвэрийн тайлбар, нөхцөл болон тэмдэглэл..."
              className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"
            />
            <div className="grid gap-3 md:grid-cols-3">
              {canDecide.approve && (
              <button
                onClick={() => makeDecision('approve')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                Зөвшөөрөх
              </button>
              )}
              {canDecide.conditional && (
              <button
                onClick={() => makeDecision('conditional')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                Нөхцөлтэй
              </button>
              )}
              {canDecide.reject && (
              <button
                onClick={() => makeDecision('reject')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-sm shadow-md hover:shadow-lg transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
                Татгалзах
              </button>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default LoanOrigination;
