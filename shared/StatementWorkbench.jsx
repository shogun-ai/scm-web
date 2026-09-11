import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  FilePlus2,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react';
import {
  DEFAULT_INCOME_WEIGHTS,
  EXPENSE_GROUPS,
  INCOME_TYPES,
  appendAnalysis,
  deriveUnderwritingMetrics,
  mergeAnalyses,
  scopeAnalysis,
  transactionKey,
} from './statementWorkbenchUtils.js';

const money = (value) => new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(Number(value || 0));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const list = (value) => (Array.isArray(value) ? value : []);
const formatDate = (value) => value ? new Date(value).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const formatAmount = (value, currency) => value === null || value === undefined
  ? '-'
  : `${money(value)}${currency && !['UNKNOWN', 'MIXED'].includes(currency) ? ` ${currency}` : ''}`;
const authHeader = () => {
  try {
    const token = localStorage.getItem('loan_token') || JSON.parse(localStorage.getItem('scm_auth') || '{}').token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const TONES = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

function Button({ children, onClick, disabled, kind = 'secondary', icon: Icon, className = '', title }) {
  const primary = kind === 'primary';
  const positive = kind === 'positive';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={primary ? { backgroundColor: '#003B5C', color: '#fff' } : positive ? { backgroundColor: '#00A651', color: '#fff' } : undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        primary || positive ? 'shadow-sm hover:brightness-95' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      } ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function Pill({ children, tone = 'slate' }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold ${TONES[tone] || TONES.slate}`}>{children}</span>;
}

function Heading({ eyebrow, title, detail, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-[#00A651]">{eyebrow}</p>}
        <h3 className="mt-1 text-base font-black text-[#003B5C]">{title}</h3>
        {detail && <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, detail, tone = 'slate', icon: Icon }) {
  return (
    <article className={`min-h-[118px] rounded-lg border p-4 ${TONES[tone] || TONES.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-slate-600">{label}</p>
        {Icon && <Icon size={17} className="shrink-0" />}
      </div>
      <p className="mt-3 text-xl font-black leading-tight text-slate-900">{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>}
    </article>
  );
}

function UploadBox({ label, detail, files, setFiles, disabled, single = false }) {
  const addFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    setFiles((current) => {
      const next = single ? picked.slice(0, 1) : [...current, ...picked];
      return next.filter((file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index);
    });
    event.target.value = '';
  };
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#003B5C] shadow-sm"><FilePlus2 size={18} /></div>
        <div><p className="font-bold text-slate-800">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>
      </div>
      <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#003B5C] hover:border-[#003B5C] hover:bg-blue-50">
        <Plus size={16} />{single ? 'Файл сонгох' : 'Файл нэмэх'}
        <input disabled={disabled} type="file" multiple={!single} accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.json" className="sr-only" onChange={addFiles} />
      </label>
      {files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <FileText size={14} className="shrink-0 text-[#003B5C]" />
          <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
          <span className="shrink-0 text-slate-400">{Math.max(1, Math.round(file.size / 1024))} KB</span>
          <button type="button" title="Файл хасах" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><X size={15} /></button>
        </li>
      ))}</ul>}
    </div>
  );
}

function Decision({ decision, reasons }) {
  const Icon = decision.tone === 'emerald' ? CheckCircle2 : decision.tone === 'rose' ? AlertTriangle : CircleAlert;
  return (
    <section className={`rounded-lg border p-5 ${TONES[decision.tone] || TONES.amber}`}>
      <div className="flex gap-3">
        <Icon size={23} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-black text-slate-900">{decision.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{decision.text}</p>
          {reasons.length > 0 && <ul className="mt-3 space-y-1 text-sm text-slate-700">{reasons.map((reason) => <li key={reason}>- {reason}</li>)}</ul>}
        </div>
      </div>
    </section>
  );
}

function Distribution({ item, color, currency, income }) {
  return (
    <div className="border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-slate-800">{income ? item.label : `${item.key === 'U' ? '' : `${item.key}. `}${item.label}`}</p>
          <p className="mt-0.5 text-xs leading-4 text-slate-500">{item.count} гүйлгээ{income ? ` · Зээлд тооцох ${formatAmount(item.eligible, currency)}` : ` · ${item.detail}`}</p>
        </div>
        <div className="shrink-0 text-right"><p className="font-bold text-slate-900">{formatAmount(item.total, currency)}</p><p className="mt-0.5 text-xs text-slate-500">{item.sharePercent.toFixed(1)}%</p></div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${item.total > 0 ? Math.max(3, Math.min(100, item.sharePercent)) : 0}%` }} /></div>
    </div>
  );
}

function CashFlow({ rows, currency }) {
  const maximum = Math.max(1, ...rows.flatMap((item) => [Math.abs(Number(item.income || 0)), Math.abs(Number(item.expense || 0))]));
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <Heading eyebrow="Мөнгөн урсгал" title="Сар бүрийн орлого, зарлага" detail="Сарын дундаж болон хэлбэлзлийг нэг дор хянах урсгал." />
      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="p-3">Сар</th><th className="p-3">Орлого</th><th className="p-3">Зарлага</th><th className="p-3">Цэвэр урсгал</th><th className="p-3">Харьцуулалт</th></tr></thead>
          <tbody>{rows.map((item) => (
            <tr key={item.month} className="border-t border-slate-100">
              <td className="p-3 font-bold text-slate-700">{item.month}</td>
              <td className="p-3 tabular-nums text-emerald-700">{formatAmount(item.income, currency)}</td>
              <td className="p-3 tabular-nums text-rose-700">{formatAmount(item.expense, currency)}</td>
              <td className={`p-3 font-bold tabular-nums ${Number(item.netCashFlow) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatAmount(item.netCashFlow, currency)}</td>
              <td className="p-3"><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(2, Math.min(100, Number(item.income || 0) / maximum * 100))}%` }} /></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(2, Math.min(100, Number(item.expense || 0) / maximum * 100))}%` }} /></div></div></td>
            </tr>
          ))}{!rows.length && <tr><td className="p-5 text-slate-500" colSpan="5">Сарын задаргаа тодорхойлогдоогүй.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}

