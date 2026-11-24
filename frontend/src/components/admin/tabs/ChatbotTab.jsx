import { Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import Button from '../ui/Button';
import { Field, Input, Textarea, Toggle } from '../ui/Form';
import { EmptyState, Pill } from '../ui/Feedback';
import { Check, FileButton, IconButton, InlineNote, Panel, SUBCARD, SubCard } from './cms/editorKit';

const CARD_GROUPS = [['root', 'Эхний цэс'], ['products', 'Бүтээгдэхүүн доторх цэс'], ['loan_actions', 'Зээлийн үйлчилгээний action цэс']];

// Removable string list (conditions / requirements) used inside the product block.
function StringList({ title, items, onChangeItem, onRemove, onAdd, addLabel, itemLabel }) {
  return <div className="space-y-2">
    <p className="adm-label">{title}</p>
    {items.map((item, idx) => (
      <div key={idx} className="flex gap-2">
        <Input className="adm-field--sm" aria-label={`${itemLabel} ${idx + 1}`} value={item} onChange={e => onChangeItem(idx, e.target.value)} />
        <IconButton danger label={`${itemLabel} ${idx + 1} хасах`} icon={<X size={16} aria-hidden="true" />} onClick={() => onRemove(idx)} />
      </div>
    ))}
    <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-[color-mix(in_srgb,var(--hue)_55%,white)] hover:text-white">
      <Plus size={14} aria-hidden="true" /> {addLabel}
    </button>
  </div>;
}

// Чатбот (cyan). Rendered by CmsTab under its own PageHeader when cmsSubTab === 'chatbot'. All handlers unchanged.
export default function ChatbotTab({ PRODUCT_NAMES, addChatbotCard, addChatbotProductListItem, chatbotCards, cmsSaving, configEdits, facebookPosts, products, removeChatbotCard, removeChatbotProductListItem, saveChatbotSettings, saveFacebookPost, setConfigEdits, setProducts, siteConfig, syncFacebookPosts, updateChatbotCard, updateChatbotProductList, updateFacebookPost, uploadImage }) {
  const saveAll = (label, className = '') => <Button className={className} icon={<Save size={16} aria-hidden="true" />} busy={cmsSaving} onClick={saveChatbotSettings} disabled={cmsSaving}>{cmsSaving ? 'Хадгалж байна...' : label}</Button>;
  const repaymentImage = configEdits.chatbot_repayment_image ?? siteConfig.chatbot?.chatbot_repayment_image?.value;

  return <div className="space-y-4 md:space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm text-[var(--adm-ink-3)]">Өөрчлөлтүүд “Бүгдийг хадгалах” дарах хүртэл хадгалагдахгүй. Facebook постын мэдлэгийг пост бүрээр тусад нь хадгална.</p>
      {saveAll('Бүгдийг хадгалах')}
    </div>

    <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
      <Panel title="Холбоо барих мэдээлэл">
        {[
          { key: 'contact_phone', label: 'Утас', placeholder: '75991919' },
          { key: 'contact_email', label: 'Имэйл', placeholder: 'info@scm.mn' },
          { key: 'contact_address', label: 'Хаяг', placeholder: 'Хаяг оруулах' }
        ].map(({ key, label, placeholder }) => (
          <Field key={key} label={label}>{({ id }) => <textarea id={id}
            rows={key === 'contact_address' ? 3 : 1}
            value={configEdits[key] ?? siteConfig.contact?.[key]?.value ?? ''}
            placeholder={placeholder}
            onChange={e => setConfigEdits(prev => ({ ...prev, [key]: e.target.value }))}
            className="adm-field w-full resize-none py-2.5 leading-relaxed"
          />}</Field>
        ))}
      </Panel>

      <Panel title="Тооцооллын тохиргоо">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'loan_rate_default', label: 'Зээлийн сарын хүү (%)', step: '0.1' },
            { key: 'trust_rate', label: 'Итгэлцлийн сарын хүү (%)', step: '0.1' },
            { key: 'dti_individual', label: 'Иргэний ӨОХ (%)', step: '1' },
            { key: 'dti_org', label: 'Байгууллагын ӨОХ (%)', step: '1' }
          ].map(({ key, label, step }) => (
            <Field key={key} label={label}>{({ id }) => <Input id={id} className="adm-tnum font-semibold"
              type="number"
              step={step}
              value={configEdits[key] ?? siteConfig.rates?.[key]?.value ?? ''}
              onChange={e => setConfigEdits(prev => ({ ...prev, [key]: e.target.value }))}
            />}</Field>
          ))}
        </div>
      </Panel>
    </div>

    <Panel title="AI хариултын хязгаар" description="Chatbot нь энд тохируулсан бодлого болон бүтээгдэхүүн, нөхцөл, баримт бичиг, хүү, холбоо барих мэдээллийн хүрээнд л хариулна."
      actions={<Toggle checked={configEdits.chatbot_ai_enabled !== false && configEdits.chatbot_ai_enabled !== 'false'} onChange={checked => setConfigEdits(prev => ({ ...prev, chatbot_ai_enabled: checked }))} label="AI fallback" />}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Хариулах хүрээ">{({ id }) => <Textarea id={id}
          rows={4}
          value={configEdits.chatbot_ai_scope_text ?? siteConfig.chatbot?.chatbot_ai_scope_text?.value ?? ''}
          onChange={e => setConfigEdits(prev => ({ ...prev, chatbot_ai_scope_text: e.target.value }))}
          placeholder="Зөвхөн админ панелд бүртгэсэн мэдээллийн хүрээнд хариулна."
        />}</Field>
        <Field label="Мэдээлэл байхгүй үед">{({ id }) => <Textarea id={id}
          rows={4}
          value={configEdits.chatbot_ai_fallback_text ?? siteConfig.chatbot?.chatbot_ai_fallback_text?.value ?? ''}
          onChange={e => setConfigEdits(prev => ({ ...prev, chatbot_ai_fallback_text: e.target.value }))}
          placeholder="Энэ мэдээлэл админ панелд бүртгэгдээгүй байна."
        />}</Field>
      </div>
      <InlineNote kind="ok" role="note" className="!text-xs leading-relaxed">
        Тооцооллын хариу AI-аар зохиогдохгүй. Зээлийн сарын хүү, иргэн/байгууллагын ӨОХ дээр үндэслэн backend өөрөө сарын төлөлт, нийт төлөлт, шаардлагатай сарын доод орлогыг бодож гаргана.
      </InlineNote>
    </Panel>

    <Panel title="Facebook boosted/ad постын мэдлэг" description="Зөвхөн идэвхтэй boost/ad постууд sync хийгдэнэ. Пост бүрийн доор chatbot ашиглах хариултын мэдээллийг оруулна."
      actions={<Button variant="secondary" icon={<RefreshCw size={15} aria-hidden="true" />} onClick={syncFacebookPosts} disabled={cmsSaving}>Facebook sync</Button>}>
      {!facebookPosts.length ? (
        <p className={`${SUBCARD} text-sm text-[var(--adm-ink-3)]`}>Одоогоор sync хийгдсэн зарын пост алга. Facebook sync дарж идэвхтэй boosted/ad постуудыг татна.</p>
      ) : (
        <div className="space-y-3">
          {facebookPosts.map(post => (
            <SubCard key={post._id} className="space-y-3">
              <div className="flex items-start gap-3">
                {post.thumbnailUrl && (
                  <img src={post.thumbnailUrl} alt={post.adName || 'Facebook post зураг'} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="adm-tnum text-xs text-[var(--adm-ink-3)]">{post.createdTime ? new Date(post.createdTime).toLocaleString('mn-MN') : 'Facebook ad post'}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{post.adName || 'Boosted post'}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-[var(--adm-ink-2)]">{post.message || 'Текстгүй зарын пост'}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2"><Pill hue="indigo" className="!py-0.5 !text-[11px]">Ad status: {post.adEffectiveStatus || post.statusType || 'ACTIVE'}</Pill>
                    {post.permalinkUrl && <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#A6E6FF] underline underline-offset-2 hover:text-white">Ad preview харах</a>}</p>
                </div>
                <Check className="text-xs" checked={post.isActive !== false} onChange={e => updateFacebookPost(post._id, 'isActive', e.target.checked)} label="Ашиглах" />
              </div>
              <Textarea
                aria-label={`${post.adName || 'Boosted post'} — хариултын мэдлэг`}
                rows={4}
                value={post.replyKnowledge || ''}
                onChange={e => updateFacebookPost(post._id, 'replyKnowledge', e.target.value)}
                placeholder="Энэ зарын постын талаар хэрэглэгч асуувал chatbot ямар мэдээллийн хүрээнд хариулах вэ?"
              />
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => saveFacebookPost(post)} disabled={cmsSaving}>Постын мэдлэг хадгалах</Button>
              </div>
            </SubCard>
          ))}
        </div>
      )}
    </Panel>

    <Panel className="max-w-3xl" title="Эргэн төлөлтийн мэдээллийн карт">
      <Field label="Картын гарчиг">{({ id }) => <Input id={id}
        value={configEdits.chatbot_repayment_title ?? siteConfig.chatbot?.chatbot_repayment_title?.value ?? ''}
        onChange={e => setConfigEdits(prev => ({ ...prev, chatbot_repayment_title: e.target.value }))}
        placeholder="Картын гарчиг"
      />}</Field>
      <Field label="Дансны мэдээлэл">{({ id }) => <Textarea id={id}
        rows={4}
        value={configEdits.chatbot_repayment_text ?? siteConfig.chatbot?.chatbot_repayment_text?.value ?? ''}
        onChange={e => setConfigEdits(prev => ({ ...prev, chatbot_repayment_text: e.target.value }))}
        placeholder="Банк, дансны дугаар, дансны нэр зэрэг мэдээлэл"
      />}</Field>
      {repaymentImage && (
        <img src={repaymentImage} alt="Дансны мэдээлэл зураг" className="h-40 w-full rounded-xl object-cover ring-1 ring-white/10" />
      )}
      <Field label="Зураг">{({ id }) => <div className="flex gap-2">
        <Input id={id} className="min-w-0 flex-1"
          value={configEdits.chatbot_repayment_image ?? siteConfig.chatbot?.chatbot_repayment_image?.value ?? ''}
          onChange={e => setConfigEdits(prev => ({ ...prev, chatbot_repayment_image: e.target.value }))}
          placeholder="Зургийн URL"
        />
        <FileButton label="Upload" onFile={async file => {
          const url = await uploadImage(file);
          setConfigEdits(prev => ({ ...prev, chatbot_repayment_image: url }));
        }} />
      </div>}</Field>
    </Panel>

    <Panel title="Чатбот картын бүтэц" description="Web чат дээр харагдах зурагтай сонголтын картууд. parentId нь root бол эхний цэс, products бол Бүтээгдэхүүн дотор харагдана." bodyClassName="space-y-6"
      actions={<>
        <Button variant="secondary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => addChatbotCard('root')}>Root карт</Button>
        <Button variant="secondary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => addChatbotCard('products')}>Product карт</Button>
        <Button variant="secondary" icon={<Plus size={14} aria-hidden="true" />} onClick={() => addChatbotCard('loan_actions')}>Action карт</Button>
      </>}>
      {CARD_GROUPS.map(([parentId, groupLabel]) => {
        const cards = chatbotCards
          .filter(card => card.parentId === parentId)
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        return <div key={parentId} className="space-y-3">
          <h4 className="adm-label">{groupLabel} <span className="adm-tnum">({cards.length})</span></h4>
          {cards.length === 0 && <p className="text-sm text-[var(--adm-ink-3)]">Карт алга.</p>}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {cards.map(card => (
              <SubCard key={card.id} className={`space-y-3 ${card.isActive === false ? 'opacity-70' : ''}`}>
                {card.imageUrl && (
                  <img src={card.imageUrl} alt={card.title || 'card'} className="h-28 w-full rounded-xl object-cover ring-1 ring-white/10" />
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input aria-label="Гарчиг" value={card.title || ''} onChange={e => updateChatbotCard(card.id, 'title', e.target.value)} placeholder="Гарчиг" />
                  <Input aria-label="Command" className="font-mono text-[13px]" value={card.command || ''} onChange={e => updateChatbotCard(card.id, 'command', e.target.value)} placeholder="command: products, loan, contact" />
                </div>
                <Textarea aria-label="Тайлбар" value={card.subtitle || ''} onChange={e => updateChatbotCard(card.id, 'subtitle', e.target.value)} placeholder="Тайлбар" rows={2} />
                <div className="flex gap-2">
                  <Input aria-label="Зургийн URL" className="min-w-0 flex-1" value={card.imageUrl || ''} onChange={e => updateChatbotCard(card.id, 'imageUrl', e.target.value)} placeholder="Зургийн URL" />
                  <FileButton label="Upload" onFile={async file => {
                    const url = await uploadImage(file);
                    updateChatbotCard(card.id, 'imageUrl', url);
                  }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--adm-ink-3)]">Дараалал
                    <input type="number" value={card.order || 0} onChange={e => updateChatbotCard(card.id, 'order', Number(e.target.value))} className="adm-field adm-field--sm adm-tnum w-24" />
                  </label>
                  <Check className="text-xs" checked={card.isActive !== false} onChange={e => updateChatbotCard(card.id, 'isActive', e.target.checked)} label="Идэвхтэй" />
                  <IconButton danger label={`${card.title || 'Карт'} устгах`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => removeChatbotCard(card.id)} />
                </div>
              </SubCard>
            ))}
          </div>
        </div>;
      })}
    </Panel>

    <Panel title="Бүтээгдэхүүний chatbot хариулт ба баримт бичиг" description="Хэрэглэгч бүтээгдэхүүн сонгоход харагдах текст болон иргэн/байгууллагын бүрдүүлэх баримт." bodyClassName="space-y-4"
      actions={<Pill hue="neutral" dot={false}><span className="adm-tnum">{products.length}</span> бүтээгдэхүүн</Pill>}>
      {products.map(product => (
        <details key={product._id || product.productKey} className={`${SUBCARD} group`}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block font-semibold text-white">{product.title || PRODUCT_NAMES[product.productKey] || product.productKey}</span>
              <span className="block font-mono text-[11px] text-[var(--adm-ink-3)]">{product.productKey}</span>
            </span>
            <Plus size={18} className="shrink-0 text-[var(--adm-ink-2)] transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2.5">
                <p className="adm-label">Бүтээгдэхүүний card зураг</p>
                {(product.headerImageUrl || product.bgImageUrl) && (
                  <img src={product.headerImageUrl || product.bgImageUrl} alt={product.title || ''} className="h-32 w-full rounded-xl object-cover ring-1 ring-white/10" />
                )}
                <div className="flex gap-2">
                  <Input aria-label="Card зургийн URL" className="min-w-0 flex-1"
                    value={product.headerImageUrl || ''}
                    onChange={e => setProducts(prev => prev.map(item => (
                      item.productKey === product.productKey ? { ...item, headerImageUrl: e.target.value } : item
                    )))}
                    placeholder="Card зургийн URL"
                  />
                  <FileButton label="Upload" onFile={async file => {
                    const url = await uploadImage(file);
                    setProducts(prev => prev.map(item => (
                      item.productKey === product.productKey ? { ...item, headerImageUrl: url } : item
                    )));
                  }} />
                </div>
                <p className="text-[11px] text-[var(--adm-ink-3)]">Tier 3 дахь бүтээгдэхүүний card болон мэдээллийн дэлгэцийн толгой зураг.</p>
              </div>
              <Field label="Үйлчилгээний нөхцөл дээр харагдах товч танилцуулга">{({ id }) => <Textarea id={id}
                rows={6}
                value={product.chatbotText || ''}
                placeholder="Жишээ: Зээлийн хэмжээ, хүү, хугацаа, гол нөхцөлийг товч бичнэ үү."
                onChange={e => setProducts(prev => prev.map(item => (
                  item.productKey === product.productKey
                    ? { ...item, chatbotText: e.target.value }
                    : item
                )))}
              />}</Field>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {[
                { type: 'individual', label: 'Иргэний бүрдүүлэх баримт' },
                { type: 'organization', label: 'Байгууллагын бүрдүүлэх баримт' }
              ].map(({ type, label }) => (
                <div key={type} className="space-y-4 rounded-xl bg-black/20 p-3 ring-1 ring-inset ring-white/[0.06] md:p-4">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <StringList title="Үйлчилгээний нөхцөл" itemLabel={`${label} — нөхцөл`} addLabel="Нөхцөл нэмэх"
                    items={product[type]?.conditions || []}
                    onChangeItem={(idx, value) => updateChatbotProductList(product.productKey, type, 'conditions', idx, value)}
                    onRemove={idx => removeChatbotProductListItem(product.productKey, type, 'conditions', idx)}
                    onAdd={() => addChatbotProductListItem(product.productKey, type, 'conditions')} />
                  <div className="border-t border-white/[0.06] pt-3">
                    <StringList title="Бүрдүүлэх баримт бичиг" itemLabel={`${label} — баримт`} addLabel="Баримт нэмэх"
                      items={product[type]?.requirements || []}
                      onChangeItem={(idx, value) => updateChatbotProductList(product.productKey, type, 'requirements', idx, value)}
                      onRemove={idx => removeChatbotProductListItem(product.productKey, type, 'requirements', idx)}
                      onAdd={() => addChatbotProductListItem(product.productKey, type, 'requirements')} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      ))}

      {products.length === 0 && <EmptyState title="Бүтээгдэхүүний мэдээлэл олдсонгүй." description="Backend server ажиллаж байгаа эсэхийг шалгана уу." />}

      <div className="flex justify-end border-t border-white/[0.08] pt-4">{saveAll('Чатботын мэдээлэл хадгалах')}</div>
    </Panel>
  </div>;
}
