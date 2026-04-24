import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Printer, ChevronDown, ChevronRight, Edit2, Save, X,
  Lock, Shield, Users, Settings, CheckCircle2, AlertCircle,
} from 'lucide-react';

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
  full:    { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  label: 'Бүрэн',        sym: '✓' },
  view:    { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   label: 'Харах',        sym: '👁' },
  partial: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  label: 'Хэсэгчлэн',   sym: '~' },
  none:    { bg: 'bg-slate-50',   text: 'text-slate-300',  border: 'border-slate-100',  label: 'Эрхгүй',      sym: '—' },
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
const Cell = ({ value, editable, onClick }) => {
  const m = PERM_META[value] || PERM_META.none;
  return (
    <td className="px-2 py-2 text-center border-b border-slate-100">
      <button
        onClick={editable ? onClick : undefined}
        disabled={!editable}
        title={editable ? `${m.label} — дарж өөрчлөх` : m.label}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black border transition-all
          ${m.bg} ${m.text} ${m.border}
          ${editable ? 'cursor-pointer hover:scale-110 hover:shadow-md ring-offset-1 hover:ring-2 hover:ring-slate-400' : 'cursor-default'}`}
      >
        {m.sym}
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
      <div style="font-size:9px;font-weight:800;color:#00A651;text-transform:uppercase;letter-spacing:.15em">Solongo Capital SCM</div>
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
    } catch { }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Required approvers */}
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm font-black text-[#003B5C]">Зөвшөөрөлийн тоо</p>
          <p className="text-xs text-slate-500 mt-0.5">Зээлийн хорооны шийдвэр гарахад хэдэн хүний зөвшөөрөл шаардлагатай вэ?</p>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setSettings(p => ({ ...p, requiredApprovers: n }))}
              className={`w-16 h-16 rounded-2xl border-2 font-black text-xl transition-all ${
                settings.requiredApprovers === n
                  ? 'bg-[#003B5C] border-[#003B5C] text-white shadow-lg scale-105'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-[#003B5C] hover:text-[#003B5C]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {settings.requiredApprovers === 1 && 'Нэг хүний шийдвэр хангалтай.'}
          {settings.requiredApprovers === 2 && 'Хоёр хүн зөвшөөрсний дараа батлагдана.'}
          {settings.requiredApprovers === 3 && 'Гурван хүн зөвшөөрсний дараа л батлагдана.'}
        </p>
      </div>

      {/* Approver users */}
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm font-black text-[#003B5C]">Зээлийн хорооны гишүүд</p>
          <p className="text-xs text-slate-500 mt-0.5">Зээлийн хорооны шийдвэр гаргах эрх бүхий хэрэглэгчдийг сонгоно уу.</p>
        </div>
        {usersList.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Хэрэглэгч байхгүй байна.</p>
        ) : (
          <div className="space-y-2">
            {usersList.map(u => {
              const isSelected = settings.approvers.includes(u._id);
              return (
                <label
                  key={u._id}
                  className={`flex items-center gap-4 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#003B5C]/5 border-[#003B5C]'
                      : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleApprover(u._id)}
                    className="w-4 h-4 accent-[#003B5C] rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#003B5C]">{u.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[u.roles?.[0]] || ROLE_LABELS[u.role] || u.role || '—'}</p>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-black px-2 py-0.5 bg-[#003B5C] text-white rounded-lg">Гишүүн</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">
          Сонгогдсон: <strong>{settings.approvers.length}</strong> хэрэглэгч
          {settings.approvers.length > 0 && settings.approvers.length < settings.requiredApprovers && (
            <span className="text-amber-600 ml-2">⚠ Шаардлагатай тооноос ({settings.requiredApprovers}) бага байна.</span>
          )}
        </p>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#003B5C] text-white rounded-xl font-bold text-sm hover:bg-[#002d47] disabled:opacity-50 transition-all"
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : saved ? (
          <CheckCircle2 size={15} />
        ) : (
          <Save size={15} />
        )}
        {saved ? 'Хадгалагдлаа!' : 'Хадгалах'}
      </button>
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
    } catch { }
    setSaving(false);
  };

  const activeMap = editMode ? editMap : permMap;
  const counts = permMap ? summarize(activeMap) : summarize(null);

  const toggleSection = key => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  if (loading) return (
    <div className="flex items-center justify-center py-24 bg-white border rounded-2xl gap-3 text-slate-400">
      <span className="w-5 h-5 border-2 border-slate-300 border-t-[#003B5C] rounded-full animate-spin" />
      <span className="font-bold">Уншиж байна...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#00A651]">Системийн тохиргоо</p>
          <h2 className="text-2xl font-bold text-[#003B5C]">Хэрэглэгчийн эрх</h2>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-700 bg-green-50 border border-green-300 px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={14} /> Хадгалагдлаа
            </span>
          )}
          {subTab === 'matrix' && !editMode && (
            <>
              <button onClick={() => printMatrix(permMap)}
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                <Printer size={14} /> Хэвлэх
              </button>
              <button onClick={startEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B5C] text-white rounded-xl text-sm font-bold hover:bg-[#002d47] transition-all">
                <Edit2 size={14} /> Засах
              </button>
            </>
          )}
          {subTab === 'matrix' && editMode && (
            <>
              <button onClick={cancelEdit}
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                <X size={14} /> Болих
              </button>
              <button onClick={savePermissions} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-all">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                Хадгалах
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-800 text-sm font-bold">
          <AlertCircle size={16} />
          Засах горим идэвхтэй байна. Эсийг дарж эрхийг өөрчилнө үү.
          <span className="ml-2 font-normal text-amber-700">Adminийн эрхийг өөрчлөх боломжгүй.</span>
        </div>
      )}

      {/* Sub tabs */}
      <div className="bg-white border rounded-2xl p-1.5 inline-flex gap-1">
        {[
          { key: 'matrix',    label: 'Эрхийн матриц',         icon: Shield },
          { key: 'committee', label: 'Зээлийн хорооны тохиргоо', icon: Settings },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => { setSubTab(t.key); if (editMode) cancelEdit(); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                subTab === t.key ? 'bg-[#003B5C] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'committee' && <CommitteeSettings apiUrl={apiUrl} />}

      {subTab === 'matrix' && (
        <>
          {/* Role summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ROLES.map(r => {
              const c = counts[r.key];
              const accessPct = Math.round(((c.full + c.view + c.partial) / c.total) * 100);
              return (
                <div key={r.key} className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded-lg text-white" style={{ background: r.color }}>
                      {r.abbr}
                    </span>
                    {r.locked
                      ? <Lock size={13} className="text-slate-400" title="Засах боломжгүй" />
                      : <Edit2 size={13} className="text-slate-400" />
                    }
                  </div>
                  <p className="font-black text-sm text-[#003B5C] mb-2">{r.label}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${accessPct}%`, background: r.color }} />
                  </div>
                  <div className="grid grid-cols-2 gap-0.5 text-[10px]">
                    <span className="text-green-700 font-bold">✓ {c.full}</span>
                    <span className="text-blue-600 font-bold">👁 {c.view}</span>
                    <span className="text-amber-600 font-bold">~ {c.partial}</span>
                    <span className="text-slate-400 font-bold">— {c.none}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs bg-white border rounded-xl px-4 py-3">
            {Object.entries(PERM_META).map(([k, m]) => (
              <span key={k} className="flex items-center gap-2">
                <span className={`w-6 h-6 flex items-center justify-center rounded-md font-black border text-xs ${m.bg} ${m.text} ${m.border}`}>
                  {m.sym}
                </span>
                <span className="font-semibold text-slate-600">{m.label}</span>
              </span>
            ))}
            {editMode && (
              <span className="ml-auto text-amber-700 font-bold flex items-center gap-1">
                <AlertCircle size={11} /> Эс дарж эрхийг циклчилж солино
              </span>
            )}
          </div>

          {/* Matrix table */}
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-[#003B5C]">
                    <th className="px-4 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider w-72">
                      Үйлдэл
                    </th>
                    {ROLES.map(r => (
                      <th key={r.key} className="px-2 py-3 text-center w-28">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-black text-white px-2 py-0.5 rounded-lg flex items-center gap-1"
                            style={{ background: r.color + '50', border: `1px solid ${r.color}80` }}>
                            {r.locked && <Lock size={9} />} {r.abbr}
                          </span>
                          <span className="text-[10px] text-white/70 font-semibold leading-tight">{r.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_SECTIONS.map(section => (
                    <>
                      <tr key={`sec-${section.key}`}
                        onClick={() => toggleSection(section.key)}
                        className="bg-slate-50 border-y border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                        <td colSpan={ROLES.length + 1} className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {collapsed[section.key]
                              ? <ChevronRight size={14} className="text-slate-400" />
                              : <ChevronDown size={14} className="text-slate-400" />}
                            <span>{section.icon}</span>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-600">{section.title}</span>
                            <span className="text-[10px] text-slate-400">{section.rows.length} үйлдэл</span>
                          </div>
                        </td>
                      </tr>
                      {!collapsed[section.key] && section.rows.map((row, i) => (
                        <tr key={`${section.key}-${i}`}
                          className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-2 text-sm text-slate-700 border-b border-slate-100 group-hover:font-medium">
                            {row.action}
                          </td>
                          {ROLES.map(r => (
                            <Cell
                              key={r.key}
                              value={activeMap?.[r.key]?.[`${section.key}:${row.action}`] || 'none'}
                              editable={editMode && !r.locked}
                              onClick={() => cycleCell(r.key, section.key, row.action)}
                            />
                          ))}
                        </tr>
                      ))}
                    </>
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