function Sources({ accounts, scope, setScope, mixed }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <Heading eyebrow="Эх сурвалж" title="Дансны мэдээлэл" detail="Файл бүрийн данс, банк, хамрах хугацаа болон үлдэгдэл тусдаа хадгалагдана." />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={mixed} onClick={() => setScope('combined')} className={`rounded-md border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45 ${scope === 'combined' ? 'border-[#003B5C] bg-[#003B5C] text-white' : 'border-slate-300 bg-white text-slate-600'}`}>Нийлбэр</button>
        {accounts.map((account, index) => <button type="button" key={account.sourceId} onClick={() => setScope(account.sourceId)} className={`rounded-md border px-3 py-2 text-xs font-bold ${scope === account.sourceId ? 'border-[#003B5C] bg-[#003B5C] text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{account.accountNumber || `Данс ${index + 1}`}</button>)}
      </div>
      <div className="mt-4 overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="p-3">Файл</th><th className="p-3">Банк</th><th className="p-3">Данс</th><th className="p-3">Хугацаа</th><th className="p-3 text-right">Эхний</th><th className="p-3 text-right">Эцсийн</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.sourceId} className="border-t border-slate-100"><td className="p-3 font-semibold text-slate-700">{account.sourceName}</td><td className="p-3 text-slate-600">{account.bankName || '-'}</td><td className="p-3 font-bold text-[#003B5C]">{account.accountNumber || '-'}</td><td className="p-3 text-slate-600">{account.periodStart || '-'} - {account.periodEnd || '-'}</td><td className="p-3 text-right tabular-nums">{formatAmount(account.startingBalance, account.currency)}</td><td className="p-3 text-right font-bold tabular-nums">{formatAmount(account.endingBalance, account.currency)}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function AiReport({ reports }) {
  const available = reports.filter((item) => item.report && Object.keys(item.report).length);
  if (!available.length) return null;
  const labels = { incomePattern: 'Орлогын хэв шинж', expensePattern: 'Зарлагын хэв шинж', payrollCycle: 'Орлогын мөчлөг', cashDependency: 'Бэлэн мөнгөний хамаарал', ownerRelatedFlow: 'Эзэмшигчтэй холбоотой урсгал', cashBuffer: 'Үлдэгдлийн хамгаалалт' };
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <Heading eyebrow="AI тайлан" title="Орлого, зан төлөв, score-ийн дүгнэлт" detail="Эх баримтаас уншсан дохиог ажилтан баталгаажуулж шийдвэрт ашиглана." />
      <div className="mt-5 space-y-5">{available.map(({ sourceId, sourceName, report, behaviour }) => {
        const patterns = report.behaviorPatterns || behaviour || {};
        const scoring = report.creditScoring || {};
        return <article key={sourceId} className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0"><p className="font-black text-slate-800">{sourceName}</p><div className="mt-3 grid gap-4 lg:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Үндсэн үзүүлэлт</p><dl className="mt-2 space-y-2 text-sm">{list(report.summaryRows).slice(0, 8).map((item) => <div key={item.label} className="flex justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">{item.label}</dt><dd className="text-right font-bold text-slate-700">{item.value}</dd></div>)}</dl></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Орлогын шалгуур</p><div className="mt-2 space-y-2">{list(report.incomeScoring).map((item) => <div key={item.criterion} className="rounded-md bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><b className="text-sm text-slate-800">{item.criterion}</b><Pill tone={item.assessment === 'Сайн' ? 'emerald' : item.assessment === 'Муу' ? 'rose' : item.assessment === 'Анхаарах' ? 'amber' : 'slate'}>{item.assessment}</Pill></div><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p></div>)}</div></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Зан төлөвийн дохио</p><div className="mt-2 space-y-2">{Object.entries(patterns).filter(([, value]) => clean(value)).map(([key, value]) => <div key={key} className="rounded-md bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{labels[key] || key}</p><p className="mt-1 text-sm leading-5 text-slate-700">{value}</p></div>)}</div>{scoring.maxScore > 0 && <p className="mt-3 text-sm font-bold text-[#003B5C]">AI score: {scoring.totalScore}/{scoring.maxScore}</p>}</div></div></article>;
      })}</div>
    </section>
  );
}

function Transactions({ rows, accounts, filter, setFilter, query, setQuery, patch, createRule }) {
  const shown = rows.filter((item) => {
    if (filter === 'income' && item.direction !== 'income') return false;
    if (filter === 'expense' && item.direction !== 'expense') return false;
    if (filter === 'debt' && item.expenseGroup !== 'A') return false;
    if (filter === 'review' && item.confidence !== 'review') return false;
    return !query || `${item.description} ${item.category} ${item.sourceName}`.toLowerCase().includes(query.toLowerCase());
  });
  const accountName = (id) => accounts.find((item) => item.sourceId === id)?.accountNumber || accounts.find((item) => item.sourceId === id)?.sourceName || id;
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-[#00A651]">Гүйлгээ</p><h3 className="mt-1 text-base font-black text-[#003B5C]">Гүйлгээний ангилал ба review</h3><p className="mt-1 text-sm text-slate-500">Бүх гүйлгээ хадгалагдана. Ажилтан ангилал болон eligible хувьтай холбоотой шийдвэрийг засна.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Гүйлгээ хайх" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 md:w-64" /></div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">{[['all', 'Бүгд'], ['income', 'Орлого'], ['expense', 'Зарлага'], ['debt', 'Өрийн төлөлт'], ['review', 'Review шаардлагатай']].map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} className={`rounded-md px-3 py-2 text-xs font-bold ${filter === key ? 'bg-[#003B5C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}</div>
      <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1200px] text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="p-3">Огноо / гүйлгээ</th><th className="p-3">Данс</th><th className="p-3 text-right">Дүн</th><th className="p-3">Ангилал</th><th className="p-3">Зээлийн тооцоолол</th><th className="p-3">Дүрэм</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id} className="border-t border-slate-100 align-top"><td className="p-3"><p className="max-w-[320px] font-bold text-slate-800">{item.description || '-'}</p><p className="mt-1 text-xs text-slate-400">{item.date || '-'} · {item.confidence === 'rule' ? 'Дүрэм' : item.confidence === 'reviewed' ? 'Ажилтан засварласан' : item.confidence === 'ai' ? 'AI ангилал' : 'Review шаардлагатай'}</p></td><td className="p-3 text-xs font-semibold text-slate-600">{accountName(item.sourceId)}</td><td className={`p-3 text-right font-black tabular-nums ${item.direction === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.direction === 'income' ? '+' : '-'}{money(item.amount)}</td><td className="p-3"><input value={item.category} onChange={(event) => patch(item, { category: event.target.value })} className="h-9 w-48 rounded border border-slate-300 px-2 text-xs font-semibold text-slate-700" /></td><td className="p-3">{item.direction === 'income' ? <div className="flex items-center gap-2"><select value={item.incomeType} onChange={(event) => patch(item, { incomeType: event.target.value })} className="h-9 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700">{INCOME_TYPES.map((type) => <option key={type.key} value={type.key}>{type.shortLabel}</option>)}</select><span className="text-xs font-bold text-[#003B5C]">{item.eligiblePercent}%</span></div> : <select value={item.expenseGroup} onChange={(event) => patch(item, { expenseGroup: event.target.value })} className="h-9 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700">{EXPENSE_GROUPS.map((group) => <option key={group.key} value={group.key}>{group.key} - {group.label}</option>)}</select>}</td><td className="p-3"><button type="button" onClick={() => createRule(item)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-bold text-[#003B5C] hover:bg-blue-50">Дүрэм болгох</button></td></tr>)}{!shown.length && <tr><td colSpan="6" className="p-5 text-slate-500">Тохирох гүйлгээ олдсонгүй.</td></tr>}</tbody></table></div>
    </section>
  );
}

function RuleEditor({ draft, change, save, close, saving }) {
  if (!draft) return null;
  const income = draft.direction === 'income';
  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-[#003B5C]">Дүрэм үүсгэх</p><p className="mt-1 text-xs leading-5 text-slate-600">Tenant admin эрхтэй хэрэглэгч ижил түлхүүр үгийг цаашид автоматаар ангилах дүрэм үүсгэнэ.</p></div><button type="button" title="Хаах" onClick={close} className="rounded p-1 text-slate-500 hover:bg-white"><X size={17} /></button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-bold text-slate-600">Түлхүүр үг<input value={draft.keyword} onChange={(event) => change({ keyword: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" /></label>
        <label className="text-xs font-bold text-slate-600">Ангилал<input value={draft.category} onChange={(event) => change({ category: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800" /></label>
        {income ? <label className="text-xs font-bold text-slate-600">Орлогын төрөл<select value={draft.incomeType} onChange={(event) => change({ incomeType: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">{INCOME_TYPES.map((type) => <option key={type.key} value={type.key}>{type.shortLabel}</option>)}</select></label> : <label className="text-xs font-bold text-slate-600">Зардлын бүлэг<select value={draft.expenseGroup} onChange={(event) => change({ expenseGroup: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">{EXPENSE_GROUPS.filter((group) => group.key !== 'U').map((group) => <option key={group.key} value={group.key}>{group.key} - {group.label}</option>)}</select></label>}
        <div className="flex items-end"><Button onClick={save} disabled={saving || !clean(draft.keyword) || !clean(draft.category)} kind="primary" icon={Save} className="w-full">Дүрэм хадгалах</Button></div>
      </div>
    </section>
  );
}

export default function StatementWorkbench({ apiUrl, caseId, onCaseLoaded }) {
  const [statementFiles, setStatementFiles] = useState([]);
  const [creditFiles, setCreditFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [credit, setCredit] = useState(null);
  const [savedCase, setSavedCase] = useState(null);
  const [bootstrap, setBootstrap] = useState({ industries: [], rules: [], dtiDefaults: { individual: 55, organization: 20 } });
  const [subject, setSubject] = useState({ entityType: 'individual', accountHolderName: '', industryCode: '', industryName: '' });
  const [incomeWeights, setIncomeWeights] = useState(DEFAULT_INCOME_WEIGHTS);
  const [dtiLimit, setDtiLimit] = useState(55);
  const [overrides, setOverrides] = useState({});
  const [scope, setScope] = useState('combined');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState('');
  const [ruleDraft, setRuleDraft] = useState(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  const request = async (path, options = {}) => {
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { ...authHeader(), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Үйлдэл амжилтгүй боллоо.');
    return body;
  };

  const restoreAnalysis = (stored) => {
    if (!stored) return null;
    if (list(stored.accounts).length) return { ...stored, transactions: list(stored.transactions).map((item, index) => ({ ...item, transactionIndex: Number.isInteger(item.transactionIndex) ? item.transactionIndex : index })) };
    const account = { ...(stored.frontSheet || {}), sourceId: 'source-1', sourceName: 'Хадгалсан дансны хуулга', monthlySummary: list(stored.monthlySummary) };
    return { ...stored, accounts: [account], transactions: list(stored.transactions).map((item, index) => ({ ...item, sourceId: item.sourceId || 'source-1', sourceName: item.sourceName || account.sourceName, transactionIndex: index })), warnings: list(stored.warnings), notableTransactions: list(stored.notableTransactions), reports: list(stored.reports) };
  };

  const restoreOverrides = (storedOverrides, restoredAnalysis) => {
    const transactions = list(restoredAnalysis?.transactions);
    const currentKeys = new Set(transactions.map((item, index) => transactionKey(item, Number.isInteger(item.transactionIndex) ? item.transactionIndex : index)));
    return Object.fromEntries(list(storedOverrides).filter((entry) => entry.transactionKey).map(({ transactionKey: storedKey, ...entry }) => {
      if (currentKeys.has(storedKey)) return [storedKey, entry];
      const legacyIndex = transactions.findIndex((item, index) => storedKey === `${item.sourceId || ''}|${item.date || ''}|${item.direction || ''}|${item.amount || 0}|${item.description || ''}|${index}`);
      const resolvedKey = legacyIndex >= 0 ? transactionKey(transactions[legacyIndex], Number.isInteger(transactions[legacyIndex].transactionIndex) ? transactions[legacyIndex].transactionIndex : legacyIndex) : storedKey;
      return [resolvedKey, entry];
    }));
  };

  useEffect(() => {
    let active = true;
    request('/api/statement-workbench/bootstrap').then((data) => {
      if (!active) return;
      setBootstrap(data);
      setIncomeWeights({ ...DEFAULT_INCOME_WEIGHTS, ...(data.incomeWeights || {}) });
      setDtiLimit(Number(data.dtiDefaults?.individual || 55));
    }).catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [apiUrl]);

  useEffect(() => {
    if (!caseId) return undefined;
    let active = true;
    setLoading(true);
    setProgress('Хадгалсан кейсийг нээж байна...');
    request(`/api/statement-workbench/reviews/${caseId}`).then((item) => {
      if (!active) return;
      const restored = restoreAnalysis(item.analysis);
      setAnalysis(restored);
      setCredit(item.creditReference || null);
      setSavedCase(item);
      setSubject({ entityType: 'individual', accountHolderName: '', industryCode: '', industryName: '', ...(item.subject || {}) });
      setDtiLimit(Number(item.review?.dtiLimit || 55));
      setIncomeWeights({ ...DEFAULT_INCOME_WEIGHTS, ...(item.review?.incomeWeights || {}) });
      setOverrides(restoreOverrides(item.review?.overrides, restored));
      setScope('combined');
      setMessage(`${item.reference || 'Кейс'} нээгдлээ.`);
      onCaseLoaded?.();
    }).catch((error) => active && setMessage(error.message)).finally(() => {
      if (active) { setLoading(false); setProgress(''); }
    });
    return () => { active = false; };
  }, [caseId, apiUrl]);

  const currentAnalysis = useMemo(() => scopeAnalysis(analysis, scope), [analysis, scope]);
  const metrics = useMemo(() => deriveUnderwritingMetrics(currentAnalysis, {
    rules: bootstrap.rules,
    overrides,
    incomeWeights,
    dtiLimit,
    credit,
    industryName: subject.industryName,
  }), [currentAnalysis, bootstrap.rules, overrides, incomeWeights, dtiLimit, credit, subject.industryName]);

  useEffect(() => {
    if (analysis && metrics.mixedCurrency && scope === 'combined') setScope(analysis.accounts?.[0]?.sourceId || 'combined');
  }, [analysis, metrics.mixedCurrency, scope]);

  const reset = () => {
    setStatementFiles([]);
    setCreditFiles([]);
    setAnalysis(null);
    setCredit(null);
    setSavedCase(null);
    setSubject({ entityType: 'individual', accountHolderName: '', industryCode: '', industryName: '' });
    setIncomeWeights({ ...DEFAULT_INCOME_WEIGHTS, ...(bootstrap.incomeWeights || {}) });
    setDtiLimit(Number(bootstrap.dtiDefaults?.individual || 55));
    setOverrides({});
    setScope('combined');
    setFilter('all');
    setQuery('');
    setRuleDraft(null);
    setMessage('Шинэ кейс бэлэн.');
  };

  const analyze = async () => {
    if (!statementFiles.length && !(analysis && creditFiles.length)) {
      setMessage('Дор хаяж нэг дансны хуулга, эсвэл нээгдсэн кейст ЗМС лавлагаа сонгоно уу.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const results = await Promise.all(statementFiles.map(async (file, index) => {
        setProgress(`${index + 1}/${statementFiles.length} дансны хуулгыг уншиж байна...`);
        const payload = new FormData();
        payload.append('bankStatements', file);
        return { file, result: await request('/api/loan-research/analyze-statement', { method: 'POST', body: payload }) };
      }));
      if (results.length) {
        const fresh = mergeAnalyses(results);
        const next = savedCase && analysis ? appendAnalysis(analysis, fresh) : fresh;
        setAnalysis(next);
        setSubject((current) => ({ ...current, accountHolderName: current.accountHolderName || fresh.frontSheet?.customerName || '' }));
        setScope(next.frontSheet?.currencies?.length > 1 ? next.accounts?.[0]?.sourceId || 'combined' : 'combined');
      }
      if (creditFiles.length) {
        setProgress('ЗМС лавлагааг уншиж, төлбөртэй тулгаж байна...');
        const payload = new FormData();
        payload.append('bankStatements', creditFiles[0]);
        setCredit(await request('/api/loan-research/analyze-credit-reference', { method: 'POST', body: payload }));
      }
      setStatementFiles([]);
      setCreditFiles([]);
      setMessage(savedCase ? 'Сонгосон баримтууд кейст нэмэгдлээ. Өөрчлөлт хадгалах товчоор баталгаажуулна уу.' : 'Underwriting тайлан бэлэн боллоо.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const save = async () => {
    if (!analysis) return;
    setLoading(true);
    try {
      const sourceFiles = list(analysis.accounts).map((item) => ({ name: item.sourceName, size: Number(item.sourceSize || 0), bankName: item.bankName, accountNumber: item.accountNumber, periodStart: item.periodStart, periodEnd: item.periodEnd }));
      const body = {
        subject,
        sourceFiles,
        analysis,
        creditReference: credit,
        review: { dtiLimit, incomeWeights, overrides: Object.entries(overrides).map(([transactionKey, item]) => ({ transactionKey, ...item })) },
        status: 'reviewed',
      };
      const item = await request(savedCase ? `/api/statement-workbench/reviews/${savedCase._id}` : '/api/statement-workbench/reviews', { method: savedCase ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setSavedCase(item);
      setMessage(`${item.reference || 'Кейс'} хадгалагдлаа.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const convert = async () => {
    if (!savedCase) return;
    setLoading(true);
    try {
      const result = await request(`/api/statement-workbench/reviews/${savedCase._id}/convert-customer`, { method: 'POST' });
      setMessage(result.alreadyConverted ? `Харилцагчийн draft өмнө нь үүссэн: ${result.requestId || result.onboardingId}` : `Харилцагчийн draft үүслээ: ${result.requestId || result.onboardingId}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const patch = (row, change) => setOverrides((current) => ({ ...current, [row.id]: { ...(current[row.id] || {}), ...change } }));
  const beginRule = (row) => {
    const keyword = clean(row.description).split(/\s+/).find((part) => part.length >= 3) || clean(row.description);
    setRuleDraft({ keyword, direction: row.direction, category: row.category, incomeType: row.incomeType || 'other', expenseGroup: row.expenseGroup === 'U' ? 'F' : row.expenseGroup });
  };
  const saveRule = async () => {
    if (!ruleDraft) return;
    setRuleSaving(true);
    try {
      const rule = await request('/api/statement-workbench/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleDraft) });
      setBootstrap((current) => ({ ...current, rules: [rule, ...list(current.rules)] }));
      setRuleDraft(null);
      setMessage(`"${rule.keyword}" дүрэм хадгалагдлаа.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRuleSaving(false);
    }
  };
  const pickIndustry = (code) => {
    const selected = list(bootstrap.industries).find((item) => item.code === code);
    setSubject((current) => ({ ...current, industryCode: selected?.code || '', industryName: selected?.name || '' }));
  };
  const updateEntity = (entityType) => {
    setSubject((current) => ({ ...current, entityType }));
    setDtiLimit(Number(bootstrap.dtiDefaults?.[entityType] || (entityType === 'organization' ? 20 : 55)));
  };

  const actionLabel = loading ? progress || 'Шинжилж байна...' : savedCase ? 'Сонгосон файлыг кейст нэмэх' : analysis ? 'Сонгосон файлыг дахин шинжлэх' : 'Файлыг судлах';
  const canAnalyze = !loading && (statementFiles.length > 0 || Boolean(analysis && creditFiles.length));
  const incomeMap = Object.fromEntries(metrics.incomeBreakdown.map((item) => [item.key, item]));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#00A651]">Underwriting case</p><h2 className="mt-1 text-xl font-black text-[#003B5C]">Дансны хуулга ба ЗМС-ийн зээлийн судалгаа</h2><p className="mt-1 text-sm text-slate-500">Баримтаас гарсан орлого, зарлага, өрийн ачаалал, зан төлөвийг шийдвэрийн түвшинд нягтална.</p></div>
          <div className="flex flex-wrap gap-2">{savedCase?.reference && <Pill tone="blue">{savedCase.reference}</Pill>}<Button onClick={reset} disabled={loading} icon={Plus}>Шинэ кейс</Button><Button onClick={save} disabled={!analysis || loading} kind="positive" icon={Save}>{savedCase ? 'Өөрчлөлт хадгалах' : 'Кейс хадгалах'}</Button></div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">Харилцагчийн төрөл<select value={subject.entityType} onChange={(event) => updateEntity(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"><option value="individual">Иргэн</option><option value="organization">Байгууллага</option></select></label>
          <label className="text-sm font-bold text-slate-700">Данс эзэмшигчийн нэр<input value={subject.accountHolderName} onChange={(event) => setSubject((current) => ({ ...current, accountHolderName: event.target.value }))} placeholder="Хуулгаас уншсан нэр" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700" /></label>
          <label className="text-sm font-bold text-slate-700">Үйл ажиллагааны чиглэл<select value={subject.industryCode} onChange={(event) => pickIndustry(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"><option value="">ҮСХ-ийн ангиллаас сонгох</option>{list(bootstrap.industries).map((industry) => <option key={industry.code} value={industry.code}>{industry.code} - {industry.name}</option>)}</select></label>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2"><UploadBox label="Дансны хуулга" detail="PDF, PNG, JPG. Нэг кейст олон банк, олон данс оруулж болно." files={statementFiles} setFiles={setStatementFiles} disabled={loading} /><UploadBox label="ЗМС лавлагаа" detail="Оруулбал ЗМС-ийн сарын төлбөрийг хуулга дахь төлөлттэй тулгана." files={creditFiles} setFiles={setCreditFiles} disabled={loading} single /></div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={analyze} disabled={!canAnalyze} kind="primary" icon={loading ? LoaderCircle : BarChart3} className="min-w-[210px]">{actionLabel}</Button>{loading && <span className="text-sm font-semibold text-slate-500">{progress}</span>}{!loading && savedCase && <span className="text-sm text-slate-500">Шинэ баримт нэмсний дараа өөрчлөлтийг хадгална.</span>}</div>
      </section>
      {message && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{message}</div>}

      {analysis && <><>{metrics.mixedCurrency && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"><b>Олон валютын данс илэрлээ.</b> Хөрвүүлэлтгүй нийлбэр болон DTI тооцоог ашиглахгүй; нэг валютын дансыг сонгож үзнэ.</div>}</><Decision decision={metrics.decision} reasons={metrics.reasons} />
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><Metric label="Зээлд тооцох сарын орлого" value={metrics.mixedCurrency ? '-' : formatAmount(metrics.monthlyEligibleIncome, metrics.currency)} detail={`${metrics.coveredMonths} сарын ажиглалт`} tone="emerald" icon={TrendingUp} /><Metric label="ӨОХ / DTI" value={metrics.dti === null ? '-' : `${metrics.dti.toFixed(1)}%`} detail={`Тохируулсан босго: ${dtiLimit}%`} tone={metrics.dti !== null && metrics.dti > dtiLimit ? 'rose' : 'blue'} icon={SlidersHorizontal} /><Metric label="Сарын өрийн төлбөр" value={metrics.mixedCurrency ? '-' : formatAmount(metrics.debtPayment, metrics.currency)} detail="Хуулга ба ЗМС-ийн их дүн" tone="amber" icon={WalletCards} /><Metric label="Сарын цэвэр cash-flow" value={metrics.mixedCurrency ? '-' : formatAmount(metrics.netCashFlow, metrics.currency)} detail={metrics.netCashFlow >= 0 ? 'Эерэг урсгал' : 'Сөрөг урсгал'} tone={metrics.netCashFlow >= 0 ? 'emerald' : 'rose'} icon={metrics.netCashFlow >= 0 ? TrendingUp : TrendingDown} /><Metric label="Хяналтын score" value={`${metrics.score.total}/${metrics.score.max}`} detail="Ил тод шалгуурын оноо" tone={metrics.score.total >= 70 ? 'emerald' : metrics.score.total >= 45 ? 'amber' : 'rose'} icon={ShieldCheck} /><Metric label="Ажилтны review" value={`${metrics.unclassified.length} мөр`} detail={scope === 'combined' ? 'Нийлбэр харагдац' : 'Сонгосон данс'} tone={metrics.unclassified.length ? 'amber' : 'emerald'} icon={CircleAlert} /></section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="DTI тойм" title="Зээлд тооцох орлогын бодлого" detail="Орлогын төрлийн хувь өөрчлөгдөхөд eligible income, DTI шууд шинэчлэгдэнэ." /><div className="mt-4 divide-y divide-slate-100">{INCOME_TYPES.map((type) => { const item = incomeMap[type.key] || { total: 0, eligible: 0, count: 0 }; return <div key={type.key} className="grid gap-3 py-3 md:grid-cols-[1fr_auto_auto]"><div><p className="font-bold text-slate-800">{type.label}</p><p className="mt-1 text-xs text-slate-500">{item.count} гүйлгээ · {formatAmount(item.total, metrics.currency)}</p></div><p className="self-center text-right text-sm font-bold text-[#003B5C]">{formatAmount(item.eligible, metrics.currency)}</p><label className="self-center text-xs font-bold text-slate-500">Хувь<input type="number" min="0" max="100" value={incomeWeights[type.key] ?? type.defaultEligiblePercent} onChange={(event) => setIncomeWeights((current) => ({ ...current, [type.key]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) }))} className="ml-2 h-9 w-16 rounded border border-slate-300 px-2 text-right text-sm text-slate-800" /><span className="ml-1">%</span></label></div>; })}</div></div>
          <div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="Тооцоо" title="Өрийн ачааллын харьцаа" /><div className="mt-5 rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">DTI = сарын өрийн төлбөр / eligible сарын орлого</p><p className="mt-3 text-3xl font-black text-[#003B5C]">{metrics.dti === null ? '-' : `${metrics.dti.toFixed(1)}%`}</p><p className="mt-2 text-sm text-slate-600">{formatAmount(metrics.debtPayment, metrics.currency)} / {formatAmount(metrics.monthlyEligibleIncome, metrics.currency)}</p></div><label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold text-slate-700">DTI босго<input type="number" min="1" max="100" value={dtiLimit} onChange={(event) => setDtiLimit(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} className="h-10 w-24 rounded border border-slate-300 px-3 text-right text-sm text-slate-800" /><span>%</span></label><div className="mt-4 space-y-2">{metrics.score.criteria.map((item) => <div key={item.label} className="flex justify-between gap-3 text-xs"><span className="text-slate-600">{item.label}</span><b className="text-slate-800">{item.score}/{item.max}</b></div>)}</div></div></section>

        <section className="grid gap-5 xl:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="Орлого" title="Орлогын бүтэц" detail="Орлогын ангилал, тогтвортой байдал, зээлд тооцох дүн." /><div className="mt-5">{metrics.incomeBreakdown.map((item, index) => <Distribution key={item.key} item={item} color={['bg-emerald-500', 'bg-teal-500', 'bg-cyan-600', 'bg-blue-600', 'bg-slate-400'][index % 5]} currency={metrics.currency} income />)}</div></div><div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="Зарлага" title="Зардлын 6 бүлгийн задаргаа" detail="Өрийн төлбөр DTI-д, бусад зарлага cash-flow-д тусна." /><div className="mt-5">{metrics.expenseBreakdown.map((item, index) => <Distribution key={item.key} item={item} color={['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-slate-500', 'bg-slate-400'][index % 7]} currency={metrics.currency} />)}</div></div></section>
        <CashFlow rows={metrics.monthlyRows} currency={metrics.currency} />
        <Sources accounts={list(analysis.accounts)} scope={scope} setScope={setScope} mixed={analysis.frontSheet?.currency === 'MIXED'} />

        <section className="grid gap-5 xl:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="ҮА чиглэл" title="Орлогын эх үүсвэрийн тулгалт" detail="ҮСХ-ийн ЭЗБТҮА (ISIC-4) ангилалд сонгосон чиглэл болон дансны орлогын дохиог тулгана." /><div className="mt-5 flex flex-wrap items-center gap-3"><Pill tone={metrics.industryMatch.status === 'matched' ? 'emerald' : metrics.industryMatch.status === 'review' ? 'amber' : 'slate'}>{metrics.industryMatch.status === 'matched' ? 'Холбогдох дохио' : metrics.industryMatch.status === 'review' ? 'Баталгаажуулах' : 'Сонгоогүй'}</Pill><p className="text-sm leading-6 text-slate-700">{subject.industryName || 'Үйл ажиллагааны чиглэл сонгоогүй.'}<br /><span className="text-slate-500">{metrics.industryMatch.label}</span></p></div></div><div className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="ЗМС тулгалт" title="Зээлийн мэдээлэл ба хуулга" detail="ЗМС оруулсан үед сарын төлбөрийг хуулга дахь A бүлгийн төлөлттэй зэрэгцүүлж ашиглана." />{credit ? <><div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label="ЗМС сарын төлбөр" value={formatAmount(metrics.bureauDebtPayment, metrics.currency)} detail={`${credit.summary?.activeLoansCount || 0} идэвхтэй зээл`} tone="blue" /><Metric label="Хуулга дахь төлөлт" value={formatAmount(metrics.bankDebtPayment, metrics.currency)} detail="A бүлэгт ангилсан гүйлгээ" tone="amber" /></div><p className="mt-4 text-sm leading-6 text-slate-700">{credit.summary?.institutionSummary || credit.analysis || 'ЗМС-ийн хураангуй тодорхойлогдоогүй.'}</p>{credit.summary?.hasOverdue && <p className="mt-3 font-bold text-rose-700">{credit.summary.maxOverdueDays || 0} хоногийн хугацаа хэтрэлт илэрсэн.</p>}</> : <p className="mt-5 text-sm leading-6 text-slate-500">ЗМС лавлагаа оруулбал идэвхтэй зээл, сарын төлбөр, хугацаа хэтрэлтийг тулгана.</p>}</div></section>

        {metrics.suspicious.length > 0 && <section className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="Эрсдэлийн дохио" title="Сэжигтэй болон review шаардлагатай зүйлс" detail="Эдгээр нь автомат татгалзах шийдвэр биш. Зээлийн судлаач баримтаар батална." /><div className="mt-4 grid gap-3 lg:grid-cols-2">{metrics.suspicious.map((item) => <article key={item.key} className={`rounded-lg border p-4 ${TONES[item.tone] || TONES.amber}`}><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-black text-slate-900">{item.title}</p><p className="mt-1 text-sm leading-5 text-slate-700">{item.detail}</p></div></div></article>)}</div></section>}
        <AiReport reports={scope === 'combined' ? list(analysis.reports) : list(analysis.reports).filter((item) => item.sourceId === scope)} />
        <Transactions rows={metrics.rows} accounts={list(analysis.accounts)} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} patch={patch} createRule={beginRule} />
        <RuleEditor draft={ruleDraft} change={(change) => setRuleDraft((current) => ({ ...current, ...change }))} save={saveRule} close={() => setRuleDraft(null)} saving={ruleSaving} />
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-5"><div><p className="font-black text-[#003B5C]">Кейсийн үйлдэл</p><p className="mt-1 text-sm text-slate-500">Өөрчлөлтийг хадгалсны дараа харилцагчийн draft үүсгэнэ.</p></div><div className="flex flex-wrap gap-2"><Button onClick={save} disabled={loading} kind="positive" icon={Save}>{savedCase ? 'Өөрчлөлт хадгалах' : 'Кейс хадгалах'}</Button><Button onClick={convert} disabled={!savedCase || loading} icon={UserPlus}>Харилцагч болгох</Button></div></section>
        {savedCase?.auditLog?.length > 0 && <section className="rounded-lg border border-slate-200 bg-white p-5"><Heading eyebrow="Audit log" title="Кейсийн түүх" /><ul className="mt-4 space-y-2">{list(savedCase.auditLog).slice().reverse().map((item, index) => <li key={`${item.at}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm"><span className="font-semibold text-slate-700">{item.summary || item.action}</span><span className="text-slate-500">{formatDate(item.at)}</span></li>)}</ul></section>}
      </>}
    </div>
  );
}

export function StatementHistory({ apiUrl, onOpenCase }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/statement-workbench/reviews`, { headers: authHeader() });
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.message || 'Кейсийн түүхийг уншиж чадсангүй.');
      setItems(list(body));
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [apiUrl]);
  const shown = items.filter((item) => `${item.reference} ${item.subject?.accountHolderName} ${item.subject?.industryName}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <Heading eyebrow="Кейсийн сан" title="Өмнөх шинжилгээний түүх" detail="Хадгалсан кейсийг нээж, файл эсвэл ЗМС нэмээд дахин хадгалах боломжтой." action={<Button onClick={load} disabled={loading} icon={RefreshCw}>{loading ? 'Шинэчилж байна' : 'Шинэчлэх'}</Button>} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Кейс, нэр, үйл ажиллагааны чиглэлээр хайх" className="mt-5 h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 text-sm text-slate-800" />
      {message && <p className="mt-4 text-sm font-semibold text-rose-700">{message}</p>}
      <div className="mt-5 overflow-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="p-3">Кейс</th><th className="p-3">Харилцагч</th><th className="p-3">Эх сурвалж</th><th className="p-3">DTI</th><th className="p-3">Статус</th><th className="p-3">Шинэчлэгдсэн</th><th className="p-3" /></tr></thead><tbody>{shown.map((item) => { const summary = item.review?.result?.summary || {}; return <tr key={item._id} className="border-t border-slate-100"><td className="p-3 font-black text-[#003B5C]">{item.reference || 'Кейс'}</td><td className="p-3"><p className="font-bold text-slate-800">{item.subject?.accountHolderName || '-'}</p><p className="mt-1 text-xs text-slate-500">{item.subject?.entityType === 'organization' ? 'Байгууллага' : 'Иргэн'}{item.subject?.industryName ? ` · ${item.subject.industryName}` : ''}</p></td><td className="p-3 text-xs text-slate-600">{list(item.sourceFiles).map((file) => file.accountNumber || file.name).join(', ') || '-'}</td><td className="p-3 font-bold text-slate-800">{summary.dti === null || summary.dti === undefined ? '-' : `${Number(summary.dti).toFixed(1)}%`}</td><td className="p-3"><Pill tone={item.status === 'converted' ? 'emerald' : item.status === 'reviewed' ? 'blue' : 'slate'}>{item.status === 'converted' ? 'Харилцагч болсон' : item.status === 'reviewed' ? 'Хянасан' : 'Ноорог'}</Pill></td><td className="p-3 text-xs text-slate-500">{formatDate(item.updatedAt)}</td><td className="p-3 text-right"><Button onClick={() => onOpenCase?.(item._id)} icon={ArrowRight}>Нээх</Button></td></tr>; })}{!shown.length && <tr><td colSpan="7" className="p-5 text-slate-500">Хадгалсан кейс олдсонгүй.</td></tr>}</tbody></table></div>
    </section>
  );
}
