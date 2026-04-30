import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Building2, ChevronDown, ChevronUp, FileText, Home, Loader2,
  Plus, Save, Trash2, Upload, User, Users, Car, X, CheckCircle2, XCircle,
  Sparkles, Camera, CreditCard, Briefcase, AlertTriangle, Eye, Pencil, Clock, BadgeDollarSign,
  TrendingUp, BarChart3, ShieldCheck
} from 'lucide-react';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const getAuthToken = () => localStorage.getItem('loan_token') || '';
const fmtNum = (v) => {
  const n = String(v).replace(/[^0-9]/g, '');
  return n ? Number(n).toLocaleString('mn-MN') : '';
};
const parseFmtNum = (v) => Number(String(v).replace(/[^0-9]/g, '')) || '';

const EMPLOYMENT_TYPES = [
  'Цалинтай ажилтан', 'Хувиараа хөдөлмөр эрхлэгч', 'Бизнес эрхлэгч',
  'Тэтгэвэрт гарсан', 'Ажилгүй', 'Оюутан', 'Фриланс',
];
const PRODUCTS = {
  biz_loan: 'Бизнесийн зээл', car_purchase_loan: 'Автомашин худалдан авах',
  car_coll_loan: 'Автомашин барьцаалсан', cons_loan: 'Хэрэглээний зээл',
  credit_card: 'Кредит карт', re_loan: 'Үл хөдлөх барьцаалсан', line_loan: 'Шугмын зээл',
};
const REVENUE_RANGES = ['<10 сая', '10-50 сая', '50-200 сая', '200-500 сая', '500+ сая'];
const EMPLOYEE_RANGES = ['1-5', '6-20', '21-50', '51-200', '200+'];
const GUARANTOR_TYPES = ['Хамтран зээлдэгч', 'Батлан даагч'];
const COLLATERAL_TYPES = [
  { key: 'real_estate', label: 'Үл хөдлөх хөрөнгө', icon: Home },
  { key: 'vehicle', label: 'Тээврийн хэрэгсэл', icon: Car },
  { key: 'contract', label: 'Гэрээ / Бусад', icon: FileText },
];

const inp = 'w-full p-2.5 border-2 border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C] focus:ring-2 focus:ring-[#003B5C]/20 focus:shadow-sm transition-all';
const label = 'text-[11px] font-bold uppercase text-[#003B5C]';
const sectionHdr = 'font-bold text-[#003B5C] flex items-center gap-2 text-sm bg-[#003B5C]/5 rounded-lg px-3 py-2';

