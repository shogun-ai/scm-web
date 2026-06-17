import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getTransactions, getTransactionCodes, createTransaction,
  importTransactions, updateTransaction, deleteTransaction, recodeTransactions,
  getCodeRules, saveCodeRule, getCodeCombos,
  fmt, fmtDate,
} from '../api';
import { COA } from '../chartOfAccounts';
import { Upload, Plus, Trash2, X, Check, AlertTriangle } from 'lucide-react';

const EMPTY = { date: new Date().toISOString().slice(0, 10), amount: '', description: '', dt: '', ct: '', code: '', bankReference: '' };

// ─── Тайлбарын эхний утгатай үгсийг keyword болгон авах ────────────────────
function extractKeyword(desc) {
  const words = String(desc).trim().toLowerCase().split(/\s+/);
  const meaningful = words.filter(w => !/^\d/.test(w));
  return meaningful.slice(0, 3).join(' ');
}

// ─── Тайлбараас dt/ct/код автоматаар таних ──────────────────────────────────
function guessCode(description, customRules = []) {
  const d = String(description);
  const dl = d.toLowerCase();

  // 1. Хэрэглэгчийн хадгалсан дүрмүүд (хамгийн өндөр эрэмбэ)
  for (const rule of customRules) {
    if (rule.keyword && dl.includes(rule.keyword.toLowerCase())) {
      return { dt: rule.dt || '', ct: rule.ct || '', code: rule.code || '' };
    }
  }

  // 2. Байгууллага (Солонго капитал, ББСБ гэх мэт)
  const isOrg = /солонго капитал|ббсб|хк|ххк|зохион байгуул/i.test(d);
  if (isOrg) {
    if (/хүр\.?тооц.*(хүү|зээл)/i.test(d)) return { dt: '2,024', ct: '1,120', code: '2,126' };
    if (/зээлийн хүү|хүү төлев/i.test(d))  return { dt: '5,121', ct: '1,120', code: '2,126' };
    if (/зээлааc|зээлэac|зээлээс/i.test(d)) return { dt: '2,021', ct: '1,120', code: '2,163' };
  }

  // 3. Зээл — банкнаас авсан
  if (/зээл олгов|зээл олгол/i.test(d))              return { dt: '1,120', ct: '2,021', code: '2,161' };
  if (/зээлааc|зээлэac|зээлээс|зээл буц/i.test(d))   return { dt: '1,120', ct: '1,210', code: '2,104' };

  // 4. Хүүгийн орлого
  if (/хүр\.?тооц.*(хүү|зээл)/i.test(d))            return { dt: '1,120', ct: '1,270', code: '2,101' };
  if (/зээлийн хүү|хүүгийн орлого|хүү төлев/i.test(d)) return { dt: '1,120', ct: '4,140', code: '2,101' };

  // 5. Боловсон хүчний зардал
  if (/цалин/i.test(d))                              return { dt: '5,221', ct: '1,120', code: '2,129' };
  if (/нийгмийн даатгал|ндш|мзуаэ/i.test(d))         return { dt: '5,226', ct: '1,120', code: '2,129' };
  if (/эрүүл мэнд.*даатгал|даатгалын шимтгэл/i.test(d)) return { dt: '5,226', ct: '1,120', code: '2,129' };
  if (/томилолт/i.test(d))                           return { dt: '5,227', ct: '1,120', code: '2,129' };
  if (/сургалт/i.test(d))                            return { dt: '5,228', ct: '1,120', code: '2,129' };

  // 6. Бусад зардал
  if (/шимтгэл/i.test(d))                            return { dt: '5,248', ct: '1,120', code: '2,129' };
  if (/аудит/i.test(d))                              return { dt: '5,236', ct: '1,120', code: '2,129' };
  if (/даатгал/i.test(d))                            return { dt: '5,238', ct: '1,120', code: '2,129' };
  if (/интернет|харилцаа холбоо|утасны/i.test(d))    return { dt: '5,245', ct: '1,120', code: '2,129' };
  if (/цахилгаан|дулаан|усан хангамж/i.test(d))      return { dt: '5,241', ct: '1,120', code: '2,129' };
  if (/хэвлэл|сэтгүүл/i.test(d))                    return { dt: '5,246', ct: '1,120', code: '2,129' };
  if (/бичиг хэрэг/i.test(d))                       return { dt: '5,253', ct: '1,120', code: '2,129' };
  if (/хуулийн|өмгөөлөл/i.test(d))                  return { dt: '5,258', ct: '1,120', code: '2,129' };
  if (/маркетинг|сурталчилгаа/i.test(d))             return { dt: '5,252', ct: '1,120', code: '2,129' };
  if (/тээвэр|ачаа/i.test(d))                        return { dt: '5,254', ct: '1,120', code: '2,129' };
  if (/хамгаалалт|манаач/i.test(d))                  return { dt: '5,244', ct: '1,120', code: '2,129' };
  if (/торгуул/i.test(d))                            return { dt: '5,303', ct: '1,120', code: '2,129' };
  if (/хандив/i.test(d))                             return { dt: '5,304', ct: '1,120', code: '2,129' };
  if (/элэгдэл/i.test(d))                            return { dt: '5,242', ct: '1,120', code: '2,129' };

  return { dt: '', ct: '', code: '' };
}

