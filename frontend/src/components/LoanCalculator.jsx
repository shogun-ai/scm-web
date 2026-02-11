import React, { useState, useEffect } from 'react';
import { Calculator, ArrowLeft, Banknote, Info, CheckCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const LoanCalculator = ({ onBack }) => {
  // --- STATE ---
  const [amount, setAmount] = useState('10000000');
  const [rate, setRate] = useState(2.5);
  const [months, setMonths] = useState(12);
  const [method, setMethod] = useState('equal');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Эхлэх огноо
  
  const [result, setResult] = useState(null);
  const [schedule, setSchedule] = useState([]); // Төлбөрийн хуваарь
  const [showSchedule, setShowSchedule] = useState(false); // Хуваарь харагдах эсэх

  // --- ХҮҮНИЙ СОНГОЛТУУД ---
  const rateOptions = [];
  for (let r = 2.5; r <= 3.6; r += 0.1) {
    rateOptions.push(r.toFixed(1));
  }

  // --- ТООЦООЛОХ ---
  useEffect(() => {
    calculateLoan();
  }, [amount, rate, months, method, startDate]);

  const calculateLoan = () => {
    const rawAmount = amount.toString().replace(/,/g, '');
    const p = parseFloat(rawAmount); // Зээлийн дүн
    const r = parseFloat(rate) / 100; // Сарын хүү
    const n = parseInt(months); // Хугацаа

    if (!p || !n) {
        setResult(null);
        setSchedule([]);
        return;
    }

    let monthlyPayment = 0;
    let totalPayment = 0;
    let totalInterest = 0;
    
    // Хуваарь бодох хувьсагчид
    let tempSchedule = [];
    let currentBalance = p;
    let currentDate = new Date(startDate);
    
    // Тогтмол төлбөрийг эхэлж олох (Тэнцүү төлбөрт үед)
    const fixedMonthlyPayment = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

    for (let i = 1; i <= n; i++) {
        // Огноо ахиулах
        currentDate.setMonth(currentDate.getMonth() + 1);
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

    // ӨОХ 60% байхын тулд шаардлагатай хамгийн бага орлого
    const minRequiredIncome = monthlyPayment / 0.6;

    setResult({
      monthlyPayment,
      totalPayment,
      totalInterest,
      minRequiredIncome, 
      lastPayment: tempSchedule[n-1].payment // Сүүлийн төлбөр
    });

    setSchedule(tempSchedule);
  };

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
    <div className="min-h-screen relative font-sans text-slate-800 pb-20">
      
      {/* 1. BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1501854140884-074cf27f731d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#003B5C]/80 backdrop-blur-sm"></div>
      </div>

      {/* 2. HEADER SECTION */}
      <div className="relative z-10 pt-32 pb-10 px-6 max-w-6xl mx-auto">
         
         {/* ❌ ЭНД БАЙСАН <button> КОДЫГ БҮХЭЛД НЬ УСТГААРАЙ */}

         <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4 flex items-center gap-4">
            <Calculator className="text-[#D4AF37]" size={40}/> Зээлийн тооцоолуур
         </h1>
         <p className="text-blue-100 max-w-2xl font-light text-lg">
             Та өөрийн санхүүгийн боломжид тулгуурлан зээлийн тооцооллыг хийгээрэй.
         </p>
      </div>

      {/* 3. CALCULATOR CARD */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LEFT: INPUTS */}
            <div className="w-full lg:w-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
                <h3 className="font-display font-bold text-xl mb-6 text-[#003B5C] border-b border-gray-100 pb-4">
                    Зээлийн нөхцөл оруулах
                </h3>
                
                <div className="space-y-6">
                    {/* Зээлийн дүн */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            Зээлийн дүн (₮)
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-xl text-[#003B5C]"
                            />
                            <div className="absolute right-4 top-4 text-gray-400 text-sm pointer-events-none font-bold">
                                ₮
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Хүү */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Сарын хүү (%)
                            </label>
                            <select 
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-lg text-[#003B5C]"
                            >
                                {rateOptions.map(r => (
                                    <option key={r} value={r}>{r}%</option>
                                ))}
                            </select>
                        </div>

                        {/* Хугацаа */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Хугацаа (Сар)
                            </label>
                            <input 
                                type="number" 
                                min="1" max="96"
                                value={months}
                                onChange={(e) => setMonths(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-lg text-[#003B5C]"
                            />
                        </div>
                    </div>

                    {/* Огноо */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                            <Calendar size={14}/> Эхлэх огноо
                        </label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-base text-[#003B5C]"
                        />
                    </div>

                    {/* Төлбөрийн нөхцөл */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            Төлбөрийн нөхцөл
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => setMethod('equal')}
                                className={`p-4 rounded-xl border text-sm font-bold transition-all ${method === 'equal' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#D4AF37]'}`}
                            >
                                Тэнцүү төлбөрт
                            </button>
                            <button 
                                onClick={() => setMethod('bullet')}
                                className={`p-4 rounded-xl border text-sm font-bold transition-all ${method === 'bullet' ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#D4AF37]'}`}
                            >
                                Хугацааны эцэст
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: RESULTS */}
            <div className="w-full lg:w-1/2 space-y-6">
                
                {/* Үндсэн үр дүн */}
                <div className="bg-[#003B5C] text-white rounded-2xl shadow-2xl p-8 relative overflow-hidden border border-white/10">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37] rounded-full opacity-10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-transparent"></div>
                    
                    <h3 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
                        <CheckCircle size={14} /> Тооцооллын үр дүн
                    </h3>
                    
                    <div className="space-y-8 relative z-10">
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
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        >
                            {showSchedule ? 'Хуваарь хаах' : 'Төлбөрийн хуваарь харах'}
                            {showSchedule ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                    </div>
                </div>

                {/* ШААРДЛАГАТАЙ ОРЛОГО (DTI Logic) */}
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                            <Banknote size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-emerald-900 mb-1">
                                Шаардлагатай сарын орлого
                            </h4>
                            <p className="text-emerald-700 text-sm mb-3 opacity-90">
                                Өр орлогын харьцааг 60%-д барихын тулд таны сарын цэвэр орлого доод тал нь ийм байх шаардлагатай:
                            </p>
                            <p className="text-3xl font-bold text-emerald-600 tracking-tight">
                                {formatMoney(result?.minRequiredIncome)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-white/20 text-xs text-slate-500 flex gap-3">
                    <Info className="flex-shrink-0 text-[#003B5C]" size={18} />
                    <p>
                        Энэхүү тооцоолол нь зөвхөн урьдчилсан байдлаар хийгдэж байгаа бөгөөд зээлийн бодит нөхцөл, шимтгэл зэргээс шалтгаалан өөрчлөгдөх боломжтой.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* 4. PAYMENT SCHEDULE TABLE (TOGGLE) */}
      {showSchedule && schedule.length > 0 && (
          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 mt-8 animate-fade-in-up pb-20">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                  <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-display font-bold text-lg text-[#003B5C]">Зээлийн эргэн төлөлтийн хуваарь</h3>
                      <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase">Хаах</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-gray-100">
                              <tr>
                                  <th className="px-6 py-4">#</th>
                                  <th className="px-6 py-4">Огноо</th>
                                  <th className="px-6 py-4 text-right">Үндсэн зээл</th>
                                  <th className="px-6 py-4 text-right">Хүү</th>
                                  <th className="px-6 py-4 text-right text-[#003B5C] font-bold">Нийт төлөх</th>
                                  <th className="px-6 py-4 text-right">Үлдэгдэл</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {schedule.map((row) => (
                                  <tr key={row.num} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-gray-900">{row.num}</td>
                                      <td className="px-6 py-4 text-gray-500">{row.date}</td>
                                      <td className="px-6 py-4 text-right">{formatMoney(row.principal)}</td>
                                      <td className="px-6 py-4 text-right">{formatMoney(row.interest)}</td>
                                      <td className="px-6 py-4 text-right font-bold text-[#003B5C]">{formatMoney(row.payment)}</td>
                                      <td className="px-6 py-4 text-right text-gray-400">{formatMoney(row.balance)}</td>
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