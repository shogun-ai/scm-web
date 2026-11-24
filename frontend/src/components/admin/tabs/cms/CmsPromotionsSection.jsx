import { Images, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import Button from '../../ui/Button';
import { Field, Input, Select, Textarea, Toggle } from '../../ui/Form';
import { EmptyState, Pill } from '../../ui/Feedback';
import { IconButton, ImageField, Panel, SUBCARD } from './editorKit';

// Урамшуулал / маркетинг slider. Handlers (savePromo, deletePromo, updatePromoWidget) unchanged.
export default function CmsPromotionsSection({ cmsSaving, createEmptyPromo, deletePromo, editingPromo, promoSlides, savePromo, setEditingPromo, updatePromoWidget, uploadImage }) {
  const add = <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => promoSlides.length >= 5 ? alert('Хамгийн ихдээ 5 хуудас нэмнэ.') : setEditingPromo(createEmptyPromo())}>Нэмэх <span className="adm-tnum font-normal text-[var(--adm-ink-3)]">{promoSlides.length}/5</span></Button>;

  if (!editingPromo) {
    return <Panel title="Маркетинг slider" description="Нүүр дээр хажуу тийш солигдох хуудас. Хамгийн ихдээ 5." actions={add}>
      {promoSlides.length === 0 && <EmptyState icon={Images} title="Одоогоор slider хуудас алга." />}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {promoSlides.map(p => (
          <li key={p._id} className={`${SUBCARD} !p-0 overflow-hidden`}>
            <div className="relative h-36 bg-white/[0.04] bg-cover bg-center" style={{ backgroundImage: `url(${p.backgroundImageUrl})` }}>
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(12,16,32,0.9)] to-transparent" aria-hidden="true" />
              <span className="absolute left-3 top-3"><Pill hue={p.isActive ? 'green' : 'neutral'} className="!bg-[rgba(10,13,27,0.75)]">{p.isActive ? 'Идэвхтэй' : 'Нуусан'}</Pill></span>
            </div>
            <div className="flex justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-white">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--adm-ink-3)]">{p.excerpt}</p>
                <p className="mt-2 font-mono text-[11px] text-[var(--adm-ink-3)]">/{p.slug}</p>
              </div>
              <IconButton label={`${p.title || 'Хуудас'} засах`} icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditingPromo({ ...p })} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>;
  }

  return <Panel className="max-w-5xl" eyebrow="Маркетинг slider" title={editingPromo._id ? 'Хуудас засах' : 'Шинэ хуудас'} bodyClassName="space-y-5"
    actions={<IconButton label="Хаах" icon={<X size={20} aria-hidden="true" />} onClick={() => setEditingPromo(null)} />}>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[
        ['title', 'Гарчиг'], ['subtitle', 'Дээд жижиг текст'], ['slug', 'URL slug'], ['ctaLabel', 'Товчны текст']
      ].map(([field, label]) => (
        <Field key={field} label={label}>{({ id }) => <Input id={id} value={editingPromo[field] || ''} onChange={e => setEditingPromo(p => ({ ...p, [field]: e.target.value }))} />}</Field>
      ))}
      <Field label="Дараалал">{({ id }) => <Input id={id} type="number" value={editingPromo.order || 1} onChange={e => setEditingPromo(p => ({ ...p, order: Number(e.target.value) }))} />}</Field>
      <div className="flex items-end"><Toggle checked={editingPromo.isActive !== false} onChange={checked => setEditingPromo(p => ({ ...p, isActive: checked }))} label="Нүүр дээр харуулах" /></div>
    </div>
    <ImageField label="Суурь дэвсгэр зураг" alt="Promotion дэвсгэр зураг" placeholder="URL эсвэл зураг upload" previewClassName="h-40 w-full"
      value={editingPromo.backgroundImageUrl || ''}
      onChange={e => setEditingPromo(p => ({ ...p, backgroundImageUrl: e.target.value }))}
      onFile={async file => { try { const url = await uploadImage(file); setEditingPromo(p => ({ ...p, backgroundImageUrl: url })); } catch { alert('Upload алдаа'); } }} />
    <Field label="Богино тайлбар">{({ id }) => <Textarea id={id} rows={2} value={editingPromo.excerpt || ''} onChange={e => setEditingPromo(p => ({ ...p, excerpt: e.target.value }))} placeholder="Нүүр дээр харагдах богино тайлбар" />}</Field>
    <Field label="Үндсэн мэдээлэл">{({ id }) => <Textarea id={id} rows={7} value={editingPromo.body || ''} onChange={e => setEditingPromo(p => ({ ...p, body: e.target.value }))} placeholder="Дэлгэрэнгүй хуудсанд харагдах үндсэн мэдээлэл" />}</Field>
    <div className="space-y-3 border-t border-white/[0.08] pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="adm-label">Widget-үүд</p>
        <Button variant="secondary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => setEditingPromo(p => ({ ...p, widgets: [...(p.widgets || []), { type: 'text', title: '', content: '', meta: '' }] }))}>Widget нэмэх</Button>
      </div>
      {(editingPromo.widgets || []).map((w, idx) => (
        <div key={idx} className={`${SUBCARD} grid grid-cols-1 items-center gap-2 md:grid-cols-[130px_1fr_1fr_auto]`}>
          <Select aria-label={`Widget ${idx + 1} төрөл`} value={w.type || 'text'} onChange={e => updatePromoWidget(idx, 'type', e.target.value)}>
            <option value="text">Text</option>
            <option value="stat">Stat</option>
            <option value="quote">Quote</option>
          </Select>
          <Input aria-label={`Widget ${idx + 1} гарчиг`} value={w.title || ''} onChange={e => updatePromoWidget(idx, 'title', e.target.value)} placeholder="Гарчиг" />
          <Input aria-label={`Widget ${idx + 1} агуулга`} value={w.content || ''} onChange={e => updatePromoWidget(idx, 'content', e.target.value)} placeholder="Агуулга" />
          <IconButton danger label={`Widget ${idx + 1} устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setEditingPromo(p => ({ ...p, widgets: (p.widgets || []).filter((_, i) => i !== idx) }))} />
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} onClick={savePromo} disabled={cmsSaving}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
      {editingPromo._id && <Button variant="danger" className="sm:ml-auto" icon={<Trash2 size={15} aria-hidden="true" />} onClick={() => deletePromo(editingPromo._id)}>Устгах</Button>}
    </div>
  </Panel>;
}
