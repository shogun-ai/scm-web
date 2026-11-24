import { Fragment, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Printer, ChevronDown, ChevronRight, Edit2, Save, X,
  Lock, Shield, CheckCircle2, AlertCircle, Check, Eye, Minus, Loader2,
} from 'lucide-react';
import PageHeader from './admin/ui/PageHeader';
import Tabs from './admin/ui/Tabs';
import Button from './admin/ui/Button';
import { Pill } from './admin/ui/Feedback';

// ─────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────
export const ROLES = [
  { key: 'admin',           label: 'Админ',                color: '#7c3aed', abbr: 'ADM', locked: true  },
  { key: 'director',        label: 'Захирал',              color: '#003B5C', abbr: 'ЗАХ', locked: false },
  { key: 'loan_officer',    label: 'Зээлийн ажилтан',      color: '#0ea5e9', abbr: 'ЗАА', locked: false },
  { key: 'finance_manager', label: 'Санхүүгийн менежер',   color: '#10b981', abbr: 'СМЕ', locked: false },
];

export const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.key, r.label]));

// Permission levels in cycle order
const PERM_CYCLE = ['full', 'view', 'partial', 'none'];
const PERM_META = {
  full:    { bg: 'bg-[#34D399]/[0.14]', text: 'text-[#8FF0C8]', border: 'border-[#34D399]/35', label: 'Бүрэн',      sym: '✓' },
  view:    { bg: 'bg-[#4CC6FF]/[0.12]', text: 'text-[#A6E6FF]', border: 'border-[#4CC6FF]/30', label: 'Харах',      sym: '👁' },
  partial: { bg: 'bg-[#F3CB55]/[0.12]', text: 'text-[#F7DC8A]', border: 'border-[#F3CB55]/30', label: 'Хэсэгчлэн',  sym: '~' },
  none:    { bg: 'bg-white/[0.03]',     text: 'text-[#93A0B6]', border: 'border-white/10',     label: 'Эрхгүй',     sym: '—' },
};

// ─────────────────────────────────────────────
// DEFAULT MATRIX
// ─────────────────────────────────────────────
const F = 'full', V = 'view', P = 'partial', N = 'none';

