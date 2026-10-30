import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ArrowLeft, PiggyBank, Coins, Info, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const TrustCalculator = ({ onBack }) => {
  // --- STATE ---
  const [initialAmount, setInitialAmount] = useState('10000000'); // Анхны дүн
  const [monthlyContribution, setMonthlyContribution] = useState('0'); // Сар бүр нэмэх
  const [duration, setDuration] = useState(12); // Хугацаа (6 or 12)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Эхлэх огноо
  
  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';
  const [rate, setRate] = useState(1.8);

  const [showSchedule, setShowSchedule] = useState(false); // Хуваарь харагдах эсэх

  // --- CONFIG FETCH ---
  useEffect(() => {
    fetch(`${API_URL}/api/config/flat`)
      .then(r => r.json())
      .then(d => { if (d.trust_rate) setRate(parseFloat(d.trust_rate)); })
      .catch(() => {});
  }, [API_URL]);

  // --- ТОЙМ ТООЦООЛОЛ ---
  const { result, chartData, schedule } = useMemo(() => {
    const principal = parseFloat(initialAmount.toString().replace(/,/g, '')) || 0;
    const monthlyAdd = parseFloat(monthlyContribution.toString().replace(/,/g, '')) || 0;

    let currentBalance = principal;
    let totalInvested = principal;
    let history = []; // Графикийн дата
    let tempSchedule = []; // Хүснэгтийн дата
    
    let currentDate = new Date(startDate);

    // Хугацааны давталт
    for (let i = 1; i <= duration; i++) {
        // Огноо ахиулах
        currentDate.setMonth(currentDate.getMonth() + 1);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Энэ сарын хүү (Эхний үлдэгдлээс бодогдоно)
        const interestEarned = currentBalance * (rate / 100);
        
        // Хуваарьт бүртгэх (Өсөлтөөс өмнөх үлдэгдэл дээр бичих нь ойлгомжтой байдаг)
        const openingBalance = currentBalance;

        // Шинэ үлдэгдэл = Хуучин + Хүү + Нэмэлт орлого
        currentBalance += interestEarned + monthlyAdd;
        totalInvested += monthlyAdd;

        // График дата
        history.push({
            month: i,
            balance: currentBalance,
            interest: interestEarned
        });

        // Хүснэгт дата
        tempSchedule.push({
            num: i,
            date: dateStr,
            openingBalance: openingBalance,
            interest: interestEarned,
            contribution: monthlyAdd,
            closingBalance: currentBalance
        });
    }

    const totalBalance = currentBalance;
    const grossInterest = totalBalance - totalInvested; // Нийт хүүгийн орлого
    const tax = grossInterest * 0.10; // 10% татвар
    const netInterest = grossInterest - tax; // Гарт олгох хүү
    const netBalance = totalInvested + netInterest; // Гарт олгох нийт мөнгө

    return { result: {
        totalInvested,
        grossInterest,
        tax,
        netInterest,
        netBalance
    }, chartData: history, schedule: tempSchedule };
  }, [initialAmount, monthlyContribution, duration, startDate, rate]);

  // --- HELPER ---
  const handleMoneyInput = (val, setter) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (raw) {
        setter(parseInt(raw).toLocaleString());
    } else {
        setter('');
    }
  };

  const formatMoney = (value) => {
    if (!value && value !== 0) return '0 ₮';
    return new Intl.NumberFormat('mn-MN').format(Math.round(value)) + ' ₮';
  };

  return (
    <div className="sc-public-page min-h-screen relative font-sans text-slate-800 pb-20 bg-[#f7f8f6]">
      
      {/* 1. BACKGROUND */}


      {/* 2. HEADER */}
      <div className="relative z-10 pt-32 pb-10 px-6 max-w-6xl mx-auto">
        <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#062842]"><ArrowLeft size={16} /> Нүүр хуудас</button>
        
        {/* ❌ ЭНД БАЙСАН "БУЦАХ" ТОВЧИЙГ УСТГАЛАА */}

        <h1 className="text-3xl md:text-5xl font-display font-bold text-[#062842] mb-4 flex items-center gap-4 flex-wrap">
           <TrendingUp className="text-[#D4AF37]" size={40}/> Итгэлцлийн тооцоолуур
        </h1>
        <p className="text-slate-600 max-w-2xl text-base leading-7">
            Таны мөнгө сар бүр хэрхэн өсөхийг тооцоолж үзээрэй.
        </p>
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LEFT: INPUTS */}
            <div className="w-full lg:w-1/3 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                    <h3 className="font-display font-bold text-lg mb-6 text-[#003B5C] border-b border-gray-100 pb-4">
                        Хөрөнгө оруулалт
                    </h3>
                    
                    <div className="space-y-6">
                        {/* Анхны дүн */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                                Анх байршуулах дүн (₮)
                            </label>
                            <input 
                                type="text" 
                                value={initialAmount}
                                onChange={(e) => handleMoneyInput(e.target.value, setInitialAmount)}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-xl text-[#003B5C]"
                            />
                        </div>

                        {/* Сар бүр нэмэх */}
                        <div>
                            <label className="block text-sm font-medium text-[#007A3D] mb-2 flex items-center gap-2">
                                <Coins size={14} /> Сар бүр нэмэх (Сонголттой)
                            </label>
                            <input 
                                type="text" 
                                value={monthlyContribution}
                                onChange={(e) => handleMoneyInput(e.target.value, setMonthlyContribution)}
                                className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-xl focus:outline-none focus:border-[#00A651] transition font-bold text-xl text-[#003B5C]"
                            />
                        </div>

                        {/* Хугацаа */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                                <Calendar size={14} /> Хугацаа (Сар)
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setDuration(6)}
                                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${duration === 6 ? 'bg-[#003B5C] text-white border-[#003B5C] shadow-lg' : 'bg-white text-gray-500 border-gray-200 hover:border-[#D4AF37]'}`}
                                >
                                    6 Сар
                                </button>
                                <button 
                                    onClick={() => setDuration(12)}
                                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${duration === 12 ? 'bg-[#003B5C] text-white border-[#003B5C] shadow-lg' : 'bg-white text-gray-500 border-gray-200 hover:border-[#D4AF37]'}`}
                                >
                                    12 Сар
                                </button>
                            </div>
                        </div>

                        {/* Огноо */}
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                                Эхлэх огноо
                            </label>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#D4AF37] transition font-bold text-base text-[#003B5C]"
                            />
                        </div>

                        {/* Жишээ хүү */}
                        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-gray-200 text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Жишээ хүү (Сар)</p>
                            <p className="text-2xl font-bold text-[#D4AF37]">{rate}%</p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-[#D4AF37]/10 p-4 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] flex gap-3">
                    <Info className="flex-shrink-0" size={18} />
                    <p className="font-medium">
                        Итгэлцлийн хүүгийн орлогод хуулийн дагуу 10%-ийн татвар ногддог болохыг анхаарна уу.
                    </p>
                </div>
            </div>

            {/* RIGHT: RESULTS & CHART */}
            <div className="w-full lg:w-2/3 space-y-6">
                
                {/* 1. RESULTS SUMMARY */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-[#003B5C] p-6 text-white flex justify-between items-center">
                        <div>
                            <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Нийт хүлээж авах дүн</p>
                            <p className="text-4xl font-display font-bold text-[#D4AF37]">{formatMoney(result?.netBalance)}</p>
                        </div>
                        <PiggyBank size={48} className="text-white/20" />
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Нийт хүүгийн орлого</p>
                            <p className="text-xl font-bold text-[#003B5C]">{formatMoney(result?.grossInterest)}</p>
                        </div>
                        <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ХХОАТ (10%)</p>
                            <p className="text-xl font-bold text-red-500">-{formatMoney(result?.tax)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Цэвэр ашиг</p>
                            <p className="text-xl font-bold text-[#007A3D]">{formatMoney(result?.netInterest)}</p>
                        </div>
                    </div>

                    {/* Хуваарь харах товч */}
                    <div className="px-6 pb-6">
                        <button 
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-[#003B5C] font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {showSchedule ? 'Хуваарь хаах' : 'Өсөлтийн хуваарь харах'}
                            {showSchedule ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                    </div>
                </div>

                {/* Disclaimer */}
                {result && (
                  <div className="mt-4 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-start gap-2">
                    <svg className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-white/50">
                      Энэхүү тооцоолол нь <strong className="text-white/70">зөвхөн лавлагааны зориулалттай</strong> бөгөөд бодит зээлийн нөхцөлөөс ялгаатай байж болно. Нарийвчилсан мэдээлэлд манай мэргэжилтнүүдтэй холбоо барина уу.
                    </p>
                  </div>
                )}

                {/* 2. CUSTOM BAR CHART */}
                <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200">
                     <div className="flex justify-between items-center mb-8">
                        <h3 className="font-display font-bold text-sm uppercase tracking-widest text-[#003B5C]">
                            Өсөлтийн график ({duration} сар)
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-[#003B5C] rounded-sm"></div>
                            <span className="text-xs text-gray-500">Үндсэн дүн</span>
                            <div className="w-3 h-3 bg-[#D4AF37] rounded-sm ml-2"></div>
                            <span className="text-xs text-gray-500">Хүү</span>
                        </div>
                     </div>
                     
                     {/* Графикын талбар */}
                     <div className="h-64 w-full flex items-end justify-between gap-2 md:gap-4 px-2">
                        {chartData.map((data, index) => {
                            const maxVal = chartData[chartData.length - 1]?.balance || 1;
                            let heightPercent = (data.balance / maxVal) * 100;
                            if (heightPercent < 5) heightPercent = 5; 

                            return (
                                <div key={index} className="flex flex-col items-center gap-2 group w-full h-full justify-end relative">
                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#003B5C] text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                        Сар {data.month}: {formatMoney(data.balance)}
                                    </div>
                                    <div 
                                        className="w-full max-w-[40px] bg-gray-100 rounded-t-sm relative overflow-hidden transition-all duration-500 group-hover:shadow-lg"
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#003B5C] via-[#005f8f] to-[#D4AF37] opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#003B5C] transition-colors">{data.month}</span>
                                </div>
                            )
                        })}
                     </div>
                </div>

            </div>
        </div>
      </div>

      {/* 4. SCHEDULE TABLE (TOGGLE) */}
      {showSchedule && schedule.length > 0 && (
          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 mt-8 animate-fade-in-up pb-20">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="bg-slate-50 p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-display font-bold text-lg text-[#003B5C]">Өсөлтийн дэлгэрэнгүй хуваарь</h3>
                      <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase">Хаах</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-gray-100">
                              <tr>
                                  <th className="px-6 py-4">Сар</th>
                                  <th className="px-6 py-4">Огноо</th>
                                  <th className="px-6 py-4 text-right">Эхний үлдэгдэл</th>
                                  <th className="px-6 py-4 text-right text-[#D4AF37] font-bold">Хүүгийн орлого</th>
                                  <th className="px-6 py-4 text-right text-[#007A3D]">Нэмсэн</th>
                                  <th className="px-6 py-4 text-right text-[#003B5C] font-bold">Эцсийн үлдэгдэл</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {schedule.map((row) => (
                                  <tr key={row.num} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-gray-900">{row.num}</td>
                                      <td className="px-6 py-4 text-gray-500">{row.date}</td>
                                      <td className="px-6 py-4 text-right">{formatMoney(row.openingBalance)}</td>
                                      <td className="px-6 py-4 text-right text-[#D4AF37] font-bold">+{formatMoney(row.interest)}</td>
                                      <td className="px-6 py-4 text-right text-[#007A3D]">+{formatMoney(row.contribution)}</td>
                                      <td className="px-6 py-4 text-right text-[#003B5C] font-bold">{formatMoney(row.closingBalance)}</td>
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

export default TrustCalculator;
