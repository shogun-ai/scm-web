import { useMemo, useState } from 'react';
import axios from 'axios';
import { Check, Mail, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import NotifyEmailEditor from '../NotifyEmailEditor';
import InviteUserForm from '../InviteUserForm';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';
import DataTable from '../ui/DataTable';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EmptyState, Notice, Pill } from '../ui/Feedback';
import { Field, SearchInput, Select } from '../ui/Form';
import { MODULE_HUES } from '../theme/spectrum';

const HUE = MODULE_HUES.users;
const date = value => { try { return value ? new Date(value).toLocaleDateString('mn-MN') : '—'; } catch { return '—'; } };
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

// Хэрэглэгчид — тэнгэр дээр шууд (pearl sheet-гүй). Өгөгдөл, API, эрхийн логик AdminPanel-аас prop-оор ирнэ (өөрчлөлтгүй).
// Хайлт/шүүлт нь ачаалсан жагсаалт дээр клиент талд.
export default function UsersTab({ API_URL, NOTIFY_API_URL, SCM_ROLES, deleteUser, editingUserRoles, inviteNotice, resendInvite, saveUserRoles, setEditingUserRoles, setUsersList, toggleEditRole, user, usersList }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [twoFA, setTwoFA] = useState('all');
  const list = useMemo(() => (Array.isArray(usersList) ? usersList : []), [usersList]);
  const roleLabel = key => SCM_ROLES.find(r => r.key === key)?.label || key;
  const myId = user?.id || user?._id;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(u => (!q || `${u.name || ''} ${u.email || ''} ${u.notificationEmail || ''}`.toLowerCase().includes(q))
      && (role === 'all' || (role === 'admin' ? u.role === 'admin' : role === 'none' ? u.role !== 'admin' && !(u.roles || []).length : (u.roles || []).includes(role)))
      && (twoFA === 'all' || (twoFA === 'on' ? u.isTwoFAEnabled : !u.isTwoFAEnabled)));
  }, [list, query, role, twoFA]);
  const activeCount = [role !== 'all', twoFA !== 'all'].filter(Boolean).length;
  const twoFACount = list.filter(u => u.isTwoFAEnabled).length;
  const editingUser = editingUserRoles ? list.find(u => u._id === editingUserRoles.userId) : null;

  const refreshNotify = async () => { const userRes = await axios.get(`${NOTIFY_API_URL}/api/users`); setUsersList(userRes.data); };
  const rolePills = u => <div className="flex flex-wrap gap-1.5">
    {u.role === 'admin' && <Pill hue="violet">Админ</Pill>}
    {(u.roles || []).filter(rk => !(u.role === 'admin' && rk === 'admin')).map(rk => <Pill key={rk} hue="cyan" dot={false}>{roleLabel(rk)}</Pill>)}
    {u.role !== 'admin' && (!u.roles || u.roles.length === 0) && <Pill hue="neutral" dot={false}>Эрхгүй</Pill>}
  </div>;
  const twoFAPill = u => (u.isTwoFAEnabled ? <Pill hue="green">2FA идэвхтэй</Pill> : <Pill hue="neutral" dot={false}>2FA идэвхгүй</Pill>);
  const person = u => <div className="flex min-w-0 items-center gap-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-xs font-bold text-white ring-1 ring-inset ring-white/10" aria-hidden="true">{initials(u.name)}</span>
    <span className="min-w-0"><span className="block truncate font-semibold text-white">{u.name || '—'}{u._id === myId && <span className="ml-2 text-xs font-medium text-[var(--adm-ink-3)]">(та)</span>}</span><span className="block break-all text-xs text-[var(--adm-ink-3)]">{u.email}</span></span>
  </div>;
  const actions = (u, wide) => <div className={`flex items-center gap-1.5 ${wide ? 'w-full flex-wrap' : 'justify-end'}`}>
    {u.role !== 'admin' && <button type="button" onClick={() => setEditingUserRoles({ userId: u._id, roles: u.roles || [] })} className={`adm-row-btn ${wide ? 'flex-1' : '!px-2.5'}`} title="Эрх тохируулах" aria-label={`${u.email} — эрх тохируулах`}><Shield size={14} aria-hidden="true" />{wide && 'Эрх'}</button>}
    <button type="button" onClick={() => resendInvite(u)} className={`adm-row-btn ${wide ? 'flex-1' : ''}`} title="Урилга дахин илгээх" aria-label={`${u.email} — урилга дахин илгээх`}><Mail size={14} aria-hidden="true" />Урилга</button>
    {u._id !== myId && <button type="button" onClick={() => deleteUser(u._id)} className="adm-row-btn adm-row-btn--danger !px-2.5" title="Устгах" aria-label={`${u.email} — устгах`}><Trash2 size={14} aria-hidden="true" /></button>}
  </div>;

  const columns = [
    { key: 'name', header: 'Хэрэглэгч', hideOnCard: true, className: 'min-w-[14rem]', render: person },
    { key: 'notify', header: 'Мэдэгдлийн имэйл', cardLabel: 'Мэдэгдлийн имэйл', cardWide: true, className: 'min-w-[12rem] max-w-[18rem]', render: u => <NotifyEmailEditor userId={u._id} value={u.notificationEmail} label={u.email} onSaved={refreshNotify} /> },
    { key: 'roles', header: 'Эрх', cardWide: true, render: rolePills },
    { key: '2fa', header: '2FA', hideOnCard: true, className: 'whitespace-nowrap', render: twoFAPill },
    { key: 'date', header: 'Бүртгэсэн', className: 'adm-tnum whitespace-nowrap text-xs text-[var(--adm-ink-3)]', render: u => date(u.createdAt) },
    { key: 'actions', header: '', srHeader: 'Үйлдэл', hideOnCard: true, align: 'right', className: 'whitespace-nowrap', render: u => actions(u, false) },
  ];

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={Users} eyebrow="Тохиргоо" title="Хэрэглэгчид" count={list.length} countLabel="хэрэглэгч" description={list.length ? `${twoFACount} нь 2FA идэвхжүүлсэн` : undefined}
      actions={<Button hue={HUE} icon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setInviteOpen(true)}>Хэрэглэгч нэмэх</Button>} />

    {inviteNotice && <Notice kind={inviteNotice.ok ? 'ok' : 'err'}>{inviteNotice.text}</Notice>}

    <Toolbar
      columns={2}
      activeCount={activeCount}
      resultCount={rows.length}
      label="Хэрэглэгч хайх, шүүх"
      search={<SearchInput value={query} onChange={event => setQuery(event.target.value)} maxLength={80} placeholder="Нэр, имэйл" />}
      filters={<>
        <Field label="Эрх">{({ id }) => <Select id={id} value={role} onChange={event => setRole(event.target.value)}>
          <option value="all">Бүгд</option>
          {SCM_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          <option value="none">Эрхгүй</option>
        </Select>}</Field>
        <Field label="2FA">{({ id }) => <Select id={id} value={twoFA} onChange={event => setTwoFA(event.target.value)}><option value="all">Бүгд</option><option value="on">Идэвхтэй</option><option value="off">Идэвхгүй</option></Select>}</Field>
      </>}
    />

    {rows.length === 0
      ? <EmptyState icon={Users} title={list.length ? 'Шүүлтэд тохирох хэрэглэгч алга' : 'Хэрэглэгч байхгүй.'} description={list.length ? 'Шүүлтүүр эсвэл хайлтаа өөрчилж үзнэ үү.' : 'Шинэ хэрэглэгчийг урилгаар нэмнэ.'}
        action={list.length ? undefined : <Button hue={HUE} icon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setInviteOpen(true)}>Хэрэглэгч нэмэх</Button>} />
      : <DataTable
        caption="Хэрэглэгчийн жагсаалт"
        columns={columns}
        rows={rows}
        cardTitle={person}
        cardAside={twoFAPill}
        cardFooter={u => actions(u, true)}
      />}

    {inviteOpen && <Modal size="lg" title="Хэрэглэгч нэмэх" description="Урилгын имэйлээр хэрэглэгч нууц үгээ өөрөө үүсгэнэ." onClose={() => setInviteOpen(false)}>
      <InviteUserForm apiUrl={API_URL} roles={SCM_ROLES} onCreated={async () => {
        try { const userRes = await axios.get(`${API_URL}/api/users`); setUsersList(userRes.data); } catch { /* жагсаалт дараа шинэчлэгдэнэ */ }
      }} />
    </Modal>}

    {editingUserRoles && <Modal size="sm" title="Эрх тохируулах" description={editingUser ? `${editingUser.name || ''} · ${editingUser.email || ''}` : undefined} onClose={() => setEditingUserRoles(null)}
      footer={<><Button variant="light" onClick={() => setEditingUserRoles(null)}>Болих</Button><Button variant="ink" onClick={saveUserRoles} icon={<Check size={16} aria-hidden="true" />}>Хадгалах</Button></>}>
      <fieldset>
        <legend className="text-sm text-slate-700">Хамгийн ихдээ <strong>2</strong> эрх холбох боломжтой.</legend>
        <div className="mt-3 space-y-2">
          {SCM_ROLES.map(r => {
            const sel = editingUserRoles.roles.includes(r.key);
            const maxed = !sel && editingUserRoles.roles.length >= 2;
            return <label key={r.key} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 transition ${sel ? 'cursor-pointer border-[#0B1530] bg-white shadow-[inset_0_0_0_1px_#0B1530]' : maxed ? 'cursor-not-allowed border-slate-200 bg-white/50 text-slate-500' : 'cursor-pointer border-slate-300 bg-white hover:border-slate-500'}`}>
              <input type="checkbox" checked={sel} disabled={maxed && !sel} onChange={() => (!maxed || sel ? toggleEditRole(r.key) : null)} className="h-[18px] w-[18px] accent-[#0B1530]" />
              <span className={`text-sm font-semibold ${maxed ? 'text-slate-500' : 'text-slate-900'}`}>{r.label}</span>
            </label>;
          })}
        </div>
      </fieldset>
    </Modal>}
  </div>;
}
