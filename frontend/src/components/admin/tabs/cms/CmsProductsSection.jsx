import { Package, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import ProductTermsEditor from '../../../ProductTermsEditor';
import axios from 'axios';
import { copyProductContent, pruneNewEmptyTerms } from '../../../../utils/productTerms.mjs';
import Button from '../../ui/Button';
import { Field, Input, Select, Textarea } from '../../ui/Form';
import { EmptyState } from '../../ui/Feedback';
import { IconButton, ImageField, Panel, SUBCARD, SubCard } from './editorKit';

// Бүтээгдэхүүн. Create / copy / terms / save / delete logic unchanged (same endpoints, validation and alerts).
export default function CmsProductsSection({ API_URL, cmsSaving, editingProduct, fetchCMSData, products, setCmsSaving, setEditingProduct, uploadImage }) {
  const save = async () => {
    setCmsSaving(true);
    try {
      if (editingProduct._id) {
        await axios.put(`${API_URL}/api/products/content/${editingProduct.productKey}`, pruneNewEmptyTerms(editingProduct, products.find(p => p._id === editingProduct._id)));
        alert('✅ Хадгалагдлаа!');
      } else {
        if (!/^[a-z][a-z0-9_]{1,39}$/.test(String(editingProduct.productKey || ''))) {
          alert('Бүтээгдэхүүний key зөвхөн англи жижиг үсэг, тоо, "_" байна (жишээ: parking_loan).');
          return;
        }
        await axios.post(`${API_URL}/api/products/content`, pruneNewEmptyTerms(editingProduct, null));
        alert('✅ Нэмэгдлээ!');
      }
      setEditingProduct(null);
      fetchCMSData();
    } catch (e) { alert('❌ Алдаа: ' + (e.response?.data?.message || e.message || JSON.stringify(e))); }
    finally { setCmsSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`"${editingProduct.title}" устгах уу?`)) return;
    try {
      await axios.delete(`${API_URL}/api/products/content/${editingProduct._id}`);
      alert('✅ Устгагдлаа!');
      setEditingProduct(null);
      fetchCMSData();
    } catch (e) { alert('❌ Устгах алдаа: ' + (e.response?.data?.message || e.message || JSON.stringify(e))); }
  };

  if (!editingProduct) {
    return <Panel title="Бүтээгдэхүүн" description="Нийтийн сайтын бүтээгдэхүүний агуулга, нөхцөл, шаардлага." bodyClassName="space-y-4"
      actions={<Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditingProduct({ productKey: '', title: '', shortDesc: '', description: '', bgImageUrl: '', headerImageUrl: '', order: products.length + 1 })}>Шинэ бүтээгдэхүүн нэмэх</Button>}>
      {products.length === 0 && <EmptyState icon={Package} title="Бүтээгдэхүүн алга." />}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {products.map(p => (
          <li key={p.productKey} className={`${SUBCARD} flex items-start justify-between gap-3 transition-[box-shadow,background-color] duration-200 hover:bg-white/[0.05] hover:ring-[color-mix(in_srgb,var(--hue)_35%,transparent)]`}>
            <div className="min-w-0">
              <p className="font-semibold text-white">{p.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--adm-ink-3)]">{p.shortDesc}</p>
              <p className="mt-2 font-mono text-[11px] text-[var(--adm-ink-3)]">{p.productKey}</p>
            </div>
            <IconButton label={`${p.title || p.productKey} засах`} icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditingProduct({ ...p })} />
          </li>
        ))}
      </ul>
    </Panel>;
  }

  return <Panel className="max-w-4xl" eyebrow={editingProduct._id ? 'Засах' : 'Шинэ'} title={editingProduct._id ? editingProduct.title : 'Шинэ бүтээгдэхүүн'} bodyClassName="space-y-5"
    actions={<IconButton label="Хаах" icon={<X size={20} aria-hidden="true" />} onClick={() => setEditingProduct(null)} />}>
    <SubCard>
      <Field label="Өөр бүтээгдэхүүнээс хуулах" hint="Тайлбар, нөхцөл, шаардлага, зургийг хуулна. Key болон дараалал хуулагдахгүй. Хуулсны дараа засаад хадгална.">{({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value=""
        onChange={e => { const source = products.find(p => p._id === e.target.value); if (source) setEditingProduct(p => copyProductContent(p, source)); }}>
        <option value="">Бүтээгдэхүүн сонгох…</option>
        {products.filter(p => p._id && p._id !== editingProduct._id).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
      </Select>}</Field>
    </SubCard>
    {!editingProduct._id && (
      <Field label="Бүтээгдэхүүний key (eng, жишээ: new_loan)">{({ id }) => <Input id={id} className="font-mono" value={editingProduct.productKey || ''} onChange={e => setEditingProduct(p => ({ ...p, productKey: e.target.value }))} />}</Field>
    )}
    {[
      { field: 'title', label: 'Гарчиг', multi: false },
      { field: 'shortDesc', label: 'Богино тайлбар', multi: false },
      { field: 'description', label: 'Дэлгэрэнгүй тайлбар', multi: true },
    ].map(({ field, label, multi }) => (
      <Field key={field} label={label}>{({ id }) => (multi
        ? <Textarea id={id} rows={3} value={editingProduct[field] || ''} onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))} />
        : <Input id={id} value={editingProduct[field] || ''} onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))} />)}</Field>
    ))}
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { field: 'bgImageUrl', label: 'Дэвсгэр зураг' },
        { field: 'headerImageUrl', label: 'Дэлгэрэнгүй хуудсын зураг' },
      ].map(({ field, label }) => (
        <ImageField key={field} label={label} value={editingProduct[field] || ''} placeholder="URL эсвэл доор файл сонгоно уу" previewClassName="h-24 w-full"
          onChange={e => setEditingProduct(p => ({ ...p, [field]: e.target.value }))}
          onFile={async file => { try { const url = await uploadImage(file); setEditingProduct(p => ({ ...p, [field]: url })); } catch { alert('Upload алдаа'); } }} />
      ))}
    </div>
    <ProductTermsEditor product={editingProduct} onChange={setEditingProduct} />
    <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
      <Button icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} onClick={save} disabled={cmsSaving}>{cmsSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
      <Button variant="secondary" onClick={() => setEditingProduct(null)}>Болих</Button>
      <Button variant="danger" className="sm:ml-auto" icon={<Trash2 size={15} aria-hidden="true" />} onClick={remove}>Устгах</Button>
    </div>
  </Panel>;
}
