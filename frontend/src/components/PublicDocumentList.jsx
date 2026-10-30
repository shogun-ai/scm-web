import { useEffect, useState } from 'react';
import { FileText, ArrowUpRight, X } from 'lucide-react';
import { API_URL } from '../data/constants';
import PublicPageShell from './PublicPageShell';

export default function PublicDocumentList({ title, category, onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/policies?category=${category}&displayOnWeb=true`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('request'); return response.json(); })
      .then(data => { if (!Array.isArray(data)) throw new Error('response'); setFiles(data.filter(file => file && typeof file === 'object')); })
      .catch(err => { if (err.name !== 'AbortError') setError('Мэдээлэл ачаалж чадсангүй. Дахин оролдоно уу.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, retry]);
  useEffect(() => {
    if (!pdfUrl) return;
    const handler = event => { if (event.key === 'Escape') setPdfUrl(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pdfUrl]);
  const getFileUrl = file => {
    try {
      const url = new URL(file.fileUrl || `${API_URL}/policies/${encodeURIComponent(file.fileName || '')}`, API_URL);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  return (
    <PublicPageShell title={title} description="Байгууллагын нийтэд нээлттэй баримт бичгүүдтэй танилцаарай." onBack={onBack}>
      <div className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        {loading ? <p role="status" className="py-8 text-slate-500">Мэдээлэл ачаалж байна...</p> : error ? <div role="alert" className="py-8"><p className="text-red-700">{error}</p><button type="button" onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }} className="mt-4 rounded-xl bg-[#062842] px-5 py-3 text-white">Дахин оролдох</button></div> : files.length ? <ul className="divide-y divide-slate-100">{files.map((file, index) => {
          const url = getFileUrl(file);
          return <li key={file._id || index} className="flex items-center gap-4 py-5"><FileText size={28} className="shrink-0 text-[#007A3D]" /><div className="min-w-0 flex-1"><h2 className="font-semibold break-words">{file.title || 'Баримт бичиг'}</h2><p className="mt-1 text-sm text-slate-500">PDF баримт</p></div><button type="button" disabled={!url} onClick={() => setPdfUrl(url)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Харах <ArrowUpRight size={16} /></button></li>;
        })}</ul> : <p className="py-8 text-slate-500">Одоогоор нийтлэгдсэн баримт бичиг байхгүй байна.</p>}
      </div>
      {pdfUrl && <div role="dialog" aria-modal="true" aria-label="Баримт бичиг харах" className="fixed inset-0 z-[250] flex flex-col bg-white"><div className="flex items-center justify-between gap-4 bg-[#062842] px-4 py-4 text-white"><a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Шинэ цонхонд нээх</a><button autoFocus type="button" onClick={() => setPdfUrl(null)} className="inline-flex items-center gap-2"><X size={18} /> Хаах</button></div><iframe src={pdfUrl} title="PDF баримт бичиг" className="w-full flex-1 border-0" /></div>}
    </PublicPageShell>
  );
}
