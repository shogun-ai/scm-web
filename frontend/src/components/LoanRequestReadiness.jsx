import { useState } from 'react';
import axios from 'axios';
import { FileCheck2, Loader2, RefreshCw } from 'lucide-react';

const DOCUMENTS = [
  ['Иргэний үнэмлэх', ['file_id']], ['Хаягийн лавлагаа', ['file_address']],
  ['НДШ-ийн лавлагаа', ['file_social']], ['Дансны хуулга', ['file_bank', 'file_org_bank']],
  ['ЗМС / кредит лавлагаа', ['file_credit', 'file_fico', 'file_sainscore']],
  ['Барьцааны зураг / материал', ['file_car_photos', 'file_prop_map']],
];
const STATUS = { pending: 'Дараалалд', running: 'Боловсруулж байна', completed: 'Уншилт дууссан', completed_with_warnings: 'Уншилт дууссан · хянах зүйлтэй', failed: 'Уншилт амжилтгүй' };
const headers = () => {
  try { const token = JSON.parse(localStorage.getItem('scm_auth') || '{}').token; return token ? { Authorization: `Bearer ${token}` } : {}; }
  catch { return {}; }
};

export default function LoanRequestReadiness({ loan, apiUrl, user, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const appData = loan.applicationData || {};
  const intake = appData.autoIntake || {};
  const files = Array.isArray(loan.fileDetails) ? loan.fileDetails : [];
  const errors = Array.isArray(intake.errors) ? intake.errors : [];
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])];
  const manager = roles.some(role => ['admin', 'director'].includes(role));
  const userId = user?._id || user?.id;
  const assigned = Boolean(userId) && String(loan.assignee?.userId || '') === String(userId);
  const canRetry = loan.intakeVersion === 'quick-v1' && (manager || assigned) && !['approved', 'resolved', 'rejected', 'closed', 'disbursed'].includes(loan.status);
  const bankAnalyses = Array.isArray(appData.incomeResearch?.bankStatementAnalyses) ? appData.incomeResearch.bankStatementAnalyses : [];
  const hasCredit = Boolean(appData.creditBureau?.creditBureauData || appData.creditBureau?.ficoData);

  const refresh = async (retry = false) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (retry) await axios.post(`${apiUrl}/api/loan-requests/${loan._id}/intake-automation`, {}, { headers: headers() });
      const response = await axios.get(`${apiUrl}/api/loan-requests/${loan._id}`, { headers: headers() });
      onUpdated?.(response.data);
      if (retry) setNotice('AI уншилт дараалалд орлоо. Үр дүнг шинэчлэх товчоор шалгана уу.');
    } catch (failure) { setError(failure.response?.data?.message || 'Мэдээллийг шинэчилж чадсангүй. Дахин оролдоно уу.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-700" aria-label="Хүсэлтийн материал, AI уншилтын төлөв">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-bold text-[#003B5C]"><FileCheck2 size={17} /> Хүсэлтийн материал ба AI уншилт</h3><button type="button" disabled={busy} onClick={() => refresh()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Төлөв шинэчлэх</button></div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{DOCUMENTS.map(([label, fields]) => {
      const count = files.filter(file => fields.includes(file.fieldName)).length;
      return <div key={label} className="border-l-2 border-slate-200 pl-3"><dt className="text-xs font-semibold">{label}</dt><dd className={`mt-1 text-xs ${count ? 'text-emerald-700' : 'text-slate-500'}`}>{count ? `${count} хавсралт` : 'Хавсралтгүй · шаардлагатай эсэхийг шалгах'}</dd></div>;
    })}</dl>
    <div className="mt-4 border-t pt-3 text-xs leading-relaxed"><p>Файл уншилт: <strong>{STATUS[intake.status] || 'Автомат уншилтын мэдээлэлгүй'}</strong></p><p className="mt-1 text-slate-500">Хадгалсан шинжилгээ: дансны хуулга {bankAnalyses.length} · ЗМС / кредит {hasCredit ? 'байгаа' : 'байхгүй'}. Байгаа үр дүнг судалгаанд ашиглана.</p><p className="mt-2 text-slate-500">AI нь баримт унших туслах хэрэгсэл. Дутуу, зөрүүтэй мэдээллийг ажилтан шалгаж, шийдвэрийг эрх бүхий ажилтан гаргана.</p>
      {errors.length > 0 && <p className="mt-2 text-amber-800">Уншилтад {errors.length} анхаарах зүйл байна. Баримт болон судалгааны талбаруудыг нягтална уу.</p>}
      {canRetry && <button type="button" disabled={busy || ['pending', 'running'].includes(intake.status)} onClick={() => refresh(true)} className="mt-3 rounded-lg border border-[#003B5C]/25 px-3 py-2 font-semibold text-[#003B5C] disabled:opacity-40">Файлын AI уншилтыг дахин ажиллуулах</button>}
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}{notice && <p role="status" className="mt-3 text-xs text-emerald-700">{notice}</p>}
  </section>;
}
