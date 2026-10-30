import { calculateAPR, calculateAnnuityPayment, calculateBulletAPR, calculateBulletMonthlyPayment } from '../../../shared/loanApr.js';

const money = value => `${new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(value)} ₮`;

export function LoanAprFields({ settings, feeIndex, onFeeChange, insuranceCost, onInsuranceChange }) {
  return (
    <div className="space-y-5 border-t border-white/10 pt-6">
      <div>
        <label htmlFor="apr-service-fee" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">{settings.serviceFeeLabel}</label>
        <select id="apr-service-fee" value={feeIndex} onChange={event => onFeeChange(Number(event.target.value))}
          className="w-full p-4 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition"
          style={{background:'#0a2540',color:'#fff',border:'1px solid rgba(255,255,255,0.15)'}}>
          <option value={-1} style={{background:'#0a2540',color:'#fff'}}>Шимтгэлгүй (0 ₮)</option>
          {settings.serviceFeeOptions.map((fee, index) => <option key={index} value={index} style={{background:'#0a2540',color:'#fff'}}>{money(fee)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="apr-insurance-cost" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">{settings.insuranceLabel} (₮)</label>
        <input id="apr-insurance-cost" type="number" min="0" step="1" value={insuranceCost}
          onChange={event => onInsuranceChange(event.target.value)}
          className="w-full p-4 bg-white/5 border border-white/15 rounded-xl font-bold text-white focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20" />
      </div>
    </div>
  );
}

export function LoanAprResult({ principal, monthlyRate, months, serviceFee, insuranceCost, settings, method }) {
  const insurance = insuranceCost === '' ? 0 : Number(insuranceCost);
  const validCosts = Number.isSafeInteger(insurance) && insurance >= 0;
  const costs = serviceFee + insurance;
  const isBullet = method === 'bullet';
  const apr = validCosts
    ? (isBullet
        ? calculateBulletAPR(principal, monthlyRate, months, costs)
        : calculateAPR(principal, monthlyRate, months, costs))
    : null;
  const payment = apr === null ? null
    : isBullet
      ? calculateBulletMonthlyPayment(principal, monthlyRate, months, costs)
      : calculateAnnuityPayment(principal + costs, monthlyRate, months);
  const totalPayment = payment === null ? null
    : isBullet ? payment * months + principal : payment * months;
  return (
    <section aria-labelledby="apr-result-heading" className="rounded-2xl border border-white/10 p-6 space-y-4 relative overflow-hidden" style={{background:'rgba(255,255,255,0.04)'}}>
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl pointer-events-none" style={{background:'radial-gradient(circle,#4f9cf9,transparent)'}}/>
      <h3 id="apr-result-heading" className="font-bold text-base text-white flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-[#4f9cf9] inline-block"/>{settings.title}
      </h3>
      <p className="text-xs text-white/40 uppercase tracking-widest">
        {isBullet ? 'Хугацааны эцэст • жилийн бодит өртөг' : 'Тэнцүү төлбөрийн суурьтай • жилээр'}
      </p>
      <div aria-live="polite" aria-atomic="true">
        {apr === null ? (
          <p role="status" className="text-sm text-red-400">Зээлийн дүн, сарын хүү, хугацаа болон зардлаа зөв оруулна уу. Даатгалын зардал 0 буюу түүнээс их бүхэл төгрөг байна.</p>
        ) : (
          <>
            <p className="text-4xl font-bold text-[#4ade80]">{apr.toFixed(2)}%</p>
            <dl className="mt-5 space-y-3 text-sm divide-y divide-white/5">
              <div className="flex justify-between gap-4 pb-2"><dt className="text-white/50">Нийт нэмэлт зардал</dt><dd className="font-semibold text-white">{money(costs)}</dd></div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-white/50">{isBullet ? 'Зардал багтсан сарын хүүний төлбөр' : 'Зардал багтсан сарын тэнцүү төлбөр'}</dt>
                <dd className="font-semibold text-white">{money(payment)}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2">
                <dt className="text-white/50">{isBullet ? 'Нийт хүүний төлбөр + үндсэн зээл' : 'Зардал багтсан нийт төлбөр'}</dt>
                <dd className="font-semibold text-[#D4AF37]">{money(totalPayment)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
      <p className="text-xs leading-6 text-white/30 whitespace-pre-line">{settings.calculationNote}</p>
    </section>
  );
}

export function LoanAprExplanation({ settings }) {
  return (
    <section aria-label="Зээлийн бодит өртгийн тайлбар" className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 mt-8">
      <div className="rounded-2xl border border-white/10 p-6 md:p-8 space-y-6 text-sm leading-7" style={{background:'rgba(255,255,255,0.04)'}}>
        <p className="font-semibold text-white/80 whitespace-pre-line">{settings.explanationIntro}</p>
        {[['includedTitle', 'includedText'], ['excludedTitle', 'excludedText']].map(([title, text]) => (
          <div key={title} className="space-y-3">
            <h3 className="font-bold text-[#D4AF37] whitespace-pre-line">{settings[title]}</h3>
            <div className="space-y-2 text-white/50">{settings[text].split('\n').filter(line => line.trim()).map((line, index) => <p key={index}>{line}</p>)}</div>
          </div>
        ))}
        <a href="https://www.mongolbank.mn/mn/loan-rate-calculator" target="_blank" rel="noopener noreferrer"
          className="inline-block text-[#D4AF37]/70 hover:text-[#D4AF37] underline underline-offset-4 transition">Монголбанкны зээлийн бодит өртгийн тооцоолуур</a>
      </div>
    </section>
  );
}