// ─── COA autocomplete input (dt/ct талбарт данс хайх) ────────────────────────
function CoaInput({ value, onChange, placeholder }) {
  const [q, setQ]       = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref             = useRef();

  useEffect(() => { setQ(value || ''); }, [value]);

  const matches = (() => {
    const ql = q.toLowerCase().replace(/,/g, '');
    if (!ql) return Object.entries(COA).slice(0, 10);
    return Object.entries(COA).filter(([code, name]) =>
      code.replace(/,/g, '').startsWith(ql) ||
      name.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
  })();

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={ref}
        className="z-input"
        style={{ width: 80, fontSize: 12 }}
        placeholder={placeholder}
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />
      {open && matches.length > 0 && (
        <div style={{
          position: 'fixed', zIndex: 99999,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: 300, maxHeight: 220, overflowY: 'auto',
          left: ref.current ? ref.current.getBoundingClientRect().left : 0,
          top:  ref.current ? ref.current.getBoundingClientRect().bottom + 2 : 0,
        }}>
          {matches.map(([code, name]) => (
            <div
              key={code}
              onMouseDown={e => { e.preventDefault(); setQ(code); onChange(code); setOpen(false); }}
              style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 8, alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', minWidth: 56 }}>{code}</span>
              <span style={{ color: '#475569' }}>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Хэрэглэгчийн кодуудаас сонгох modal ─────────────────────────────────────
function RulePicker({ row, combos, codeRules, onApply, onClose }) {
  const [filter, setFilter] = useState('');
  const [manual, setManual] = useState({ dt: row.dt || '', ct: row.ct || '', code: row.code || '' });
  const inputRef = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const desc = (row.description || '').toLowerCase();
  const matchedRules = codeRules.filter(r => r.keyword && desc.includes(r.keyword.toLowerCase()));
  const matchedKeys  = new Set(matchedRules.map(r => `${r.dt}|${r.ct}|${r.code}`));
  const matchedCombos = combos.filter(c => matchedKeys.has(`${c.dt}|${c.ct}|${c.code}`));

  const q = filter.toLowerCase();
  const allFiltered = q
    ? combos.filter(c =>
        (c.dt || '').includes(q) || (c.ct || '').includes(q) || (c.code || '').includes(q) ||
        (c.sample || '').toLowerCase().includes(q)
      )
    : combos;
  const otherCombos = allFiltered.filter(c => !matchedKeys.has(`${c.dt}|${c.ct}|${c.code}`));

  const ComboRow = ({ c, matched }) => (
    <div
      onClick={() => onApply(c)}
      style={{
        padding: '8px 12px', cursor: 'pointer', borderRadius: 8, marginBottom: 4,
        border: matched ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
      }}
      onMouseEnter={e => e.currentTarget.style.background = matched ? '#eff6ff' : '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {matched && (
          <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
            Тохирно
          </span>
        )}
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: 12 }}>
          dt {c.dt || '—'} &nbsp;/&nbsp; ct {c.ct || '—'} &nbsp;/&nbsp; код {c.code || '—'}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 'auto' }}>{c.count}x</span>
      </div>
      {c.sample && (
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, paddingLeft: 0 }}>
          {c.sample.slice(0, 80)}
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: 520, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.4, textTransform: 'uppercase' }}>Кодлох гүйлгээ</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4, background: '#f8fafc', borderRadius: 6, padding: '5px 9px' }}>
              {row.description || '—'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
          {matchedCombos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>AI тохирох код олов</div>
              {matchedCombos.map(c => <ComboRow key={`${c.dt}|${c.ct}|${c.code}`} c={c} matched />)}
            </div>
          )}

          <input
            ref={inputRef}
            className="z-input"
            style={{ width: '100%', marginBottom: 10, fontSize: 12 }}
            placeholder="Хайх (данс, код, тайлбар...)"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />

          {combos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 24, lineHeight: 1.8 }}>
              Өмнө кодолсон гүйлгээ байхгүй<br />
              <span style={{ fontSize: 11 }}>Доор dt/ct талбарт данс хайж оруулна уу — жишээ нь: <b>1,120</b> буюу <b>зээл</b></span>
            </div>
          ) : (
            <>
              {otherCombos.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                  {matchedCombos.length > 0 ? 'Бусад кодууд' : 'Өмнө ашигласан кодууд'}
                </div>
              )}
              {otherCombos.length === 0 && filter ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 12 }}>
                  Хайлтад тохирсон код олдсонгүй
                </div>
              ) : (
                otherCombos.map(c => <ComboRow key={`${c.dt}|${c.ct}|${c.code}`} c={c} />)
              )}
            </>
          )}
        </div>

        {/* Manual entry with COA autocomplete */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 7 }}>
            Гараар оруулах
            <span style={{ fontWeight: 400, marginLeft: 6, color: '#94a3b8' }}>— dt/ct талбарт данс хайна</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>dt (дебет данс)</span>
              <CoaInput value={manual.dt} onChange={v => setManual(m => ({ ...m, dt: v }))} placeholder="1,120..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>ct (кредит данс)</span>
              <CoaInput value={manual.ct} onChange={v => setManual(m => ({ ...m, ct: v }))} placeholder="2,021..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>код</span>
              <input className="z-input" placeholder="2,161..." value={manual.code}
                onChange={e => setManual(m => ({ ...m, code: e.target.value }))}
                style={{ width: 80, fontSize: 12 }} />
            </div>
            <button
              className="z-btn z-btn-primary z-btn-sm"
              style={{ marginLeft: 'auto', alignSelf: 'flex-end', marginBottom: 2 }}
              onClick={() => onApply(manual)}
              disabled={!manual.dt && !manual.ct && !manual.code}
            >
              <Check size={12} /> Хадгалах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [rows, setRows]               = useState([]);
  const [codes, setCodes]             = useState([]);
  const [codeRules, setCodeRules]     = useState([]);
  const [codeCombos, setCodeCombos]   = useState([]);
  const [rulePicker, setRulePicker]   = useState(null); // null | { rowId, description, dt, ct, code }
  const [startDate, setStart]         = useState('');
  const [endDate, setEnd]             = useState('');
  const [codeFilter, setCodeFilter]   = useState('');
  const [editing, setEditing]         = useState(null); // {id, field, value} — description only
  const [modal, setModal]             = useState(null);  // null | 'new' | 'import'
  const [form, setForm]               = useState(EMPTY);
  const [importRows, setImportRows]   = useState([]);
  const [importFilename, setImportFilename] = useState('');
  const [saving, setSaving]           = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    const [txs, cds] = await Promise.all([
      getTransactions({ startDate, endDate, code: codeFilter || undefined }),
      getTransactionCodes(),
    ]);
    setRows(txs);
    setCodes(cds);
  }, [startDate, endDate, codeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getCodeRules().then(setCodeRules).catch(() => {}); }, []);
  useEffect(() => { getCodeCombos().then(setCodeCombos).catch(() => {}); }, []);

  // ─── Inline edit ──────────────────────────────────────────────────────────
  const startEdit = (id, field, value) => setEditing({ id, field, value });

  const commitEdit = async () => {
    if (!editing) return;
    const updated = await updateTransaction(editing.id, { [editing.field]: editing.value });
    setRows(prev => prev.map(r => r._id === updated._id ? updated : r));
    // code хадгалахад дүрэм автоматаар үүсгэнэ
    if (editing.field === 'code' && editing.value && updated.description) {
      const kw = extractKeyword(updated.description);
      if (kw) {
        const rule = { keyword: kw, dt: updated.dt || '', ct: updated.ct || '', code: updated.code || '' };
        saveCodeRule(rule).then(saved => {
          setCodeRules(prev => {
            const exists = prev.find(r => r.keyword === kw);
            return exists ? prev.map(r => r.keyword === kw ? saved : r) : [...prev, saved];
          });
        }).catch(() => {});
      }
    }
    if (editing.field === 'code' && editing.value && !codes.includes(editing.value)) {
      setCodes(prev => [...prev, editing.value].sort());
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  // ─── RulePicker-ээс combo сонгоход 3 талбарыг нэгэн зэрэг хадгалах ──────
  const applyCombo = async (combo) => {
    if (!rulePicker) return;
    const { rowId, description } = rulePicker;
    const updated = await updateTransaction(rowId, { dt: combo.dt || '', ct: combo.ct || '', code: combo.code || '' });
    setRows(prev => prev.map(r => r._id === updated._id ? updated : r));

    // combo-г кодуудын жагсаалтад нэмэх
    const key = `${combo.dt}|${combo.ct}|${combo.code}`;
    setCodeCombos(prev => {
      const exists = prev.find(c => `${c.dt}|${c.ct}|${c.code}` === key);
      if (exists) return prev.map(c => `${c.dt}|${c.ct}|${c.code}` === key ? { ...c, count: c.count + 1 } : c);
      return [{ dt: combo.dt || '', ct: combo.ct || '', code: combo.code || '', count: 1, sample: description }, ...prev];
    });

    // дүрмийг санах (keyword → combo)
    const kw = extractKeyword(description);
    if (kw && (combo.dt || combo.ct)) {
      const rule = { keyword: kw, dt: combo.dt || '', ct: combo.ct || '', code: combo.code || '' };
      saveCodeRule(rule).then(saved => {
        setCodeRules(prev => {
          const exists = prev.find(r => r.keyword === kw);
          return exists ? prev.map(r => r.keyword === kw ? saved : r) : [...prev, saved];
        });
      }).catch(() => {});
    }

    setRulePicker(null);
  };

  const remove = async (id) => {
    if (!confirm('Устгах уу?')) return;
    await deleteTransaction(id);
    setRows(prev => prev.filter(r => r._id !== id));
  };

  // ─── Manual add ───────────────────────────────────────────────────────────
  const saveManual = async () => {
    setSaving(true);
    try {
      const tx = await createTransaction(form);
      setRows(prev => [...prev, tx].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setModal(null);
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  // ─── Огноо normalize ──────────────────────────────────────────────────────
  const normalizeDate = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const s = String(val).trim();
    // M/D/YYYY эсвэл MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [m, d, y] = s.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    // YYYY.MM.DD эсвэл DD.MM.YYYY
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s.replace(/\./g, '-');
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
      const [d, m, y] = s.split('.');
      return `${y}-${m}-${d}`;
    }
    return s.slice(0, 10);
  };

  // ─── Excel import ─────────────────────────────────────────────────────────
  const parseExcel = async (file) => {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // ── raw array уншина (header:1) — Голомт банк хуулга шиг тогтмол бус форматыг дэмжихийн тулд
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, header: 1 });

    const toNum = (v) => parseFloat(String(v).replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;

    // ── Голомт банк хуулга: Col0=огноо "YYYY.M.D ...", Col7=орлого, Col11=зарлага, Col28=утга
    const isGolomtDate = (v) => /^\d{4}\.\d{1,2}\.\d{1,2}/.test(String(v));
    const golomtRows = raw.filter(r => isGolomtDate(r[0]));

    if (golomtRows.length > 0) {
      return golomtRows.map(r => {
        // огноо: "2026.3.17  9:36:36 AM" → "2026-03-17"
        const parts = String(r[0]).split(/[\s,]+/)[0].split('.');
        const date = `${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
        const orlogo  = toNum(r[7]);
        const zarlaga = toNum(r[11]);
        const amount  = orlogo > 0 ? orlogo : zarlaga;
        const description = String(r[28] || r[23] || '').trim();
        return { date, amount, description, ...guessCode(description, codeRules) };
      }).filter(r => r.amount > 0 && r.date);
    }

    // ── Стандарт формат: эхний мөр header байна
    const headers = raw[0] || [];
    const data = raw.slice(1);
    const hi = (re) => headers.findIndex(h => re.test(String(h)));
    const dateIdx = hi(/огноо|date|өдөр/i) !== -1 ? hi(/огноо|date|өдөр/i) : 1;
    const amtIdx  = hi(/дүн|amount/i)      !== -1 ? hi(/дүн|amount/i)      : 2;
    const descIdx = hi(/утга|тайлбар|description/i) !== -1 ? hi(/утга|тайлбар|description/i) : 3;
    const dtIdx   = hi(/^dt$/i);
    const ctIdx   = hi(/^ct$/i);
    const codeIdx = hi(/код|code/i);
    // Орлого/зарлага тусдаа баганатай эсэх
    const inIdx  = hi(/орлого/i);
    const outIdx = hi(/зарлага/i);

    return data.map(r => {
      let amount;
      if (inIdx !== -1 && outIdx !== -1) {
        amount = toNum(r[inIdx]) || toNum(r[outIdx]);
      } else {
        amount = toNum(r[amtIdx]);
      }
      const description = String(r[descIdx] || '').trim();
      const hasManualCodes = dtIdx >= 0 && String(r[dtIdx]).trim();
      const autoCodes = hasManualCodes ? {} : guessCode(description, codeRules);
      return {
        date: normalizeDate(r[dateIdx]),
        amount,
        description,
        dt:   dtIdx   >= 0 ? String(r[dtIdx]).trim()   : (autoCodes.dt   || ''),
        ct:   ctIdx   >= 0 ? String(r[ctIdx]).trim()   : (autoCodes.ct   || ''),
        code: codeIdx >= 0 ? String(r[codeIdx]).trim() : (autoCodes.code || ''),
      };
    }).filter(r => r.date && r.amount > 0);
  };

  // ─── PDF import ───────────────────────────────────────────────────────────
  const parsePdf = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs', import.meta.url
    ).toString();

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const DATE_RE = /\b(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/;
    const AMT_RE  = /^-?[\d,]+\.\d{2}$/;

    const allItems = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // текст item-ийг Y байрлалаар бүлэглэнэ (мөр тус бүр)
      const byY = {};
      for (const item of content.items) {
        if (!item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!byY[y]) byY[y] = [];
        byY[y].push({ x: item.transform[4], str: item.str.trim() });
      }
      // Y-ийг буурах дарааллаар (дээрээс доош)
      const ySorted = Object.keys(byY).map(Number).sort((a, b) => b - a);
      for (const y of ySorted) {
        const line = byY[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ');
        allItems.push(line);
      }
    }

    // Мөр бүрийг задлах: огноо + дүн + тайлбар хайна
    const rows = [];
    for (const line of allItems) {
      const dateMatch = line.match(DATE_RE);
      if (!dateMatch) continue;
      const date = normalizeDate(dateMatch[1]);
      // дүнг хайна: тоо, таслал, цэг агуулсан
      const tokens = line.split(/\s+/);
      const amtToken = tokens.find(t => AMT_RE.test(t));
      if (!amtToken) continue;
      const amount = parseFloat(amtToken.replace(/,/g, ''));
      if (!amount || amount <= 0) continue;
      // тайлбар: огноо болон дүнгийн хооронд эсвэл хойно байгаа текст
      const dateIdx = tokens.indexOf(dateMatch[1]);
      const amtIdx  = tokens.indexOf(amtToken);
      const descTokens = tokens.filter((_, i) => i !== dateIdx && i !== amtIdx && !/^\d+$/.test(tokens[i]));
      const description = descTokens.join(' ').trim();
      rows.push({ date, amount, description, dt: '', ct: '', code: '' });
    }
    return rows;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      let parsed;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        parsed = await parsePdf(file);
      } else {
        parsed = await parseExcel(file);
      }
      setImportRows(parsed);
      setImportFilename(file.name);
    } catch (err) {
      alert('Файл уншихад алдаа: ' + err.message);
    }
    e.target.value = '';
  };

  const saveImport = async () => {
    setSaving(true);
    try {
      const source = importFilename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'excel';
      const res = await importTransactions({ rows: importRows, filename: importFilename, source });
      alert(`${res.inserted} мөр нэмэгдлээ, ${res.skipped} давхардал алгасав`);
      setModal(null);
      setImportRows([]);
      setImportFilename('');
      load();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  // ─── Totals ───────────────────────────────────────────────────────────────
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const Cell = ({ row, field, wide, center }) => {
    const isCodeField = field === 'dt' || field === 'ct' || field === 'code';
    const isEditing   = !isCodeField && editing?.id === row._id && editing?.field === field;
    const tdStyle     = { padding: '3px 6px', textAlign: center ? 'center' : 'left' };
    const coaName     = isCodeField && row[field] ? COA[row[field]] : null;

    // dt / ct / code — нэг дарахад RulePicker нээнэ
    if (isCodeField) {
      return (
        <td
          className="cursor-pointer hover:bg-blue-50 transition-colors"
          style={tdStyle}
          onClick={() => setRulePicker({ rowId: row._id, description: row.description || '', dt: row.dt || '', ct: row.ct || '', code: row.code || '' })}
          title={coaName ? `${row[field]}: ${coaName}` : 'Дарж кодлох'}
        >
          {row[field]
            ? <span>
                {row[field]}
                {coaName && <span style={{ fontSize: 9, color: '#94a3b8', display: 'block', lineHeight: 1.2 }}>{coaName}</span>}
              </span>
            : <span style={{ color: '#e2e8f0' }}>—</span>}
        </td>
      );
    }

    // description / бусад — double-click inline edit
    if (isEditing) return (
      <td style={{ ...tdStyle, minWidth: wide ? 180 : 80 }}>
        <div className="flex items-center gap-1">
          <input
            className="z-input"
            style={{ padding: '2px 5px', fontSize: 11, minWidth: wide ? 160 : 44 }}
            value={editing.value}
            autoFocus
            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          />
          <button className="z-btn z-btn-primary z-btn-sm" style={{ padding: '2px 4px' }} onClick={commitEdit}><Check size={10} /></button>
          <button className="z-btn z-btn-secondary z-btn-sm" style={{ padding: '2px 4px' }} onClick={cancelEdit}><X size={10} /></button>
        </div>
      </td>
    );
    return (
      <td
        className="cursor-pointer hover:bg-yellow-50 transition-colors"
        style={tdStyle}
        onDoubleClick={() => startEdit(row._id, field, row[field] || '')}
        title="Давхар дарж засах"
      >
        {row[field] ? <span>{row[field]}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
      </td>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="z-card flex flex-wrap items-end gap-3">
        <div>
          <label className="z-label">Эхлэх огноо</label>
          <input className="z-input" type="date" value={startDate} onChange={e => setStart(e.target.value)} style={{ width: 150 }} />
        </div>
        <div>
          <label className="z-label">Дуусах огноо</label>
          <input className="z-input" type="date" value={endDate} onChange={e => setEnd(e.target.value)} style={{ width: 150 }} />
        </div>
        <div>
          <label className="z-label">Код</label>
          <select className="z-select" value={codeFilter} onChange={e => setCodeFilter(e.target.value)} style={{ width: 130 }}>
            <option value="">Бүгд</option>
            {codes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <button className="z-btn z-btn-secondary" onClick={async () => {
            const res = await recodeTransactions();
            alert(`${res.updated} мөрт код тохируулагдлаа (нийт ${res.total} хоосон байсан)`);
            load();
          }}>
            ⚡ Дахин кодлох
          </button>
          <button className="z-btn z-btn-secondary" onClick={() => { setImportRows([]); setModal('import'); }}>
            <Upload size={14} /> Хуулга оруулах
          </button>
          <button className="z-btn z-btn-primary" onClick={() => { setForm(EMPTY); setModal('new'); }}>
            <Plus size={14} /> Гараар нэмэх
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="z-table-wrap">
        <table className="z-table" style={{ fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f6fb' }}>
              <th style={{ width: 30, padding: '5px 6px' }}>№</th>
              <th style={{ width: 82, padding: '5px 8px' }}>Огноо</th>
              <th style={{ width: 110, padding: '5px 8px', textAlign: 'right' }}>Дүн /₮/</th>
              <th style={{ padding: '5px 8px' }}>Гүйлгээний утга</th>
              <th style={{ width: 56, padding: '5px 8px', textAlign: 'center' }}>dt</th>
              <th style={{ width: 56, padding: '5px 8px', textAlign: 'center' }}>ct</th>
              <th style={{ width: 56, padding: '5px 8px', textAlign: 'center' }}>Код</th>
              <th style={{ width: 28 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Гүйлгээ байхгүй</td></tr>
            )}
            {rows.map((r, i) => {
              const uncoded = !r.code && !r.dt && !r.ct;
              return (
              <tr key={r._id} style={{ borderTop: '1px solid #e2e8f0', background: uncoded ? '#fffbeb' : undefined }}>
                <td style={{ padding: '3px 6px', color: '#94a3b8', textAlign: 'center' }}>
                  {uncoded
                    ? <AlertTriangle
                        size={11}
                        className="text-yellow-500 mx-auto cursor-pointer"
                        title="Дарж кодлох"
                        onClick={() => setRulePicker({ rowId: r._id, description: r.description || '', dt: r.dt || '', ct: r.ct || '', code: r.code || '' })}
                      />
                    : i + 1}
                </td>
                <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.amount)}</td>
                <Cell row={r} field="description" wide />
                <Cell row={r} field="dt" center />
                <Cell row={r} field="ct" center />
                <Cell row={r} field="code" center />
                <td style={{ padding: '2px 4px' }}>
                  <button className="z-btn z-btn-danger z-btn-sm" style={{ padding: '2px 5px' }} onClick={() => remove(r._id)}>
                    <Trash2 size={10} />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #cbd8e6', background: '#f8fafc' }}>
              <td colSpan={2} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569' }}>Нийт дүн:</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(total)}</td>
              <td colSpan={5} style={{ padding: '5px 8px', fontSize: 11, color: '#94a3b8' }}>{rows.length} мөр</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Manual entry modal */}
      {modal === 'new' && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="z-modal">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Гүйлгээ гараар нэмэх</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-3">
              <div className="z-grid-2">
                <div><label className="z-label">Огноо</label><input className="z-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label className="z-label">Дүн (₮)</label><input className="z-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
              </div>
              <div><label className="z-label">Гүйлгээний утга</label><input className="z-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="z-grid-3">
                <div><label className="z-label">dt</label><input className="z-input" value={form.dt} onChange={e => setForm(f => ({ ...f, dt: e.target.value }))} /></div>
                <div><label className="z-label">ct</label><input className="z-input" value={form.ct} onChange={e => setForm(f => ({ ...f, ct: e.target.value }))} /></div>
                <div><label className="z-label">Код</label><input className="z-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
              </div>
              <div><label className="z-label">Гүйлгээний дугаар</label><input className="z-input" value={form.bankReference} onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))} /></div>
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={() => setModal(null)}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={saveManual} disabled={saving}>{saving ? '...' : 'Нэмэх'}</button>
            </div>
          </div>
        </div>
      )}

      {/* RulePicker modal */}
      {rulePicker && (
        <RulePicker
          row={{ _id: rulePicker.rowId, description: rulePicker.description, dt: rulePicker.dt, ct: rulePicker.ct, code: rulePicker.code }}
          combos={codeCombos}
          codeRules={codeRules}
          onApply={applyCombo}
          onClose={() => setRulePicker(null)}
        />
      )}

      {/* Import modal */}
      {modal === 'import' && (
        <div className="z-modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="z-modal z-modal-lg">
            <div className="z-modal-head">
              <h3 className="font-bold text-slate-800">Банкны хуулга оруулах</h3>
              <button className="z-btn z-btn-secondary z-btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="z-modal-body flex flex-col gap-4">
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">Excel (.xlsx, .xls) эсвэл PDF файл сонгох</p>
                <p className="text-xs text-slate-400 mt-1">Давхардсан мөрүүдийг автоматаар алгасна</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf" className="hidden" onChange={handleFile} />
              </div>

              {importRows.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-green-700 mb-2">{importRows.length} мөр илрүүллээ:</p>
                  <div className="z-table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table className="z-table" style={{ fontSize: 11 }}>
                      <thead>
                        <tr><th>Огноо</th><th>Дүн</th><th>Гүйлгээний утга</th><th>dt</th><th>ct</th><th>Код</th></tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i}>
                            <td>{r.date}</td>
                            <td className="font-semibold text-right">{fmt(r.amount)}</td>
                            <td>{r.description}</td>
                            <td>{r.dt}</td>
                            <td>{r.ct}</td>
                            <td>{r.code}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="z-modal-foot">
              <button className="z-btn z-btn-secondary" onClick={() => setModal(null)}>Болих</button>
              <button className="z-btn z-btn-primary" onClick={saveImport} disabled={saving || importRows.length === 0}>
                {saving ? '...' : `${importRows.length} мөр оруулах`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
