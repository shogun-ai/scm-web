import { DEFAULT_LOAN_APR_CONFIG } from '../../../shared/loanAprConfig.js';

const textFields = [
  ['title', 'Бодит өртгийн гарчиг', 1],
  ['serviceFeeLabel', 'Үйлчилгээний шимтгэлийн талбарын нэр', 2],
  ['insuranceLabel', 'Даатгалын талбарын нэр', 1],
  ['calculationNote', 'Тооцооллын тайлбар (тэнцүү төлбөрт)', 4],
  ['bulletCalculationNote', 'Тооцооллын тайлбар (хугацааны эцэст)', 4],
  ['explanationIntro', 'Журмын тайлбарын эхлэл', 3],
  ['includedTitle', '2.4 — Оруулах зардлын гарчиг', 3],
  ['includedText', '2.4.1–2.4.5 — Оруулах зардлууд (мөр бүрээр)', 10],
  ['excludedTitle', '2.5 — Оруулахгүй зардлын гарчиг', 3],
  ['excludedText', '2.5.1–2.5.5 — Оруулахгүй зардлууд (мөр бүрээр)', 8],
];

export default function LoanAprSettingsEditor({ value, onChange }) {
  const settings = { ...DEFAULT_LOAN_APR_CONFIG, ...value };
  if (!Array.isArray(settings.serviceFeeOptions) || settings.serviceFeeOptions.length !== 2) {
    settings.serviceFeeOptions = DEFAULT_LOAN_APR_CONFIG.serviceFeeOptions;
  }
  const update = (key, next) => onChange({ ...settings, [key]: next });
  return (
    <section aria-labelledby="apr-settings-heading" className="border-t border-slate-200 pt-6 space-y-5 text-slate-800 [color-scheme:light]">
      <h4 id="apr-settings-heading" className="font-bold text-lg text-[#003B5C]">Зээлийн бодит өртгийн тохиргоо</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {settings.serviceFeeOptions.map((fee, index) => (
          <div key={index}>
            <label htmlFor={`apr-fee-option-${index}`} className="block text-sm text-slate-600 mb-2">Шимтгэлийн сонголт {index + 1} (₮)</label>
            <input id={`apr-fee-option-${index}`} type="number" min="0" step="1" value={Number.isFinite(fee) ? fee : ''}
              onChange={event => update('serviceFeeOptions', settings.serviceFeeOptions.map((entry, i) => i === index ? (event.target.value === '' ? NaN : Number(event.target.value)) : entry))}
              className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="apr-default-insurance" className="block text-sm text-slate-600 mb-2">Даатгалын анхны дүн (₮)</label>
        <input id="apr-default-insurance" type="number" min="0" step="1" value={Number.isFinite(settings.defaultInsuranceCost) ? settings.defaultInsuranceCost : ''}
          onChange={event => update('defaultInsuranceCost', event.target.value === '' ? NaN : Number(event.target.value))}
          className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
      </div>
      {textFields.map(([key, label, rows]) => (
        <div key={key}>
          <label htmlFor={`apr-config-${key}`} className="block text-sm text-slate-600 mb-2">{label}</label>
          <textarea id={`apr-config-${key}`} rows={rows} value={settings[key]} onChange={event => update(key, event.target.value)}
            className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
        </div>
      ))}
    </section>
  );
}
