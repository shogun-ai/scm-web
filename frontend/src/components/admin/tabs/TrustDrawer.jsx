import { useState } from 'react';
import axios from 'axios';
import { Check, Link2, Mail, MessageSquare, Phone, UserCheck } from 'lucide-react';
import SideDrawer from '../ui/SideDrawer';
import { DetailList, DrawerAction, DrawerSection } from '../ui/Drawer';
import { Pill } from '../ui/Feedback';
import Button from '../ui/Button';
import { TrustAssignPanel, TrustDocRequestPanel, TrustFilesSection, TrustHistorySection } from '../TrustDocsPanel';
import { TrustEmailDialog, TrustEmailHistory } from '../TrustMessagePanel';
import { isTrustClosed, useTrustPermissions } from '../trustUtils';

// Итгэлцлийн хүсэлтийн дэлгэрэнгүй — зээлийн хүсэлтийн drawer-тэй ижил бүтэц (SideDrawer, алтан өнгө).
// Note save and "Шийдсэн" keep the exact previous calls/side effects (saveContactNote / PUT status + list refresh).
export default function TrustDrawer({ API_URL, contactNote, formatDate, saveContactNote, selectedTrust, setContactNote, setSelectedTrust, setTrusts, trustCanMessage }) {
  const [trust, setTrust] = useState(selectedTrust);
  const [panel, setPanel] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [resolving, setResolving] = useState(false);
  const perms = useTrustPermissions(API_URL);
  const email = String(trust?.email || '').trim();
  const phone = String(trust?.phone || '').trim();
  const resolved = trust.status === 'resolved';

  const close = () => { setSelectedTrust(null); setContactNote(''); };
  const refreshList = async () => {
    try { const trustRes = await axios.get(`${API_URL}/api/trusts`); setTrusts(trustRes.data); } catch { /* түүх дараагийн нээлтээр шинэчлэгдэнэ */ }
  };
  const toggle = name => setPanel(previous => (previous === name ? null : name));
  const resolve = async () => {
    setResolving(true);
    try {
      await axios.put(`${API_URL}/api/trusts/${trust._id}`, { status: 'resolved' });
      const trustRes = await axios.get(`${API_URL}/api/trusts`);
      setTrusts(trustRes.data);
      setSelectedTrust(null);
    } finally { setResolving(false); }
  };
  const onMailSent = (entry, result) => {
    setTrust(previous => ({ ...previous, messages: [...(Array.isArray(previous.messages) ? previous.messages : []), entry] }));
    setFeedback(result);
    setEmailOpen(false);
    refreshList();
  };

  const panelProps = { apiUrl: API_URL, trust, onTrustChange: setTrust, onChanged: refreshList };

  return <SideDrawer
    hue="gold"
    label="Итгэлцлийн хүсэлтийн дэлгэрэнгүй"
    eyebrow="Итгэлцлийн хүсэлт"
    title={`${trust.lastname || ''} ${trust.firstname || ''}`.trim() || 'Хүсэлт'}
    subtitle={trust.amount ? `Дүн: ${trust.amount}` : undefined}
    meta={<>
      <Pill hue={resolved ? 'green' : 'gold'}>{resolved ? 'Шийдсэн' : 'Хүлээгдэж байна'}</Pill>
      <span>Хариуцагч: {trust.assignee?.name || 'Хуваарилаагүй'} · Үүссэн: {formatDate(trust.createdAt)}</span>
    </>}
    onClose={close}
    actions={<>
      <DrawerAction icon={<Link2 size={16} aria-hidden="true" />} active={panel === 'docs'} aria-controls="trust-panel" onClick={() => toggle('docs')}>Нэмэлт материал хүсэх</DrawerAction>
      <DrawerAction icon={<Mail size={16} aria-hidden="true" />} disabled={!email || !trustCanMessage} onClick={() => { setFeedback(null); setEmailOpen(true); }}>Чөлөөт имэйл бичих</DrawerAction>
      <DrawerAction icon={<UserCheck size={16} aria-hidden="true" />} active={panel === 'assign'} aria-controls="trust-panel" onClick={() => toggle('assign')}>Хуваарилах</DrawerAction>
      {!resolved && <DrawerAction icon={<Check size={16} aria-hidden="true" />} active={panel === 'status'} aria-controls="trust-panel" onClick={() => toggle('status')}>Төлөв</DrawerAction>}
      <DrawerAction icon={<MessageSquare size={16} aria-hidden="true" />} active={panel === 'note'} aria-controls="trust-panel" onClick={() => toggle('note')}>Тэмдэглэл</DrawerAction>
    </>}
    actionsNote={!email ? <p className="text-amber-800">Харилцагчийн имэйл бүртгэлгүй тул имэйл илгээх боломжгүй. Утсаар холбогдоно уу.</p> : !trustCanMessage ? <p className="text-slate-600">Танд имэйл илгээх эрх байхгүй.</p> : null}
  >
    <DrawerSection first id="trust-contact" title="Харилцагчийн холбоо барих" className="mb-4">
      <DetailList items={[
        { label: 'Нэр', value: `${trust.lastname || ''} ${trust.firstname || ''}`.trim() || '—' },
        { label: 'Утас', value: phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-9 items-center gap-1 font-semibold text-slate-900 underline decoration-[var(--hue)] decoration-2 underline-offset-4"><Phone size={14} aria-hidden="true" />{phone}</a> : '—' },
        { label: 'Имэйл', value: email ? <a href={`mailto:${email}`} className="break-all font-semibold text-slate-900 underline decoration-[var(--hue)] decoration-2 underline-offset-4">{email}</a> : '—' },
        { label: 'Дүн', value: trust.amount || '—' },
        { label: 'Огноо', value: formatDate(trust.createdAt) },
        trust.contactNote ? { label: 'Тэмдэглэл', value: <span className="whitespace-pre-wrap">{trust.contactNote}</span> } : null,
      ]} />
    </DrawerSection>

    {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-xl p-3 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.text}</p>}

    {panel && <DrawerSection first id="trust-panel-title" title={{ docs: 'Нэмэлт материал хүсэх', assign: 'Хуваарилах', status: 'Төлөв', note: 'Тэмдэглэл' }[panel]} className="mb-4 ring-2 ring-[color-mix(in_srgb,var(--hue)_35%,transparent)]">
      <div id="trust-panel">
        {panel === 'docs' && <TrustDocRequestPanel {...panelProps} canRequest={Boolean(perms?.has('trusts.message'))} permsLoaded={Boolean(perms)} />}
        {panel === 'assign' && <TrustAssignPanel {...panelProps} canAssign={Boolean(perms?.has('trusts.assign'))} />}
        {panel === 'status' && !resolved && <div className="space-y-3">
          <p className="text-sm text-slate-700">Одоогийн төлөв: <b className="text-slate-900">Хүлээгдэж байна</b>. Харилцагчтай холбогдож асуудлыг шийдсэний дараа тэмдэглэнэ үү.</p>
          <Button variant="ink" busy={resolving} disabled={resolving || isTrustClosed(trust)} icon={<Check size={16} aria-hidden="true" />} onClick={resolve}>Шийдсэн гэж тэмдэглэх</Button>
        </div>}
        {panel === 'note' && <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Холбоо барих тэмдэглэл
            <textarea rows={3} value={contactNote} onChange={event => setContactNote(event.target.value)} className="adm-lfield mt-1 resize-none" placeholder="Холбоо барих тэмдэглэл..." />
          </label>
          <Button variant="ink" onClick={saveContactNote}>Хадгалах</Button>
        </div>}
      </div>
    </DrawerSection>}

    <TrustFilesSection apiUrl={API_URL} trust={trust} />
    <TrustEmailHistory trust={trust} />
    <TrustHistorySection trust={trust} />

    {emailOpen && <TrustEmailDialog apiUrl={API_URL} trust={trust} onClose={() => setEmailOpen(false)} onSent={onMailSent} />}
  </SideDrawer>;
}
