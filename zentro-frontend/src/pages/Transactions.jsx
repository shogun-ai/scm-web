import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getTransactions, getTransactionCodes, createTransaction,
  importTransactions, updateTransaction, deleteTransaction, recodeTransactions,
  getCodeRules, saveCodeRule,
  fmt, fmtDate,
} from '../api';
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

  // эхлээд хэрэглэгчийн хадгалсан дүрмүүдийг шалгана
  for (const rule of customRules) {
    if (rule.keyword && dl.includes(rule.keyword.toLowerCase())) {
      return { dt: rule.dt || '', ct: rule.ct || '', code: rule.code || '' };
    }
  }

  const isOrg = /солонго капитал|ббсб|хк|ххк|зохион байгуул/i.test(d);
  if (isOrg) {
    if (/хүр\.?тооц.*хүү|хүр\.?тооц.*зээл/i.test(d)) return { dt: '2,024', ct: '1,120', code: '2,126' };
    if (/зээлийн хүү|хүү төлев/i.test(d))             return { dt: '5,121', ct: '1,120', code: '2,126' };
    if (/зээлааc|зээлэac|зээлээс/i.test(d))           return { dt: '2,021', ct: '1,120', code: '2,163' };
  }
  if (/зээл олгов|зээл олгол/i.test(d))               return { dt: '1,120', ct: '2,021', code: '2,161' };
  if (/хүр\.?тооц.*хүү|хүр\.?тооц.*зээл/i.test(d))   return { dt: '1,120', ct: '1,270', code: '2,101' };
  if (/зээлийн хүү|хүү төлев/i.test(d))               return { dt: '1,120', ct: '4,140', code: '2,101' };
  if (/зээлааc|зээлэac|зээлээс/i.test(d))             return { dt: '1,120', ct: '1,210', code: '2,104' };
  if (/шимтгэл/i.test(d))                             return { dt: '5,248', ct: '1,120', code: '2,129' };
  if (/мзуаэ/i.test(d))                               return { dt: '5,228', ct: '1,120', code: '2,129' };
  if (/аудит/i.test(d))                               return { dt: '5,236', ct: '1,120', code: '2,129' };
  if (/сургалт/i.test(d))                             return { dt: '5,228', ct: '1,120', code: '2,129' };
  return { dt: '', ct: '', code: '' };
}

export default function Transactions() {
  const [rows, setRows]           = useState([]);
  const [codes, setCodes]         = useState([]);
  const [codeRules, setCodeRules] = useState([]);
  const [startDate, setStart]     = useState('');
  const [endDate, setEnd]         = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [editing, setEditing]     = useState(null); // {id, field, value}
  const [modal, setModal]         = useState(null);  // null | 'new' | 'import'
  const [form, setForm]           = useState(EMPTY);
  const [importRows, setImportRows] = useState([]);
  const [importFilename, setImportFilename] = useState('');
  const [saving, setSaving]       = useState(false);
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
    const isEditing = editing?.id === row._id && editing?.field === field;
    const tdStyle = { padding: '3px 6px', textAlign: center ? 'center' : 'left' };
    if (isEditing) return (
      <td style={{ ...tdStyle, minWidth: wide ? 180 : 60 }}>
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
        {row[field] || <span style={{ color: '#cbd5e1' }}>—</span>}
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
                    ? <AlertTriangle size={11} className="text-yellow-500 mx-auto" title="Код тохируулаагүй байна — гараар оруулах эсвэл ⚡ дарна уу" />
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
