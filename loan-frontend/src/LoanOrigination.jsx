import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  AlertCircle, BadgeCheck, BarChart2, CheckCircle2, ChevronRight,
  ClipboardList, CreditCard, Eye, FileText, Loader2,
  Plus, Printer, RotateCcw, ThumbsDown, ThumbsUp, User,
  UserCheck, X, XCircle, Home, Users,
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

const PRODUCTS = {
  biz_loan: 'Бизнесийн зээл', car_purchase_loan: 'Автомашин худалдан авах',
  car_coll_loan: 'Автомашин барьцаалсан', cons_loan: 'Хэрэглээний зээл',
  credit_card: 'Кредит карт', re_loan: 'Үл хөдлөх барьцаалсан', line_loan: 'Шугмын зээл',
};


const fmt = (v) => new Intl.NumberFormat('mn-MN').format(v || 0) + ' ₮';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('mn-MN') : '-';
const borrowerName = (r) => r?.userType === 'organization'
  ? (r.orgName || '-') : [r?.lastname, r?.firstname].filter(Boolean).join(' ') || '-';

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status || 'Шинэ', color: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${m.color}`}>{m.label}</span>;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LoanOrigination = ({ apiUrl, user, requests = [], onRequestsChange, usersList = [] }) => {
  const [activeStep, setActiveStep] = useState('application');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [applicationView, setApplicationView] = useState('requests');

  // Tab 1 state
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [viewLoan, setViewLoan] = useState(null); // modal-д харуулах зээл

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

  const selectAndGo = (loan, step) => {
    setApplicationView('requests');
    setSelectedLoan(loan);
    setActiveStep(step || 'application');
  };

  // ── Committee decision ────────────────────
  const makeDecision = async (decision) => {
    if (!selectedLoan) return;
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
  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

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

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A651]">Зээлийн үйл явц</p>
          <h2 className="text-2xl font-bold text-[#003B5C]">Loan Origination System</h2>
        </div>
        {selectedLoan && (
          <div className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2 text-sm">
            <User size={15} className="text-[#003B5C]" />
            <span className="font-black text-[#003B5C]">{borrowerName(selectedLoan)}</span>
            <StatusBadge status={selectedLoan.status} />
            <button onClick={() => { setSelectedLoan(null); setActiveStep('application'); }}
              className="ml-2 text-slate-400 hover:text-red-500"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Step nav */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto">
          {LOS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === step.key;
            const isDone = selectedLoan && LOS_STEPS.findIndex(s => s.key === activeStep) > idx;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={`flex-1 min-w-[120px] flex flex-col items-center gap-1 py-4 px-2 border-b-2 text-xs font-bold transition-all relative ${
                  isActive
                    ? 'border-[#003B5C] text-[#003B5C] bg-blue-50'
                    : isDone
                      ? 'border-[#00A651] text-[#00A651] bg-green-50'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  isActive ? 'bg-[#003B5C] text-white' : isDone ? 'bg-[#00A651] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {isDone ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <span className="leading-tight text-center">{step.label}</span>
                {idx < LOS_STEPS.length - 1 && (
                  <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300" />
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
          <div className="bg-white border rounded-2xl p-2 inline-flex gap-2">
            <button
              onClick={() => setApplicationView('requests')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                applicationView === 'requests'
                  ? 'bg-[#003B5C] text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Loan requests
            </button>
            <button
              onClick={() => {
                setApplicationView('exposure');
                setSelectedLoan(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                applicationView === 'exposure'
                  ? 'bg-[#003B5C] text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Exposure monitor
            </button>
          </div>

          {applicationView === 'exposure' ? (
            <LoanExposureMonitor apiUrl={apiUrl} usersList={usersList} />
          ) : (
            <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'Бүгд' },
                { value: 'pending', label: 'Онлайн' },
                { value: 'created', label: 'Ажилтан үүсгэсэн' },
                { value: 'assigned', label: 'Хариуцагч томилогдсон' },
                { value: 'approved', label: 'Зөвшөөрөгдсөн' },
                { value: 'rejected', label: 'Татгалзсан' },
                { value: 'disbursed', label: 'Олгосон' },
              ].map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    statusFilter === f.value ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewForm(v => !v)}
              className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-sm">
              <Plus size={15} /> Шинэ хүсэлт үүсгэх
            </button>
          </div>

          {/* New loan form — full application detail */}
          {showNewForm && (
            <div className="bg-white border-2 border-[#003B5C] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#003B5C] text-base">Шинэ зээлийн хүсэлт үүсгэх</h4>
                <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
              </div>
              <LoanApplicationDetail
                loan={null}
                apiUrl={apiUrl}
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
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3 text-left">Огноо</th>
                    <th className="p-3 text-left">Нэр</th>
                    <th className="p-3 text-left">Зээлийн төрөл</th>
                    <th className="p-3 text-right">Дүн</th>
                    <th className="p-3 text-center">Статус</th>
                    <th className="p-3 text-left">Хариуцагч</th>
                    <th className="p-3 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRequests.map(req => (
                    <tr key={req._id} className={`hover:bg-slate-50 cursor-pointer ${selectedLoan?._id === req._id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedLoan(req)}>
                      <td className="p-3 text-slate-500 text-xs">{fmtDate(req.createdAt)}</td>
                      <td className="p-3 font-semibold text-[#003B5C]">
                        {borrowerName(req)}
                        {req.source === 'web' && !req.createdByStaff && (
                          <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">ВЭБ</span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                          {PRODUCTS[req.selectedProduct] || req.selectedProduct || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">{fmt(req.amount)}</td>
                      <td className="p-3 text-center"><StatusBadge status={req.status} /></td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={req.assignee?.userId || ''}
                          onChange={e => {
                            const u = usersList.find(u => u._id === e.target.value);
                            if (u) assignUser(req, u._id, u.name);
                          }}
                          className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#003B5C] max-w-[140px]"
                        >
                          <option value="">— сонгох —</option>
                          {usersList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                        {req.assignee?.name && (
                          <span className="block text-[11px] text-[#003B5C] font-bold mt-0.5">{req.assignee.name}</span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewLoan(req)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200" title="Харилцагчийн дэлгэрэнгүй">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => selectAndGo(req, 'assessment')}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100" title="Зээлийн үнэлгээ">
                            <BarChart2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredRequests.length && (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400">Хүсэлт байхгүй байна.</td></tr>
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
                className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-sm">
                <BadgeCheck size={15} /> Зээлийн хороо руу шилжих
              </button>
            </div>
            <LoanResearch
              apiUrl={apiUrl}
              prefillRequest={researchSeed}
              studyRequests={requests.filter(r => ['studying','assessment','assigned'].includes(r.status))}
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
            onGoAssessment={() => setActiveStep('assessment')}
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
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700">
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


// ─────────────────────────────────────────────
// COMMITTEE PANEL
// ─────────────────────────────────────────────
const ANALYST_DECISION_LABELS = {
  approve: 'Зөвшөөрөх',
  conditional: 'Нөхцөлтэй зөвшөөрөх',
  reject: 'Татгалзах',
};

const CommitteePanel = ({ loan, latestResearch, loadingResearch, approvalNote, setApprovalNote, savingDecision, makeDecision, revertDecision, onGoAssessment }) => {
  const nfmt = v => new Intl.NumberFormat('mn-MN').format(Math.round(v || 0));
  const [revertMode, setRevertMode] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);

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
  const collaterals = b.collaterals || [];
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
  ];
  const passCount = kpis.filter(k => k.pass).length;
  const autoVerdict = passCount >= 4 ? 'approve' : passCount >= 2 ? 'conditional' : 'reject';
  const verdictStyle = { approve: 'bg-green-50 border-green-300 text-green-700', conditional: 'bg-amber-50 border-amber-300 text-amber-700', reject: 'bg-red-50 border-red-300 text-red-700' }[autoVerdict];

  const isDecided = ['approved', 'rejected', 'resolved', 'disbursed'].includes(loan.status);

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
        <td style="padding:8px 10px;font-size:11px;font-weight:600">${esc({'real_estate':'Үл хөдлөх','vehicle':'Тээврийн хэрэгсэл','equipment':'Тоног төхөөрөмж','deposit':'Хадгаламж'}[c.collateralType]||c.collateralType||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.description||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.plateNumber||'-')}</td>
        <td style="padding:8px 10px;font-size:11px">${esc(c.ownerName||'-')}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:800;color:#15803d;text-align:right">${fmtM(c.estimatedValue)} ₮</td>
      </tr>`).join('') : `<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px">Барьцаа байхгүй</td></tr>`;

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

    const decisionHex = ['approved','disbursed'].includes(loan.status)?'#15803d':loan.status==='rejected'?'#dc2626':'#d97706';
    const decisionLabel = ['approved','disbursed'].includes(loan.status)?'ЗӨВШӨӨРӨГДСӨН':loan.status==='rejected'?'ТАТГАЛЗСАН':'НӨХЦӨЛТЭЙ ЗӨВШӨӨРӨВ';

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
      .verdict{display:inline-block;padding:4px 14px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;border:2px solid ${decisionHex};color:${decisionHex};background:${ ['approved','disbursed'].includes(loan.status)?'#f0fdf4':loan.status==='rejected'?'#fff1f2':'#fffbeb'}}
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

    <!-- COLLATERAL -->
    <div class="section">
      <div class="section-title">Барьцаа хөрөнгө ${col.totalValue?`· Нийт: ${fmtM(col.totalValue)} ₮`:''}${col.ltvRatio!=null?` · LTV: ${col.ltvRatio.toFixed(1)}%`:''}</div>
      <table><thead><tr><th>#</th><th>Төрөл</th><th>Тайлбар</th><th>Дугаар</th><th>Өмчлөгч</th><th style="text-align:right">Үнэлгээ</th></tr></thead>
      <tbody>${collHtml}</tbody></table>
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
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Printer size={15} /> Хэвлэх
            </button>
          )}
          <button onClick={onGoAssessment}
            className="text-sm font-bold text-[#003B5C] underline underline-offset-2 hover:text-[#002d47]">
            ← Судалгаа харах
          </button>
        </div>
      </div>

      {/* Hero — grade + score + borrower */}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        {autoVerdict === 'approve' ? 'Олгоход тохиромжтой' : autoVerdict === 'conditional' ? 'Нөхцөлтэй зөвшөөрөл санал болгож байна' : 'Эрсдэлтэй — татгалзах санал'}
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
                      {{ real_estate: 'Үл хөдлөх', vehicle: 'Тээврийн хэрэгсэл', equipment: 'Тоног төхөөрөмж', deposit: 'Хадгаламж' }[c.collateralType] || c.collateralType || 'Барьцаа'}
                    </span>
                    <span className="font-black text-green-700">{nfmt(c.estimatedValue)} ₮</span>
                  </div>
                  {c.description && <p className="text-slate-500">{c.description}</p>}
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
            {loan.status !== 'disbursed' && (
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
        ) : (
          <>
            <textarea
              rows={3}
              value={approvalNote}
              onChange={e => setApprovalNote(e.target.value)}
              placeholder="Шийдвэрийн тайлбар, нөхцөл болон тэмдэглэл..."
              className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C] resize-none"
            />
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => makeDecision('approve')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                Зөвшөөрөх
              </button>
              <button
                onClick={() => makeDecision('conditional')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                Нөхцөлтэй
              </button>
              <button
                onClick={() => makeDecision('reject')}
                disabled={savingDecision}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                {savingDecision ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
                Татгалзах
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoanOrigination;
