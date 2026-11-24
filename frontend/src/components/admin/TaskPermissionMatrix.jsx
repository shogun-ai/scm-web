import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Check, CheckCircle2, History, Loader2, Lock, Save, ShieldCheck } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_ROLES, PERMISSIONS, effectiveMatrix, matrixCellKey } from '@shared/permissions';
import { getAuthHeaders } from '../loanTask/api';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import { Notice, Pill } from './ui/Feedback';
import { MODULE_HUES } from './theme/spectrum';

const HUE = MODULE_HUES.permissions;

// Хуучин LOS-ийн матриц ба зээлийн хорооны тохиргоо (нэмэлт, хойно ачаална).
const LegacyPermissionMatrix = lazy(() => import('../PermissionMatrix'));

const HELP = {
  'loan_requests.view_all': 'Бүх ажилтны хуваарилсан хүсэлтийг харна. Үгүй бол зөвхөн өөрт хуваарилсныг харна.',
  'loan_requests.view_assigned': 'Өөрт хуваарилагдсан хүсэлтийг жагсаалт, дэлгэрэнгүйгээс харна.',
  'loan_requests.assign': 'Хүсэлтэд хариуцагч томилох, солих.',
  'loan_requests.change_status': 'Хүсэлтийн төлөв болон эцсийн үр дүнг (зөвшөөрсөн, татгалзсан гэх мэт) өөрчилнө.',
  'loan_requests.request_docs': 'Харилцагчаас нэмэлт баримт хүсч, файл оруулах холбоос илгээнэ.',
  'loan_requests.message': 'Харилцагч руу чөлөөт имэйл бичнэ.',
  'loan_requests.notes_files': 'Дотоод тэмдэглэл болон файл нэмнэ.',
  'loan_requests.reopen': 'Хаагдсан хүсэлтийг дахин нээнэ.',
  'loan_requests.delete': 'Хүсэлтийг бүрмөсөн устгана. Зөвхөн админд олгогдох бөгөөд "Устгах тохиргоо" асаалттай үед ажиллана.',
  'loan_forms.configure': 'Бүтээгдэхүүний хүсэлтийн маягтын талбар, алхмыг тохируулна. Зөвхөн админ.',
  'trusts.view': 'Итгэлцлийн хүсэлтийн жагсаалт болон дэлгэрэнгүйг харна.',
  'trusts.message': 'Итгэлцлийн хүсэлт гаргагчид чөлөөт имэйл бичнэ.',
  'document_ai.use': 'Баримт AI уншилтын хэсгийг ашиглана.',
  'content.edit': 'Вэбсайтын контент, файл, чатботыг засна.',
  'admin.users_permissions_logs': 'Хэрэглэгч нэмэх, эрх олгох, үйлдлийн лог харах.',
};

