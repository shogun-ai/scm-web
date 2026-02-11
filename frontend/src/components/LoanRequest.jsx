import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { 
  ArrowLeft, Send, CheckCircle, User, Phone, FileText, Wallet, 
  Car, Home, Building2, X, UploadCloud, Users, Briefcase, ChevronRight, ChevronLeft, AlertCircle, Loader, Camera
} from 'lucide-react';

const LOAN_PRODUCTS = [
  { id: 'biz_loan', name: 'Бизнесийн зээл' },
  { id: 'car_purchase_loan', name: 'Автомашин худалдан авах' },
  { id: 'car_coll_loan', name: 'Автомашин барьцаалсан зээл' },
  { id: 'cons_loan', name: 'Хэрэглээний зээл' },
  { id: 'credit_card', name: 'Кредит карт' },
  { id: 're_loan', name: 'Үл хөдлөх барьцаалсан зээл' },
  { id: 'line_loan', name: 'Шугмын зээл' }
];

const PRODUCT_ID_MAP = {
    1: 'biz_loan',
    2: 'car_purchase_loan',
    3: 'cons_loan',
    5: 'credit_card',
    6: 're_loan',
    7: 'line_loan'
};

const LoanRequest = ({ onBack, initialProduct }) => {
  const [step, setStep] = useState(1); 
  const [userType, setUserType] = useState('individual'); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasCoBorrower, setHasCoBorrower] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);

  const [formData, setFormData] = useState({
    lastname: '', firstname: '', regNo: '', phone: '', email: '', address: '',
    coLastname: '', coFirstname: '', coRegNo: '', coPhone: '',
    orgName: '', orgRegNo: '', contactName: '', contactPosition: '', contactPhone: '',
    selectedProduct: '', amount: '', term: '', purpose: '', repaymentSource: '', collateralType: 'real_estate',
    files: {} 
  });

  const [errors, setErrors] = useState({});

  // ✅ АВТОМАТ ХАЯГ СОЛИХ ТОХИРГОО
  const isLocal = window.location.hostname === 'localhost';
  const API_BASE_URL = isLocal 
    ? 'http://localhost:5000' 
    : 'https://scm-okjs.onrender.com';

  // ✅ 1. АВТОМАТ СОНГОЛТ & ТӨРӨЛ ХЯЗГААРЛАХ
  useEffect(() => {
      if (initialProduct) {
          const mappedCode = PRODUCT_ID_MAP[initialProduct.id];
          if (mappedCode) {
              setFormData(prev => ({ ...prev, selectedProduct: mappedCode }));
              
              if (mappedCode === 'cons_loan') setUserType('individual');
              if (mappedCode === 'line_loan') setUserType('organization');
          }
      }
  }, [initialProduct]);

  // ✅ 2. Хэрэглэгч Dropdown-оос зээлээ солих үед бас шалгах
  useEffect(() => {
      if (formData.selectedProduct === 'cons_loan') {
          setUserType('individual');
      } else if (formData.selectedProduct === 'line_loan') {
          setUserType('organization');
      }
  }, [formData.selectedProduct]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (['term', 'phone', 'contactPhone', 'coPhone'].includes(name)) {
        const numeric = value.replace(/[^0-9]/g, '');
        if (value && !/^[0-9]*$/.test(value)) return;
        if ((name.includes('Phone') || name === 'phone') && numeric.length > 8) return;
        setFormData(prev => ({ ...prev, [name]: numeric }));
        return;
    }

    if (name === 'amount') {
        const val = value.replace(/[^0-9]/g, '');
        if (val) {
            setFormData(prev => ({ ...prev, amount: parseInt(val).toLocaleString() }));
        } else {
            setFormData(prev => ({ ...prev, amount: '' }));
        }
        return;
    }

    if (['lastname', 'firstname', 'orgName', 'purpose', 'address', 'contactName', 'contactPosition', 'coLastname', 'coFirstname', 'repaymentSource'].includes(name)) {
        if (value && !/^[\u0400-\u04FF0-9\s\-\.\,\(\)]*$/.test(value)) return;
        setFormData(prev => ({ ...prev, [name]: value }));
        return;
    }

    if (name === 'regNo' || name === 'coRegNo' || name === 'orgRegNo') {
        if (name === 'orgRegNo') {
            if (value && !/^[0-9]*$/.test(value)) return;
            if (value.length > 7) return;
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            if (value.length <= 2) {
                if (value && !/^[\u0400-\u04FF]*$/.test(value)) return;
                setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
            } else {
                const firstTwo = value.slice(0, 2);
                const rest = value.slice(2);
                if (!/^[0-9]*$/.test(rest)) return;
                if (value.length > 10) return;
                setFormData(prev => ({ ...prev, [name]: firstTwo + rest }));
            }
        }
        return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const processFiles = async (files, fieldName) => {
      setFileProcessing(true);
      const processedFiles = [];
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };

      for (const file of files) {
          if (file.type === 'application/pdf') {
              if (file.size > 10 * 1024 * 1024) { 
                  alert(`"${file.name}" файл хэт том байна (Max 10MB).`);
                  continue;
              }
              processedFiles.push(file);
          } else if (file.type.startsWith('image/')) {
              try {
                  const compressedFile = await imageCompression(file, options);
                  const newFile = new File([compressedFile], file.name, { type: file.type });
                  processedFiles.push(newFile);
              } catch (error) {
                  console.error("Compression error:", error);
                  processedFiles.push(file); 
              }
          } else {
              processedFiles.push(file);
          }
      }
      setFileProcessing(false);
      if (processedFiles.length > 0) {
          setFormData(prev => ({
              ...prev,
              files: { ...prev.files, [fieldName]: [...(prev.files[fieldName] || []), ...processedFiles] }
          }));
          setErrors(prev => ({ ...prev, [fieldName]: null, files: null }));
      }
  };

  const handleFileChange = (e, fieldName) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) processFiles(selectedFiles, fieldName);
  };

  const handleDrop = (e, fieldName) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files || []);
      if (droppedFiles.length > 0) processFiles(droppedFiles, fieldName);
  };

  const validateStep = () => {
      let currentErrors = {};
      let isValid = true;
      if (step === 2) {
          if (userType === 'individual') {
              if (!formData.lastname) currentErrors.lastname = 'Овог оруулна уу';
              if (!formData.firstname) currentErrors.firstname = 'Нэр оруулна уу';
              if (!formData.regNo || formData.regNo.length < 10) currentErrors.regNo = 'Регистр дутуу байна';
              if (!formData.phone || formData.phone.length < 8) currentErrors.phone = 'Утас дутуу байна';
              if (!formData.address) currentErrors.address = 'Хаяг оруулна уу';
          } else {
              if (!formData.orgName) currentErrors.orgName = 'Байгууллагын нэр оруулна уу';
              if (!formData.orgRegNo || formData.orgRegNo.length < 7) currentErrors.orgRegNo = 'Регистр 7 оронтой байна';
              if (!formData.contactName) currentErrors.contactName = 'Холбоо барих хүний нэр';
              if (!formData.contactPhone) currentErrors.contactPhone = 'Утасны дугаар';
          }
      }
      if (step === 3) {
          if (!formData.selectedProduct) currentErrors.selectedProduct = 'Бүтээгдэхүүн сонгоно уу';
          if (!formData.amount) currentErrors.amount = 'Зээлийн дүн оруулна уу';
          if (!formData.term) currentErrors.term = 'Хугацаа оруулна уу';
          if (!formData.purpose) currentErrors.purpose = 'Зориулалт бичнэ үү';
      }
      if (Object.keys(currentErrors).length > 0) {
          setErrors(currentErrors);
          isValid = false;
      }
      return isValid;
  };

  const nextStep = () => {
      if (validateStep()) {
          setStep(prev => prev + 1);
          window.scrollTo(0, 0);
      }
  };

  const prevStep = () => {
      setStep(prev => prev - 1);
      setErrors({});
      window.scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep()) { 
        setLoading(true);
        try {
            const formDataToSend = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'files') formDataToSend.append(key, formData[key]);
            });

            const cleanAmount = parseInt(formData.amount.replace(/,/g, ''), 10);
            formDataToSend.set('amount', cleanAmount);
            formDataToSend.append('userType', userType);
            formDataToSend.append('hasCoBorrower', hasCoBorrower);

            Object.keys(formData.files).forEach(fieldName => {
                const fileList = formData.files[fieldName];
                fileList.forEach(file => formDataToSend.append(fieldName, file));
            });

            // ✅ ШИНЭЧЛЭГДСЭН API ДУУДЛАГА
            await axios.post(`${API_BASE_URL}/api/loans`, formDataToSend);
            setShowSuccess(true);
        } catch (error) {
            console.error("Error submitting loan:", error);
            alert("Алдаа гарлаа: " + (error.response?.data?.message || "Сервертэй холбогдож чадсангүй"));
        } finally {
            setLoading(false);
        }
    }
  };

  const FileUploadField = ({ label, name, accept = ".pdf,.jpg,.jpeg,.png" }) => {
      const fileInputRef = useRef(null);
      const files = formData.files[name] || [];
      const error = errors[name];
      return (
        <div 
            className={`relative p-5 rounded-xl border-2 border-dashed transition-all group ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-[#D4AF37] hover:bg-slate-50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, name)}
        >
            <input type="file" ref={fileInputRef} name={name} accept={accept} multiple onChange={(e) => handleFileChange(e, name)} className="hidden" />
            <div className="flex items-center gap-4">
                <div onClick={() => fileInputRef.current.click()} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#003B5C] shadow-sm cursor-pointer group-hover:scale-110 transition border border-gray-100">
                    {fileProcessing ? <Loader className="animate-spin" size={24}/> : (files.length > 0 ? <CheckCircle size={24} className="text-[#00A651]" /> : <UploadCloud size={24} />)}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-gray-500 uppercase truncate mb-1">{label}</p>
                    {files.length > 0 ? (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#003B5C]">{files.length} файл</span>
                            <button type="button" onClick={() => setFormData(prev => ({...prev, files: {...prev.files, [name]: []}}))} className="text-red-400 hover:text-red-600 p-1"><X size={16}/></button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">{fileProcessing ? 'Боловсруулж байна...' : 'Товших эсвэл чирж оруулна уу'}</p>
                    )}
                    {error && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
                </div>
            </div>
        </div>
      );
  };

  const StepIndicator = () => (
      <div className="flex justify-between items-center mb-8 relative px-4">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10"></div>
          <div className="absolute left-0 top-1/2 h-1 bg-[#00A651] transition-all duration-500 -z-10" style={{ width: `${(step - 1) * 25}%` }}></div>
          {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-[#00A651] text-white scale-110' : 'bg-gray-200 text-gray-500'}`}>
                      {step > s ? <CheckCircle size={16} /> : s}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 hidden md:block">
                      {s === 1 ? 'Төрөл' : s === 2 ? 'Мэдээлэл' : s === 3 ? 'Зээл' : s === 4 ? 'Файл' : 'Илгээх'}
                  </span>
              </div>
          ))}
      </div>
  );

  const isCarLoan = formData.selectedProduct === 'car_purchase_loan' || formData.selectedProduct === 'car_coll_loan';

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-20">
      <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" alt="Background" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-[#003B5C]/90 backdrop-blur-sm"></div>
      </div>
      <div className="relative z-10 pt-28 pb-6 px-6 max-w-5xl mx-auto text-center">
        <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-2">Зээлийн хүсэлт</h1>
        <p className="text-blue-100 max-w-xl mx-auto font-light text-sm md:text-base">Та мэдээллээ үнэн зөв бөглөнө үү. Бүх талбарыг бөглөх шаардлагатай.</p>
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 md:p-10 border border-white/20 min-h-[500px] flex flex-col">
            <StepIndicator />
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                {step === 1 && (
                    <div className="flex-1 flex flex-col justify-center animate-fade-in">
                        <h3 className="text-center text-[#003B5C] font-bold text-lg mb-8 uppercase tracking-widest">Та хэн бэ?</h3>
                        {formData.selectedProduct === 'cons_loan' ? (
                            <div className="text-center">
                                <div className="p-8 rounded-2xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 flex flex-col items-center gap-4 max-w-sm mx-auto">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#003B5C] shadow-lg"><User size={40} /></div>
                                    <h4 className="font-bold text-xl text-[#003B5C]">Иргэн</h4>
                                    <p className="text-sm text-gray-500">Энэ бүтээгдэхүүн зөвхөн иргэнд зориулагдсан.</p>
                                    <button type="button" onClick={nextStep} className="px-8 py-3 bg-[#003B5C] text-white rounded-xl font-bold hover:bg-[#002a42] transition shadow-lg mt-2">Үргэлжлүүлэх</button>
                                </div>
                            </div>
                        ) : formData.selectedProduct === 'line_loan' ? (
                            <div className="text-center">
                                <div className="p-8 rounded-2xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 flex flex-col items-center gap-4 max-w-sm mx-auto">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#003B5C] shadow-lg"><Building2 size={40} /></div>
                                    <h4 className="font-bold text-xl text-[#003B5C]">Байгууллага</h4>
                                    <p className="text-sm text-gray-500">Энэ бүтээгдэхүүн зөвхөн байгууллагад зориулагдсан.</p>
                                    <button type="button" onClick={nextStep} className="px-8 py-3 bg-[#003B5C] text-white rounded-xl font-bold hover:bg-[#002a42] transition shadow-lg mt-2">Үргэлжлүүлэх</button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div onClick={() => { setUserType('individual'); nextStep(); }} className={`cursor-pointer p-8 rounded-2xl border-2 transition-all hover:scale-105 flex flex-col items-center gap-4 group ${userType === 'individual' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-gray-200 hover:border-[#D4AF37]'}`}>
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#003B5C] shadow-lg group-hover:bg-[#003B5C] group-hover:text-white transition"><User size={40} /></div>
                                    <h4 className="font-bold text-xl text-[#003B5C]">Иргэн</h4>
                                    <p className="text-sm text-gray-500 text-center">Цалингийн болон хэрэглээний зээл</p>
                                </div>
                                <div onClick={() => { setUserType('organization'); nextStep(); }} className={`cursor-pointer p-8 rounded-2xl border-2 transition-all hover:scale-105 flex flex-col items-center gap-4 group ${userType === 'organization' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-gray-200 hover:border-[#D4AF37]'}`}>
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#003B5C] shadow-lg group-hover:bg-[#003B5C] group-hover:text-white transition"><Building2 size={40} /></div>
                                    <h4 className="font-bold text-xl text-[#003B5C]">Байгууллага</h4>
                                    <p className="text-sm text-gray-500 text-center">Бизнесийн болон эргэлтийн хөрөнгө</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in flex-1">
                        <h3 className="text-[#003B5C] font-bold text-sm uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">{userType === 'individual' ? 'Хувийн мэдээлэл' : 'Байгууллагын мэдээлэл'}</h3>
                        {userType === 'individual' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><input name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Овог (Кирил) *" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.lastname ? 'border-red-500' : 'border-gray-200'}`} />{errors.lastname && <p className="text-xs text-red-500 mt-1">{errors.lastname}</p>}</div>
                                <div><input name="firstname" value={formData.firstname} onChange={handleChange} placeholder="Нэр (Кирил) *" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.firstname ? 'border-red-500' : 'border-gray-200'}`} />{errors.firstname && <p className="text-xs text-red-500 mt-1">{errors.firstname}</p>}</div>
                                <div><input name="regNo" value={formData.regNo} onChange={handleChange} placeholder="Регистр (УУ80...) *" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] uppercase ${errors.regNo ? 'border-red-500' : 'border-gray-200'}`} />{errors.regNo && <p className="text-xs text-red-500 mt-1">{errors.regNo}</p>}</div>
                                <div><input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Утас (8 орон) *" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.phone ? 'border-red-500' : 'border-gray-200'}`} />{errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}</div>
                                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="И-мэйл" className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl font-bold text-[#003B5C]" />
                                <div><input name="address" value={formData.address} onChange={handleChange} placeholder="Хаяг (Кирил) *" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.address ? 'border-red-500' : 'border-gray-200'}`} />{errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}</div>
                                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-gray-200">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={hasCoBorrower} onChange={() => setHasCoBorrower(!hasCoBorrower)} className="w-5 h-5 accent-[#00A651]" />
                                        <span className="font-bold text-[#003B5C] text-sm flex items-center gap-2"><Users size={16}/> Хамтран зээлдэгчтэй эсэх</span>
                                    </label>
                                    {hasCoBorrower && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 animate-fade-in">
                                            <input name="coLastname" value={formData.coLastname} onChange={handleChange} placeholder="Хамтран - Овог" className="p-3 bg-white border border-gray-200 rounded-lg text-sm" />
                                            <input name="coFirstname" value={formData.coFirstname} onChange={handleChange} placeholder="Хамтран - Нэр" className="p-3 bg-white border border-gray-200 rounded-lg text-sm" />
                                            <input name="coRegNo" value={formData.coRegNo} onChange={handleChange} placeholder="Хамтран - Регистр" className="p-3 bg-white border border-gray-200 rounded-lg text-sm" />
                                            <input name="coPhone" type="tel" value={formData.coPhone} onChange={handleChange} placeholder="Хамтран - Утас" className="p-3 bg-white border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Байгууллагын нэр (Кирил) *</label>
                                    <input name="orgName" value={formData.orgName} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.orgName ? 'border-red-500' : 'border-gray-200'}`} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Регистр (7 орон) *</label>
                                    <input name="orgRegNo" value={formData.orgRegNo} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.orgRegNo ? 'border-red-500' : 'border-gray-200'}`} />
                                </div>
                                <div className="md:col-span-2 mt-2 pt-4 border-t border-gray-100">
                                    <p className="text-xs font-bold text-[#00A651] uppercase mb-4 flex items-center gap-2"><Briefcase size={14}/> Холбоо барих албан тушаалтан</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Нэр *" className="p-3 bg-slate-50 border rounded-xl" />
                                        <input name="contactPosition" value={formData.contactPosition} onChange={handleChange} placeholder="Албан тушаал *" className="p-3 bg-slate-50 border rounded-xl" />
                                        <input name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} placeholder="Утас *" className="p-3 bg-slate-50 border rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in flex-1">
                        <h3 className="text-[#003B5C] font-bold text-sm uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Зээлийн мэдээлэл</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Бүтээгдэхүүн сонгох *</label>
                                {isCarLoan ? (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.selectedProduct === 'car_purchase_loan' ? 'bg-white border-[#003B5C] shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                                                <input type="radio" name="car_type" checked={formData.selectedProduct === 'car_purchase_loan'} onChange={() => setFormData({...formData, selectedProduct: 'car_purchase_loan'})} className="accent-[#003B5C] w-5 h-5" />
                                                <span className="text-sm font-bold text-[#003B5C]">Автомашин худалдан авах</span>
                                            </label>
                                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.selectedProduct === 'car_coll_loan' ? 'bg-white border-[#003B5C] shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                                                <input type="radio" name="car_type" checked={formData.selectedProduct === 'car_coll_loan'} onChange={() => setFormData({...formData, selectedProduct: 'car_coll_loan'})} className="accent-[#003B5C] w-5 h-5" />
                                                <span className="text-sm font-bold text-[#003B5C]">Автомашин барьцаалах</span>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <select name="selectedProduct" value={formData.selectedProduct} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] outline-none ${errors.selectedProduct ? 'border-red-500' : 'border-gray-200'}`}>
                                        <option value="">-- Сонгоно уу --</option>
                                        {LOAN_PRODUCTS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                )}
                                {errors.selectedProduct && <p className="text-xs text-red-500 mt-1">{errors.selectedProduct}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Зээлийн хэмжээ (₮) *</label>
                                <input type="text" name="amount" value={formData.amount} onChange={handleChange} placeholder="10,000,000" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.amount ? 'border-red-500' : 'border-gray-200'}`} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Хугацаа (Сар) *</label>
                                <input name="term" type="text" value={formData.term} onChange={handleChange} placeholder="12" className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] ${errors.term ? 'border-red-500' : 'border-gray-200'}`} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Зээлийн зориулалт (Кирил) *</label>
                                <textarea name="purpose" rows="2" value={formData.purpose} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] text-sm ${errors.purpose ? 'border-red-500' : 'border-gray-200'}`}></textarea>
                            </div>
                            {userType === 'organization' && (
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Эргэн төлөх эх үүсвэр *</label>
                                    <textarea name="repaymentSource" rows="2" value={formData.repaymentSource} onChange={handleChange} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-[#003B5C] text-sm"></textarea>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {step === 4 && (
                    <div className="space-y-6 animate-fade-in flex-1">
                        <div className="flex justify-between items-end border-b border-gray-100 pb-2 mb-4">
                             <h3 className="text-[#003B5C] font-bold text-sm uppercase tracking-widest">Бичиг баримт хавсаргах</h3>
                             <span className="text-xs font-bold text-gray-400">Ядаж 3 төрлийн файл</span>
                        </div>
                        {errors.files && (<div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-pulse"><AlertCircle size={24} /><span className="font-bold">{errors.files}</span></div>)}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                            <h4 className="text-sm font-bold text-[#003B5C] mb-3 flex items-center gap-2"><Camera size={18}/> Зээлдэгчийн зураг (Сэлфи)</h4>
                            <FileUploadField label="Цээж зураг оруулах" name="file_selfie" accept=".jpg,.jpeg,.png" />
                            <p className="text-xs text-gray-500 mt-2">* Та гар утаснаасаа өөрийн цээж зургийг дараад оруулж болно.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userType === 'individual' && (<><FileUploadField label="Иргэний үнэмлэх (Лавлагаа)" name="file_id" /><FileUploadField label="Оршин суугаа хаяг" name="file_address" /><FileUploadField label="НДШ-ийн лавлагаа" name="file_social" /><FileUploadField label="Дансны хуулга (12 сар)" name="file_bank" /></>)}
                            {userType === 'organization' && (<><FileUploadField label="Улсын бүртгэлийн гэрчилгээ" name="file_org_cert" /><FileUploadField label="Байгууллагын дүрэм" name="file_charter" /><FileUploadField label="Санхүүгийн тайлан (3 жил)" name="file_finance" /><FileUploadField label="Дансны хуулга (12 сар)" name="file_org_bank" /></>)}
                            <div className="md:col-span-2 pt-4">
                                <p className="text-xs font-bold text-[#D4AF37] uppercase mb-3">Барьцаа хөрөнгийн бичиг баримт</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formData.collateralType === 'real_estate' ? (<><FileUploadField label="Үл хөдлөхийн гэрчилгээ" name="file_prop_cert" /><FileUploadField label="Кадастрын зураг / Гэрээ" name="file_prop_map" /></>) : (<><FileUploadField label="Тээврийн хэрэгслийн гэрчилгээ" name="file_car_cert" /><FileUploadField label="Машины зургууд" name="file_car_photos" /></>)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {step === 5 && (
                    <div className="space-y-6 animate-fade-in flex-1 text-center">
                        <div className="w-16 h-16 bg-[#00A651]/10 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-4"><Send size={32} /></div>
                        <h3 className="text-[#003B5C] font-bold text-xl">Мэдээллээ баталгаажуулна уу</h3>
                        <div className="bg-slate-50 p-6 rounded-2xl text-left border border-gray-200 text-sm space-y-2 max-w-lg mx-auto">
                            <div className="flex justify-between"><span className="text-gray-500">Төрөл:</span><span className="font-bold text-[#003B5C]">{userType === 'individual' ? 'Иргэн' : 'Байгууллага'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Зээлдэгч:</span><span className="font-bold text-[#003B5C]">{userType === 'individual' ? `${formData.lastname?.substring(0,1)}.${formData.firstname}` : formData.orgName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Бүтээгдэхүүн:</span><span className="font-bold text-[#003B5C]">{LOAN_PRODUCTS.find(p => p.id === formData.selectedProduct)?.name || formData.selectedProduct}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Зээлийн дүн:</span><span className="font-bold text-[#00A651]">{formData.amount} ₮</span></div>
                        </div>
                    </div>
                )}
                <div className="pt-8 mt-auto flex justify-between gap-4">
                    {step > 1 ? (<button type="button" onClick={prevStep} className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition flex items-center gap-2"><ChevronLeft size={20} /> Буцах</button>) : (<div></div>)}
                    {step < 5 ? (<button type="button" onClick={nextStep} className="px-8 py-4 bg-[#003B5C] text-white rounded-xl font-bold hover:bg-[#002a42] transition shadow-lg flex items-center gap-2">Үргэлжлүүлэх <ChevronRight size={20} /></button>) : (<button type="submit" disabled={loading} className="px-10 py-4 bg-[#00A651] text-white rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg flex items-center gap-2 uppercase tracking-wider">{loading ? 'Илгээж байна...' : <><Send size={20} /> Илгээх</>}</button>)}
                </div>
            </form>
        </div>
      </div>
      {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSuccess(false)}></div>
              <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full relative z-10 shadow-2xl animate-scale-up text-center">
                  <button onClick={() => setShowSuccess(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
                  <div className="w-20 h-20 bg-green-100 text-[#00A651] rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} strokeWidth={3} /></div>
                  <h3 className="font-display font-bold text-2xl text-[#003B5C] mb-4">Хүсэлт амжилттай!</h3>
                  <p className="text-gray-500 mb-8 leading-relaxed text-sm">Таны мэдээлэл манай мэдээллийн санд бүртгэгдлээ. <br/> Манай зээлийн эдийн засагч тантай <span className="font-bold text-[#003B5C]">24 цагийн дотор</span> холбогдох болно.</p>
                  <button onClick={() => { setShowSuccess(false); onBack(); }} className="w-full py-4 bg-[#003B5C] text-white rounded-xl font-bold uppercase tracking-wider hover:bg-[#002a42] transition">Ойлголоо</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default LoanRequest;