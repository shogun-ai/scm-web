import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import Button from '../../ui/Button';
import { Field, Input, Toggle } from '../../ui/Form';
import { EmptyState } from '../../ui/Feedback';
import { IconButton, ImageField, Panel, SUBCARD } from './editorKit';

// Shared body of the ТУЗ / Удирдлагын баг sections. Handlers and payloads are exactly the ones the two
// sections used before (saveMember, deleteMember, addMember with setNewMemberType(memberType)).
export default function TeamMembersEditor({ memberType, title, description, newTitle, editFields, newFields, addMember, cmsSaving, deleteMember, editingMember, newMember, newMemberType, saveMember, setEditingMember, setNewMember, setNewMemberType, setShowNewMember, showNewMember, teamMembers, uploadImage }) {
  const members = teamMembers.filter(m => m.memberType === memberType);
  return <Panel className="max-w-3xl" title={title} description={description} bodyClassName="space-y-3"
    actions={!(showNewMember && newMemberType === memberType) && <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => { setNewMemberType(memberType); setShowNewMember(true); setNewMember({ name: '', role: '', imagePath: '', experience: '', memberType, order: 99 }); }}>Шинэ гишүүн нэмэх</Button>}>
    {members.length === 0 && !(showNewMember && newMemberType === memberType) && <EmptyState icon={UserRound} title="Гишүүн бүртгэгдээгүй байна." />}
    {members.map(m => (
      <div key={m._id} className={SUBCARD}>
        {editingMember?._id === m._id ? (
          <div className="space-y-4">
            {editFields.map(({ f, l }) => (
              <Field key={f} label={l}>{({ id }) => <Input id={id} value={editingMember[f] || ''} onChange={e => setEditingMember(p => ({ ...p, [f]: e.target.value }))} />}</Field>
            ))}
            <ImageField label="Зураг" alt={editingMember.name || ''} placeholder="/board/name.jpg эсвэл URL" previewClassName="h-16 w-16 !rounded-full"
              value={editingMember.imagePath || ''}
              onChange={e => setEditingMember(p => ({ ...p, imagePath: e.target.value }))}
              onFile={async file => { try { const url = await uploadImage(file); setEditingMember(p => ({ ...p, imagePath: url })); } catch { alert('Upload алдаа'); } }} />
            <Toggle checked={editingMember.isActive !== false} onChange={checked => setEditingMember(p => ({ ...p, isActive: checked }))} label="Идэвхтэй" />
            <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
              <Button onClick={() => { saveMember(editingMember); setEditingMember(null); }} disabled={cmsSaving}>Хадгалах</Button>
              <Button variant="secondary" onClick={() => setEditingMember(null)}>Болих</Button>
              <Button variant="danger" className="ml-auto" icon={<Trash2 size={15} aria-hidden="true" />} onClick={() => { deleteMember(m._id); setEditingMember(null); }} aria-label={`${m.name || 'Гишүүн'} устгах`}>Устгах</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <img src={m.imagePath} alt={m.name} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[color-mix(in_srgb,var(--hue)_45%,transparent)]"
                onError={e => { e.target.src = 'https://via.placeholder.com/60'; }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                <p className="truncate text-xs text-[var(--adm-ink-3)]">{m.role}{m.isActive === false ? ' · идэвхгүй' : ''}</p>
              </div>
            </div>
            <IconButton label={`${m.name || 'Гишүүн'} засах`} icon={<Pencil size={15} aria-hidden="true" />} onClick={() => setEditingMember({ ...m })} />
          </div>
        )}
      </div>
    ))}
    {showNewMember && newMemberType === memberType && (
      <div className="space-y-4 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--hue)_50%,transparent)] bg-[color-mix(in_srgb,var(--hue)_5%,transparent)] p-4 md:p-5">
        <p className="text-sm font-semibold text-white">{newTitle}</p>
        {newFields.map(({ f, l }) => (
          <Field key={f} label={l}>{({ id }) => <Input id={id} value={newMember[f] || ''} onChange={e => setNewMember(p => ({ ...p, [f]: e.target.value }))} />}</Field>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setNewMemberType(memberType); addMember(); }} disabled={cmsSaving}>Нэмэх</Button>
          <Button variant="secondary" onClick={() => setShowNewMember(false)}>Болих</Button>
        </div>
      </div>
    )}
  </Panel>;
}