const sameMatrix = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function TaskPermissionMatrix({ apiUrl }) {
  const [raw, setRaw] = useState({});
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${apiUrl}/api/config/permissions`, { headers: getAuthHeaders(), timeout: 10000 });
      const data = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : {};
      setRaw(data); setDraft(effectiveMatrix(data));
    } catch (err) {
      setError(err.response?.data?.message || 'Эрхийн тохиргоо ачаалж чадсангүй. Анхдагч утгыг харуулж байна.');
      setRaw({}); setDraft(effectiveMatrix({}));
    } finally { setLoading(false); }
  }, [apiUrl]);
  useEffect(() => { load(); }, [load]);

  const baseline = useMemo(() => effectiveMatrix(raw), [raw]);
  const dirty = draft ? !sameMatrix(draft, baseline) : false;
  const groups = useMemo(() => PERMISSION_GROUPS.map(group => ({ ...group, items: PERMISSIONS.filter(item => item.group === group.key) })).filter(group => group.items.length > 0), []);

  const toggle = (role, key) => setDraft(previous => ({ ...previous, [role]: { ...previous[role], [key]: !previous[role][key] } }));

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      // Хуучин LOS нүднүүдийг алдахгүйн тулд хадгалагдсан өгөгдөл дээр зөвхөн өөрчилсөн нүдийг нэмнэ.
      const body = JSON.parse(JSON.stringify(raw || {}));
      PERMISSION_ROLES.filter(role => role.key !== 'admin').forEach(role => {
        PERMISSIONS.filter(item => !item.adminOnly).forEach(item => {
          if (draft[role.key][item.key] !== baseline[role.key][item.key]) {
            body[role.key] = { ...(body[role.key] || {}), [matrixCellKey(item.key)]: draft[role.key][item.key] ? 'full' : 'none' };
          }
        });
      });
      await axios.put(`${apiUrl}/api/config/permissions`, body, { headers: getAuthHeaders(), timeout: 15000 });
      setRaw(body); setDraft(effectiveMatrix(body)); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Хадгалж чадсангүй.'); }
    finally { setSaving(false); }
  };

  const changed = (role, key) => Boolean(draft?.[role]?.[key]) !== Boolean(baseline?.[role]?.[key]);
  const changedCount = draft ? PERMISSION_ROLES.reduce((sum, role) => sum + PERMISSIONS.filter(item => changed(role.key, item.key)).length, 0) : 0;

  // Нүд: sr-only checkbox (нэр, тайлбар хадгалагдана) + гэрэлтдэг дүрс. Түгжээтэй нүд бүдэг, цоожтой.
  const cell = (role, item, helpId, withLabel) => {
    const locked = role.key === 'admin' || item.adminOnly;
    const checked = Boolean(draft[role.key]?.[item.key]);
    const isChanged = changed(role.key, item.key);
    return <label className={`group inline-flex min-h-11 items-center gap-2.5 rounded-xl ${withLabel ? 'w-full border border-white/10 bg-white/[0.03] px-3' : 'min-w-11 justify-center'} ${locked || saving ? 'cursor-not-allowed' : 'cursor-pointer'} has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color-mix(in_srgb,var(--hue)_65%,white)]`}>
      <input type="checkbox" className="sr-only" checked={checked} disabled={locked || saving}
        aria-label={`${role.label}: ${item.label}`} aria-describedby={helpId} onChange={() => toggle(role.key, item.key)} />
      <span aria-hidden="true" className={`relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] transition duration-200 ${checked
        ? (locked ? 'bg-white/[0.14] text-[var(--adm-ink-2)]' : 'bg-[var(--hue)] text-[#05070D] shadow-[0_0_14px_-2px_var(--hue)]')
        : `ring-1 ring-inset ${locked ? 'ring-white/10' : 'ring-white/45 group-hover:ring-white/70'}`}`}>
        {checked && <Check size={14} strokeWidth={3} />}
        {isChanged && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#F3CB55] ring-2 ring-[#0D1122]" />}
      </span>
      {withLabel && <span className={`min-w-0 text-[13px] font-medium ${locked ? 'text-[var(--adm-ink-3)]' : 'text-[var(--adm-ink)]'}`}>{role.label}</span>}
      {locked && <Lock size={12} className={`${withLabel ? 'ml-auto' : ''} text-[var(--adm-ink-3)]`} aria-hidden="true" />}
    </label>;
  };

  if (showLegacy) {
    return <div className="adm-board space-y-4" style={{ '--hue': `var(--sp-${HUE})` }}>
      <Button variant="secondary" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={() => setShowLegacy(false)}>Шинэ эрхийн матриц руу буцах</Button>
      <Suspense fallback={<p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}><LegacyPermissionMatrix apiUrl={apiUrl} /></Suspense>
    </div>;
  }

  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': `var(--sp-${HUE})` }}>
    <PageHeader hue={HUE} icon={ShieldCheck} eyebrow="Тохиргоо" title="Эрхийн матриц" count={PERMISSIONS.length} countLabel="эрх"
      description={`${PERMISSION_ROLES.length} роль · Админ бүх эрхтэй (түгжээтэй)`}
      actions={<>
        <Button variant="secondary" icon={<History size={16} aria-hidden="true" />} onClick={() => setShowLegacy(true)}>Хуучин LOS матриц</Button>
        <Button variant="secondary" onClick={() => setDraft(baseline)} disabled={!dirty || saving}>Болих</Button>
        <Button hue={HUE} onClick={save} busy={saving} disabled={!dirty || saving} icon={saved ? <CheckCircle2 size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}>{saved ? 'Хадгалагдлаа' : 'Хадгалах'}</Button>
      </>} />

    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="max-w-3xl text-sm text-[var(--adm-ink-2)]">Хүсэлтийн удирдлагын эрхийг ролиор тохируулна. Админаас бусад ролийн сонголтыг өөрчлөөд "Хадгалах" дарна уу.</p>
      {dirty && <Pill hue="gold">{changedCount} хадгалаагүй өөрчлөлт</Pill>}
    </div>

    {error && <Notice kind="err">{error}</Notice>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-[var(--adm-ink-2)]"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}

    {draft && <div className="space-y-4">
      {groups.map(group => <section key={group.key} aria-labelledby={`pg-${group.key}`} className="glass relative overflow-hidden">
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <h3 id={`pg-${group.key}`} className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--adm-ink-2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--hue)] shadow-[0_0_8px_var(--hue)]" aria-hidden="true" />{group.label}
          </h3>
          <span className="adm-tnum text-xs text-[var(--adm-ink-3)]">{group.items.length} эрх</span>
        </div>
        <div className="relative hidden overflow-x-auto md:block">
          <table className="adm-table w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">{group.label} — эрхийн матриц</caption>
            <thead><tr>
              <th scope="col" className="!static !bg-transparent">Эрх</th>
              {PERMISSION_ROLES.map(role => <th key={role.key} scope="col" className="!static w-32 !bg-transparent text-center">{role.label}</th>)}
            </tr></thead>
            <tbody>{group.items.map(item => <tr key={item.key} className="adm-row">
              <th scope="row" className="border-b border-white/[0.05] px-[14px] py-3 align-top font-medium text-white">
                {item.label}
                <span id={`help-${item.key}`} className="mt-0.5 block max-w-xl text-xs font-normal leading-relaxed text-[var(--adm-ink-3)]">{HELP[item.key] || ''}</span>
              </th>
              {PERMISSION_ROLES.map(role => <td key={role.key} className="text-center align-top">{cell(role, item, `help-${item.key}`, false)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <ul className="relative divide-y divide-white/[0.06] md:hidden">{group.items.map(item => <li key={item.key} className="px-4 py-4">
          <p className="font-medium text-white">{item.label}</p>
          <p id={`help-m-${item.key}`} className="mt-0.5 text-xs leading-relaxed text-[var(--adm-ink-3)]">{HELP[item.key] || ''}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">{PERMISSION_ROLES.map(role => <div key={role.key}>{cell(role, item, `help-m-${item.key}`, true)}</div>)}</div>
        </li>)}</ul>
      </section>)}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--adm-ink-3)]">
        <span className="inline-flex items-center gap-1.5"><Lock size={12} aria-hidden="true" />Түгжээтэй нүдийг өөрчлөх боломжгүй (админы эрх, зөвхөн админд олгогдох эрх).</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#F3CB55]" aria-hidden="true" />Хадгалаагүй өөрчлөлт</span>
      </p>
    </div>}
  </div>;
}
