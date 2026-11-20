import { Car, Home, IdCard, Paperclip, Wallet } from 'lucide-react';
import { Fragment } from 'react';
import { groupFileFields } from './taskFormUtils';

const META = {
  personal: { Icon: IdCard, help: 'Иргэний үнэмлэх, оршин суугаа газрын лавлагаа зэрэг.' },
  income: { Icon: Wallet, help: 'НДШ, дансны хуулга, ЗМС лавлагаа зэрэг орлогыг нотлох баримт.' },
  collateral: { Icon: Home, help: 'Үл хөдлөх хөрөнгө, тээврийн хэрэгслийн болон бусад барьцааны баримт.' },
  other: { Icon: Paperclip, help: 'Дээрх ангилалд ороогүй нэмэлт баримт.' },
};

// Groups visible file fields into category cards. renderField(field) renders one field.
export default function FileCategoryCards({ fields, files = {}, renderField }) {
  const groups = groupFileFields(fields);
  if (!groups.length) return null;
  return <div className="space-y-4">
    {groups.map(group => {
      const { Icon, help } = META[group.key] || META.other;
      const Lead = group.key === 'collateral' && group.fields.some(field => /car|vehicle/.test(field.key)) && !group.fields.some(field => !/car|vehicle/.test(field.key)) ? Car : Icon;
      const count = group.fields.reduce((sum, field) => sum + (files[field.key]?.length || 0), 0);
      const required = group.fields.some(field => field.required);
      const headingId = `file-cat-${group.key}`;
      return <section key={group.key} aria-labelledby={headingId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#102d43] text-white"><Lead size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="text-base font-semibold text-[#102d43]">{group.label}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{help}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-semibold ${count ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{count ? `${count} файл хавсаргасан` : 'Хавсаргаагүй'}</span>
            {required && <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">Заавал</span>}
          </div>
        </header>
        <div className="divide-y divide-slate-100">{group.fields.map(field => <Fragment key={field.key}><div className="px-4 py-4 md:px-5">{renderField(field)}</div></Fragment>)}</div>
      </section>;
    })}
  </div>;
}
