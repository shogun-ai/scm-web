import { useEffect, useMemo, useState } from 'react';
import { Building2, Save, SlidersHorizontal, Upload, UserPlus, Users } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(Number(value || 0));
const authHeaders = () => {
  const loanToken = localStorage.getItem('loan_token');
  if (loanToken) return { Authorization: `Bearer ${loanToken}` };
  try {
    const auth = JSON.parse(localStorage.getItem('scm_auth') || '{}');
    return auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
  } catch { return {}; }
};

const EXPENSE_GROUPS = [
  ['A', 'A - Өрийн үүрэг'], ['B', 'B - Тогтмол зардал'], ['C', 'C - Зайлшгүй зардал'],
  ['D', 'D - Сонгон зардал'], ['E', 'E - Бизнесийн зардал'], ['F', 'F - Дансны шилжүүлэг / бэлэн мөнгө'],
];
const INCOME_TYPES = [['salary', 'Хөдөлмөрийн орлого'], ['passive', 'Идэвхгүй орлого'], ['contract', 'Гэрээт ажлын орлого'], ['cash_sale', 'Бэлэн борлуулалт'], ['other', 'Бусад / ангилагдаагүй']];

export default function StatementWorkbench({ apiUrl }) {
  const [bootstrap, setBootstrap] = useState({ industries: [], rules: [], incomeWeights: {}, dtiDefaults: {} });
  const [files, setFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [subject, setSubject] = useState({ entityType: 'individual', accountHolderName: '', industryCode: '', industryName: '' });
  const [review, setReview] = useState({ dtiLimit: 55, incomeWeights: {}, overrides: [] });
  const [savedReview, setSavedReview] = useState(null);
  const [history, setHistory] = useState([]);
  const [ruleDraft, setRuleDraft] = useState({ keyword: '', direction: 'expense', category: '', incomeType: '', expenseGroup: 'F', eligiblePercent: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const request = async (path, options = {}) => {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Алдаа гарлаа.');
    return body;
  };

  const loadHistory = async () => {
    try { setHistory(await request('/api/statement-workbench/reviews')); } catch { /* optional history */ }
  };

  useEffect(() => {
    request('/api/statement-workbench/bootstrap').then((data) => {
      setBootstrap(data);
      setReview((current) => ({ ...current, dtiLimit: data.dtiDefaults?.individual || 55, incomeWeights: data.incomeWeights || {} }));
    }).catch((error) => setMessage(error.message));
    loadHistory();
  }, [apiUrl]);

  const result = useMemo(() => {
    if (!analysis) return null;
    const overrides = new Map(review.overrides.map((item) => [item.transactionKey, item]));
    const rules = bootstrap.rules || [];
    const transactions = (analysis.transactions || []).map((item, index) => {
      const transactionKey = `${item.date || ''}|${item.direction || ''}|${Number(item.amount || 0)}|${String(item.description || '').slice(0, 80)}|${index}`;
      const lower = String(item.description || '').toLowerCase();
      const rule = rules.find((candidate) => candidate.isActive !== false && (candidate.direction === 'any' || candidate.direction === item.direction) && lower.includes(String(candidate.keyword || '').toLowerCase()));
      const override = overrides.get(transactionKey);
      const incomeType = override?.incomeType || rule?.incomeType || (item.direction === 'income' ? 'other' : '');
      const eligiblePercent = item.direction === 'income' ? Number(override?.eligiblePercent ?? rule?.eligiblePercent ?? review.incomeWeights[incomeType] ?? review.incomeWeights.other ?? 0) : 0;
      return { ...item, transactionKey, category: override?.category || rule?.category || item.category || 'Ангилагдаагүй', incomeType, expenseGroup: override?.expenseGroup || rule?.expenseGroup || '', eligiblePercent, ruleMatched: Boolean(rule), manuallyReviewed: Boolean(override) };
    });
    const months = Math.max(1, Number(analysis.frontSheet?.coveredMonths || analysis.monthlySummary?.length || 1));
    const eligibleIncome = transactions.filter((item) => item.direction === 'income').reduce((sum, item) => sum + Number(item.amount || 0) * item.eligiblePercent / 100, 0);
    const debt = transactions.filter((item) => item.direction === 'expense' && item.expenseGroup === 'A').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthlyIncome = eligibleIncome / months;
    const monthlyDebt = debt / months;
    return { transactions, summary: { months, eligibleIncome, monthlyIncome, monthlyDebt, dti: monthlyIncome ? monthlyDebt / monthlyIncome * 100 : 0, unclassified: transactions.filter((item) => !item.ruleMatched && !item.manuallyReviewed).length } };
  }, [analysis, bootstrap.rules, review]);

  const analyze = async () => {
    if (!files.length) return setMessage('Нэг эсвэл хэд хэдэн дансны хуулга сонгоно уу.');
    setLoading(true); setMessage('');
    try {
      const payload = new FormData();
      files.forEach((file) => payload.append('bankStatements', file));
      const data = await request('/api/loan-research/analyze-statement', { method: 'POST', body: payload });
      setAnalysis(data);
      setSubject((current) => ({ ...current, accountHolderName: current.accountHolderName || data.frontSheet?.customerName || '' }));
      setMessage(`${files.length} хуулгын гүйлгээг уншиж, review хийхэд бэлдлээ.`);
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };

  const setIndustry = (code) => {
    const industry = bootstrap.industries.find((item) => item.code === code);
    setSubject((current) => ({ ...current, industryCode: code, industryName: industry?.name || '' }));
  };

  const patchTransaction = (transactionKey, patch) => setReview((current) => {
    const found = current.overrides.find((item) => item.transactionKey === transactionKey) || { transactionKey };
    return { ...current, overrides: [...current.overrides.filter((item) => item.transactionKey !== transactionKey), { ...found, ...patch }] };
  });

  const save = async () => {
    if (!analysis || !result) return;
    setLoading(true); setMessage('');
    try {
      const payload = savedReview
        ? { subject, review, status: 'reviewed' }
        : { subject, sourceFiles: files.map((file) => ({ name: file.name })), analysis, review };
      const path = savedReview ? `/api/statement-workbench/reviews/${savedReview._id}` : '/api/statement-workbench/reviews';
      const data = await request(path, { method: savedReview ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setSavedReview(data); setMessage('Шинжилгээ, засвар болон audit history хадгалагдлаа.'); loadHistory();
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };

  const convertCustomer = async () => {
    if (!savedReview?._id) return setMessage('Эхлээд шинжилгээг хадгална уу.');
    setLoading(true); setMessage('');
    try { const data = await request(`/api/statement-workbench/reviews/${savedReview._id}/convert-customer`, { method: 'POST' }); setMessage(`Харилцагчийн бүртгэлийн draft үүслээ: ${data.requestId || data.onboardingId}`); } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };

  const addRule = async () => {
    try { await request('/api/statement-workbench/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleDraft) }); setRuleDraft({ keyword: '', direction: 'expense', category: '', incomeType: '', expenseGroup: 'F', eligiblePercent: 0 }); const data = await request('/api/statement-workbench/bootstrap'); setBootstrap(data); setMessage('Дүрэм нэмэгдлээ.'); } catch (error) { setMessage(error.message); }
  };

  return <div className="space-y-5">
    <section className="border border-slate-200 bg-white p-5 rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Statement workbench</p><h2 className="mt-1 text-lg font-bold text-slate-900">Дансны хуулгын кредит шинжилгээ</h2><p className="mt-1 text-sm text-slate-500">Олон данс, rule-based ангилал, DTI болон ажилтны review-г нэг кейст хадгална.</p></div><button type="button" onClick={save} disabled={!analysis || loading} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16} />Хадгалах</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Харилцагчийн төрөл<select value={subject.entityType} onChange={(event) => { const entityType = event.target.value; setSubject((current) => ({ ...current, entityType })); setReview((current) => ({ ...current, dtiLimit: bootstrap.dtiDefaults?.[entityType] || 55 })); }} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"><option value="individual">Иргэн</option><option value="organization">Байгууллага</option></select></label><label className="text-sm font-semibold text-slate-700">Данс эзэмшигчийн нэр<input value={subject.accountHolderName} onChange={(event) => setSubject((current) => ({ ...current, accountHolderName: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5" /></label><label className="text-sm font-semibold text-slate-700">Үйл ажиллагааны салбар<select value={subject.industryCode} onChange={(event) => setIndustry(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"><option value="">Сонгох</option>{bootstrap.industries.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}</select></label></div>
      <div className="mt-4 flex flex-wrap gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-teal-400 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-800"><Upload size={16} />Хуулга сонгох<input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label><span className="self-center text-sm text-slate-500">{files.length ? files.map((file) => file.name).join(', ') : 'PDF, PNG, JPG - хэд хэдэн хуулга сонгож болно'}</span><button type="button" onClick={analyze} disabled={loading || !files.length} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">{loading ? 'Уншиж байна...' : 'Уншиж, ангилах'}</button></div>
    </section>
    {message && <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{message}</div>}
    {result && <><section className="grid gap-3 md:grid-cols-4"><Metric label="Дайчлах сарын орлого" value={`${money(result.summary.monthlyIncome)} MNT`} /><Metric label="Сарын өрийн төлөлт" value={`${money(result.summary.monthlyDebt)} MNT`} /><Metric label="ӨОХ / DTI" value={`${result.summary.dti.toFixed(1)}%`} alert={result.summary.dti > Number(review.dtiLimit)} /><Metric label="Ангилагдаагүй" value={`${result.summary.unclassified} гүйлгээ`} alert={result.summary.unclassified > 0} /></section>
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h3 className="font-bold text-slate-900">Гүйлгээний review</h3><p className="text-xs text-slate-500">Дүрэмд баригдаагүй мөрийг ажилтан ангилж, дахин тооцоолно.</p></div><span className="text-xs font-semibold text-slate-500">{result.transactions.length} мөр</span></div><div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[830px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase text-slate-500"><tr><th className="p-3">Огноо / утга</th><th className="p-3 text-right">Дүн</th><th className="p-3">Ангилал</th><th className="p-3">Орлого / зардал</th></tr></thead><tbody>{result.transactions.map((item) => <tr key={item.transactionKey} className="border-t border-slate-100"><td className="p-3"><p className="font-semibold text-slate-800">{item.description || '-'}</p><p className="text-xs text-slate-400">{item.date} {item.ruleMatched ? '· дүрэм' : item.manuallyReviewed ? '· ажилтан' : '· review шаардлагатай'}</p></td><td className={`p-3 text-right font-bold ${item.direction === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.direction === 'income' ? '+' : '-'}{money(item.amount)}</td><td className="p-3"><input value={item.category} onChange={(event) => patchTransaction(item.transactionKey, { category: event.target.value })} className="w-48 rounded border border-slate-300 p-2 text-xs" /></td><td className="p-3">{item.direction === 'income' ? <select value={item.incomeType} onChange={(event) => patchTransaction(item.transactionKey, { incomeType: event.target.value, eligiblePercent: review.incomeWeights[event.target.value] ?? 0 })} className="rounded border border-slate-300 p-2 text-xs">{INCOME_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <select value={item.expenseGroup} onChange={(event) => patchTransaction(item.transactionKey, { expenseGroup: event.target.value })} className="rounded border border-slate-300 p-2 text-xs"><option value="">Ангилагдаагүй</option>{EXPENSE_GROUPS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}</td></tr>)}</tbody></table></div></div>
      <aside className="space-y-4"><section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-teal-700"/><h3 className="font-bold text-slate-900">Зээлийн тохиргоо</h3></div><label className="mt-4 block text-sm font-semibold text-slate-700">DTI босго: {review.dtiLimit}%<input type="range" min="1" max="100" value={review.dtiLimit} onChange={(event) => setReview((current) => ({ ...current, dtiLimit: Number(event.target.value) }))} className="mt-2 w-full accent-teal-700" /></label><div className="mt-4 space-y-2">{INCOME_TYPES.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-xs text-slate-600"><span>{label}</span><input type="number" min="0" max="100" value={review.incomeWeights[key] ?? 0} onChange={(event) => setReview((current) => ({ ...current, incomeWeights: { ...current.incomeWeights, [key]: Number(event.target.value) } }))} className="w-16 rounded border border-slate-300 p-1.5 text-right" /></label>)}</div></section><section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Building2 size={16} className="text-teal-700"/><h3 className="font-bold text-slate-900">Салбарын дүйцэл</h3></div><p className="mt-2 text-sm text-slate-600">{subject.industryName ? `${subject.industryCode}: ${subject.industryName}` : 'Салбар сонгоогүй байна.'}</p><p className="mt-2 text-xs text-slate-500">Орлогын гүйлгээ, сонгосон үйл ажиллагааны чиглэл зөрвөл ажилтан review хийж салбарыг солино.</p></section><button type="button" onClick={convertCustomer} disabled={!savedReview || loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-700 px-4 py-3 text-sm font-bold text-teal-800 disabled:opacity-50"><UserPlus size={16}/>Харилцагч болгох</button></aside></section>
      <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Дүрэм нэмэх</h3><span className="text-xs text-slate-500">Зөвхөн админ global rule үүсгэнэ</span></div><div className="mt-3 grid gap-2 md:grid-cols-5"><input placeholder="Түлхүүр үг" value={ruleDraft.keyword} onChange={(event) => setRuleDraft((current) => ({ ...current, keyword: event.target.value }))} className="rounded border border-slate-300 p-2 text-sm"/><select value={ruleDraft.direction} onChange={(event) => setRuleDraft((current) => ({ ...current, direction: event.target.value }))} className="rounded border border-slate-300 p-2 text-sm"><option value="income">Орлого</option><option value="expense">Зарлага</option><option value="any">Аль аль</option></select><input placeholder="Ангилал" value={ruleDraft.category} onChange={(event) => setRuleDraft((current) => ({ ...current, category: event.target.value }))} className="rounded border border-slate-300 p-2 text-sm"/><select value={ruleDraft.expenseGroup} onChange={(event) => setRuleDraft((current) => ({ ...current, expenseGroup: event.target.value }))} className="rounded border border-slate-300 p-2 text-sm"><option value="">Орлогын дүрэм</option>{EXPENSE_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={addRule} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Дүрэм нэмэх</button></div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Users size={16} className="text-teal-700"/><h3 className="font-bold text-slate-900">Шинжилгээний түүх</h3></div><div className="mt-3 grid gap-2 md:grid-cols-2">{history.slice(0, 8).map((item) => <div key={item._id} className="rounded border border-slate-200 p-3 text-sm"><p className="font-semibold text-slate-800">{item.subject?.accountHolderName || '-'}</p><p className="text-xs text-slate-500">{item.subject?.industryCode || 'Салбаргүй'} · {new Date(item.updatedAt).toLocaleDateString('mn-MN')} · {item.status}</p></div>)}</div></section></>}
  </div>;
}

function Metric({ label, value, alert }) { return <div className={`rounded-lg border p-4 ${alert ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${alert ? 'text-amber-800' : 'text-slate-900'}`}>{value}</p></div>; }
