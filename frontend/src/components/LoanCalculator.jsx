import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calculator, ArrowLeft, Banknote, Info, CheckCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_LOAN_APR_CONFIG, LOAN_APR_CONFIG_KEY, normalizeLoanAprConfig } from '../../../shared/loanAprConfig.js';
import { calculateAnnuityPayment } from '../../../shared/loanApr.js';
import { LoanAprFields, LoanAprResult, LoanAprExplanation } from './LoanAprDetails';

function calculateLoanSchedule(amount, rate, months, method, startDate, dti, maxTerm) {
    const rawAmount = amount.toString().replace(/,/g, '');
    const p = parseFloat(rawAmount); // Зээлийн дүн
    const r = parseFloat(rate) / 100; // Сарын хүү
    const n = Number(months); // Хугацаа

    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r) || r < 0
      || !Number.isInteger(n) || n < 1 || n > Math.min(maxTerm, 1200)
      || !startDate || !Number.isFinite(new Date(startDate).getTime())) {
        return { result: null, schedule: [] };
    }

    let monthlyPayment = 0;
    let totalPayment = 0;
    let totalInterest = 0;
    
    // Хуваарь бодох хувьсагчид
    let tempSchedule = [];
    let currentBalance = p;
    let currentDate = new Date(startDate);
    
    // Тогтмол төлбөрийг эхэлж олох (Тэнцүү төлбөрт үед)
    const fixedMonthlyPayment = calculateAnnuityPayment(p, r, n);
    if (fixedMonthlyPayment === null) return { result: null, schedule: [] };

    for (let i = 1; i <= n; i++) {
        // Огноо ахиулах
        currentDate.setMonth(currentDate.getMonth() + 1);
        if (!Number.isFinite(currentDate.getTime())) return { result: null, schedule: [] };
        const dateStr = currentDate.toISOString().split('T')[0];

        let interest = currentBalance * r;
        let principal = 0;
        let payment = 0;

        if (method === 'equal') {
            // Тэнцүү төлбөрт
            if (i === n) {
                // Сүүлийн сар: Үлдэгдлээ бүрэн хаана
                payment = currentBalance + interest;
                principal = currentBalance;
                currentBalance = 0;
            } else {
                payment = fixedMonthlyPayment;
                principal = payment - interest;
                currentBalance -= principal;
            }
        } else {
            // Хугацааны эцэст
            if (i === n) {
                principal = currentBalance;
                payment = principal + interest;
                currentBalance = 0;
            } else {
                principal = 0;
                payment = interest;
            }
        }

        // Balance хасах утга руу орохоос сэргийлэх (Rounding error fix)
        if (currentBalance < 0) currentBalance = 0;

        tempSchedule.push({
            num: i,
            date: dateStr,
            payment: payment,
            principal: principal,
            interest: interest,
            balance: currentBalance
        });

        totalInterest += interest;
        totalPayment += payment;
    }

    // Үр дүн хадгалах
    // Тэнцүү төлбөрт үед сарын төлбөр тогтмол, Хугацааны эцэст үед зөвхөн хүү
    monthlyPayment = method === 'equal' ? fixedMonthlyPayment : (p * r);

    // ӨОХ байхын тулд шаардлагатай хамгийн бага орлого
    const minRequiredIncome = monthlyPayment / dti;

    return { result: {
      monthlyPayment,
      totalPayment,
      totalInterest,
      minRequiredIncome, 
      lastPayment: tempSchedule[n-1].payment // Сүүлийн төлбөр
    }, schedule: tempSchedule };
}

