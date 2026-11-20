import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, History, Loader2, Lock, Save } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_ROLES, PERMISSIONS, effectiveMatrix, matrixCellKey } from '@shared/permissions';
import { getAuthHeaders } from '../loanTask/api';

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

  if (showLegacy) {
    return <div className="space-y-4">
      <button type="button" onClick={() => setShowLegacy(false)} className="min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-[#003B5C] shadow-sm">← Шинэ эрхийн матриц руу буцах</button>
      <Suspense fallback={<p role="status" className="text-sm text-slate-500">Ачаалж байна…</p>}><LegacyPermissionMatrix apiUrl={apiUrl} /></Suspense>
    </div>;
  }

  return <div className="space-y-5 animate-fade-in">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#007A3D]">Тохиргоо</p>
        <h2 className="text-2xl font-bold text-[#003B5C]">Эрхийн матриц</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Хүсэлтийн удирдлагын эрхийг ролиор тохируулна. Админ бүх эрхтэй (түгжээтэй). Админаас бусад ролийн сонголтыг өөрчлөөд "Хадгалах" дарна уу.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowLegacy(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><History size={16} aria-hidden="true" />Хуучин LOS матриц</button>
        <button type="button" onClick={() => setDraft(baseline)} disabled={!dirty || saving} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">Болих</button>
        <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003B5C] px-5 text-sm font-bold text-white disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : saved ? <CheckCircle2 size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{saved ? 'Хадгалагдлаа' : 'Хадгалах'}</button>
      </div>
    </div>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Ачаалж байна…</p>}

    {draft && <div className="space-y-5">
      {groups.map(group => <section key={group.key} aria-labelledby={`pg-${group.key}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <h3 id={`pg-${group.key}`} className="border-b bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">{group.label}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{group.label} — эрхийн матриц</caption>
            <thead><tr className="text-xs text-slate-500">
              <th scope="col" className="px-4 py-2 font-semibold">Эрх</th>
              {PERMISSION_ROLES.map(role => <th key={role.key} scope="col" className="w-28 px-2 py-2 text-center font-semibold">{role.label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{group.items.map(item => <tr key={item.key}>
              <th scope="row" className="px-4 py-3 align-top font-medium text-slate-800">
                {item.label}
                <span id={`help-${item.key}`} className="mt-0.5 block text-xs font-normal text-slate-500">{HELP[item.key] || ''}</span>
              </th>
              {PERMISSION_ROLES.map(role => {
                const locked = role.key === 'admin' || item.adminOnly;
                const checked = Boolean(draft[role.key]?.[item.key]);
                return <td key={role.key} className="px-2 py-3 text-center align-top">
                  <label className="inline-flex min-h-11 min-w-11 items-center justify-center">
                    <input type="checkbox" className="h-5 w-5 accent-[#003B5C] disabled:opacity-60" checked={checked} disabled={locked || saving}
                      aria-label={`${role.label}: ${item.label}`} aria-describedby={`help-${item.key}`} onChange={() => toggle(role.key, item.key)} />
                    {locked && <Lock size={12} className="ml-1 text-slate-400" aria-hidden="true" />}
                  </label>
                </td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </section>)}
      <p className="flex items-center gap-1 text-xs text-slate-500"><Lock size={12} aria-hidden="true" />Түгжээтэй нүдийг өөрчлөх боломжгүй (админы эрх, зөвхөн админд олгогдох эрх).</p>
    </div>}
  </div>;
}
