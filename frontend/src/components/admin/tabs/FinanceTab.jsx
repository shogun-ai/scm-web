import { Eye, FileText, FolderOpen, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Form';
import { IconButton, Panel, SubCard } from './cms/editorKit';

// The policy flag checkboxes come pre-rendered (light markup) from AdminPanel; these descendant overrides
// re-tone them for the dark surface without touching AdminPanel.
const FLAG_TONE = '[&_input]:![accent-color:var(--hue)] [&_label]:!border-white/10 [&_label]:!bg-white/[0.04] [&_label]:!text-[var(--adm-ink-2)]';
const FILE_INPUT = 'block w-full min-w-0 text-sm text-[var(--adm-ink-2)] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-white/[0.12]';

function PolicySection({ category, icon, title, description, titlePlaceholder, submitLabel, empty, deletePolicy, handlePolicyUpload, newPolicy, policies, renderPolicyFlagInputs, renderPolicyRowFlags, setNewPolicy }) {
  const rows = policies.filter(p => p.category === category);
  const Icon = icon;
  return <Panel title={<span className="flex items-center gap-2"><Icon size={17} className="text-[color-mix(in_srgb,var(--hue)_70%,white)]" aria-hidden="true" />{title}</span>} description={description}>
    <form onSubmit={e => { e.preventDefault(); handlePolicyUpload(e, category); }} className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
      <Field label="Гарчиг">{({ id }) => <Input id={id} placeholder={titlePlaceholder} value={newPolicy.category === category ? newPolicy.title : ''} onChange={e => setNewPolicy(p => ({ ...p, title: e.target.value, category }))} required />}</Field>
      <Field label="PDF файл">{({ id }) => <input id={id} type="file" accept=".pdf" onChange={e => setNewPolicy(p => ({ ...p, file: e.target.files[0], category }))} className={FILE_INPUT} required />}</Field>
      <Button type="submit" icon={<Plus size={16} aria-hidden="true" />}>{submitLabel}</Button>
      <div className={`contents ${FLAG_TONE}`}>{renderPolicyFlagInputs(newPolicy, (key, value) => setNewPolicy(p => ({ ...p, [key]: value, category })))}</div>
    </form>
    <div className="space-y-2 border-t border-white/[0.08] pt-4">
      <p className="adm-label mb-1">Нийтэлсэн <span className="adm-tnum">({rows.length})</span></p>
      {rows.map(p => (
        <SubCard key={p._id} className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0 space-y-2">
            <span className="block break-words text-sm font-semibold text-white">{p.title}</span>
            <div className={FLAG_TONE}>{renderPolicyRowFlags(p)}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <a href={p.fileUrl || `/policies/${p.fileName}`} target="_blank" rel="noreferrer" className="adm-icon-btn" aria-label={`${p.title} — нээх`} title="Нээх"><Eye size={16} aria-hidden="true" /></a>
            <IconButton danger label={`${p.title} — устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => deletePolicy(p._id)} />
          </div>
        </SubCard>
      ))}
      {rows.length === 0 && <p className="py-2 text-sm text-[var(--adm-ink-3)]">{empty}</p>}
    </div>
  </Panel>;
}

// Файл засах (тайлан, бодлогын баримт) — Prism Sky, amber. Renders directly on the sky.
export default function FinanceTab({ deletePolicy, handlePolicyUpload, handleStatUpdate, newPolicy, policies, renderPolicyFlagInputs, renderPolicyRowFlags, setNewPolicy, stats }) {
  const shared = { deletePolicy, handlePolicyUpload, newPolicy, policies, renderPolicyFlagInputs, renderPolicyRowFlags, setNewPolicy };
  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-amber)' }}>
    <PageHeader hue="amber" icon={FolderOpen} eyebrow="Контент" title="Файл засах" description="Санхүүгийн үзүүлэлт, тайлан, бодлого журмын PDF" />

    <Panel title="Санхүүгийн үзүүлэлт" description="Нийтийн сайтад харагдах тоон үзүүлэлт. Утгыг засаад тухайн мөрийн товчийг дарна.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stats.map(s => (
          <SubCard key={s._id}>
            <label htmlFor={`stat-${s._id}`} className="adm-label mb-2 block">{s.label}</label>
            <div className="flex gap-2">
              <input id={`stat-${s._id}`} defaultValue={s.value} className="adm-field adm-tnum w-full min-w-0 font-semibold" />
              <Button variant="secondary" onClick={() => handleStatUpdate(s._id, document.getElementById(`stat-${s._id}`).value)} aria-label={`${s.label} — засах`}>Засах</Button>
            </div>
          </SubCard>
        ))}
      </div>
    </Panel>

    <PolicySection {...shared} category="report" icon={FileText} title="Санхүүгийн тайлан" description="Санхүүгийн тайлангийн PDF." titlePlaceholder="Тайлангийн гарчиг" submitLabel="Тайлан нэмэх" empty="Тайлан байхгүй байна." />
    <PolicySection {...shared} category="policy" icon={FolderOpen} title="Байгууллагын бодлого журам" description="Бодлого, журмын PDF." titlePlaceholder="Журамын гарчиг" submitLabel="Журам нэмэх" empty="Журам байхгүй байна." />
  </div>;
}
