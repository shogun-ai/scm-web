import { Plus, X } from 'lucide-react';
import { getProductTermSections, getProductTermList, updateProductTermList } from '../utils/productTerms.mjs';

// Product conditions / requirements lists. Rendered inside the admin CMS product editor (Prism Sky, dark surface).
export default function ProductTermsEditor({ product, onChange }) {
  const updateList = (path, field, update) => {
    onChange(previous => updateProductTermList(previous, path, field, update));
  };

  return getProductTermSections(product, { includeAll: true }).map(section => (
    <section key={section.key} aria-label={section.label} className="space-y-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.08] md:p-5">
      <h4 className="text-sm font-semibold text-white">{section.label}</h4>
      {['conditions', 'requirements'].map(field => {
        const label = field === 'conditions' ? 'Нөхцөл' : 'Шаардлага';
        return (
          <div key={field} className="space-y-2">
            <p className="adm-label">{label}</p>
            {getProductTermList(product, section.path, field).map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <textarea
                  rows={2}
                  aria-label={`${section.label} — ${label} ${index + 1}`}
                  value={item}
                  onChange={event => {
                    const value = event.target.value;
                    updateList(section.path, field, items => items.map((entry, i) => i === index ? value : entry));
                  }}
                  className="adm-field min-w-0 flex-1 resize-y py-2.5 leading-relaxed"
                />
                <button type="button" aria-label={`${section.label} — ${label} ${index + 1} устгах`}
                  onClick={() => updateList(section.path, field, items => items.filter((_, i) => i !== index))}
                  className="adm-icon-btn shrink-0 hover:!bg-[#FF6B86]/[0.12] hover:!text-[#FFB8C5]"><X size={16} aria-hidden="true" /></button>
              </div>
            ))}
            <button type="button" aria-label={`${section.label} — ${label} нэмэх`}
              onClick={() => updateList(section.path, field, items => [...items, ''])}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-[color-mix(in_srgb,var(--hue)_55%,white)] hover:text-white">
              <Plus size={14} aria-hidden="true" /> Нэмэх
            </button>
          </div>
        );
      })}
    </section>
  ));
}