const LoanCalculator = ({ onBack }) => {
  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

  // --- STATE ---
  const [amount, setAmount] = useState('10000000');
  const [rate, setRate] = useState(2.5);
  const [months, setMonths] = useState(12);
  const [rateMin, setRateMin] = useState(2.5);
  const [rateMax, setRateMax] = useState(3.5);
  const [maxTerm, setMaxTerm] = useState(96);
  const [dti, setDti] = useState(0.6);
  const [method, setMethod] = useState('equal');
  const [aprSettings, setAprSettings] = useState(DEFAULT_LOAN_APR_CONFIG);
  const [feeIndex, setFeeIndex] = useState(-1);
  const [insuranceCost, setInsuranceCost] = useState(String(DEFAULT_LOAN_APR_CONFIG.defaultInsuranceCost));
  const insuranceEdited = useRef(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Эхлэх огноо

  const [showSchedule, setShowSchedule] = useState(false); // Хуваарь харагдах эсэх
  const [configStatus, setConfigStatus] = useState('loading');
  const [configRequest, setConfigRequest] = useState(0);

  // --- ХҮҮНИЙ СОНГОЛТУУД ---
  const rateOptions = [];
  for (let r = rateMin; r <= rateMax + 0.05; r += 0.1) {
    rateOptions.push(parseFloat(r.toFixed(1)));
  }

  // --- CONFIG FETCH ---
  useEffect(() => {
    fetch(`${API_URL}/api/config/flat`)
      .then(r => {
        if (!r.ok) throw new Error('Config request failed');
        return r.json();
      })
      .then(d => {
        if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Invalid config');
        const settings = normalizeLoanAprConfig(d[LOAN_APR_CONFIG_KEY]);
        setAprSettings(settings);
        if (!insuranceEdited.current) setInsuranceCost(String(settings.defaultInsuranceCost));
        const min = Number(d.loan_rate_min);
        const max = Number(d.loan_rate_max);
        if (d.loan_rate_min != null && d.loan_rate_max != null
          && Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min && max <= 100) {
          setRateMin(min);
          setRateMax(max);
          setRate(min);
        }
        const term = Number(d.loan_max_term);
        if (Number.isInteger(term) && term >= 1 && term <= 1200) setMaxTerm(term);
        const configuredDti = Number(d.dti_individual);
        if (Number.isFinite(configuredDti) && configuredDti > 0 && configuredDti <= 100) setDti(configuredDti / 100);
        setConfigStatus('ready');
      })
      .catch(() => setConfigStatus('error'));
  }, [API_URL, configRequest]);

  // --- ТООЦООЛОХ ---
  const { result, schedule } = useMemo(() => calculateLoanSchedule(amount, rate, months, method, startDate, dti, maxTerm),
    [amount, rate, months, method, startDate, dti, maxTerm]);

  // --- INPUT FORMATTING ---
  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val) {
        setAmount(parseInt(val).toLocaleString());
    } else {
        setAmount('');
    }
  };

  const formatMoney = (value) => {
    if (!value && value !== 0) return '0 ₮';
    return new Intl.NumberFormat('mn-MN').format(Math.round(value)) + ' ₮';
  };

  return (
    <div className="sc-public-page min-h-screen relative font-sans text-slate-800 pb-20" style={{background:'linear-gradient(135deg,#020f1c 0%,#041e34 50%,#020f1c 100%)'}}>

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{background:'radial-gradient(circle,#D4AF37,transparent 70%)'}}/>
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{background:'radial-gradient(circle,#4f9cf9,transparent 70%)'}}/>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
      </div>

      {/* 2. HEADER SECTION */}
      <div className="relative z-10 pt-32 pb-10 px-6 max-w-6xl mx-auto">
         <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition"><ArrowLeft size={16} /> Нүүр хуудас</button>
         <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30"><Calculator className="text-[#D4AF37]" size={26}/></span>
            Зээлийн тооцоолуур
         </h1>
         <p className="text-white/50 max-w-2xl text-base leading-7">
             Та өөрийн санхүүгийн боломжид тулгуурлан зээлийн тооцооллыг хийгээрэй.
         </p>
      </div>

      {/* 3. CALCULATOR CARD */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LEFT: INPUTS */}
            <div className="w-full lg:w-1/2 rounded-2xl p-6 md:p-8 border border-white/10" style={{background:'rgba(255,255,255,0.04)',backdropFilter:'blur(16px)'}}>
                <h3 className="font-display font-bold text-lg mb-6 text-white border-b border-white/10 pb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-[#D4AF37] inline-block"/>Зээлийн нөхцөл оруулах
                </h3>
                
                <div className="space-y-6">
                    {/* Зээлийн дүн */}
                    <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                            Зээлийн дүн
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full p-4 bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition font-bold text-xl text-white placeholder-white/30"
                            />
                            <div className="absolute right-4 top-4 text-[#D4AF37] text-sm pointer-events-none font-bold">
                                ₮
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Хүү */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                                Сарын хүү (%)
                            </label>
                            <select
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="w-full p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition font-bold text-lg"
                                style={{background:'#0a2540',color:'#fff',border:'1px solid rgba(255,255,255,0.15)'}}
                            >
                                {rateOptions.map(r => (
                                    <option key={r} value={r} style={{background:'#0a2540',color:'#fff'}}>{r}%</option>
                                ))}
                            </select>
                        </div>

                        {/* Хугацаа */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                                Хугацаа (Сар)
                            </label>
                            <input
                                type="number"
                                min="1" max={maxTerm}
                                value={months}
                                onChange={(e) => setMonths(e.target.value)}
                                className="w-full p-4 bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition font-bold text-lg text-white"
                            />
                        </div>
                    </div>

                    {/* Огноо */}
                    <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar size={13}/> Эхлэх огноо
                        </label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition font-bold text-base [color-scheme:dark]"
                            style={{background:'#0a2540',color:'#fff',border:'1px solid rgba(255,255,255,0.15)'}}
                        />
                    </div>

                    {/* Төлбөрийн нөхцөл */}
                    <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                            Төлбөрийн нөхцөл
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMethod('equal')}
                                className={`p-4 rounded-xl border text-sm font-bold transition-all ${method === 'equal' ? 'bg-[#D4AF37] text-[#020f1c] border-[#D4AF37]' : 'bg-white/5 text-white/60 border-white/15 hover:border-[#D4AF37]/50 hover:text-white'}`}
                            >
                                Тэнцүү төлбөрт
                            </button>
                            <button
                                onClick={() => setMethod('bullet')}
                                className={`p-4 rounded-xl border text-sm font-bold transition-all ${method === 'bullet' ? 'bg-[#D4AF37] text-[#020f1c] border-[#D4AF37]' : 'bg-white/5 text-white/60 border-white/15 hover:border-[#D4AF37]/50 hover:text-white'}`}
                            >
                                Хугацааны эцэст
                            </button>
                        </div>
                    </div>
                    <LoanAprFields settings={aprSettings} feeIndex={feeIndex} onFeeChange={setFeeIndex}
                      insuranceCost={insuranceCost} onInsuranceChange={value => {
                        insuranceEdited.current = true;
                        setInsuranceCost(value);
                      }} />
                </div>
            </div>

            {/* RIGHT: RESULTS */}
            <div className="w-full lg:w-1/2 space-y-6">
                {configStatus !== 'ready' && (
                  <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {configStatus === 'loading'
                      ? 'Тохиргоог ачаалж байна. Одоогоор анхны тохиргоогоор тооцож байна.'
                      : 'Тохиргоог ачаалж чадсангүй. Анхны тохиргоогоор тооцож байна; шимтгэл, даатгалын дүнгээ шалгана уу.'}
                    {configStatus === 'error' && <button type="button" onClick={() => {
                      setConfigStatus('loading');
                      setConfigRequest(previous => previous + 1);
                    }} className="ml-2 underline font-semibold">Дахин ачаалах</button>}
                  </div>
                )}
                <LoanAprResult
                  principal={Number(amount.toString().replace(/,/g, ''))}
                  monthlyRate={Number(rate) / 100}
                  months={Number.isInteger(Number(months)) && Number(months) <= maxTerm ? Number(months) : NaN}
                  serviceFee={feeIndex < 0 ? 0 : aprSettings.serviceFeeOptions[feeIndex]}
                  insuranceCost={insuranceCost} settings={aprSettings}
                  method={method}
                />
                {!result && <p role="alert" className="text-sm text-red-700">Зээлийн дүн, хугацаа (1–{maxTerm} бүтэн сар), сарын хүү болон эхлэх огноог зөв оруулна уу.</p>}
                
                {/* Үндсэн үр дүн */}
                <div className="text-white rounded-2xl p-8 relative overflow-hidden border border-white/10" style={{background:'linear-gradient(135deg,rgba(212,175,55,0.12) 0%,rgba(4,30,52,0.95) 40%)'}}>
                    <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#D4AF37] rounded-full opacity-10 blur-3xl pointer-events-none"/>
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-[#D4AF37]/60 to-transparent"/>

                    <h3 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
                        <CheckCircle size={14} /> Үндсэн зээлийн төлбөр
                    </h3>
                    
                    <div className="space-y-8 relative z-10">
                        <p className="text-sm text-blue-100">Энэ хуваарьт үйлчилгээний шимтгэл болон даатгалын зардал ороогүй. Зардал багтсан тэнцүү төлбөрийг бодит өртгийн хэсгээс харна уу.</p>
                        <div>
                            <p className="text-blue-200 text-sm mb-2 uppercase tracking-wide">Сард төлөх дүн {method === 'bullet' && '(Зөвхөн хүү)'}</p>
                            <p className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight">
                                {formatMoney(result?.monthlyPayment)}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                            <div>
                                <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Нийт хүү</p>
                                <p className="text-2xl font-bold text-[#D4AF37]">{formatMoney(result?.totalInterest)}</p>
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Нийт төлөх</p>
                                <p className="text-2xl font-bold text-white">{formatMoney(result?.totalPayment)}</p>
                            </div>
                        </div>

                        {/* Хуваарь харах товч */}
                        <button 
                            disabled={!result}
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 border border-slate-200 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {showSchedule ? 'Хуваарь хаах' : 'Төлбөрийн хуваарь харах'}
                            {showSchedule ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                    </div>
                </div>

                {/* ШААРДЛАГАТАЙ ОРЛОГО */}
                <div className="rounded-2xl p-6 border border-white/10 relative overflow-hidden" style={{background:'rgba(255,255,255,0.04)'}}>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none" style={{background:'radial-gradient(circle,#4ade80,transparent)'}}/>
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl border border-emerald-400/20" style={{background:'rgba(74,222,128,0.08)'}}>
                            <Banknote size={22} className="text-emerald-400"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-base text-white mb-1">
                                Шаардлагатай сарын орлого
                            </h4>
                            <p className="text-white/50 text-sm mb-3">
                                ӨОХ {Math.round(dti * 100)}%-д барихын тулд доод тал нь:
                            </p>
                            <p className="text-3xl font-bold text-emerald-400 tracking-tight">
                                {formatMoney(result?.minRequiredIncome)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="p-4 rounded-xl border border-white/8 text-xs text-white/40 flex gap-3" style={{background:'rgba(255,255,255,0.02)'}}>
                    <Info className="flex-shrink-0 text-[#D4AF37]/60 mt-0.5" size={16} />
                    <p>Энэхүү тооцоолол нь зөвхөн <strong className="text-white/60">лавлагааны зориулалттай</strong> бөгөөд бодит зээлийн нөхцөлөөс ялгаатай байж болно.</p>
                </div>
            </div>
        </div>
      </div>

      <LoanAprExplanation settings={aprSettings} />

      {/* 4. PAYMENT SCHEDULE TABLE (TOGGLE) */}
      {showSchedule && schedule.length > 0 && (
          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 mt-8 animate-fade-in-up pb-20">
              <div className="rounded-2xl overflow-hidden border border-white/10" style={{background:'rgba(255,255,255,0.04)'}}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                      <h3 className="font-display font-bold text-base text-white">Зээлийн эргэн төлөлтийн хуваарь</h3>
                      <button onClick={() => setShowSchedule(false)} className="text-white/40 hover:text-red-400 font-bold text-xs uppercase transition">Хаах</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-white/40 uppercase border-b border-white/10">
                              <tr>
                                  <th className="px-6 py-4">#</th>
                                  <th className="px-6 py-4">Огноо</th>
                                  <th className="px-6 py-4 text-right">Үндсэн зээл</th>
                                  <th className="px-6 py-4 text-right">Хүү</th>
                                  <th className="px-6 py-4 text-right text-[#D4AF37] font-bold">Нийт төлөх</th>
                                  <th className="px-6 py-4 text-right">Үлдэгдэл</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {schedule.map((row) => (
                                  <tr key={row.num} className="hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4 font-medium text-white/70">{row.num}</td>
                                      <td className="px-6 py-4 text-white/40">{row.date}</td>
                                      <td className="px-6 py-4 text-right text-white/70">{formatMoney(row.principal)}</td>
                                      <td className="px-6 py-4 text-right text-white/70">{formatMoney(row.interest)}</td>
                                      <td className="px-6 py-4 text-right font-bold text-[#D4AF37]">{formatMoney(row.payment)}</td>
                                      <td className="px-6 py-4 text-right text-white/40">{formatMoney(row.balance)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default LoanCalculator;
