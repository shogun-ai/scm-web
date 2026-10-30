import { calculateAPR, calculateAnnuityPayment } from '../../../shared/loanApr.js';

const money = value => `${new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }).format(value)} ₮`;

export function LoanAprFields({ settings, feeIndex, onFeeChange, insuranceCost, onInsuranceChange }) {
  return (
    <div className="space-y-5 border-t border-slate-200 pt-6 [color-scheme:light]">
      <div>
        <label htmlFor="apr-service-fee" className="block text-sm font-medium text-slate-600 mb-2">{settings.serviceFeeLabel}</label>
        <select id="apr-service-fee" value={feeIndex} onChange={event => onFeeChange(Number(event.target.value))}
          className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl font-bold text-[#003B5C]">
          {settings.serviceFeeOptions.map((fee, index) => <option key={index} value={index}>{money(fee)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="apr-insurance-cost" className="block text-sm font-medium text-slate-600 mb-2">{settings.insuranceLabel} (₮)</label>
        <input id="apr-insurance-cost" type="number" min="0" step="1" value={insuranceCost}
          onChange={event => onInsuranceChange(event.target.value)}
          className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl font-bold text-[#003B5C]" />
      </div>
    </div>
  );
}

export function LoanAprResult({ principal, monthlyRate, months, serviceFee, insuranceCost, settings }) {
  const insurance = insuranceCost === '' ? 0 : Number(insuranceCost);
  const validCosts = Number.isSafeInteger(insurance) && insurance >= 0;
  const costs = serviceFee + insurance;
  const apr = validCosts ? calculateAPR(principal, monthlyRate, months, costs) : null;
  const payment = apr === null ? null : calculateAnnuityPayment(principal + costs, monthlyRate, months);
  return (
    <section aria-labelledby="apr-result-heading" className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-800 space-y-4">
      <h3 id="apr-result-heading" className="font-bold text-xl text-[#003B5C]">{settings.title}</h3>
      <p className="text-sm text-slate-600">Тэнцүү төлбөрийн суурьтай • жилээр</p>
      <div aria-live="polite" aria-atomic="true">
        {apr === null ? (
          <p role="status" className="text-sm text-red-700">Зээлийн дүн, сарын хүү, хугацаа болон зардлаа зөв оруулна уу. Даатгалын зардал 0 буюу түүнээс их бүхэл төгрөг байна.</p>
        ) : (
          <>
            <p className="text-4xl font-bold text-[#007A3D]">{apr.toFixed(2)}%</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt>Нийт нэмэлт зардал</dt><dd className="font-semibold">{money(costs)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Зардал багтсан сарын тэнцүү төлбөр</dt><dd className="font-semibold">{money(payment)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Зардал багтсан нийт төлбөр</dt><dd className="font-semibold">{money(payment * months)}</dd></div>
            </dl>
          </>
        )}
      </div>
      <p className="text-xs leading-6 text-slate-600 whitespace-pre-line">{settings.calculationNote}</p>
    </section>
  );
}

export function LoanAprExplanation({ settings }) {
  return (
    <section aria-label="Зээлийн бодит өртгийн тайлбар" className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 mt-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 text-sm leading-7 text-slate-700">
        <p className="font-semibold whitespace-pre-line">{settings.explanationIntro}</p>
        {[['includedTitle', 'includedText'], ['excludedTitle', 'excludedText']].map(([title, text]) => (
          <div key={title} className="space-y-3">
            <h3 className="font-bold text-[#003B5C] whitespace-pre-line">{settings[title]}</h3>
            <div className="space-y-2">{settings[text].split('\n').filter(line => line.trim()).map((line, index) => <p key={index}>{line}</p>)}</div>
          </div>
        ))}
        <a href="https://www.mongolbank.mn/mn/loan-rate-calculator" target="_blank" rel="noopener noreferrer"
          className="inline-block text-[#003B5C] underline underline-offset-4">Монголбанкны зээлийн бодит өртгийн тооцоолуур</a>
      </div>
    </section>
  );
}
