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

const inp = 'w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]';
const label = 'text-[11px] font-bold uppercase text-slate-500';
const sectionHdr = 'font-bold text-[#003B5C] flex items-center gap-2 text-sm';

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
            <div key={idx} className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-slate-50 transition-all">
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
            <label className="space-y-1">
              <span className={label}>Овог</span>
              <input value={data.lastName || ''} onChange={e => set('lastName', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1">
              <span className={label}>РД</span>
              <input value={data.regNo || ''} onChange={e => set('regNo', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1">
              <span className={label}>Утас</span>
              <input value={data.phone || ''} onChange={e => set('phone', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1">
              <span className={label}>Төрсөн огноо</span>
              <input type="date" value={data.dob || ''} onChange={e => set('dob', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1">
              <span className={label}>Иргэний үнэмлэх дуусах огноо</span>
              <input type="date" value={data.idExpiryDate || ''} onChange={e => set('idExpiryDate', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
            <label className="space-y-1 col-span-2">
              <span className={label}>Хаяг</span>
              <input value={data.address || ''} onChange={e => set('address', e.target.value)} className={disabledInp} disabled={locked} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <span className={sectionHdr}>
          <Icon size={16} className="text-[#003B5C]" />
          {title}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────
// PERSON FORM (reusable for borrower + guarantor)
// ─────────────────────────────────────────────
const PersonForm = ({ data = {}, onChange, apiUrl, showToast, prefix = '', locked = false }) => {
  const [analyzingId, setAnalyzingId] = useState(false);
  const [idFiles, setIdFiles] = useState([]);
  const [pendingPhoto, setPendingPhoto] = useState(null);

  const set = (field, val) => onChange({ ...data, [field]: val });

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
        gender: d.gender || data.gender,
        citizenship: d.citizenship || data.citizenship,
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

  const disabledInp = inp + (locked ? ' bg-slate-50 text-slate-500 cursor-not-allowed' : '');

  return (
    <div className="space-y-4">
      {/* Lock notice */}
      {locked && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
          <span>🔒</span>
          <span>Хувийн мэдээллийг зөвхөн <strong>Супервайзор</strong> засах боломжтой.</span>
        </div>
      )}

      {/* Profile photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {data.profileImageUrl ? (
            <img src={data.profileImageUrl} alt="Зураг" className="w-16 h-16 rounded-xl object-cover border-2 border-[#003B5C]" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
              <Camera size={20} className="text-slate-400" />
            </div>
          )}
        </div>
        {!locked && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500">Цээж зураг</p>
            <input type="file" accept="image/*" className="hidden" id={`${prefix}selfie`}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) set('profileImageUrl', URL.createObjectURL(f));
              }} />
            <label htmlFor={`${prefix}selfie`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload size={12} /> Зураг сонгох
            </label>
          </div>
        )}
      </div>
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

      {/* ID document + AI */}
      {!locked && (
        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Иргэний үнэмлэх / оршин суугаа газрын лавлагаа</span>
          </div>
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

      {/* Personal info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className={label}>Нэр</span>
          <input value={data.firstName || ''} onChange={e => set('firstName', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Эцэг эхийн нэр</span>
          <input value={data.fatherName || ''} onChange={e => set('fatherName', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Овог</span>
          <input value={data.lastName || ''} onChange={e => set('lastName', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>РД</span>
          <input value={data.regNo || ''} onChange={e => set('regNo', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Утас</span>
          <input value={data.phone || ''} onChange={e => set('phone', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Төрсөн огноо</span>
          <input type="date" value={data.dob || ''} onChange={e => set('dob', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Хүйс</span>
          <select value={data.gender || ''} onChange={e => set('gender', e.target.value)} className={disabledInp} disabled={locked}>
            <option value="">— сонгох —</option>
            <option value="Эрэгтэй">Эрэгтэй</option>
            <option value="Эмэгтэй">Эмэгтэй</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Иргэний үнэмлэх олгосон огноо</span>
          <input type="date" value={data.idIssueDate || ''} onChange={e => set('idIssueDate', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Иргэний үнэмлэх дуусах огноо</span>
          <input type="date" value={data.idExpiryDate || ''} onChange={e => set('idExpiryDate', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className={label}>Бүртгэлийн хаяг</span>
          <input value={data.address || ''} onChange={e => set('address', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className={label}>Имэйл</span>
          <input type="email" value={data.email || ''} onChange={e => set('email', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
      </div>

      {/* Employment */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className={label}>Ажлын байрны төрөл</span>
          <select value={data.employmentType || ''} onChange={e => set('employmentType', e.target.value)} className={inp}>
            <option value="">— сонгох —</option>
            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Ажлын байр / Байгууллага</span>
          <input value={data.employer || ''} onChange={e => set('employer', e.target.value)} className={inp} />
        </label>
        <label className="space-y-1">
          <span className={label}>Ажилд орсон огноо</span>
          <input type="date" value={data.employedSince || ''} onChange={e => set('employedSince', e.target.value)} className={inp} />
        </label>
        <label className="space-y-1">
          <span className={label}>Сарын орлого ₮</span>
          <input
            value={fmtNum(data.monthlyIncome || '')}
            onChange={e => set('monthlyIncome', parseFmtNum(e.target.value))}
            className={inp} inputMode="numeric"
          />
        </label>
        <div className="space-y-1">
          <span className={label}>Орлогын эх сурвалж</span>
          <div className="flex gap-2">
            {['Цалингийн орлого', 'Бизнесийн орлого'].map(t => (
              <button key={t} type="button" onClick={() => set('incomeSource', t)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${data.incomeSource === t ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ORG FORM
// ─────────────────────────────────────────────
const OrgForm = ({ data = {}, onChange, locked = false, apiUrl, showToast }) => {
  const set = (f, v) => { if (!locked) onChange({ ...data, [f]: v }); };
  const disabledInp = inp + (locked ? ' bg-slate-50 text-slate-500 cursor-not-allowed' : '');
  const [analyzingOrg, setAnalyzingOrg] = useState(false);
  const [orgFiles, setOrgFiles] = useState([]);

  const handleOrgAI = async (files) => {
    if (!files?.length) return;
    setAnalyzingOrg(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      const res = await axios.post(`${apiUrl}/api/loans/analyze-org-document`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      const d = res.data;
      onChange({
        ...data,
        orgName:     d.orgName     || data.orgName,
        orgRegNo:    d.orgRegNo    || data.orgRegNo,
        foundedDate: d.foundedDate || data.foundedDate,
        industry:    d.industry    || data.industry,
        ceo:      d.ceoName   ? { ...(data.ceo   || {}), firstName: d.ceoName }   : (data.ceo   || {}),
        owner:    d.ownerName ? { ...(data.owner || {}), firstName: d.ownerName } : (data.owner || {}),
      });
      showToast('Байгууллагын гэрчилгээ уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'Гэрчилгээ унших алдаа', 'error');
    } finally { setAnalyzingOrg(false); }
  };

  return (
    <div className="space-y-3">
      {locked && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
          <span>🔒</span>
          <span>Байгууллагын мэдээллийг зөвхөн <strong>Супервайзор</strong> засах боломжтой.</span>
        </div>
      )}
      {/* Org certificate AI */}
      {!locked && (
        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Улсын бүртгэлийн гэрчилгээ</span>
          </div>
          <FilePickerWithPreview
            files={orgFiles}
            onChange={setOrgFiles}
            accept="image/*,.pdf"
            onAI={handleOrgAI}
            aiLoading={analyzingOrg}
            aiLabel="Гэрчилгээ AI унших"
          />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="space-y-1 md:col-span-2">
          <span className={label}>Байгууллагын нэр</span>
          <input value={data.orgName || ''} onChange={e => set('orgName', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Регистрийн дугаар</span>
          <input value={data.orgRegNo || ''} onChange={e => set('orgRegNo', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Холбоо барих нэр</span>
          <input value={data.contactName || ''} onChange={e => set('contactName', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Холбоо барих утас</span>
          <input value={data.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Байгуулагдсан огноо</span>
          <input type="date" value={data.foundedDate || ''} onChange={e => set('foundedDate', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
        <label className="space-y-1">
          <span className={label}>Ажилчдын тоо</span>
          <select value={data.employeeCount || ''} onChange={e => set('employeeCount', e.target.value)} className={disabledInp} disabled={locked}>
            <option value="">— сонгох —</option>
            {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Жилийн орлого</span>
          <select value={data.revenueRange || ''} onChange={e => set('revenueRange', e.target.value)} className={disabledInp} disabled={locked}>
            <option value="">— сонгох —</option>
            {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Үйл ажиллагааны чиглэл</span>
          <input value={data.industry || ''} onChange={e => set('industry', e.target.value)} className={disabledInp} disabled={locked} />
        </label>
      </div>
      {/* Management persons */}
      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Удирдлагын бүртгэл</p>
        <MiniPersonForm
          title="Гүйцэтгэх захирал"
          data={data.ceo || {}}
          onChange={v => set('ceo', v)}
          apiUrl={apiUrl} showToast={showToast} locked={locked}
          prefix="ceo_"
        />
        <MiniPersonForm
          title="Эзэмшигч / Хувьцаа эзэмшигч"
          data={data.owner || {}}
          onChange={v => set('owner', v)}
          apiUrl={apiUrl} showToast={showToast} locked={locked}
          prefix="owner_"
        />
        <MiniPersonForm
          title="Холбоотой этгээд"
          data={data.relatedPerson || {}}
          onChange={v => set('relatedPerson', v)}
          apiUrl={apiUrl} showToast={showToast} locked={locked}
          prefix="related_"
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CREDIT BUREAU SECTION
// ─────────────────────────────────────────────
const CreditBureauSection = ({ data = {}, onChange, apiUrl, showToast, loanId }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [cbFiles, setCbFiles] = useState([]);
  const [analyzingFico, setAnalyzingFico] = useState(false);
  const [ficoFiles, setFicoFiles] = useState([]);

  const handleAI = async (files) => {
    if (!files?.length) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      fd.append('borrower', JSON.stringify({ regNo: data.regNo || '' }));
      const res = await axios.post(`${apiUrl}/api/loan-research/analyze-credit-reference`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      onChange({ ...data, creditBureauData: res.data });
      showToast('Зээлийн мэдээллийн лавлагаа уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'Credit bureau AI алдаа', 'error');
    } finally { setAnalyzing(false); }
  };

  const handleFicoAI = async (files) => {
    if (!files?.length) return;
    setAnalyzingFico(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      const res = await axios.post(`${apiUrl}/api/loans/analyze-fico-document`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      onChange({ ...data, ficoData: res.data });
      showToast('Зээлийн оноо уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'FICO унших алдаа', 'error');
    } finally { setAnalyzingFico(false); }
  };

  const cb = data.creditBureauData;
  const fico = data.ficoData;
  const ratingColor = {
    'МАШ САЙН': 'text-emerald-600 bg-emerald-50',
    'САЙН': 'text-green-600 bg-green-50',
    'ДУНД': 'text-amber-600 bg-amber-50',
    'МУУ': 'text-orange-600 bg-orange-50',
    'МАШ МУУ': 'text-red-600 bg-red-50',
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-600">Зээлийн мэдээллийн сангийн лавлагаа (PDF)</span>
        </div>
        <FilePickerWithPreview
          files={cbFiles}
          onChange={setCbFiles}
          accept=".pdf,image/*"
          onAI={handleAI}
          aiLoading={analyzing}
          aiLabel="AI шинжилгээ"
        />
      </div>

      {cb && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Нийт үлдэгдэл</p>
              <p className="font-bold text-[#003B5C]">{Number(cb.summary?.totalBalance || 0).toLocaleString('mn-MN')} ₮</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Сарын нийт төлбөр</p>
              <p className="font-bold text-[#003B5C]">{Number(cb.summary?.estimatedMonthlyPayment || 0).toLocaleString('mn-MN')} ₮</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Идэвхтэй зээл</p>
              <p className="font-bold text-[#003B5C]">{cb.summary?.activeLoansCount || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Байгууллагууд</p>
              <p className="font-bold text-[#003B5C] text-xs">{cb.summary?.institutionSummary || '—'}</p>
            </div>
          </div>

          {cb.summary?.hasOverdue && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={13} />
              <span>Хугацаа хэтрэлт байна — хамгийн их {cb.summary.maxOverdueDays} хоног</span>
            </div>
          )}

          {cb.finalRating && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ${ratingColor[cb.finalRating] || 'text-slate-600 bg-slate-50'}`}>
              Эцсийн үнэлгээ: {cb.finalRating}
              {cb.creditBureauScore && <span className="text-xs font-normal ml-1">| Скор: {cb.creditBureauScore}</span>}
            </div>
          )}

          {cb.analysis && (
            <details className="bg-slate-50 rounded-xl border">
              <summary className="px-4 py-3 text-xs font-bold text-slate-600 cursor-pointer select-none">
                AI дүн шинжилгээ харах
              </summary>
              <div className="px-4 pb-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {cb.analysis}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── FICO / SAINSCORE ── */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><ShieldCheck size={13} /> Зээлийн оноо (FICO / Sainscore)</p>
        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
          <FilePickerWithPreview
            files={ficoFiles}
            onChange={setFicoFiles}
            accept=".pdf,image/*"
            onAI={handleFicoAI}
            aiLoading={analyzingFico}
            aiLabel="AI унших"
          />
        </div>

        {fico && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              {fico.ficoScore != null && (
                <div className={`text-center px-5 py-3 rounded-2xl border-2 ${fico.ficoScore >= 700 ? 'border-green-400 bg-green-50' : fico.ficoScore >= 500 ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50'}`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Оноо</p>
                  <p className={`text-3xl font-black ${fico.ficoScore >= 700 ? 'text-green-600' : fico.ficoScore >= 500 ? 'text-amber-600' : 'text-red-600'}`}>{fico.ficoScore}</p>
                  {fico.scoreCategory && <p className="text-xs font-bold text-slate-600 mt-0.5">{fico.scoreCategory}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                {[
                  ['Нэр', fico.customerName],
                  ['РД', fico.regNo],
                  ['Огноо', fico.reportDate],
                  ['Дугаар', fico.reportNumber],
                ].filter(([,v]) => v).map(([lbl, val]) => (
                  <div key={lbl} className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
                    <p className="text-xs font-semibold text-slate-700 truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ['Нээлттэй зээл', fico.openLoansCount],
                ['Хаагдсан зээл', fico.closedLoansCount],
                ['90 хоног хэтрэлт', fico.overdueCount90],
                ['90+ хоног хэтрэлт', fico.overdueCount90Plus],
              ].map(([lbl, val]) => (
                <div key={lbl} className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
                  <p className="text-sm font-bold text-slate-700">{val ?? 0}</p>
                </div>
              ))}
            </div>
            {fico.totalActiveBalance > 0 && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Нийт идэвхтэй үлдэгдэл</span>
                <span className="text-sm font-bold text-[#003B5C]">₮{Number(fico.totalActiveBalance).toLocaleString('mn-MN')}</span>
              </div>
            )}
            {Array.isArray(fico.scoreReasons) && fico.scoreReasons.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Оноонд нөлөөлсөн хүчин зүйлс</p>
                {fico.scoreReasons.map((r, i) => <p key={i} className="text-xs text-amber-800">• {r}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// FIELD LABEL MAP (AI result keys → Mongolian)
// ─────────────────────────────────────────────
const FIELD_LABELS = {
  plateNumber: 'Улсын дугаар', vehicleType: 'Тээврийн хэрэгслийн төрөл', make: 'Марк',
  model: 'Загвар', year: 'Он', color: 'Өнгө', engineNumber: 'Хөдөлгүүрийн дугаар',
  chassisNumber: 'Арлын дугаар', ownerName: 'Эзэмшигчийн нэр', ownerRegNo: 'Эзэмшигчийн РД',
  registrationDate: 'Бүртгэлийн огноо', technicalPassportNumber: 'Техникийн паспортын дугаар',
  certificateNumber: 'Гэрчилгээний дугаар', propertyType: 'Хөрөнгийн төрөл',
  address: 'Хаяг', area: 'Талбай (м²)', purpose: 'Зориулалт', district: 'Дүүрэг',
  khoroo: 'Хороо', blockNumber: 'Байрны дугаар', apartmentNumber: 'Тасалгааны дугаар',
  landArea: 'Газрын талбай', buildingYear: 'Барилга баригдсан он',
};
const fieldLabel = (k) => FIELD_LABELS[k] || k;

// ─────────────────────────────────────────────
// EDIT FIELD MODAL
// ─────────────────────────────────────────────
const EditFieldModal = ({ fieldKey, currentValue, onConfirm, onClose }) => {
  const [newVal, setNewVal] = useState(String(currentValue ?? ''));
  const [reason, setReason] = useState('');
  const unchanged = newVal === String(currentValue ?? '');
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#003B5C]">Талбар засварлах</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <p className="text-xs text-slate-500 mb-0.5">{fieldLabel(fieldKey)}</p>
          <p className="font-semibold text-slate-700">{String(currentValue ?? '—')}</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600">Шинэ утга</span>
          <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#003B5C]" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600">Засварын шалтгаан <span className="text-red-400">*</span></span>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="AI буруу уншсан, баримт тодорхойгүй..."
            className="w-full p-2.5 border rounded-lg text-sm resize-none focus:outline-none focus:border-[#003B5C]" />
        </label>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Болих</button>
          <button disabled={!reason.trim() || unchanged}
            onClick={() => onConfirm(newVal, reason)}
            className="px-4 py-2 text-sm font-bold bg-[#003B5C] text-white rounded-lg hover:bg-[#002d47] disabled:opacity-40 disabled:cursor-not-allowed">
            Баталгаажуулах
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COLLATERAL SECTION
// ─────────────────────────────────────────────
const VALUATION_TYPES = ['real_estate', 'vehicle', 'contract'];

const CollateralSection = ({ items = [], onChange, apiUrl, showToast }) => {
  const [analyzing, setAnalyzing] = useState('');
  const [editingField, setEditingField] = useState(null); // { idx, key, currentValue }
  const [auditOpen, setAuditOpen] = useState({});

  const emptyItem = (type) => ({ type, files: [], aiData: null, fields: {}, auditLog: [], hasPlate: 'yes', plateNumber: '', ownerRelation: '', valuation: { borrowerAmount: '', officerAmount: '', date: '', sourceFiles: [], sourceLink: '', sourceNotes: '', coverageRate: '', notes: '' }, notes: '' });
  const addItem = (type) => onChange([...items, emptyItem(type)]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, patch) => onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const handleAI = async (idx, files, collType) => {
    if (!files?.length) return;
    const endpoint = collType === 'vehicle'
      ? `${apiUrl}/api/loans/analyze-vehicle-document`
      : `${apiUrl}/api/loans/analyze-property-document`;
    setAnalyzing(String(idx));
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      const res = await axios.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      updateItem(idx, { aiData: res.data, fields: { ...res.data } });
      showToast('Барьцааны баримт уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'Барьцаа AI алдаа', 'error');
    } finally { setAnalyzing(''); }
  };

  const canReadAI = (type) => type === 'vehicle' || type === 'real_estate';

  const handleEditConfirm = (newVal, reason) => {
    const { idx, key, currentValue } = editingField;
    const item = items[idx];
    const entry = {
      field: key,
      fieldLabel: fieldLabel(key),
      oldValue: String(currentValue ?? ''),
      newValue: newVal,
      reason,
      changedAt: new Date().toISOString(),
    };
    updateItem(idx, {
      fields: { ...item.fields, [key]: newVal },
      auditLog: [...(item.auditLog || []), entry],
    });
    setEditingField(null);
    showToast('Засвар хадгалагдлаа.');
  };

  return (
    <div className="space-y-4">
      {editingField && (
        <EditFieldModal
          fieldKey={editingField.key}
          currentValue={editingField.currentValue}
          onConfirm={handleEditConfirm}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        {COLLATERAL_TYPES.map(ct => {
          const Icon = ct.icon;
          return (
            <button key={ct.key} onClick={() => addItem(ct.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-slate-50 transition-all">
              <Icon size={13} /> + {ct.label}
            </button>
          );
        })}
      </div>

      {items.map((item, idx) => {
        const meta = COLLATERAL_TYPES.find(c => c.key === item.type) || { label: item.type, icon: FileText };
        const Icon = meta.icon;
        const hasFields = item.fields && Object.keys(item.fields).length > 0;
        const auditEntries = item.auditLog || [];
        const hasValuation = VALUATION_TYPES.includes(item.type);

        return (
          <div key={idx} className="border rounded-xl p-4 space-y-3 bg-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-[#003B5C]">
                <Icon size={14} /> {meta.label}
              </span>
              <div className="flex items-center gap-1">
                {auditEntries.length > 0 && (
                  <button onClick={() => setAuditOpen(p => ({ ...p, [idx]: !p[idx] }))}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 transition-all">
                    <Clock size={12} /> {auditEntries.length} засвар
                  </button>
                )}
                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 ml-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* File upload */}
            <div className="bg-white rounded-xl border p-3 space-y-2">
              <span className="text-xs font-bold text-slate-500">Баримт бичиг</span>
              <FilePickerWithPreview
                files={item.files || []}
                onChange={files => updateItem(idx, { files })}
                accept=".pdf,image/*"
                onAI={canReadAI(item.type) ? (files) => handleAI(idx, files, item.type) : undefined}
                aiLoading={analyzing === String(idx)}
                aiLabel="AI унших"
              />
            </div>

            {/* Manual fields: plate + ownership relation */}
            <div className="bg-white rounded-xl border p-3 space-y-3">
              <p className="text-xs font-bold text-slate-500">Барьцааны мэдээлэл</p>
              {item.type === 'vehicle' && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600">Улсын дугаар</span>
                  <div className="flex gap-2">
                    {['yes', 'no'].map(v => (
                      <button key={v} type="button"
                        onClick={() => updateItem(idx, { hasPlate: v })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${(item.hasPlate ?? 'yes') === v ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#003B5C]'}`}>
                        {v === 'yes' ? 'Дугаартай' : 'Дугааргүй'}
                      </button>
                    ))}
                  </div>
                  {(item.hasPlate ?? 'yes') === 'yes' && (
                    <input
                      value={item.plateNumber || ''}
                      onChange={e => updateItem(idx, { plateNumber: e.target.value })}
                      placeholder="УНА-001"
                      className={inp}
                    />
                  )}
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600">Өмчлөлийн хамаарал</span>
                <select
                  value={item.ownerRelation || ''}
                  onChange={e => updateItem(idx, { ownerRelation: e.target.value })}
                  className={inp}>
                  <option value="">— Сонгох —</option>
                  {item.type === 'vehicle' ? (
                    <>
                      <option value="Өөрийн">Өөрийн</option>
                      <option value="Худалдаж авах">Худалдаж авах</option>
                    </>
                  ) : (
                    <>
                      <option value="Өөрийн">Өөрийн</option>
                      <option value="Түрээсийн">Түрээсийн</option>
                      <option value="Эцэг эхийн">Эцэг эхийн</option>
                      <option value="Гэр бүлийн">Гэр бүлийн</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Fields (AI result, editable) */}
            {hasFields && item.type === 'bank_statement' && (() => {
              const fs = item.fields.frontSheet || {};
              const months = Array.isArray(item.fields.monthlySummary) ? item.fields.monthlySummary : [];
              const warnings = Array.isArray(item.fields.warnings) ? item.fields.warnings : (item.fields.warnings ? [item.fields.warnings] : []);
              const cfb = item.fields.cashFlowBehaviour || {};
              const stabColor = { high: 'text-green-600', medium: 'text-yellow-600', low: 'text-red-500', unknown: 'text-slate-400' };
              const qColor = { strong: 'text-green-600', average: 'text-yellow-600', weak: 'text-red-500', unknown: 'text-slate-400' };
              return (
                <div className="bg-white rounded-xl border p-3 space-y-3">
                  <p className="text-xs font-bold text-slate-500">Дансны хуулгын дүн шинжилгээ</p>
                  {/* Identity */}
                  <div className="grid grid-cols-3 gap-2">
                    {[['customerName','Эзэмшигч'], ['bankName','Банк'], ['accountNumber','Дансны дугаар'],
                      ['periodStart','Хугацаа эхлэл'], ['periodEnd','Хугацаа дуусгавар'], ['coveredMonths','Сарын тоо']
                    ].map(([k, lbl]) => fs[k] !== undefined && fs[k] !== '' && (
                      <div key={k} className="group">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
                        <p className="text-xs font-semibold text-slate-700">{String(fs[k])}</p>
                      </div>
                    ))}
                  </div>
                  {/* Key numbers */}
                  <div className="grid grid-cols-3 gap-2 border-t pt-2">
                    {[
                      ['Нийт орлого', fs.totalIncome, 'text-green-600'],
                      ['Нийт зарлага', fs.totalExpense, 'text-red-500'],
                      ['Цэвэр гүйлгээ', fs.netCashFlow, fs.netCashFlow >= 0 ? 'text-green-600' : 'text-red-500'],
                      ['Дунджийн орлого/сар', fs.averageMonthlyIncome, 'text-green-600'],
                      ['Дунджийн зарлага/сар', fs.averageMonthlyExpense, 'text-red-500'],
                      ['Дунджийн цэвэр/сар', fs.averageMonthlyNetCashFlow, fs.averageMonthlyNetCashFlow >= 0 ? 'text-green-600' : 'text-red-500'],
                    ].map(([lbl, val, cls]) => val !== undefined && (
                      <div key={lbl}>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
                        <p className={`text-xs font-bold ${cls}`}>₮{Number(val || 0).toLocaleString('mn-MN')}</p>
                      </div>
                    ))}
                  </div>
                  {/* Quality */}
                  <div className="grid grid-cols-2 gap-2 border-t pt-2">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Орлогын тогтвортой байдал</p>
                      <p className={`text-xs font-bold ${stabColor[fs.incomeStability] || 'text-slate-500'}`}>{fs.incomeStability || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Cash flow чанар</p>
                      <p className={`text-xs font-bold ${qColor[fs.cashFlowQuality] || 'text-slate-500'}`}>{fs.cashFlowQuality || '—'}</p>
                    </div>
                    {fs.mainIncomeSource && <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Орлогын гол эх үүсвэр</p>
                      <p className="text-xs text-slate-700">{fs.mainIncomeSource}</p>
                    </div>}
                    {fs.repaymentSource && <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Эргэн төлөлтийн эх үүсвэр</p>
                      <p className="text-xs text-slate-700">{fs.repaymentSource}</p>
                    </div>}
                  </div>
                  {/* Monthly table */}
                  {months.length > 0 && (
                    <div className="border-t pt-2 overflow-x-auto">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Сарын дүн</p>
                      <table className="w-full text-[11px]">
                        <thead><tr className="text-slate-400">
                          <th className="text-left pb-1">Сар</th>
                          <th className="text-right pb-1">Орлого</th>
                          <th className="text-right pb-1">Зарлага</th>
                          <th className="text-right pb-1">Цэвэр</th>
                        </tr></thead>
                        <tbody>
                          {months.map((m, mi) => (
                            <tr key={mi} className="border-t border-slate-100">
                              <td className="py-0.5 font-semibold text-slate-600">{m.month}</td>
                              <td className="text-right text-green-600">₮{Number(m.income || 0).toLocaleString('mn-MN')}</td>
                              <td className="text-right text-red-500">₮{Number(m.expense || 0).toLocaleString('mn-MN')}</td>
                              <td className={`text-right font-bold ${m.netCashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>₮{Number(m.netCashFlow || 0).toLocaleString('mn-MN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Анхааруулга</p>
                      {warnings.map((w, wi) => <p key={wi} className="text-xs text-amber-700">• {w}</p>)}
                    </div>
                  )}
                  {/* Key risks */}
                  {fs.keyRisks && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-red-600 uppercase mb-0.5">Гол эрсдэл</p>
                      <p className="text-xs text-red-700">{fs.keyRisks}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {hasFields && item.type !== 'bank_statement' && (
              <div className="bg-white rounded-xl border p-3 space-y-1">
                <p className="text-xs font-bold text-slate-500 mb-2">Мэдээлэл</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(item.fields)
                    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
                    .map(([k, v]) => {
                      const wasEdited = auditEntries.some(e => e.field === k);
                      return (
                        <div key={k} className="group relative">
                          <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                            {fieldLabel(k)}
                            {wasEdited && <span className="text-amber-500 text-[9px] font-bold">✎</span>}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold text-slate-700 flex-1">{String(v)}</p>
                            <button
                              onClick={() => setEditingField({ idx, key: k, currentValue: v })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-[#003B5C] p-0.5 rounded">
                              <Pencil size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Audit log */}
            {auditOpen[idx] && auditEntries.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><Clock size={12} /> Өөрчлөлтийн бүртгэл</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditEntries.map((e, i) => (
                    <div key={i} className="bg-white rounded-lg p-2.5 text-xs border border-amber-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700">{e.fieldLabel || e.field}</span>
                        <span className="text-slate-400">{new Date(e.changedAt).toLocaleString('mn-MN')}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-500 line-through">{e.oldValue || '—'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-green-600 font-semibold">{e.newValue}</span>
                      </div>
                      <p className="text-slate-500 italic">"{e.reason}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valuation */}
            {hasValuation && (() => {
              const val = item.valuation || {};
              const upd = (patch) => updateItem(idx, { valuation: { ...val, ...patch } });
              const officerAmt = Number(val.officerAmount) || 0;
              const covRate = Number(val.coverageRate) || 0;
              const coveredAmt = officerAmt * covRate / 100;
              return (
                <div className="bg-white rounded-xl border p-3 space-y-4">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><BadgeDollarSign size={13} /> Үнэлгээ</p>

                  {/* Row 1: borrower vs officer amounts + date */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-slate-600">Зээлдэгчийн үнэлгээ (₮)</span>
                      <input type="text" inputMode="numeric"
                        value={fmtNum(val.borrowerAmount || '')}
                        onChange={e => upd({ borrowerAmount: parseFmtNum(e.target.value) })}
                        className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#003B5C]" placeholder="0" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-bold text-slate-600">Үнэлгээний огноо</span>
                      <input type="date"
                        value={val.date || ''}
                        onChange={e => upd({ date: e.target.value })}
                        className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#003B5C]" />
                    </label>
                  </div>

                  {/* Loan officer section */}
                  <div className="border border-blue-100 rounded-xl p-3 space-y-3 bg-blue-50/30">
                    <p className="text-xs font-bold text-[#003B5C]">Зээлийн ажилтны үнэлгээ</p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1">
                        <span className="text-xs font-bold text-slate-600">Үнэлгээний дүн (₮)</span>
                        <input type="text" inputMode="numeric"
                          value={fmtNum(val.officerAmount || '')}
                          onChange={e => upd({ officerAmount: parseFmtNum(e.target.value) })}
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]" placeholder="0" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-bold text-slate-600">Барьцаанд авах хувь (%)</span>
                        <input type="number" min="0" max="100" step="1"
                          value={val.coverageRate || ''}
                          onChange={e => upd({ coverageRate: e.target.value })}
                          className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]" placeholder="70" />
                      </label>
                    </div>
                    {/* Covered amount display */}
                    {officerAmt > 0 && covRate > 0 && (
                      <div className="bg-[#003B5C]/5 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Барьцааны хамрах дүн</span>
                        <span className="text-sm font-bold text-[#003B5C]">₮{coveredAmt.toLocaleString('mn-MN')}</span>
                      </div>
                    )}
                    {/* Source */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-600">Үнэлгээний эх үүсвэр</span>
                      <FilePickerWithPreview
                        files={val.sourceFiles || []}
                        onChange={files => upd({ sourceFiles: files })}
                        accept=".pdf,image/*,.xlsx,.docx"
                      />
                      <input
                        value={val.sourceLink || ''}
                        onChange={e => upd({ sourceLink: e.target.value })}
                        className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]"
                        placeholder="Линк оруулах (https://...)" />
                      <textarea
                        value={val.sourceNotes || ''}
                        onChange={e => upd({ sourceNotes: e.target.value })}
                        rows={2}
                        className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C] resize-none"
                        placeholder="Тайлбар..." />
                    </div>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-xs font-bold text-slate-600">Нэмэлт тэмдэглэл</span>
                    <input
                      value={val.notes || ''}
                      onChange={e => upd({ notes: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#003B5C]" />
                  </label>
                </div>
              );
            })()}

            {/* Notes */}
            <label className="space-y-1 block">
              <span className="text-xs font-bold text-slate-600">Тэмдэглэл</span>
              <input value={item.notes || ''} onChange={e => updateItem(idx, { notes: e.target.value })} className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-[#003B5C]" />
            </label>
          </div>
        );
      })}

      {!items.length && (
        <p className="text-sm text-slate-400 text-center py-4">Барьцаа нэмэгдээгүй байна.</p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// BANK STATEMENT RESULT CARD
// ─────────────────────────────────────────────
const BankStatementCard = ({ bs, index, onRemove }) => {
  const fs = bs?.frontSheet || {};
  const months = Array.isArray(bs?.monthlySummary) ? bs.monthlySummary : [];
  const warnings = Array.isArray(bs?.warnings) ? bs.warnings : [];
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-600">Дансны хуулга {index + 1}{fs.bankName ? ` — ${fs.bankName}` : ''}{fs.accountNumber ? ` (${fs.accountNumber})` : ''}</p>
          {bs._fileName && <p className="text-[10px] text-slate-400 mt-0.5">{bs._fileName}</p>}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-1"><X size={13} /></button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[['customerName','Эзэмшигч'],['bankName','Банк'],['accountNumber','Дансны дугаар'],
          ['periodStart','Эхлэх'],['periodEnd','Дуусах'],['coveredMonths','Сарын тоо']
        ].map(([k, lbl]) => fs[k] != null && fs[k] !== '' && (
          <div key={k}><p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
          <p className="text-xs font-semibold text-slate-700">{String(fs[k])}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border-t pt-2">
        {[
          ['Дунджийн орлого/сар', fs.averageMonthlyIncome, 'text-green-600'],
          ['Дунджийн зарлага/сар', fs.averageMonthlyExpense, 'text-red-500'],
          ['Дунджийн цэвэр/сар', fs.averageMonthlyNetCashFlow, (fs.averageMonthlyNetCashFlow||0)>=0?'text-green-600':'text-red-500'],
          ['Нийт орлого', fs.totalIncome, 'text-green-600'],
          ['Нийт зарлага', fs.totalExpense, 'text-red-500'],
          ['Цэвэр гүйлгээ', fs.netCashFlow, (fs.netCashFlow||0)>=0?'text-green-600':'text-red-500'],
        ].map(([lbl, val, cls]) => val != null && (
          <div key={lbl}><p className="text-[10px] text-slate-400 uppercase font-bold">{lbl}</p>
          <p className={`text-xs font-bold ${cls}`}>₮{Number(val||0).toLocaleString('mn-MN')}</p></div>
        ))}
      </div>
      {months.length > 0 && (
        <details className="border-t">
          <summary className="pt-2 text-[10px] text-slate-400 uppercase font-bold cursor-pointer select-none">Сарын дүн ({months.length} сар)</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-slate-400">
                <th className="text-left pb-1">Сар</th>
                <th className="text-right pb-1">Орлого</th>
                <th className="text-right pb-1">Зарлага</th>
                <th className="text-right pb-1">Цэвэр</th>
              </tr></thead>
              <tbody>
                {months.map((m, mi) => (
                  <tr key={mi} className="border-t border-slate-100">
                    <td className="py-0.5 font-semibold text-slate-600">{m.month}</td>
                    <td className="text-right text-green-600">₮{Number(m.income||0).toLocaleString('mn-MN')}</td>
                    <td className="text-right text-red-500">₮{Number(m.expense||0).toLocaleString('mn-MN')}</td>
                    <td className={`text-right font-bold ${(m.netCashFlow||0)>=0?'text-green-600':'text-red-500'}`}>₮{Number(m.netCashFlow||0).toLocaleString('mn-MN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
          <p className="text-[10px] font-bold text-amber-700 uppercase">Анхааруулга</p>
          {warnings.map((w, wi) => <p key={wi} className="text-xs text-amber-700">• {w}</p>)}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// INCOME RESEARCH SECTION
// Props: onBSAppend, onSIChange, onRemoveBS — functional updates to avoid stale closure
// ─────────────────────────────────────────────
const IncomeResearchSection = ({ data = {}, onBSAppend, onSIChange, onRemoveBS, apiUrl, showToast }) => {
  const [analyzingSI, setAnalyzingSI] = useState(false);
  const [siFiles, setSiFiles] = useState([]);
  // Pending bank statement files: each has {id, file, analyzing}
  const [bsPending, setBsPending] = useState([]);
  const bsFileRef = useRef();

  const addBsFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    const entries = arr.map(f => ({ id: Math.random().toString(36).slice(2), file: f, analyzing: false }));
    setBsPending(prev => [...prev, ...entries]);
  };

  const removeBsPending = (id) => setBsPending(prev => prev.filter(e => e.id !== id));

  const handleAnalyzeSingleFile = async (entry) => {
    setBsPending(prev => prev.map(e => e.id === entry.id ? { ...e, analyzing: true } : e));
    try {
      const fd = new FormData();
      fd.append('bankStatements', entry.file);
      const res = await axios.post(`${apiUrl}/api/loan-research/analyze-statement`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      const analysis = { ...res.data, _fileName: entry.file.name };
      onBSAppend(analysis);
      setBsPending(prev => prev.filter(e => e.id !== entry.id));
      showToast(`${entry.file.name} уншигдлаа.`);
    } catch (e) {
      setBsPending(prev => prev.map(e => e.id === entry.id ? { ...e, analyzing: false } : e));
      showToast(`${entry.file.name}: ${e.response?.data?.message || 'Унших алдаа'}`, 'error');
    }
  };

  const handleSocialInsuranceAI = async (files) => {
    if (!files?.length) return;
    setAnalyzingSI(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('bankStatements', f));
      const res = await axios.post(`${apiUrl}/api/loans/analyze-social-insurance`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${getAuthToken()}` },
      });
      onSIChange(res.data);    // set — parent uses functional update
      setSiFiles([]);
      showToast('НД-ийн лавлагаа уншигдлаа.');
    } catch (e) {
      showToast(e.response?.data?.message || 'НД лавлагаа унших алдаа', 'error');
    } finally { setAnalyzingSI(false); }
  };

  const bsAnalyses = Array.isArray(data.bankStatementAnalyses) ? data.bankStatementAnalyses : [];
  const si = data.socialInsuranceAnalysis;

  return (
    <div className="space-y-5">
      {/* Bank statement */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><CreditCard size={13} /> Дансны хуулга</p>
        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
          <p className="text-[10px] text-slate-400">Файл оруулаад файл бүрийн ард "AI унших" товчийг дарж тусдаа уншуулна.</p>
          {/* File picker button */}
          <div>
            <input
              type="file" ref={bsFileRef} accept=".pdf,image/*" multiple className="hidden"
              onChange={e => { addBsFiles(e.target.files); e.target.value = ''; }}
            />
            <button
              onClick={() => bsFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-white transition-all text-slate-600"
            >
              <Upload size={12} /> Файл нэмэх
            </button>
          </div>
          {/* Pending files list — each with its own AI button */}
          {bsPending.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {bsPending.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <FileText size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-700 flex-1 truncate">{entry.file.name}</span>
                  {entry.analyzing ? (
                    <span className="text-[11px] text-blue-600 font-semibold animate-pulse whitespace-nowrap">⏳ Уншиж байна...</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAnalyzeSingleFile(entry)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-[#003B5C] text-white rounded-lg hover:bg-[#00507a] transition-all whitespace-nowrap"
                      >
                        <Sparkles size={11} /> AI унших
                      </button>
                      <button
                        onClick={() => removeBsPending(entry.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {bsAnalyses.map((bs, idx) => (
          <BankStatementCard
            key={idx}
            bs={bs}
            index={idx}
            onRemove={() => onRemoveBS(idx)}
          />
        ))}
      </div>

      {/* Social insurance */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><ShieldCheck size={13} /> НД-ийн шимтгэлийн лавлагаа</p>
        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
          <FilePickerWithPreview
            files={siFiles}
            onChange={setSiFiles}
            accept=".pdf,image/*"
            onAI={handleSocialInsuranceAI}
            aiLoading={analyzingSI}
            aiLabel="AI шинжилгээ"
          />
        </div>
        {si && (
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <p className="text-xs font-bold text-slate-500">НД лавлагааны дүн шинжилгээ</p>

            {/* Summary line */}
            {si.summary && (
              <div className="bg-[#003B5C]/5 border border-[#003B5C]/20 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-[#003B5C]">{si.summary}</p>
              </div>
            )}

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Нэр</p>
                <p className="text-xs font-bold text-slate-700">{si.employeeName || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">РД</p>
                <p className="text-xs font-bold text-slate-700">{si.regNo || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Даатгалтай сар</p>
                <p className="text-sm font-bold text-slate-700">{si.totalInsuranceMonths || 0}</p>
              </div>
              <div className={`rounded-lg p-2.5 text-center ${si.isContinuous ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Тасралтгүй байдал</p>
                <p className={`text-xs font-bold ${si.isContinuous ? 'text-green-600' : 'text-red-600'}`}>
                  {si.isContinuous ? '✓ Тасралтгүй' : `✗ ${(si.gapMonths||[]).length} сар завсар`}
                </p>
              </div>
            </div>

            {/* Salary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-green-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Дундаж цалин</p>
                <p className="text-sm font-bold text-green-600">₮{Number(si.averageSalary||0).toLocaleString('mn-MN')}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Сүүлийн цалин</p>
                <p className="text-sm font-bold text-blue-600">₮{Number(si.lastSalary||0).toLocaleString('mn-MN')}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Хамгийн бага</p>
                <p className="text-xs font-bold text-slate-600">₮{Number(si.minSalary||0).toLocaleString('mn-MN')}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Хамгийн их</p>
                <p className="text-xs font-bold text-slate-600">₮{Number(si.maxSalary||0).toLocaleString('mn-MN')}</p>
              </div>
            </div>

            {/* Employer info */}
            {Array.isArray(si.employers) && si.employers.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ажил олгогч</p>
                  {si.employerChangeCount > 0 ? (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{si.employerChangeCount} удаа солигдсон</span>
                  ) : (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Солигдоогүй</span>
                  )}
                </div>
                {si.employers.map((emp, ei) => (
                  <div key={ei} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-700">{emp.name}</span>
                    <span className="text-slate-400">{emp.fromYear}/{emp.fromMonth} — {emp.toYear}/{emp.toMonth}</span>
                    <span className="text-[#003B5C] font-bold">{emp.monthCount} сар</span>
                  </div>
                ))}
              </div>
            )}

            {/* Salary trend */}
            {si.salaryTrend && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Цалингийн хандлага</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    si.salaryTrend === 'өсөх' ? 'bg-green-50 text-green-600' :
                    si.salaryTrend === 'буурах' ? 'bg-red-50 text-red-600' :
                    si.salaryTrend === 'тогтвортой' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>{si.salaryTrend}</span>
                </div>
                {Array.isArray(si.salaryChanges) && si.salaryChanges.length > 0 && (
                  <div className="space-y-1">
                    {si.salaryChanges.map((ch, ci) => (
                      <div key={ci} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                        <span className="text-slate-400 w-14">{ch.year}/{ch.month}</span>
                        <span className="text-slate-400">₮{Number(ch.oldSalary||0).toLocaleString('mn-MN')}</span>
                        <span className="text-slate-400">→</span>
                        <span className={`font-bold ${ch.direction === 'өссөн' ? 'text-green-600' : 'text-red-500'}`}>₮{Number(ch.newSalary||0).toLocaleString('mn-MN')}</span>
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${ch.direction === 'өссөн' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {ch.direction === 'өссөн' ? '+' : '-'}{Math.abs(ch.changePercent||0).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Gap months warning */}
            {Array.isArray(si.gapMonths) && si.gapMonths.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-red-700 uppercase">Тасалдсан сарууд</p>
                <p className="text-xs text-red-700">{si.gapMonths.map(g => `${g.year}/${g.month}`).join(', ')}</p>
              </div>
            )}

            {/* Detailed analysis */}
            {si.analysis && (
              <details className="border-t">
                <summary className="pt-3 text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none">Дэлгэрэнгүй дүгнэлт харах</summary>
                <div className="mt-2 bg-slate-50 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">{si.analysis}</div>
              </details>
            )}

            {/* Monthly table */}
            {Array.isArray(si.insuranceItems) && si.insuranceItems.length > 0 && (
              <details className="border-t">
                <summary className="pt-3 text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none">Сарын дэлгэрэнгүй ({si.insuranceItems.length} мөр)</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-slate-400">
                      <th className="text-left pb-1">Он/Сар</th>
                      <th className="text-left pb-1">Ажил олгогч</th>
                      <th className="text-right pb-1">Цалин</th>
                      <th className="text-right pb-1">Шимтгэл</th>
                      <th className="text-center pb-1">Төлсөн</th>
                    </tr></thead>
                    <tbody>
                      {si.insuranceItems.map((m, mi) => (
                        <tr key={mi} className="border-t border-slate-100">
                          <td className="py-0.5 font-semibold text-slate-600">{m.year}/{m.month}</td>
                          <td className="text-slate-500 max-w-[120px] truncate">{m.employerName}</td>
                          <td className="text-right text-green-600">₮{Number(m.salary||0).toLocaleString('mn-MN')}</td>
                          <td className="text-right text-slate-500">₮{Number(m.insuranceAmount||0).toLocaleString('mn-MN')}</td>
                          <td className="text-center">{m.isPaid ? <span className="text-green-500">✓</span> : <span className="text-red-500">✗</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const LoanApplicationDetail = ({ loan, apiUrl, onSave, onSaved, createMode = false, onCancel, onCreated, user, onGoToResearch }) => {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [activeTab, setActiveTab] = useState('borrower'); // 'borrower' | 'guarantors'
  const [borrowerSubTab, setBorrowerSubTab] = useState('loan_info');
  const [selectedGuarantorIdx, setSelectedGuarantorIdx] = useState(0);
  const [guarantorSubTab, setGuarantorSubTab] = useState('loan_info');
  const isAdmin = user?.role === 'admin';
  // Personal info locked for existing loans unless admin unlocks
  const [personalUnlocked, setPersonalUnlocked] = useState(false);
  const personalLocked = !createMode && !isAdmin && !personalUnlocked;

  const showToast = useCallback((message, type = 'success') => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ message, type });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Application data state
  const [appData, setAppData] = useState(() => {
    const saved = loan?.applicationData || {};
    return {
      // Borrower type
      borrowerType: loan?.userType || saved.borrowerType || 'individual',

      // Individual borrower
      borrower: saved.borrower || {
        lastName: loan?.lastname || '',
        firstName: loan?.firstname || '',
        fatherName: loan?.fatherName || '',
        regNo: loan?.regNo || '',
        phone: loan?.phone || '',
        email: loan?.email || '',
        address: '',
        dob: '',
        gender: '',
        idIssueDate: '',
        idExpiryDate: '',
        employmentType: '',
        employer: '',
        employedSince: '',
        monthlyIncome: '',
        incomeSource: '',
        profileImageUrl: loan?.selfieUrl || '',
        citizenship: 'Монгол',
      },

      // Organization
      org: saved.org || {
        orgName: loan?.orgName || '',
        orgRegNo: loan?.orgRegNo || '',
        contactName: loan?.contactName || '',
        contactPhone: loan?.contactPhone || '',
        foundedDate: '',
        employeeCount: '',
        revenueRange: '',
        industry: '',
        ceo: {},
        owner: {},
        relatedPerson: {},
      },

      // Emergency contacts
      emergencyContacts: saved.emergencyContacts || [{ name: '', relation: '', phone: '' }],

      // Other loans (manual)
      otherLoans: saved.otherLoans || [],

      // Credit bureau AI result
      creditBureau: saved.creditBureau || {},

      // Co-borrowers / guarantors (array)
      guarantors: saved.guarantors || (
        // migrate old single guarantor
        saved.hasGuarantor && saved.guarantor ? [{
          guarantorType: saved.guarantorType || 'Хамтран зээлдэгч',
          personType: saved.guarantorPersonType || 'individual',
          person: saved.guarantor || {},
          org: saved.guarantorOrg || {},
          creditBureau: {},
          collaterals: [],
        }] : []
      ),

      // Loan request
      loanRequest: saved.loanRequest || {
        amount: loan?.amount ? String(loan.amount) : '',
        product: loan?.selectedProduct || 'cons_loan',
        term: loan?.term ? String(loan.term) : '',
        purpose: loan?.purpose || '',
        repaymentStartDate: '',
        repaymentType: 'equal',
        graceMonths: '',
      },

      // Collateral
      collaterals: saved.collaterals || [],

      // Income research (bank statements array + social insurance AI)
      incomeResearch: saved.incomeResearch || {
        bankStatementAnalyses: [],
        socialInsuranceAnalysis: null,
      },

      // Other docs notes
      otherDocsNotes: saved.otherDocsNotes || '',
    };
  });

  // Re-init when loan changes
  useEffect(() => {
    if (!loan) return;
    const saved = loan.applicationData || {};
    setAppData(prev => ({
      ...prev,
      borrowerType: loan.userType || saved.borrowerType || prev.borrowerType,
      borrower: saved.borrower || {
        ...prev.borrower,
        lastName: loan.lastname || prev.borrower?.lastName || '',
        firstName: loan.firstname || prev.borrower?.firstName || '',
        fatherName: loan.fatherName || prev.borrower?.fatherName || '',
        regNo: loan.regNo || prev.borrower?.regNo || '',
        phone: loan.phone || prev.borrower?.phone || '',
        profileImageUrl: loan.selfieUrl || prev.borrower?.profileImageUrl || '',
      },
      org: saved.org || {
        ...prev.org,
        orgName: loan.orgName || prev.org?.orgName || '',
        orgRegNo: loan.orgRegNo || prev.org?.orgRegNo || '',
        contactName: loan.contactName || prev.org?.contactName || '',
        contactPhone: loan.contactPhone || prev.org?.contactPhone || '',
      },
      loanRequest: saved.loanRequest || {
        amount: loan.amount ? String(loan.amount) : prev.loanRequest?.amount || '',
        product: loan.selectedProduct || prev.loanRequest?.product || 'cons_loan',
        term: loan.term ? String(loan.term) : prev.loanRequest?.term || '',
        purpose: loan.purpose || prev.loanRequest?.purpose || '',
      },
    }));
  }, [loan?._id]);

  const set = (field, val) => setAppData(prev => ({ ...prev, [field]: val }));

  // ── Emergency contacts helpers ────────────
  const addContact = () => {
    if (appData.emergencyContacts.length >= 3) return;
    set('emergencyContacts', [...appData.emergencyContacts, { name: '', relation: '', phone: '' }]);
  };
  const updateContact = (idx, patch) => {
    set('emergencyContacts', appData.emergencyContacts.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };
  const removeContact = (idx) => {
    set('emergencyContacts', appData.emergencyContacts.filter((_, i) => i !== idx));
  };

  // ── Other loans helpers ───────────────────
  const addOtherLoan = () => set('otherLoans', [...appData.otherLoans, { institution: '', balance: '', monthlyPayment: '', type: '' }]);
  const updateOtherLoan = (idx, patch) => set('otherLoans', appData.otherLoans.map((l, i) => i === idx ? { ...l, ...patch } : l));
  const removeOtherLoan = (idx) => set('otherLoans', appData.otherLoans.filter((_, i) => i !== idx));

  // ── Build payload ────────────────────────
  const buildPayload = () => {
    const payload = { applicationData: appData };
    if (appData.borrowerType === 'individual') {
      payload.userType = 'individual';
      payload.lastname = appData.borrower.lastName;
      payload.firstname = appData.borrower.firstName;
      payload.fatherName = appData.borrower.fatherName;
      payload.regNo = appData.borrower.regNo;
      payload.phone = appData.borrower.phone;
      payload.email = appData.borrower.email;
    } else {
      payload.userType = 'organization';
      payload.orgName = appData.org.orgName;
      payload.orgRegNo = appData.org.orgRegNo;
      payload.contactName = appData.org.contactName;
      payload.contactPhone = appData.org.contactPhone;
    }
    payload.amount = parseFmtNum(appData.loanRequest.amount) || 0;
    payload.selectedProduct = appData.loanRequest.product;
    payload.term = Number(appData.loanRequest.term) || 0;
    payload.purpose = appData.loanRequest.purpose;
    return payload;
  };

  // ── Save (edit) ───────────────────────────
  const handleSave = async () => {
    if (createMode) {
      // CREATE
      setSaving(true);
      try {
        const payload = buildPayload();
        const res = await axios.post(`${apiUrl}/api/loans/staff`, payload, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        });
        showToast('Шинэ хүсэлт амжилттай үүсгэгдлээ.');
        if (onCreated) onCreated(res.data);
      } catch (e) {
        showToast(e.response?.data?.message || 'Үүсгэхэд алдаа гарлаа.', 'error');
      } finally { setSaving(false); }
      return;
    }
    // UPDATE
    if (!loan?._id) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      payload.amount = payload.amount || loan.amount;
      payload.term = payload.term || loan.term;
      const res = await axios.put(`${apiUrl}/api/loans/${loan._id}`, payload, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      showToast('Аппликэйшн хадгалагдлаа.');
      if (onSaved) onSaved(res.data);
    } catch (e) {
      showToast(e.response?.data?.message || 'Хадгалахад алдаа гарлаа.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl font-bold text-sm ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#003B5C] text-white'}`}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── BORROWER TYPE ── */}
      <div className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-600">Зээлдэгчийн төрөл:</span>
          {createMode ? (
            <div className="flex gap-2">
              <button onClick={() => set('borrowerType', 'individual')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${appData.borrowerType === 'individual' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
                <User size={14} /> Иргэн
              </button>
              <button onClick={() => set('borrowerType', 'organization')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${appData.borrowerType === 'organization' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
                <Building2 size={14} /> Байгууллага
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#003B5C] text-white">
              {appData.borrowerType === 'organization' ? <><Building2 size={14} /> Байгууллага</> : <><User size={14} /> Иргэн</>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
        {/* Go to research button */}
        {onGoToResearch && !createMode && loan?._id && (
          <button
            onClick={() => onGoToResearch(loan)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-[#00A651] text-[#00A651] bg-white hover:bg-green-50 transition-all">
            <TrendingUp size={13} /> Зээлийн судалгаа
          </button>
        )}
        {/* Admin unlock button */}
        {!createMode && isAdmin && (
          <button
            onClick={() => setPersonalUnlocked(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${personalUnlocked ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-300 hover:border-amber-400'}`}>
            {personalUnlocked ? '🔓 Засварлаж байна' : '🔒 Хувийн мэдээлэл засах'}
          </button>
        )}
        </div>
      </div>

      {/* ── MAIN TABS ── */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="flex">
          {[
            { key: 'borrower',   label: appData.borrowerType === 'organization' ? 'Үндсэн байгууллага' : 'Үндсэн зээлдэгч', icon: User },
            { key: 'guarantors', label: `Хамтран / Батлан даагч${appData.guarantors.length ? ` (${appData.guarantors.length})` : ''}`, icon: Users },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all
                  ${isActive ? 'border-[#003B5C] text-[#003B5C] bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-[#003B5C] hover:bg-slate-50'}`}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BORROWER MAIN TAB ── */}
      {activeTab === 'borrower' && (
        <div className="space-y-3">
          {/* Borrower sub-tab bar */}
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="flex overflow-x-auto">
              {[
                { key: 'loan_info',  label: 'Зээлийн мэдээлэл', icon: Briefcase },
                { key: 'income',     label: 'Орлогын байдал',   icon: TrendingUp },
                { key: 'collateral', label: 'Барьцаа хөрөнгө',  icon: Home },
                { key: 'other',      label: 'Зээлийн мэдээллийн лавлагаа', icon: FileText },
              ].map(t => {
                const Icon = t.icon;
                const isActive = borrowerSubTab === t.key;
                return (
                  <button key={t.key} onClick={() => setBorrowerSubTab(t.key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap
                      ${isActive ? 'border-[#003B5C] text-[#003B5C] bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-[#003B5C] hover:bg-slate-50'}`}>
                    <Icon size={13} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Borrower sub: Зээлийн мэдээлэл */}
          {borrowerSubTab === 'loan_info' && (
            <div className="space-y-4">
              <div className="bg-white border rounded-2xl p-5">
                {appData.borrowerType === 'individual'
                  ? <PersonForm data={appData.borrower} onChange={v => set('borrower', v)} apiUrl={apiUrl} showToast={showToast} prefix="borrower_" locked={personalLocked} />
                  : <OrgForm data={appData.org} onChange={v => set('org', v)} locked={personalLocked} apiUrl={apiUrl} showToast={showToast} />
                }
              </div>
              <div className="bg-white border rounded-2xl p-5 space-y-4">
                <p className={sectionHdr}><Briefcase size={15} /> Зээлийн хүсэлт</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="space-y-1">
                    <span className={label}>Зээлийн бүтээгдэхүүн</span>
                    <select value={appData.loanRequest.product} onChange={e => set('loanRequest', { ...appData.loanRequest, product: e.target.value })} className={inp}>
                      {Object.entries(PRODUCTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className={label}>Зээлийн дүн ₮</span>
                    <input value={fmtNum(appData.loanRequest.amount)} onChange={e => set('loanRequest', { ...appData.loanRequest, amount: parseFmtNum(e.target.value) })} className={inp} inputMode="numeric" />
                  </label>
                  <label className="space-y-1">
                    <span className={label}>Хугацаа (сар)</span>
                    <input value={fmtNum(appData.loanRequest.term)} onChange={e => set('loanRequest', { ...appData.loanRequest, term: parseFmtNum(e.target.value) })} className={inp} inputMode="numeric" />
                  </label>
                  <label className="space-y-1 col-span-2 md:col-span-4">
                    <span className={label}>Зориулалт / Зорилго</span>
                    <input value={appData.loanRequest.purpose} onChange={e => set('loanRequest', { ...appData.loanRequest, purpose: e.target.value })} className={inp} />
                  </label>
                </div>
              </div>
              {appData.borrowerType === 'individual' && (
                <div className="bg-white border rounded-2xl p-5 space-y-3">
                  <p className={sectionHdr}><Users size={15} /> Яаралтай холбоо барих</p>
                  {appData.emergencyContacts.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3 items-end">
                      <label className="space-y-1"><span className={label}>Нэр</span>
                        <input value={c.name} onChange={e => updateContact(idx, { name: e.target.value })} className={inp} /></label>
                      <label className="space-y-1"><span className={label}>Холбоо</span>
                        <input value={c.relation} onChange={e => updateContact(idx, { relation: e.target.value })} className={inp} placeholder="Эцэг, ах, эгч..." /></label>
                      <div className="flex gap-2">
                        <label className="space-y-1 flex-1"><span className={label}>Утас</span>
                          <input value={c.phone} onChange={e => updateContact(idx, { phone: e.target.value })} className={inp} /></label>
                        {appData.emergencyContacts.length > 1 && (
                          <button onClick={() => removeContact(idx)} className="mt-5 p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  {appData.emergencyContacts.length < 3 && (
                    <button onClick={addContact} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] hover:underline">
                      <Plus size={13} /> Холбоо нэмэх
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Borrower sub: Орлогын байдал */}
          {borrowerSubTab === 'income' && (
            <div className="bg-white border rounded-2xl p-5">
              <IncomeResearchSection
                data={appData.incomeResearch}
                onBSAppend={v => setAppData(prev => ({ ...prev, incomeResearch: { ...prev.incomeResearch, bankStatementAnalyses: [...(prev.incomeResearch?.bankStatementAnalyses || []), v] } }))}
                onSIChange={v => setAppData(prev => ({ ...prev, incomeResearch: { ...prev.incomeResearch, socialInsuranceAnalysis: v } }))}
                onRemoveBS={idx => setAppData(prev => ({ ...prev, incomeResearch: { ...prev.incomeResearch, bankStatementAnalyses: (prev.incomeResearch?.bankStatementAnalyses || []).filter((_, i) => i !== idx) } }))}
                apiUrl={apiUrl} showToast={showToast}
              />
            </div>
          )}

          {/* Borrower sub: Барьцаа хөрөнгө */}
          {borrowerSubTab === 'collateral' && (
            <div className="bg-white border rounded-2xl p-5 space-y-4">
              <CollateralSection items={appData.collaterals} onChange={v => set('collaterals', v)} apiUrl={apiUrl} showToast={showToast} />
              {(() => {
                const loanAmt = parseFmtNum(appData.loanRequest?.amount) || 0;
                const rows = appData.collaterals.filter(c => ['real_estate','vehicle','contract'].includes(c.type));
                if (!rows.length) return null;
                const totalOfficer = rows.reduce((s, c) => s + (Number(c.valuation?.officerAmount) || 0), 0);
                const totalCovered = rows.reduce((s, c) => { const a = Number(c.valuation?.officerAmount) || 0; const r = Number(c.valuation?.coverageRate) || 0; return s + a * r / 100; }, 0);
                const coverPct = loanAmt > 0 ? (totalCovered / loanAmt * 100).toFixed(1) : null;
                const ok = Number(coverPct) >= 100;
                return (
                  <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><BadgeDollarSign size={13} /> Барьцааны нэгтгэл</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-lg p-2.5"><p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Нийт үнэлгээ</p><p className="text-sm font-bold">₮{totalOfficer.toLocaleString('mn-MN')}</p></div>
                      <div className="bg-white rounded-lg p-2.5"><p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Барьцааны хамрах дүн</p><p className="text-sm font-bold">₮{totalCovered.toLocaleString('mn-MN')}</p></div>
                      <div className={`rounded-lg p-2.5 ${ok ? 'bg-green-50' : 'bg-red-50'}`}><p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Зээлийг хамрах %</p>
                        {coverPct !== null ? <p className={`text-sm font-bold ${ok ? 'text-green-600' : 'text-red-500'}`}>{coverPct}%</p> : <p className="text-xs text-slate-400">Зээлийн дүн оруулна уу</p>}
                      </div>
                    </div>
                    {rows.map((c, i) => { const meta = COLLATERAL_TYPES.find(x => x.key === c.type); const oAmt = Number(c.valuation?.officerAmount) || 0; const rate = Number(c.valuation?.coverageRate) || 0; const cov = oAmt * rate / 100; return (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-600 border-t pt-2">
                        <span className="font-semibold">{meta?.label || c.type} {i + 1}</span>
                        <span>Ажилтны үнэлгээ: ₮{oAmt.toLocaleString('mn-MN')}</span>
                        <span>{rate}% → ₮{cov.toLocaleString('mn-MN')}</span>
                      </div>
                    ); })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Borrower sub: Бусад */}
          {borrowerSubTab === 'other' && (
            <div className="space-y-4">
              <div className="bg-white border rounded-2xl p-5 space-y-3">
                <p className={sectionHdr}><CreditCard size={15} /> Бусад зээлийн мэдээлэл</p>
                {appData.otherLoans.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-3 items-end">
                    <label className="space-y-1"><span className={label}>Байгууллага</span><input value={l.institution} onChange={e => updateOtherLoan(idx, { institution: e.target.value })} className={inp} /></label>
                    <label className="space-y-1"><span className={label}>Зээлийн төрөл</span><input value={l.type} onChange={e => updateOtherLoan(idx, { type: e.target.value })} className={inp} /></label>
                    <label className="space-y-1"><span className={label}>Үлдэгдэл ₮</span><input value={fmtNum(l.balance)} onChange={e => updateOtherLoan(idx, { balance: parseFmtNum(e.target.value) })} className={inp} inputMode="numeric" /></label>
                    <div className="flex gap-2">
                      <label className="space-y-1 flex-1"><span className={label}>Сарын төлбөр ₮</span><input value={fmtNum(l.monthlyPayment)} onChange={e => updateOtherLoan(idx, { monthlyPayment: parseFmtNum(e.target.value) })} className={inp} inputMode="numeric" /></label>
                      <button onClick={() => removeOtherLoan(idx)} className="mt-5 p-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={addOtherLoan} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] hover:underline"><Plus size={13} /> Зээл нэмэх</button>
              </div>
              <div className="bg-white border rounded-2xl p-5 space-y-4">
                <p className={sectionHdr}><CreditCard size={15} /> Зээлийн мэдээллийн лавлагаа (Credit Bureau / FICO)</p>
                <CreditBureauSection data={appData.creditBureau} onChange={v => set('creditBureau', v)} apiUrl={apiUrl} showToast={showToast} loanId={loan?._id} />
              </div>
              <div className="bg-white border rounded-2xl p-5">
                <p className={sectionHdr + ' mb-4'}><FileText size={15} /> Бусад баримт бичгийн тэмдэглэл</p>
                <textarea value={appData.otherDocsNotes} onChange={e => set('otherDocsNotes', e.target.value)} rows={4} className={inp + ' resize-none'} placeholder="Бусад баримт, тэмдэглэл..." />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GUARANTORS MAIN TAB ── */}
      {activeTab === 'guarantors' && (
        <div className="space-y-3">
          {/* Guarantor selector chips + add button */}
          <div className="bg-white border rounded-2xl p-4 flex items-center gap-2 flex-wrap">
            {appData.guarantors.map((g, gIdx) => {
              const name = g.personType === 'organization'
                ? (g.org?.orgName || `Хамтрагч ${gIdx + 1}`)
                : [g.person?.firstName, g.person?.fatherName].filter(Boolean).join(' ') || g.person?.lastName || `Хамтрагч ${gIdx + 1}`;
              const isActive = selectedGuarantorIdx === gIdx;
              const isBD = g.guarantorType === 'Батлан даагч';
              return (
                <button key={gIdx}
                  onClick={() => { setSelectedGuarantorIdx(gIdx); setGuarantorSubTab('loan_info'); }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${isActive ? 'border-[#003B5C] bg-[#003B5C] text-white shadow-md' : 'border-slate-200 text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C]'}`}>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isBD ? (isActive ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700') : (isActive ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700')}`}>
                    {isBD ? 'БД' : 'ХЗ'}
                  </span>
                  {name}
                  <span onClick={e => { e.stopPropagation(); const newList = appData.guarantors.filter((_, i) => i !== gIdx); set('guarantors', newList); if (selectedGuarantorIdx >= newList.length) setSelectedGuarantorIdx(Math.max(0, newList.length - 1)); }}
                    className={`ml-1 rounded p-0.5 cursor-pointer ${isActive ? 'hover:bg-white/20' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}>
                    <X size={12} />
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => { const newIdx = appData.guarantors.length; set('guarantors', [...appData.guarantors, { guarantorType: 'Хамтран зээлдэгч', personType: 'individual', person: {}, org: {}, creditBureau: {}, collaterals: [] }]); setSelectedGuarantorIdx(newIdx); setGuarantorSubTab('loan_info'); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-dashed border-slate-300 text-slate-500 hover:border-[#003B5C] hover:text-[#003B5C] transition-all">
              <Plus size={14} /> Хамтрагч нэмэх
            </button>
          </div>

          {appData.guarantors.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-sm">Хамтран зээлдэгч / Батлан даагч бүртгээгүй байна</p>
              <p className="text-xs mt-1">Дээрх товчийг дарж нэмнэ үү</p>
            </div>
          ) : (() => {
            const gIdx = Math.min(selectedGuarantorIdx, appData.guarantors.length - 1);
            const g = appData.guarantors[gIdx];
            const updateG = (patch) => set('guarantors', appData.guarantors.map((x, i) => i === gIdx ? { ...x, ...patch } : x));
            return (
              <div className="space-y-3">
                {/* Type / PersonType selector */}
                <div className="bg-white border rounded-2xl p-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Төрөл:</span>
                    {GUARANTOR_TYPES.map(t => (
                      <button key={t} onClick={() => updateG({ guarantorType: t })}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${g.guarantorType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Батлан даагчийн төрөл:</span>
                    <button onClick={() => updateG({ personType: 'individual' })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${(g.personType || 'individual') === 'individual' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
                      <User size={12} /> Иргэн
                    </button>
                    <button onClick={() => updateG({ personType: 'organization' })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${g.personType === 'organization' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
                      <Building2 size={12} /> Байгууллага
                    </button>
                  </div>
                </div>

                {/* Guarantor sub-tab bar */}
                <div className="bg-white border rounded-2xl overflow-hidden">
                  <div className="flex overflow-x-auto">
                    {[
                      { key: 'loan_info',  label: 'Зээлийн мэдээлэл', icon: CreditCard },
                      { key: 'income',     label: 'Орлогын байдал',   icon: TrendingUp },
                      { key: 'collateral', label: 'Барьцаа хөрөнгө',  icon: Home },
                      { key: 'other',      label: 'Зээлийн мэдээллийн лавлагаа', icon: FileText },
                    ].map(t => {
                      const Icon = t.icon;
                      const isActive = guarantorSubTab === t.key;
                      return (
                        <button key={t.key} onClick={() => setGuarantorSubTab(t.key)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap
                            ${isActive ? 'border-[#003B5C] text-[#003B5C] bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-[#003B5C] hover:bg-slate-50'}`}>
                          <Icon size={13} /> {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guarantor sub: Зээлийн мэдээлэл */}
                {guarantorSubTab === 'loan_info' && (
                  <div className="space-y-4">
                    <div className="bg-white border rounded-2xl p-5">
                      {(g.personType || 'individual') === 'individual'
                        ? <PersonForm data={g.person || {}} onChange={v => updateG({ person: v })} apiUrl={apiUrl} showToast={showToast} prefix={`g${gIdx}_`} locked={personalLocked} />
                        : <OrgForm data={g.org || {}} onChange={v => updateG({ org: v })} locked={personalLocked} apiUrl={apiUrl} showToast={showToast} />
                      }
                    </div>
                    <div className="bg-white border rounded-2xl p-5 space-y-4">
                      <p className={sectionHdr}><CreditCard size={15} /> Зээлийн мэдээллийн лавлагаа (Credit Bureau / FICO)</p>
                      <CreditBureauSection data={g.creditBureau || {}} onChange={v => updateG({ creditBureau: v })} apiUrl={apiUrl} showToast={showToast} />
                    </div>
                  </div>
                )}

                {/* Guarantor sub: Орлогын байдал */}
                {guarantorSubTab === 'income' && (
                  <div className="bg-white border rounded-2xl p-5 space-y-4">
                    <p className={sectionHdr}><TrendingUp size={15} /> Орлогын мэдээлэл</p>
                    {(g.personType || 'individual') === 'individual' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1"><span className={label}>Сарын орлого ₮</span>
                          <input value={fmtNum(g.person?.monthlyIncome || '')} onChange={e => updateG({ person: { ...g.person, monthlyIncome: parseFmtNum(e.target.value) } })} className={inp} inputMode="numeric" placeholder="₮" /></label>
                        <label className="space-y-1"><span className={label}>Ажил эрхлэлтийн хэлбэр</span>
                          <select value={g.person?.employmentType || ''} onChange={e => updateG({ person: { ...g.person, employmentType: e.target.value } })} className={inp}>
                            <option value="">— сонгох —</option>
                            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select></label>
                        <label className="space-y-1"><span className={label}>Ажил олгогч</span>
                          <input value={g.person?.employer || ''} onChange={e => updateG({ person: { ...g.person, employer: e.target.value } })} className={inp} /></label>
                        <label className="space-y-1"><span className={label}>Ажилд орсон огноо</span>
                          <input type="date" value={g.person?.employedSince || ''} onChange={e => updateG({ person: { ...g.person, employedSince: e.target.value } })} className={inp} /></label>
                      </div>
                    ) : (
                      <label className="space-y-1 max-w-xs"><span className={label}>Сарын орлого / Эргэлт ₮</span>
                        <input value={fmtNum(g.org?.monthlyRevenue || '')} onChange={e => updateG({ org: { ...g.org, monthlyRevenue: parseFmtNum(e.target.value) } })} className={inp} inputMode="numeric" placeholder="₮" /></label>
                    )}
                  </div>
                )}

                {/* Guarantor sub: Барьцаа хөрөнгө */}
                {guarantorSubTab === 'collateral' && (
                  <div className="bg-white border rounded-2xl p-5 space-y-4">
                    <p className={sectionHdr}><Home size={15} /> Барьцаа хөрөнгө</p>
                    <CollateralSection items={g.collaterals || []} onChange={v => updateG({ collaterals: v })} apiUrl={apiUrl} showToast={showToast} />
                  </div>
                )}

                {/* Guarantor sub: Бусад */}
                {guarantorSubTab === 'other' && (
                  <div className="bg-white border rounded-2xl p-5 space-y-4">
                    <p className={sectionHdr}><FileText size={15} /> Бусад тэмдэглэл</p>
                    <textarea value={g.notes || ''} onChange={e => updateG({ notes: e.target.value })} rows={4} className={inp + ' resize-none'} placeholder="Нэмэлт тэмдэглэл..." />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SAVE ── */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {createMode && onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl font-bold text-sm border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all"
          >
            Болих
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-[#00527f] disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Хадгалж байна...' : (createMode ? 'Хүсэлт үүсгэх' : 'Хадгалах')}
        </button>
      </div>
    </div>
  );
};

export default LoanApplicationDetail;