export const DEFAULT_SECTIONS = [
  { key: 'dashboard', title: 'Хянах самбар', icon: '📊', rows: [
    { action: 'Хянах самбар харах',          admin:F, director:F, loan_officer:F, finance_manager:F },
    { action: 'Зээлийн статистик харах',     admin:F, director:F, loan_officer:V, finance_manager:V },
    { action: 'Exposure Monitor харах',      admin:F, director:F, loan_officer:F, finance_manager:F },
  ]},
  { key: 'los_app', title: 'LOS — Аппликэйшн', icon: '📋', rows: [
    { action: 'Хүсэлтийн жагсаалт харах',   admin:F, director:F, loan_officer:F, finance_manager:V },
    { action: 'Шинэ хүсэлт үүсгэх',         admin:F, director:N, loan_officer:F, finance_manager:N },
    { action: 'Хүсэлтийн дэлгэрэнгүй харах',admin:F, director:F, loan_officer:F, finance_manager:V },
    { action: 'Хүсэлт засах',               admin:F, director:N, loan_officer:F, finance_manager:N },
    { action: 'Хүсэлт устгах',              admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Хариуцагч томилох',          admin:F, director:F, loan_officer:P, finance_manager:N },
    { action: 'Статус шинэчлэх',            admin:F, director:F, loan_officer:F, finance_manager:N },
    { action: 'Иргэний үнэмлэх AI уншуулах',admin:F, director:N, loan_officer:F, finance_manager:N },
  ]},
  { key: 'los_assessment', title: 'LOS — Зээлийн үнэлгээ', icon: '📈', rows: [
    { action: 'Зээлийн судалгаа харах',      admin:F, director:F, loan_officer:F, finance_manager:V },
    { action: 'Судалгаа хийх / засах',       admin:F, director:N, loan_officer:F, finance_manager:N },
    { action: 'Судалгааг хадгалах',          admin:F, director:N, loan_officer:F, finance_manager:N },
    { action: 'Судалгаа хэвлэх',            admin:F, director:F, loan_officer:F, finance_manager:F },
    { action: 'Хорооны шийдвэрт шилжих',    admin:F, director:F, loan_officer:F, finance_manager:N },
    { action: 'Банкны хуулга AI шинжлэх',   admin:F, director:N, loan_officer:F, finance_manager:N },
    { action: 'Зээлийн мэдэлтэйн сан AI',   admin:F, director:N, loan_officer:F, finance_manager:N },
  ]},
  { key: 'los_committee', title: 'LOS — Зээлийн хороо', icon: '⚖️', rows: [
    { action: 'Зээлийн хорооны дүгнэлт харах', admin:F, director:F, loan_officer:F, finance_manager:V },
    { action: 'Зөвшөөрөх',                  admin:F, director:F, loan_officer:N, finance_manager:N },
    { action: 'Татгалзах',                  admin:F, director:F, loan_officer:N, finance_manager:N },
    { action: 'Нөхцөлтэй зөвшөөрөх',       admin:F, director:F, loan_officer:N, finance_manager:N },
    { action: 'Дахин шийдэх (цуцлах)',      admin:F, director:F, loan_officer:N, finance_manager:N },
    { action: 'Дүгнэлт хэвлэх',            admin:F, director:F, loan_officer:F, finance_manager:F },
  ]},
  { key: 'los_disbursement', title: 'LOS — Олголт', icon: '💳', rows: [
    { action: 'Олголтын мэдээлэл харах',    admin:F, director:F, loan_officer:F, finance_manager:F },
    { action: 'Зээл олгосон гэж бүртгэх',  admin:F, director:N, loan_officer:N, finance_manager:F },
  ]},
  { key: 'trusts', title: 'Итгэлцэл', icon: '🤝', rows: [
    { action: 'Жагсаалт харах',             admin:F, director:F, loan_officer:N, finance_manager:F },
    { action: 'Дэлгэрэнгүй харах',          admin:F, director:F, loan_officer:N, finance_manager:F },
    { action: 'Статус шинэчлэх',            admin:F, director:N, loan_officer:N, finance_manager:F },
    { action: 'Устгах',                     admin:F, director:N, loan_officer:N, finance_manager:N },
  ]},
  { key: 'finance', title: 'Санхүүгийн мэдээлэл', icon: '💰', rows: [
    { action: 'Санхүүгийн үзүүлэлт харах', admin:F, director:F, loan_officer:N, finance_manager:F },
    { action: 'Үзүүлэлт нэмэх / засах',    admin:F, director:N, loan_officer:N, finance_manager:F },
    { action: 'Устгах',                     admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Файл оруулах / татах',       admin:F, director:V, loan_officer:N, finance_manager:F },
  ]},
  { key: 'cms', title: 'Контент удирдлага (CMS)', icon: '🌐', rows: [
    { action: 'Hero / Нүүр хуудас засах',   admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Бүтээгдэхүүн харах',         admin:F, director:V, loan_officer:N, finance_manager:N },
    { action: 'Бүтээгдэхүүн засах / устгах',admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Баг гишүүн харах',           admin:F, director:V, loan_officer:N, finance_manager:N },
    { action: 'Баг гишүүн засах / устгах',  admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Блог харах',                 admin:F, director:V, loan_officer:N, finance_manager:N },
    { action: 'Блог нэмэх / засах / устгах',admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Бодлого засах',              admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Chatbot / Загвар тохиргоо',  admin:F, director:N, loan_officer:N, finance_manager:N },
  ]},
  { key: 'users', title: 'Хэрэглэгчид', icon: '👥', rows: [
    { action: 'Жагсаалт харах',             admin:F, director:V, loan_officer:N, finance_manager:N },
    { action: 'Шинэ хэрэглэгч нэмэх',      admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Хэрэглэгч засах / устгах',   admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Эрх / роль өгөх',            admin:F, director:N, loan_officer:N, finance_manager:N },
    { action: 'Нэвтрэлтийн лог харах',      admin:F, director:N, loan_officer:N, finance_manager:N },
  ]},
  { key: 'settings', title: 'Тохиргоо', icon: '⚙️', rows: [
    { action: 'Нууц үг солих',              admin:F, director:F, loan_officer:F, finance_manager:F },
    { action: '2FA тохируулах',             admin:F, director:F, loan_officer:F, finance_manager:F },
  ]},
];

// Build a flat map: { roleKey: { "sectionKey:action": permValue } }
const buildDefaultMap = () => {
  const map = {};
  ROLES.forEach(r => {
    map[r.key] = {};
    DEFAULT_SECTIONS.forEach(s => {
      s.rows.forEach(row => {
        map[r.key][`${s.key}:${row.action}`] = row[r.key];
      });
    });
  });
  return map;
};

// Merge saved overrides onto defaults
const applyOverrides = (saved = {}) => {
  const base = buildDefaultMap();
  Object.entries(saved).forEach(([roleKey, actions]) => {
    if (base[roleKey]) {
      Object.assign(base[roleKey], actions);
    }
  });
  return base;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const getToken = () => { try { return JSON.parse(localStorage.getItem('scm_auth') || '{}').token || ''; } catch { return ''; } };
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const summarize = (permMap) => {
  const counts = {};
  ROLES.forEach(r => { counts[r.key] = { full: 0, view: 0, partial: 0, none: 0, total: 0 }; });
  DEFAULT_SECTIONS.forEach(s => s.rows.forEach(row => {
    ROLES.forEach(r => {
      const v = permMap ? (permMap[r.key]?.[`${s.key}:${row.action}`] || 'none') : row[r.key];
      if (counts[r.key][v] !== undefined) counts[r.key][v]++;
      counts[r.key].total++;
    });
  }));
  return counts;
};

// ─────────────────────────────────────────────
// CELL COMPONENT
// ─────────────────────────────────────────────
const PERM_ICON = { full: Check, view: Eye, partial: null, none: Minus };
const Cell = ({ value, editable, onClick, label }) => {
  const m = PERM_META[value] || PERM_META.none;
  const Icon = PERM_ICON[value] || Minus;
  return (
    <td className="px-2 py-2 text-center">
      <button
        type="button"
        onClick={editable ? onClick : undefined}
        disabled={!editable}
        title={editable ? `${m.label} — дарж өөрчлөх` : m.label}
        aria-label={`${label}: ${m.label}${editable ? ' — дарж өөрчлөх' : ''}`}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border text-xs font-bold ring-inset transition
          ${m.bg} ${m.text} ${m.border}
          ${editable ? 'cursor-pointer hover:ring-1 hover:ring-white/40' : 'cursor-default'}`}
      >
        {value === 'partial' ? '~' : <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
      </button>
    </td>
  );
};

// ─────────────────────────────────────────────
// PRINT
// ─────────────────────────────────────────────
const printMatrix = (permMap) => {
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const today = new Date().toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric' });
  const syms  = { full:'✓', view:'👁', partial:'~', none:'—' };
  const bgs   = { full:'#dcfce7', view:'#dbeafe', partial:'#fef3c7', none:'#f8fafc' };
  const clrs  = { full:'#15803d', view:'#1d4ed8', partial:'#92400e', none:'#cbd5e1' };

  const getV = (roleKey, sKey, action) =>
    permMap ? (permMap[roleKey]?.[`${sKey}:${action}`] || 'none') : 'none';

  const rows = DEFAULT_SECTIONS.map(s => `
    <tr><td colspan="${ROLES.length+1}" style="background:#f1f5f9;padding:8px 12px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:#475569;border-top:2px solid #e2e8f0">
      ${esc(s.icon)} &nbsp;${esc(s.title)}
    </td></tr>
    ${s.rows.map(row => `<tr>
      <td style="padding:6px 12px;font-size:11px;color:#334155;border-bottom:1px solid #f1f5f9">${esc(row.action)}</td>
      ${ROLES.map(r => {
        const v = getV(r.key, s.key, row.action);
        return `<td style="padding:6px;text-align:center;border-bottom:1px solid #f1f5f9">
          <span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:6px;font-size:11px;font-weight:900;background:${bgs[v]};color:${clrs[v]};text-align:center">${syms[v]}</span>
        </td>`;
      }).join('')}
    </tr>`).join('')}
  `).join('');

  const counts = summarize(permMap);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Эрхийн матриц — SCM</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b}
  @page{size:A4 landscape;margin:14mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  table{width:100%;border-collapse:collapse}th{background:#003B5C;color:#fff;font-size:10px;font-weight:800;padding:10px 8px;text-align:center}</style>
  </head><body style="padding:20px">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #003B5C">
    <div>
      <div style="font-size:9px;font-weight:800;color:#007A3D;text-transform:uppercase;letter-spacing:.15em">Solongo Capital SCM</div>
      <div style="font-size:20px;font-weight:900;color:#003B5C">Хэрэглэгчийн эрхийн матриц</div>
      <div style="font-size:11px;color:#64748b;margin-top:3px">Огноо: ${today}</div>
    </div>
    <div style="display:flex;gap:12px">
      ${ROLES.map(r => {
        const c = counts[r.key];
        const pct = Math.round(((c.full+c.view+c.partial)/c.total)*100);
        return `<div style="text-align:center;padding:8px 12px;border:2px solid ${r.color};border-radius:10px">
          <div style="font-size:15px;font-weight:900;color:${r.color}">${esc(r.abbr)}</div>
          <div style="font-size:8px;color:#64748b">${esc(r.label)}</div>
          <div style="font-size:9px;color:#15803d;margin-top:2px">${pct}% хандалт</div>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div style="display:flex;gap:14px;margin-bottom:12px;font-size:10px">
    ${Object.entries(syms).map(([k,s])=>`<span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:4px;background:${bgs[k]};color:${clrs[k]};text-align:center;font-weight:900">${s}</span>${PERM_META[k].label}</span>`).join('')}
  </div>
  <table><thead><tr>
    <th style="text-align:left;width:260px">Үйлдэл</th>
    ${ROLES.map(r=>`<th style="background:${r.color};width:100px">${esc(r.abbr)}<br><span style="font-size:8px;opacity:.8">${esc(r.label)}</span></th>`).join('')}
  </tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=750');
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
};

// ─────────────────────────────────────────────
// COMMITTEE SETTINGS TAB
// ─────────────────────────────────────────────
const CommitteeSettings = ({ apiUrl }) => {
  const [settings, setSettings] = useState({ requiredApprovers: 1, approvers: [] });
  const [usersList, setUsersList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get(`${apiUrl}/api/config/committee`, { headers: authHeaders(), timeout: 8000 })
      .then(r => setSettings(r.data || { requiredApprovers: 1, approvers: [] }))
      .catch(() => {});
    axios.get(`${apiUrl}/api/users/list`, { headers: authHeaders(), timeout: 8000 })
      .then(r => setUsersList(r.data || []))
      .catch(() => {});
  }, [apiUrl]);

  const toggleApprover = (userId) => {
    setSettings(prev => {
      const has = prev.approvers.includes(userId);
      return { ...prev, approvers: has ? prev.approvers.filter(id => id !== userId) : [...prev.approvers, userId] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${apiUrl}/api/config/committee`, settings, { headers: authHeaders() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* алдааг чимээгүй өнгөрөөнө (хуучин зан төлөв) */ }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Required approvers */}
      <section className="glass relative space-y-4 p-5 md:p-6" aria-labelledby="committee-count">
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="relative">
          <h3 id="committee-count" className="text-[15px] font-semibold text-white">Зөвшөөрөлийн тоо</h3>
          <p className="mt-1 text-sm text-[var(--adm-ink-2)]">Зээлийн хорооны шийдвэр гарахад хэдэн хүний зөвшөөрөл шаардлагатай вэ?</p>
        </div>
        <div className="relative flex gap-3" role="group" aria-labelledby="committee-count">
          {[1, 2, 3].map(n => (
            <button
              key={n}
              type="button"
              aria-pressed={settings.requiredApprovers === n}
              onClick={() => setSettings(p => ({ ...p, requiredApprovers: n }))}
              className={`adm-tnum h-14 w-14 rounded-2xl border text-xl font-bold transition ${
                settings.requiredApprovers === n
                  ? 'border-[color-mix(in_srgb,var(--hue)_60%,transparent)] bg-[color-mix(in_srgb,var(--hue)_20%,transparent)] text-white shadow-[0_10px_30px_-12px_var(--hue)]'
                  : 'border-white/10 bg-white/[0.03] text-[var(--adm-ink-2)] hover:border-white/25 hover:text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="relative text-xs text-[var(--adm-ink-3)]">
          {settings.requiredApprovers === 1 && 'Нэг хүний шийдвэр хангалтай.'}
          {settings.requiredApprovers === 2 && 'Хоёр хүн зөвшөөрсний дараа батлагдана.'}
          {settings.requiredApprovers === 3 && 'Гурван хүн зөвшөөрсний дараа л батлагдана.'}
        </p>
      </section>

      {/* Approver users */}
      <section className="glass relative space-y-4 p-5 md:p-6" aria-labelledby="committee-members">
        <span className="adm-card__rim" aria-hidden="true" />
        <div className="relative">
          <h3 id="committee-members" className="text-[15px] font-semibold text-white">Зээлийн хорооны гишүүд</h3>
          <p className="mt-1 text-sm text-[var(--adm-ink-2)]">Зээлийн хорооны шийдвэр гаргах эрх бүхий хэрэглэгчдийг сонгоно уу.</p>
        </div>
        {usersList.length === 0 ? (
          <p className="relative py-4 text-center text-sm text-[var(--adm-ink-3)]">Хэрэглэгч байхгүй байна.</p>
        ) : (
          <div className="relative space-y-2">
            {usersList.map(u => {
              const isSelected = settings.approvers.includes(u._id);
              return (
                <label
                  key={u._id}
                  className={`flex min-h-12 cursor-pointer items-center gap-4 rounded-xl border px-3.5 py-2.5 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color-mix(in_srgb,var(--hue)_65%,white)] ${
                    isSelected
                      ? 'border-[color-mix(in_srgb,var(--hue)_55%,transparent)] bg-[color-mix(in_srgb,var(--hue)_10%,transparent)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleApprover(u._id)}
                    className="h-4 w-4 rounded accent-[var(--hue)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-[var(--adm-ink-3)]">{ROLE_LABELS[u.roles?.[0]] || ROLE_LABELS[u.role] || u.role || '—'}</p>
                  </div>
                  {isSelected && <Pill hue="indigo" dot={false}>Гишүүн</Pill>}
                </label>
              );
            })}
          </div>
        )}
        <p className="relative text-xs text-[var(--adm-ink-3)]">
          Сонгогдсон: <strong className="text-white">{settings.approvers.length}</strong> хэрэглэгч
          {settings.approvers.length > 0 && settings.approvers.length < settings.requiredApprovers && (
            <span className="ml-2 text-[#F7DC8A]">Шаардлагатай тооноос ({settings.requiredApprovers}) бага байна.</span>
          )}
        </p>
      </section>

      {/* Save */}
      <Button onClick={handleSave} busy={saving} disabled={saving} icon={saved ? <CheckCircle2 size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}>
        {saved ? 'Хадгалагдлаа!' : 'Хадгалах'}
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const PermissionMatrix = ({ apiUrl }) => {
  const [permMap, setPermMap]       = useState(null);   // loaded map
  const [editMap, setEditMap]       = useState(null);   // mutable copy during edit
  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [collapsed, setCollapsed]   = useState({});
  const [subTab, setSubTab]         = useState('matrix');

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/config/permissions`, { headers: authHeaders(), timeout: 8000 });
      const saved = res.data || {};
      const hasOverrides = Object.keys(saved).length > 0;
      setPermMap(hasOverrides ? applyOverrides(saved) : buildDefaultMap());
    } catch (err) {
      console.warn('Permission load error:', err?.response?.status, err?.message);
      setPermMap(buildDefaultMap());
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { loadPermissions(); }, [loadPermissions]);

  const startEdit = () => {
    setEditMap(JSON.parse(JSON.stringify(permMap)));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMap(null);
    setEditMode(false);
  };

  const cycleCell = (roleKey, sectionKey, action) => {
    const k = `${sectionKey}:${action}`;
    const cur = editMap[roleKey][k] || 'none';
    const next = PERM_CYCLE[(PERM_CYCLE.indexOf(cur) + 1) % PERM_CYCLE.length];
    setEditMap(prev => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [k]: next },
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      // Only send non-admin overrides
      const toSave = {};
      ROLES.filter(r => !r.locked).forEach(r => { toSave[r.key] = editMap[r.key]; });
      await axios.put(`${apiUrl}/api/config/permissions`, toSave, { headers: authHeaders() });
      setPermMap(JSON.parse(JSON.stringify(editMap)));
      setEditMode(false);
      setEditMap(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* алдааг чимээгүй өнгөрөөнө (хуучин зан төлөв) */ }
    setSaving(false);
  };

  const activeMap = editMode ? editMap : permMap;
  const counts = permMap ? summarize(activeMap) : summarize(null);

  const toggleSection = key => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  if (loading) return (
    <div role="status" className="glass relative flex items-center justify-center gap-3 py-24 text-[var(--adm-ink-2)]">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span className="font-semibold">Уншиж байна...</span>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader hue="indigo" icon={Shield} eyebrow="Хуучин LOS" title="Хэрэглэгчийн эрх"
        actions={<>
          {saved && <Pill hue="green">Хадгалагдлаа</Pill>}
          {subTab === 'matrix' && !editMode && <>
            <Button variant="secondary" onClick={() => printMatrix(permMap)} icon={<Printer size={16} aria-hidden="true" />}>Хэвлэх</Button>
            <Button onClick={startEdit} icon={<Edit2 size={16} aria-hidden="true" />}>Засах</Button>
          </>}
          {subTab === 'matrix' && editMode && <>
            <Button variant="secondary" onClick={cancelEdit} icon={<X size={16} aria-hidden="true" />}>Болих</Button>
            <Button hue="green" onClick={savePermissions} busy={saving} disabled={saving} icon={<Save size={16} aria-hidden="true" />}>Хадгалах</Button>
          </>}
        </>} />

      {/* Edit mode banner */}
      {editMode && (
        <p role="status" className="adm-note flex flex-wrap items-center gap-x-3 gap-y-1 border-[#F3CB55]/30 bg-[#F3CB55]/10 text-[#F7DC8A]">
          <AlertCircle size={16} aria-hidden="true" />
          <span className="font-semibold">Засах горим идэвхтэй байна. Эсийг дарж эрхийг өөрчилнө үү.</span>
          <span>Админы эрхийг өөрчлөх боломжгүй.</span>
        </p>
      )}

      {/* Sub tabs */}
      <Tabs label="Хуучин LOS тохиргоо" value={subTab} onChange={key => { setSubTab(key); if (editMode) cancelEdit(); }}
        items={[{ id: 'matrix', label: 'Эрхийн матриц' }, { id: 'committee', label: 'Зээлийн хорооны тохиргоо' }]} />

      {subTab === 'committee' && <CommitteeSettings apiUrl={apiUrl} />}

      {subTab === 'matrix' && (
        <>
          {/* Role summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {ROLES.map(r => {
              const c = counts[r.key];
              const accessPct = Math.round(((c.full + c.view + c.partial) / c.total) * 100);
              return (
                <div key={r.key} className="glass relative p-4">
                  <span className="adm-card__rim" aria-hidden="true" />
                  <div className="relative mb-2 flex items-center justify-between">
                    <span className="adm-label">{r.abbr}</span>
                    {r.locked
                      ? <Lock size={13} className="text-[var(--adm-ink-3)]" aria-label="Засах боломжгүй" />
                      : <Edit2 size={13} className="text-[var(--adm-ink-3)]" aria-hidden="true" />
                    }
                  </div>
                  <p className="relative mb-2 text-sm font-semibold text-white">{r.label}</p>
                  <div className="relative mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]" role="img" aria-label={`${accessPct}% хандалт`}>
                    <div className="h-full rounded-full bg-[var(--hue)] shadow-[0_0_10px_var(--hue)]" style={{ width: `${accessPct}%` }} />
                  </div>
                  <div className="adm-tnum relative grid grid-cols-2 gap-0.5 text-[11px] font-semibold">
                    <span className="text-[#8FF0C8]">{PERM_META.full.label} {c.full}</span>
                    <span className="text-[#A6E6FF]">{PERM_META.view.label} {c.view}</span>
                    <span className="text-[#F7DC8A]">{PERM_META.partial.label} {c.partial}</span>
                    <span className="text-[var(--adm-ink-3)]">{PERM_META.none.label} {c.none}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {Object.entries(PERM_META).map(([k, m]) => {
              const Icon = PERM_ICON[k];
              return (
                <span key={k} className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${m.bg} ${m.text} ${m.border}`} aria-hidden="true">
                    {Icon ? <Icon size={12} strokeWidth={2.5} /> : '~'}
                  </span>
                  <span className="font-medium text-[var(--adm-ink-2)]">{m.label}</span>
                </span>
              );
            })}
            {editMode && (
              <span className="flex items-center gap-1 font-semibold text-[#F7DC8A] md:ml-auto">
                <AlertCircle size={12} aria-hidden="true" /> Эс дарж эрхийг циклчилж солино
              </span>
            )}
          </div>

          {/* Matrix table */}
          <div className="glass relative overflow-hidden">
            <span className="adm-card__rim" aria-hidden="true" />
            <div className="relative overflow-x-auto">
              <table className="adm-table w-full min-w-[640px] text-sm">
                <caption className="sr-only">Хуучин LOS эрхийн матриц</caption>
                <thead>
                  <tr>
                    <th scope="col" className="!static w-72 !bg-transparent text-left">Үйлдэл</th>
                    {ROLES.map(r => (
                      <th key={r.key} scope="col" className="!static w-28 !bg-transparent text-center">
                        <span className="inline-flex items-center gap-1">{r.locked && <Lock size={10} aria-hidden="true" />}{r.abbr}</span>
                        <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-[var(--adm-ink-3)]">{r.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_SECTIONS.map(section => (
                    <Fragment key={section.key}>
                      <tr className="bg-white/[0.035]">
                        <td colSpan={ROLES.length + 1} className="!p-0">
                          <button type="button" onClick={() => toggleSection(section.key)} aria-expanded={!collapsed[section.key]}
                            className="flex min-h-11 w-full items-center gap-2 px-4 text-left transition hover:bg-white/[0.04]">
                            {collapsed[section.key]
                              ? <ChevronRight size={14} className="text-[var(--adm-ink-3)]" aria-hidden="true" />
                              : <ChevronDown size={14} className="text-[var(--adm-ink-3)]" aria-hidden="true" />}
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--adm-ink-2)]">{section.title}</span>
                            <span className="adm-tnum text-[11px] text-[var(--adm-ink-3)]">{section.rows.length} үйлдэл</span>
                          </button>
                        </td>
                      </tr>
                      {!collapsed[section.key] && section.rows.map((row, i) => (
                        <tr key={`${section.key}-${i}`} className="adm-row">
                          <th scope="row" className="border-b border-white/[0.05] px-4 py-2 text-left text-sm font-normal text-[var(--adm-ink)]">
                            {row.action}
                          </th>
                          {ROLES.map(r => (
                            <Cell
                              key={r.key}
                              label={`${r.label}: ${row.action}`}
                              value={activeMap?.[r.key]?.[`${section.key}:${row.action}`] || 'none'}
                              editable={editMode && !r.locked}
                              onClick={() => cycleCell(r.key, section.key, row.action)}
                            />
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PermissionMatrix;
