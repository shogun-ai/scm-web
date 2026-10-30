import { Plus, X } from 'lucide-react';
import { getProductTermSections, getProductTermList, updateProductTermList } from '../utils/productTerms.mjs';

export default function ProductTermsEditor({ product, onChange }) {
  const updateList = (path, field, update) => {
    onChange(previous => updateProductTermList(previous, path, field, update));
  };

  return getProductTermSections(product).map(section => (
    <section key={section.key} aria-label={section.label} className="border rounded-2xl p-5 space-y-4 text-slate-800">
      <h4 className="font-bold text-sm text-gray-600">{section.label}</h4>
      {['conditions', 'requirements'].map(field => {
        const label = field === 'conditions' ? 'Нөхцөл' : 'Шаардлага';
        return (
          <div key={field} className="space-y-2">
            <p className="text-xs text-slate-500 font-bold">{label}</p>
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
                  className="flex-1 min-w-0 p-2 border rounded-lg text-sm bg-slate-50 text-slate-800"
                />
                <button type="button" aria-label={`${section.label} — ${label} ${index + 1} устгах`}
                  onClick={() => updateList(section.path, field, items => items.filter((_, i) => i !== index))}
                  className="p-2 text-red-400 hover:text-red-600"><X size={16} /></button>
              </div>
            ))}
            <button type="button" aria-label={`${section.label} — ${label} нэмэх`}
              onClick={() => updateList(section.path, field, items => [...items, ''])}
              className="flex items-center gap-1 text-xs text-[#003B5C] font-bold hover:underline">
              <Plus size={14} /> Нэмэх
            </button>
          </div>
        );
      })}
    </section>
  ));
}