// ─────────────────────────────────────────────
// FILE PICKER WITH PREVIEW
// ─────────────────────────────────────────────
const FilePickerWithPreview = ({ files = [], onChange, accept = 'image/*,.pdf', multiple = true, onAI, aiLoading, aiLabel }) => {
  const ref = useRef();
  const [preview, setPreview] = useState(null); // { url, name, isImage }

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles || []);
    if (!arr.length) return;
    const merged = [...files, ...arr];
    onChange(merged);
    if (onAI) onAI(merged);
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const openPreview = (f) => {
    const url = URL.createObjectURL(f);
    if (!f.type.startsWith('image/')) {
      window.open(url, '_blank');
      return;
    }
    setPreview({ url, name: f.name, isImage: true });
  };

  return (
    <div className="space-y-2">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2">
              <FileText size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-700 flex-1 truncate">{f.name}</span>
              <button onClick={() => openPreview(f)}
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all" title="Preview">
                <Eye size={13} />
              </button>
              <button onClick={() => removeFile(idx)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Устгах">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2">
        <input type="file" accept={accept} multiple={multiple} className="hidden" ref={ref}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <button onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-dashed border-[#003B5C] text-[#003B5C] bg-blue-50 hover:bg-blue-100 rounded-lg shadow-sm transition-all">
          <Upload size={12} /> {files.length > 0 ? 'Файл нэмэх' : 'Файл сонгох'}
        </button>
        {onAI && files.length > 0 && (
          <AiReadBtn loading={aiLoading} onClick={() => onAI(files)} lbl={aiLabel || 'AI унших'} />
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-bold text-slate-700 truncate">{preview.name}</span>
              <button onClick={() => setPreview(null)} className="p-1 text-slate-400 hover:text-red-500"><X size={18} /></button>
            </div>
            <div className="p-4">
              {preview.isImage ? (
                <img src={preview.url} alt={preview.name} className="w-full rounded-xl" />
              ) : (
                <iframe src={preview.url} title={preview.name} className="w-full h-[70vh] rounded-xl border" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// AI READ BUTTON
// ─────────────────────────────────────────────
const AiReadBtn = ({ loading, onClick, label: lbl = 'AI унших' }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
  >
    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
    {lbl}
  </button>
);

// ─────────────────────────────────────────────
// SUB-TAB NAVIGATION (дараагийн / өмнөх хэсэг)
// ─────────────────────────────────────────────
const SUB_TABS_LIST = [
  { key: 'loan_info',  label: 'Зээлийн мэдээлэл' },
  { key: 'income',     label: 'Орлогын байдал' },
  { key: 'collateral', label: 'Барьцаа хөрөнгө' },
  { key: 'other',      label: 'Зээлийн мэдээллийн лавлагаа' },
];

const SubTabNav = ({ current, setter, completionMap = {} }) => {
  const idx = SUB_TABS_LIST.findIndex(t => t.key === current);
  const prev = idx > 0 ? SUB_TABS_LIST[idx - 1] : null;
  const next = idx < SUB_TABS_LIST.length - 1 ? SUB_TABS_LIST[idx + 1] : null;
  const isDone = !!completionMap[current];
  return (
    <div className="flex items-center justify-between pt-3">
      {prev ? (
        <button onClick={() => setter(prev.key)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          ← {prev.label}
        </button>
      ) : <span />}
      {next ? (
        <button onClick={() => setter(next.key)}
          className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isDone ? 'bg-[#003B5C] text-white hover:bg-[#002d47] shadow-md' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
          {next.label} →
        </button>
      ) : <span />}
    </div>
  );
};

// ─────────────────────────────────────────────
// ID DOCUMENT PHOTO EXTRACTOR
// Иргэний үнэмлэхийн лавлагаа (И-17 маягт) дээрх
// хүний зургийг Canvas-аар crop хийнэ.
// Зөвхөн image/* файлд ажиллана.
// ─────────────────────────────────────────────
const cropPhotoFromCanvas = (canvas) => {
  // И-17 маягт дахь зургийн байрлал: зүүн дээд булан x≈2%, y≈18%, w≈22%, h≈33%
  const cx = Math.floor(canvas.width * 0.02);
  const cy = Math.floor(canvas.height * 0.18);
  const cw = Math.floor(canvas.width * 0.22);
  const ch = Math.floor(canvas.height * 0.33);
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out.toDataURL('image/jpeg', 0.92);
};

const extractPhotoFromIdDocument = async (file) => {
  if (!file) return null;
  try {
    if (file.type.startsWith('image/')) {
      return await new Promise((resolve) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(objUrl);
            resolve(cropPhotoFromCanvas(canvas));
          } catch { URL.revokeObjectURL(objUrl); resolve(null); }
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
        img.src = objUrl;
      });
    }
    if (file.type === 'application/pdf') {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return cropPhotoFromCanvas(canvas);
    }
  } catch { return null; }
  return null;
};

// ─────────────────────────────────────────────
// MINI PERSON FORM (захирал, эзэмшигч, г.м.)
// ─────────────────────────────────────────────
const MiniPersonForm = ({ title, data = {}, onChange, apiUrl, showToast, locked = false, prefix = '' }) => {
  const [open, setOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(false);
  const [idFiles, setIdFiles] = useState([]);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const disabledInp = inp + (locked ? ' bg-slate-50 text-slate-500 cursor-not-allowed' : '');
  const set = (f, v) => { if (!locked) onChange({ ...data, [f]: v }); };

  const displayName = [data.firstName, data.fatherName].filter(Boolean).join(' ') || data.lastName || data.regNo || '—';

  const handleIdAI = async (files) => {
    if (!files?.length) return;
    setAnalyzingId(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      const [res, extractedPhoto] = await Promise.all([
        axios.post(`${apiUrl}/api/loans/analyze-id-document`, fd, {
          headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
        }),
        extractPhotoFromIdDocument(files[0]),
      ]);
      const d = res.data;
      onChange({
        ...data,
        lastName: d.lastName || data.lastName,
        firstName: d.firstName || data.firstName,
        fatherName: d.fatherName || data.fatherName,
        regNo: d.regNo || data.regNo,
        dob: d.dob || data.dob,
        address: d.address || data.address,
        idIssueDate: d.issueDate || data.idIssueDate,
        idExpiryDate: d.expiryDate || data.idExpiryDate,
      });
      if (extractedPhoto) setPendingPhoto(extractedPhoto);
      showToast('Иргэний үнэмлэх уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'ID унших алдаа', 'error');
    } finally { setAnalyzingId(false); }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="text-left">
          <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">{title}</p>
          <p className="text-sm font-semibold text-[#003B5C]">{displayName}</p>
        </div>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 bg-white">
          {/* ID AI */}
          {!locked && (
            <div className="p-2 bg-slate-50 rounded-xl border space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Иргэний үнэмлэх</span>
              <FilePickerWithPreview
                files={idFiles}
                onChange={(newFiles) => {
                  setIdFiles(newFiles);
                  if (newFiles.length > 0 && !analyzingId) handleIdAI(newFiles);
                }}
                accept="image/*,.pdf"
                onAI={handleIdAI}
                aiLoading={analyzingId}
                aiLabel="ID AI унших"
              />
            </div>
          )}
          {pendingPhoto && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <img src={pendingPhoto} alt="ID зураг" className="w-12 h-12 rounded-lg object-cover border border-blue-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-800">Иргэний үнэмлэхийн зургийг цээж зурагт оруулах уу?</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => { set('profileImageUrl', pendingPhoto); setPendingPhoto(null); showToast('Зураг тавигдлаа.'); }}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Тийм</button>
                <button type="button" onClick={() => setPendingPhoto(null)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50">Үгүй</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className={label}>Нэр</span>
              <input value={data.firstName || ''} onChange={e => set('firstName', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1">
              <span className={label}>Эцэг эхийн нэр</span>
              <input value={data.fatherName || ''} onChange={e => set('fatherName', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export { inp, label, sectionHdr, FilePickerWithPreview, AiReadBtn, SubTabNav, MiniPersonForm, PRODUCTS, EMPLOYMENT_TYPES, REVENUE_RANGES, EMPLOYEE_RANGES, GUARANTOR_TYPES, COLLATERAL_TYPES, fmtNum, parseFmtNum, getAuthToken, extractPhotoFromIdDocument };
export default MiniPersonForm;
