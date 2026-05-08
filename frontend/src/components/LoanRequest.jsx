import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import {
  ArrowLeft, Send, CheckCircle, User, Phone, FileText, Wallet,
  Car, Home, Building2, X, UploadCloud, Users, Briefcase,
  ChevronRight, ChevronLeft, AlertCircle, Loader2, Camera,
  Shield, Plus, Trash2, BadgeCheck, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';

// ─────────────────────────────────────────────
import { LOAN_PRODUCTS } from '@shared/loanFormConfig';
import {
  INDIVIDUAL_FIELDS, EMPLOYMENT_FIELDS,
  ORG_FIELDS, CONTACT_PERSON_FIELDS,
  COLLATERAL_VEHICLE_FIELDS, COLLATERAL_REALESTATE_FIELDS,
  GUARANTOR_FIELDS,
} from '@shared/loanFormSchema';

const PRODUCT_ID_MAP = { 1: 'biz_loan', 2: 'car_purchase_loan', 3: 'cons_loan', 5: 'credit_card', 6: 're_loan', 7: 'line_loan' };

const STEPS = [
  { n: 1, label: 'Бүтээгдэхүүн' },
  { n: 2, label: 'Зээлдэгч' },
  { n: 3, label: 'Мэдээлэл' },
  { n: 4, label: 'Нөхцөл' },
  { n: 5, label: 'Барьцаа' },
  { n: 6, label: 'Батлан даагч' },
  { n: 7, label: 'Баримт' },
  { n: 8, label: 'Илгээх' },
];

const EMPTY_GUARANTOR = { guarantorType: 'Хамтран зээлдэгч', lastName: '', firstName: '', fatherName: '', regNo: '', phone: '', address: '' };
const EMPTY_COLLATERAL = { certificateNumber: '', propertyType: '', address: '', area: '', district: '', khoroo: '', blockNumber: '', apartmentNumber: '', landArea: '', buildingYear: '', ownerName: '', ownerRegNo: '', ownerRelation: '' };
const EMPTY_VEHICLE = { plateNumber: '', vehicleType: '', make: '', model: '', year: '', color: '', engineNumber: '', chassisNumber: '', technicalPassportNumber: '', ownerName: '', ownerRegNo: '', ownerRelation: '' };
const EMPTY_PERSON = { firstName: '', lastName: '', fatherName: '', regNo: '', phone: '' };

// ─────────────────────────────────────────────
const LoanRequest = ({ onBack, initialProduct }) => {
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const inputRefs = useRef({});
  const activeFieldRef = useRef(null);

  // Org sub-person toggles
  const [showCeo,   setShowCeo]   = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  const isLocal = window.location.hostname === 'localhost';
  const API = isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

  const focusProps = (key) => ({
    ref: (node) => {
      if (node) inputRefs.current[key] = node;
    },
    onFocus: () => {
      activeFieldRef.current = key;
    },
  });

  useLayoutEffect(() => {
    const key = activeFieldRef.current;
    const el = key ? inputRefs.current[key] : null;
    if (!el || document.activeElement === el || !document.body.contains(el)) return;
    el.focus({ preventScroll: true });
    if (typeof el.selectionStart === 'number' && typeof el.setSelectionRange === 'function') {
      const pos = String(el.value || '').length;
      el.setSelectionRange(pos, pos);
    }
  });

  const [formData, setFormData] = useState({
    userType: 'individual',
    // Individual
    lastName: '', firstName: '', fatherName: '', regNo: '', dob: '', phone: '', email: '', address: '',
    gender: '', idIssueDate: '', idExpiryDate: '',
    employmentType: '', employer: '', employedSince: '', monthlyIncome: '', incomeSource: '',
    // Organization
    orgName: '', orgRegNo: '', legalForm: '', contactName: '', contactPosition: '', contactPhone: '', orgAddress: '',
    foundedDate: '', employeeCount: '', revenueRange: '', industry: '',
    orgCeo:   { ...EMPTY_PERSON },
    orgOwner: { ...EMPTY_PERSON },
    // Loan
    selectedProduct: '', amount: '', term: '', repaymentStartDate: '', purpose: '', repaymentSource: '', collateralType: 'real_estate',
    // Collateral
    collateral: { ...EMPTY_COLLATERAL },
    vehicle: { ...EMPTY_VEHICLE },
    // Guarantors
    guarantors: [],
    // Files
    files: {},
  });

  // ─── Initialise product from props ───────────────────────────────────────
  useEffect(() => {
    if (!initialProduct) return;
    const code = PRODUCT_ID_MAP[initialProduct.id] || initialProduct.id;
    setFormData(p => ({
      ...p,
      selectedProduct: code,
      userType: code === 'cons_loan' ? 'individual' : code === 'line_loan' ? 'organization' : p.userType,
    }));
  }, [initialProduct]);

  useEffect(() => {
    const p = formData.selectedProduct;
    if (p === 'car_purchase_loan' || p === 'car_coll_loan')
      setFormData(prev => ({ ...prev, collateralType: 'vehicle' }));
  }, [formData.selectedProduct]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const setColl = (field, value) => setFormData(p => ({ ...p, collateral: { ...p.collateral, [field]: value } }));
  const setVeh  = (field, value) => setFormData(p => ({ ...p, vehicle:    { ...p.vehicle,    [field]: value } }));
  const setCeo  = (field, value) => setFormData(p => ({ ...p, orgCeo:   { ...p.orgCeo,   [field]: value } }));
  const setOwner= (field, value) => setFormData(p => ({ ...p, orgOwner: { ...p.orgOwner, [field]: value } }));

  const fmtAmount = v => {
    const n = v.replace(/[^0-9]/g, '');
    return n ? parseInt(n).toLocaleString() : '';
  };
  const fmtIncome = v => {
    const n = String(v).replace(/[^0-9]/g, '');
    return n ? parseInt(n).toLocaleString() : '';
  };

  const handleChange = e => {
    const { name, value } = e.target;
    if (['term', 'phone', 'contactPhone'].includes(name)) {
      if (value && !/^[0-9]*$/.test(value)) return;
      if ((name.includes('Phone') || name === 'phone') && value.length > 8) return;
      set(name, value); return;
    }
    if (name === 'amount') { set('amount', fmtAmount(value)); return; }
    if (name === 'monthlyIncome') { set('monthlyIncome', fmtAmount(value)); return; }
    if (name === 'regNo') {
      if (value.length <= 2) { if (value && !/^[\u0400-\u04FF]*$/.test(value)) return; set('regNo', value.toUpperCase()); return; }
      const letters = value.slice(0, 2); const digits = value.slice(2);
      if (!/^[0-9]*$/.test(digits) || value.length > 10) return;
      set('regNo', letters + digits); return;
    }
    if (name === 'orgRegNo') { if (value && !/^[0-9]*$/.test(value)) return; if (value.length > 7) return; set('orgRegNo', value); return; }
    set(name, value);
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  // ─── File processing ──────────────────────────────────────────────────────
  const [fileProcessing, setFileProcessing] = useState(false);
  const processFiles = useCallback(async (files, fieldName) => {
    setFileProcessing(true);
    const opts = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
    const out = [];
    for (const f of files) {
      if (f.type === 'application/pdf') { if (f.size < 10 * 1024 * 1024) out.push(f); }
      else if (f.type.startsWith('image/')) {
        try { const c = await imageCompression(f, opts); out.push(new File([c], f.name, { type: f.type })); }
        catch { out.push(f); }
      } else { out.push(f); }
    }
    setFileProcessing(false);
    if (out.length) setFormData(p => ({ ...p, files: { ...p.files, [fieldName]: [...(p.files[fieldName] || []), ...out] } }));
  }, []);

  const handleFileDrop = (e, name) => { e.preventDefault(); processFiles(Array.from(e.dataTransfer.files || []), name); };
  const removeFiles = name => setFormData(p => ({ ...p, files: { ...p.files, [name]: [] } }));

  const onIdFiles = files => processFiles(files, 'file_id');
  const onOrgFiles = files => processFiles(files, 'file_org_cert');
  const onPropertyFiles = files => processFiles(files, 'file_prop_cert');
  const onVehicleFiles = files => processFiles(files, 'file_car_cert');

  // ─── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!formData.selectedProduct) e.selectedProduct = 'Бүтээгдэхүүн сонгоно уу';
    }
    if (step === 3) {
      if (formData.userType === 'individual') {
        if (!formData.lastName)  e.lastName  = 'Овог оруулна уу';
        if (!formData.firstName) e.firstName = 'Нэр оруулна уу';
        if (!formData.regNo || formData.regNo.length < 10) e.regNo = 'Регистр дутуу';
        if (!formData.phone || formData.phone.length < 8)  e.phone = 'Утас дутуу';
        if (!formData.address)   e.address   = 'Хаяг оруулна уу';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'И-мэйл буруу';
      } else {
        if (!formData.orgName)   e.orgName   = 'Байгууллагын нэр';
        if (!formData.orgRegNo || formData.orgRegNo.length < 7) e.orgRegNo = 'Регистр 7 орон';
        if (!formData.contactName)  e.contactName  = 'Холбоо барих нэр';
        if (!formData.contactPhone) e.contactPhone = 'Утас';
      }
    }
    if (step === 4) {
      if (!formData.amount)  e.amount  = 'Дүн оруулна уу';
      if (!formData.term)    e.term    = 'Хугацаа оруулна уу';
      if (parseInt(formData.term) > 120) e.term = 'Хугацаа 120 сараас хэтрэхгүй';
      if (!formData.purpose) e.purpose = 'Зориулалт бичнэ үү';
    }
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  };

  const nextStep = () => { if (validate()) { setStep(p => p + 1); window.scrollTo(0, 0); } };
  const prevStep = () => { setStep(p => p - 1); setErrors({}); window.scrollTo(0, 0); };

  const calcMonthly = () => {
    const P = parseInt((formData.amount || '').replace(/,/g, ''), 10);
    const n = parseInt(formData.term);
    if (!P || !n || n <= 0) return null;
    const r = 0.025;
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toLocaleString();
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      const { files, collateral, vehicle, guarantors, orgCeo, orgOwner, ...scalar } = formData;
      Object.entries(scalar).forEach(([k, v]) => fd.append(k, v));
      fd.set('amount', parseInt((formData.amount || '').replace(/,/g, ''), 10) || 0);
      fd.set('source', 'web');
      fd.set('createdByStaff', 'false');
      // nested objects as JSON strings
      fd.append('collateralJSON',  JSON.stringify(collateral));
      fd.append('vehicleJSON',     JSON.stringify(vehicle));
      fd.append('guarantorsJSON',  JSON.stringify(guarantors));
      fd.append('orgCeoJSON',      JSON.stringify(orgCeo));
      fd.append('orgOwnerJSON',    JSON.stringify(orgOwner));
      // files
      Object.entries(files).forEach(([name, list]) => list.forEach(f => fd.append(name, f)));
      await axios.post(`${API}/api/loans`, fd);
      setShowSuccess(true);
    } catch (err) {
      alert('Алдаа гарлаа: ' + (err.response?.data?.message || 'Сервертэй холбогдож чадсангүй'));
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────
  const inp = (err) => `w-full p-3 bg-white border rounded-xl font-semibold text-[#003B5C] text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#003B5C] focus:ring-4 focus:ring-[#003B5C]/10 transition ${err ? 'border-red-400 bg-red-50' : 'border-slate-200'}`;
  const lbl = 'text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block';

  const Err = ({ msg }) => msg ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{msg}</p> : null;

  // ── Schema field renderer for formData-level fields ───────────────────────
  const renderFormField = (f) => {
    const v = formData[f.key];
    const colCls = `space-y-1${f.col === 2 ? ' col-span-2' : ''}`;
    if (f.type === 'choice') return (
      <div key={f.key} className={colCls}>
        <span className={lbl}>{f.label}</span>
        <div className="flex gap-2 flex-wrap">
          {(f.options || []).map(t => (
            <button key={t} type="button" onClick={() => set(f.key, t)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${v === t ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C]'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
    );
    if (f.type === 'select') return (
      <label key={f.key} className={colCls}>
        <span className={lbl}>{f.label}{f.required ? ' *' : ''}</span>
        <select name={f.key} value={v || ''} onChange={handleChange} className={`${inp(errors[f.key])} bg-white`} {...focusProps(f.key)}>
          <option value="">— сонгох —</option>
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Err msg={errors[f.key]}/>
      </label>
    );
    return (
      <label key={f.key} className={colCls}>
        <span className={lbl}>{f.label}{f.required ? ' *' : ''}</span>
        <input name={f.key} type={['date','tel','email'].includes(f.type) ? f.type : 'text'}
          value={v || ''} placeholder={f.placeholder || ''}
          className={`${inp(errors[f.key])}${f.upper ? ' uppercase' : ''}`}
          inputMode={f.type === 'number' ? 'numeric' : undefined}
          onChange={handleChange}
          {...focusProps(f.key)}
        />
        <Err msg={errors[f.key]}/>
      </label>
    );
  };

  // ── Schema field renderer for nested objects (vehicle, collateral) ─────────
  const renderNestedField = (f, obj, setFn, scope) => {
    const v = obj[f.key];
    const colCls = `space-y-1${f.col === 2 ? ' col-span-2' : ''}`;
    if (f.type === 'select') return (
      <label key={f.key} className={colCls}>
        <span className={lbl}>{f.label}</span>
        <select value={v || ''} onChange={e => setFn(f.key, e.target.value)} className={`${inp()} bg-white`} {...focusProps(`${scope}.${f.key}`)}>
          <option value="">— Сонгоно уу —</option>
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
    return (
      <label key={f.key} className={colCls}>
        <span className={lbl}>{f.label}</span>
        <input value={v || ''} onChange={e => setFn(f.key, e.target.value)} className={inp()} {...focusProps(`${scope}.${f.key}`)} />
      </label>
    );
  };

  // File upload zone
  const UploadZone = ({ name, label: zoneLbl, accept = '.pdf,.jpg,.jpeg,.png', onFiles, note }) => {
    const ref = useRef(null);
    const files = formData.files[name] || [];
    const openFile = (file) => {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    return (
      <div className={`relative rounded-2xl border transition-all ${errors[name] ? 'border-red-300 bg-red-50' : files.length ? 'border-[#00A651]/40 bg-green-50/40' : 'border-slate-200 bg-white hover:border-[#D4AF37] hover:bg-slate-50'}`}
        onDragOver={e => e.preventDefault()} onDrop={e => handleFileDrop(e, name)}>
        <input ref={ref} type="file" accept={accept} multiple className="hidden"
          onChange={e => { const f = Array.from(e.target.files || []); if (f.length) onFiles ? onFiles(f) : processFiles(f, name); }} />
        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => ref.current.click()}>
          <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition ${files.length ? 'bg-[#00A651] text-white' : 'bg-slate-50 text-[#003B5C] border border-slate-200'}`}>
            {files.length ? <CheckCircle size={18} /> : <UploadCloud size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#003B5C] truncate">{zoneLbl}</p>
            {files.length > 0 ? <p className="text-xs text-[#00A651] font-semibold mt-0.5">{files.length} файл хавсаргасан</p>
              : <p className="text-xs text-slate-400 mt-0.5">{note || 'Товших эсвэл чирж оруулна уу'}</p>}
          </div>
          {files.length > 0 && <button type="button" onClick={e => { e.stopPropagation(); removeFiles(name); }} className="text-slate-400 hover:text-red-500 p-1"><X size={14}/></button>}
        </div>
        {files.length > 0 && (
          <div className="px-4 pb-3 grid gap-2">
            {files.map((f, i) => f.type?.startsWith('image/') ? (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <img src={URL.createObjectURL(f)} alt="" className="h-10 w-10 object-cover rounded-lg border border-gray-200" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">{f.name}</span>
                <button type="button" onClick={() => openFile(f)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-[#003B5C] hover:bg-blue-50"><Eye size={12}/> Харах</button>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <div className="h-10 w-10 bg-slate-100 rounded-lg border border-gray-200 flex items-center justify-center text-[#003B5C]"><FileText size={16}/></div>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">{f.name}</span>
                <button type="button" onClick={() => openFile(f)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-[#003B5C] hover:bg-blue-50"><Eye size={12}/> Харах</button>
              </div>
            ))}
          </div>
        )}
        {errors[name] && <p className="px-4 pb-3 text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={11}/>{errors[name]}</p>}
      </div>
    );
  };

  // Step progress
  const renderStepBar = () => (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step > s.n ? 'bg-[#00A651] text-white' : step === s.n ? 'bg-[#003B5C] text-white ring-4 ring-[#003B5C]/20' : 'bg-slate-200 text-slate-400'}`}>
              {step > s.n ? <CheckCircle size={14}/> : s.n}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wide whitespace-nowrap hidden md:block ${step === s.n ? 'text-[#003B5C]' : 'text-slate-500'}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 min-w-[12px] transition-all ${step > s.n ? 'bg-[#00A651]' : 'bg-slate-300'}`}/>}
        </React.Fragment>
      ))}
    </div>
  );

  const isCarLoan = formData.selectedProduct === 'car_purchase_loan' || formData.selectedProduct === 'car_coll_loan';

  // ─────────────────────────────────────────────
  // STEP RENDERS
  // ─────────────────────────────────────────────

  // STEP 1 — Product selection
  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <p className={lbl}>Зээлийн бүтээгдэхүүн *</p>
      <div className="grid grid-cols-1 gap-3">
        {LOAN_PRODUCTS.map(p => (
          <label key={p.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm
            ${formData.selectedProduct === p.id ? 'border-[#003B5C] bg-blue-50 ring-4 ring-[#003B5C]/10' : 'border-slate-200 bg-white hover:border-[#003B5C]/50 hover:bg-slate-50'}`}>
            <input type="radio" name="selectedProduct" value={p.id} checked={formData.selectedProduct === p.id}
              onChange={() => set('selectedProduct', p.id)} className="accent-[#003B5C] w-4 h-4" />
            <span className={`font-black text-sm ${formData.selectedProduct === p.id ? 'text-[#003B5C]' : 'text-slate-700'}`}>{p.name}</span>
          </label>
        ))}
      </div>
      {errors.selectedProduct && <Err msg={errors.selectedProduct}/>}
    </div>
  );

  // STEP 2 — Borrower type
  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in">
      <p className={lbl}>Зээлдэгчийн төрөл *</p>
      <div className="grid grid-cols-2 gap-5">
        {[
          { val: 'individual',   Icon: User,      title: 'Иргэн',       sub: 'Цалин, хэрэглээний зээл' },
          { val: 'organization', Icon: Building2, title: 'Байгууллага', sub: 'Бизнес, эргэлтийн хөрөнгө' },
        ].map(({ val, Icon, title, sub }) => (
          <div key={val} onClick={() => set('userType', val)}
            className={`cursor-pointer p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all shadow-sm
              ${formData.userType === val ? 'border-[#003B5C] bg-blue-50 ring-4 ring-[#003B5C]/10' : 'border-slate-200 bg-white hover:border-[#003B5C]/50 hover:bg-slate-50'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${formData.userType === val ? 'bg-[#003B5C] text-white' : 'bg-slate-100 text-[#003B5C]'}`}><Icon size={32}/></div>
            <p className="font-bold text-[#003B5C] text-lg">{title}</p>
            <p className="text-xs text-slate-500 text-center">{sub}</p>
            {formData.userType === val && <BadgeCheck size={20} className="text-[#D4AF37]"/>}
          </div>
        ))}
      </div>
    </div>
  );

  // STEP 3 — Borrower info
  const renderStep3Individual = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#003B5C]"/>
          <p className="text-sm font-bold text-[#003B5C]">Иргэний үнэмлэхээ хавсаргаад доорх талбаруудыг бөглөнө үү</p>
        </div>
        <UploadZone name="file_id" label="Иргэний үнэмлэх" onFiles={onIdFiles}
          note="Зураг эсвэл PDF файл хавсаргана" />
      </div>

      {/* Basic info — schema-driven */}
      <div className="grid grid-cols-2 gap-4">
        {INDIVIDUAL_FIELDS.map(renderFormField)}
      </div>

      {/* Employment — schema-driven */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-[#003B5C] uppercase mb-3 flex items-center gap-2"><Briefcase size={13}/> Ажил эрхлэлт & Орлого</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {EMPLOYMENT_FIELDS.map(renderFormField)}
        </div>
      </div>

    </div>
  );

  const renderStep3Org = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#003B5C]"/>
          <p className="text-sm font-bold text-[#003B5C]">Улсын бүртгэлийн гэрчилгээг хавсаргаад мэдээллээ бөглөнө үү</p>
        </div>
        <UploadZone name="file_org_cert" label="Улсын бүртгэлийн гэрчилгээ" onFiles={onOrgFiles}
          note="Зураг эсвэл PDF файл хавсаргана" />
      </div>

      {/* Org fields — schema-driven */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ORG_FIELDS.map(renderFormField)}
      </div>

      {/* Contact person — schema-driven */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-[#00A651] uppercase mb-3 flex items-center gap-2"><Briefcase size={13}/> Холбоо барих ажилтан</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONTACT_PERSON_FIELDS.map(renderFormField)}
        </div>
      </div>

      {/* CEO */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setShowCeo(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Гүйцэтгэх захирал</p>
            <p className="text-sm font-semibold text-[#003B5C]">{formData.orgCeo.firstName || formData.orgCeo.lastName || '—'}</p>
          </div>
          {showCeo ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
        </button>
        {showCeo && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[['firstName','Нэр'],['lastName','Овог'],['fatherName','Эцэг/эхийн нэр'],['regNo','Регистр'],['phone','Утас']].map(([k, l]) => (
              <label key={k} className="space-y-1">
                <span className={lbl}>{l}</span>
                <input value={formData.orgCeo[k] || ''} onChange={e => setCeo(k, e.target.value)} className={inp()} {...focusProps(`orgCeo.${k}`)} />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Owner */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setShowOwner(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Эзэмшигч / Хувьцаа эзэмшигч</p>
            <p className="text-sm font-semibold text-[#003B5C]">{formData.orgOwner.firstName || formData.orgOwner.lastName || '—'}</p>
          </div>
          {showOwner ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
        </button>
        {showOwner && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[['firstName','Нэр'],['lastName','Овог'],['fatherName','Эцэг/эхийн нэр'],['regNo','Регистр'],['phone','Утас']].map(([k, l]) => (
              <label key={k} className="space-y-1">
                <span className={lbl}>{l}</span>
                <input value={formData.orgOwner[k] || ''} onChange={e => setOwner(k, e.target.value)} className={inp()} {...focusProps(`orgOwner.${k}`)} />
              </label>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  const renderStep3 = () => formData.userType === 'individual' ? renderStep3Individual() : renderStep3Org();

  // STEP 4 — Loan terms
  const renderStep4 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className={lbl}>Зээлийн дүн (₮) *</span>
          <input type="text" name="amount" value={formData.amount} onChange={handleChange} placeholder="20,000,000" className={inp(errors.amount)} {...focusProps('amount')} />
          <Err msg={errors.amount}/>
        </label>
        <label className="space-y-1">
          <span className={lbl}>Хугацаа (сар) *</span>
          <input name="term" type="text" value={formData.term} onChange={handleChange} placeholder="36" className={inp(errors.term)} {...focusProps('term')} />
          <Err msg={errors.term}/>
        </label>
        <label className="space-y-1">
          <span className={lbl}>Зээлээ төлж эхлэх хугацаа</span>
          <input name="repaymentStartDate" type="date" value={formData.repaymentStartDate} onChange={handleChange} className={inp(errors.repaymentStartDate)} {...focusProps('repaymentStartDate')} />
          <p className="text-[10px] font-medium text-slate-400">Жишээ: цалин буух өдөртэйгээ уялдуулж сонгоно.</p>
        </label>
      </div>

      {calcMonthly() && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#003B5C]/5 to-[#00A651]/5 border border-[#00A651]/20 rounded-xl">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Жишиг сарын төлбөр</p>
            <p className="text-[10px] text-slate-400">2.5% сарын хүү үндэслэсэн</p>
          </div>
          <p className="text-2xl font-bold text-[#00A651]">{calcMonthly()} <span className="text-sm">₮</span></p>
        </div>
      )}

      <label className="space-y-1 block">
        <span className={lbl}>Зориулалт *</span>
        <textarea name="purpose" rows="2" value={formData.purpose} onChange={handleChange}
          placeholder="Жишээ: Ажлын машин авах, эргэлтийн хөрөнгө нэмэх..." className={`${inp(errors.purpose)} resize-none`} {...focusProps('purpose')} />
        <Err msg={errors.purpose}/>
      </label>

      <label className="space-y-1 block">
        <span className={lbl}>Эргэн төлөх эх үүсвэр</span>
        <textarea name="repaymentSource" rows="2" value={formData.repaymentSource} onChange={handleChange}
          placeholder="Жишээ: Цалингийн орлого, борлуулалтын орлого..." className={`${inp()} resize-none`} {...focusProps('repaymentSource')} />
      </label>

      {!isCarLoan && (
        <div>
          <p className={lbl}>Барьцааны төрөл *</p>
          <div className="grid grid-cols-2 gap-4">
            {[{ val: 'real_estate', Icon: Home, title: 'Үл хөдлөх хөрөнгө' }, { val: 'vehicle', Icon: Car, title: 'Тээврийн хэрэгсэл' }].map(({ val, Icon, title }) => (
              <div key={val} onClick={() => set('collateralType', val)}
                className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all
                  ${formData.collateralType === val ? 'border-[#003B5C] bg-blue-50 ring-4 ring-[#003B5C]/10' : 'border-slate-200 bg-white hover:border-[#003B5C]/50 hover:bg-slate-50'}`}>
                <Icon size={20} className={formData.collateralType === val ? 'text-[#003B5C]' : 'text-slate-400'} />
                <span className={`font-semibold text-sm ${formData.collateralType === val ? 'text-[#003B5C]' : 'text-slate-500'}`}>{title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // STEP 5 — Collateral details
  const renderStep5 = () => {
    const isVehicle = formData.collateralType === 'vehicle';
    return (
      <div className="space-y-5 animate-fade-in">
        {isVehicle ? (
          <>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2"><FileText size={16} className="text-[#003B5C]"/>
                <p className="text-sm font-bold text-[#003B5C]">Техникийн паспортоо хавсаргаад мэдээллээ бөглөнө үү</p>
              </div>
              <UploadZone name="file_car_cert" label="Техникийн паспорт / Бүртгэлийн гэрчилгээ"
                onFiles={onVehicleFiles}
                note="Техникийн паспортын зураг оруулна уу" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COLLATERAL_VEHICLE_FIELDS.map(f => renderNestedField(f, formData.vehicle, setVeh, 'vehicle'))}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className={lbl}>Тээврийн хэрэгслийн зураг</p>
              <UploadZone name="file_car_photos" label="Машины зургууд (гадна, дотор)" note="Олон зураг оруулж болно" />
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2"><FileText size={16} className="text-[#003B5C]"/>
                <p className="text-sm font-bold text-[#003B5C]">Үл хөдлөхийн гэрчилгээг хавсаргаад мэдээллээ бөглөнө үү</p>
              </div>
              <UploadZone name="file_prop_cert" label="Эд хөрөнгийн эрхийн гэрчилгээ"
                onFiles={onPropertyFiles}
                note="Гэрчилгээний зураг оруулна уу" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COLLATERAL_REALESTATE_FIELDS.map(f => renderNestedField(f, formData.collateral, setColl, 'collateral'))}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className={lbl}>Кадастрын зураг / Нэмэлт баримт</p>
              <UploadZone name="file_prop_map" label="Кадастрын зураг / Гэрээ" note="PDF эсвэл зураг" />
            </div>
          </>
        )}
      </div>
    );
  };

  // STEP 6 — Guarantors
  const addGuarantor = () => {
    if (formData.guarantors.length >= 3) return;
    setFormData(p => ({ ...p, guarantors: [...p.guarantors, { ...EMPTY_GUARANTOR }] }));
  };
  const removeGuarantor = idx => setFormData(p => ({ ...p, guarantors: p.guarantors.filter((_, i) => i !== idx) }));
  const setGua = (idx, field, value) => setFormData(p => {
    const gs = [...p.guarantors]; gs[idx] = { ...gs[idx], [field]: value }; return { ...p, guarantors: gs };
  });

  const renderStep6 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[#003B5C]">Батлан даагч / Хамтран зээлдэгч</p>
          <p className="text-xs text-slate-500 mt-0.5">Заавал биш. Хэрэв байхгүй бол "Үргэлжлүүлэх" дарна уу.</p>
        </div>
        {formData.guarantors.length < 3 && (
          <button type="button" onClick={addGuarantor}
            className="flex items-center gap-2 px-4 py-2 bg-[#003B5C] text-white rounded-xl text-sm font-bold hover:bg-[#002d47] transition">
            <Plus size={14}/> Нэмэх
          </button>
        )}
      </div>

      {formData.guarantors.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
          <Users size={40} className="opacity-30"/>
          <p className="text-sm">Батлан даагч нэмэгдээгүй байна</p>
          <button type="button" onClick={addGuarantor} className="text-[#003B5C] font-bold text-sm hover:underline">+ Батлан даагч нэмэх</button>
        </div>
      )}

      {formData.guarantors.map((g, idx) => (
        <div key={idx} className="border-2 border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#003B5C] text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
              <select value={g.guarantorType} onChange={e => setGua(idx, 'guarantorType', e.target.value)}
                className="text-sm font-bold text-[#003B5C] border-none bg-transparent focus:outline-none cursor-pointer">
                <option>Хамтран зээлдэгч</option>
                <option>Батлан даагч</option>
              </select>
            </div>
            <button type="button" onClick={() => removeGuarantor(idx)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GUARANTOR_FIELDS.map(f => (
              <label key={f.key} className="space-y-1">
                <span className={lbl}>{f.label}</span>
                <input type={f.type === 'tel' ? 'tel' : 'text'} value={g[f.key] || ''} onChange={e => setGua(idx, f.key, e.target.value)} className={inp()} {...focusProps(`guarantors.${idx}.${f.key}`)} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // STEP 7 — Documents
  const renderStep7 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2"><Camera size={16} className="text-amber-700"/>
          <p className="text-sm font-bold text-amber-800">Зээлдэгчийн цээж зураг</p>
        </div>
        <UploadZone name="file_selfie" label="Цээж зураг (сэлфи)" accept=".jpg,.jpeg,.png" note="Гар утаснаасаа өөрийн зургийг оруулна уу" />
      </div>

      {formData.userType === 'individual' ? (
        <div className="space-y-3">
          <p className={lbl + ' text-[#003B5C]'}>Иргэний баримт бичиг</p>
          <UploadZone name="file_address" label="Оршин суугаа хаягийн лавлагаа" />
          <UploadZone name="file_social" label="НДШ-ийн лавлагаа (3 сар)" />
          <UploadZone name="file_bank" label="Дансны хуулга (12 сар)" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className={lbl + ' text-[#003B5C]'}>Байгууллагын баримт бичиг</p>
          <UploadZone name="file_charter" label="Байгууллагын дүрэм" />
          <UploadZone name="file_finance" label="Санхүүгийн тайлан (3 жил)" />
          <UploadZone name="file_org_bank" label="Дансны хуулга (12 сар)" />
        </div>
      )}

      {formData.guarantors.length > 0 && (
        <div className="space-y-3">
          <p className={lbl + ' text-[#003B5C]'}>Батлан даагчийн баримт</p>
          <UploadZone name="file_guarantor_id" label="Батлан даагчийн иргэний үнэмлэх" />
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <Shield size={12} className="inline mr-1"/> Таны файлууд шифрлэгдсэн орчинд хадгалагдана. Зөвхөн эрх бүхий ажилтан харах боломжтой.
      </div>
    </div>
  );

  // STEP 8 — Review
  const productName = LOAN_PRODUCTS.find(p => p.id === formData.selectedProduct)?.name || formData.selectedProduct;
  const fileCount = Object.values(formData.files).filter(v => v?.length).length;

  const Row = ({ l, v, vClass = '' }) => (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 flex-shrink-0">{l}:</span>
      <span className={`font-semibold text-right ${vClass || 'text-[#003B5C]'}`}>{v || '—'}</span>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-[#00A651]/10 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-2"><Send size={28}/></div>
        <h3 className="text-[#003B5C] font-bold text-lg">Мэдээллийг нягтлана уу</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {/* Borrower */}
        <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
          <p className="text-xs font-bold text-[#003B5C] uppercase border-b pb-1 mb-2">Зээлдэгч</p>
          {formData.userType === 'individual' ? (<>
            <Row l="Нэр" v={`${formData.lastName?.charAt(0) || ''}.${formData.firstName} ${formData.fatherName ? '('+formData.fatherName+')' : ''}`} />
            <Row l="Регистр" v={formData.regNo}/>
            <Row l="Утас" v={formData.phone}/>
            {formData.employmentType && <Row l="Ажлын байр" v={`${formData.employmentType}${formData.employer ? ' — '+formData.employer : ''}`}/>}
            {formData.monthlyIncome && <Row l="Сарын орлого" v={formData.monthlyIncome + ' ₮'}/>}
            <Row l="Хаяг" v={formData.address}/>
          </>) : (<>
            <Row l="Байгууллага" v={formData.orgName}/>
            <Row l="Регистр" v={formData.orgRegNo}/>
            {formData.industry && <Row l="Чиглэл" v={formData.industry}/>}
            <Row l="Холбоо барих" v={`${formData.contactName} — ${formData.contactPhone}`}/>
          </>)}
        </div>

        {/* Loan */}
        <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
          <p className="text-xs font-bold text-[#003B5C] uppercase border-b pb-1 mb-2">Зээлийн мэдээлэл</p>
          <Row l="Бүтээгдэхүүн" v={productName}/>
          <Row l="Дүн" v={formData.amount + ' ₮'} vClass="text-[#00A651] font-bold"/>
          <Row l="Хугацаа" v={formData.term + ' сар'}/>
          {formData.repaymentStartDate && <Row l="Төлж эхлэх" v={formData.repaymentStartDate}/>}
          {calcMonthly() && <Row l="Сарын төлбөр" v={calcMonthly() + ' ₮'}/>}
          <Row l="Барьцаа" v={formData.collateralType === 'vehicle' ? 'Тээврийн хэрэгсэл' : 'Үл хөдлөх'}/>
          <Row l="Зориулалт" v={formData.purpose}/>
        </div>

        {/* Collateral */}
        <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
          <p className="text-xs font-bold text-[#003B5C] uppercase border-b pb-1 mb-2">Барьцаа хөрөнгө</p>
          {formData.collateralType === 'vehicle' ? (<>
            {formData.vehicle.plateNumber && <Row l="Улсын дугаар" v={formData.vehicle.plateNumber}/>}
            {formData.vehicle.make && <Row l="Марк/Загвар" v={`${formData.vehicle.make} ${formData.vehicle.model}`}/>}
            {formData.vehicle.year && <Row l="Он" v={formData.vehicle.year}/>}
            {formData.vehicle.ownerName && <Row l="Эзэмшигч" v={formData.vehicle.ownerName}/>}
          </>) : (<>
            {formData.collateral.certificateNumber && <Row l="Гэрчилгээ №" v={formData.collateral.certificateNumber}/>}
            {formData.collateral.address && <Row l="Хаяг" v={formData.collateral.address}/>}
            {formData.collateral.area && <Row l="Талбай" v={formData.collateral.area + ' м²'}/>}
            {formData.collateral.ownerName && <Row l="Эзэмшигч" v={formData.collateral.ownerName}/>}
          </>)}
        </div>

        {/* Files & guarantors */}
        <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 space-y-2">
          <p className="text-xs font-bold text-[#003B5C] uppercase border-b pb-1 mb-2">Баримт & Батлан даагч</p>
          <Row l="Файл" v={fileCount + ' төрлийн файл'} vClass={fileCount ? 'text-[#00A651]' : 'text-slate-400'}/>
          <Row l="Батлан даагч" v={formData.guarantors.length ? formData.guarantors.length + ' хүн' : 'Байхгүй'}/>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
        Та мэдээллийн үнэн зөвийг баталгаажуулж "Илгээх" товчийг дарна уу. Хүсэлт илгээсний дараа манай ажилтан 24 цагийн дотор тантай холбогдоно.
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-20 bg-slate-100">
      <div className="fixed inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" alt="" className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-[#003B5C]/80"/>
      </div>

      <div className="relative z-10 pt-28 pb-6 px-6 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Зээлийн хүсэлт</h1>
        <p className="text-blue-100 max-w-xl mx-auto text-sm">Мэдээллээ оруулаад файлаа хавсаргана уу. Манай ажилтан 24 цагийн дотор холбогдоно.</p>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6">
        <div className="bg-white rounded-3xl shadow-[0_28px_80px_rgba(0,0,0,0.35)] p-5 md:p-9 border border-slate-200">
          {renderStepBar()}
          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}
            {step === 7 && renderStep7()}
            {step === 8 && renderStep8()}

            <div className="pt-8 mt-6 flex justify-between gap-4 border-t border-gray-100">
              {step > 1 ? (
                <button type="button" onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition flex items-center gap-2">
                  <ChevronLeft size={18}/> Буцах
                </button>
              ) : (
                <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition flex items-center gap-2">
                  <ArrowLeft size={18}/> Буцах
                </button>
              )}
              {step < 8 ? (
                <button type="button" onClick={nextStep} className="px-8 py-3 bg-[#003B5C] text-white rounded-xl font-semibold hover:bg-[#004d7a] transition shadow-lg flex items-center gap-2">
                  Үргэлжлүүлэх <ChevronRight size={18}/>
                </button>
              ) : (
                <button type="submit" disabled={loading} className="px-10 py-3 bg-[#00A651] text-white rounded-xl font-semibold hover:bg-[#008f45] transition shadow-lg flex items-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 size={18} className="animate-spin"/> Илгээж байна...</> : <><Send size={18}/> Илгээх</>}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)}/>
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl text-center">
            <button onClick={() => setShowSuccess(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
            <div className="w-20 h-20 bg-green-100 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} strokeWidth={2.5}/></div>
            <h3 className="font-bold text-2xl text-[#003B5C] mb-3">Хүсэлт амжилттай!</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">Таны зээлийн хүсэлт бүртгэгдлээ.<br/>Манай зээлийн ажилтан <span className="font-bold text-[#003B5C]">24 цагийн дотор</span> тантай холбогдох болно.</p>
            <button onClick={() => { setShowSuccess(false); onBack(); }} className="w-full py-4 bg-[#003B5C] text-white rounded-xl font-bold hover:bg-[#002a42] transition">Ойлголоо</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanRequest;
