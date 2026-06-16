import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getTransactions, getTransactionCodes, createTransaction,
  importTransactions, updateTransaction, deleteTransaction,
  fmt, fmtDate,
} from '../api';
import { Upload, Plus, Trash2, X, Check, Filter } from 'lucide-react';

const EMPTY = { date: new Date().toISOString().slice(0, 10), amount: '', description: '', dt: '', ct: '', code: '', bankReference: '' };

export default function Transactions() {
  const [rows, setRows]           = useState([]);
  const [codes, setCodes]         = useState([]);
  const [startDate, setStart]     = useState(new Date().toISOString().slice(0, 8) + '01');
  const [endDate, setEnd]         = useState(new Date().toISOString().slice(0, 10));
  const [codeFilter, setCodeFilter] = useState('');
  const [editing, setEditing]     = useState(null); // {id, field, value}
  const [modal, setModal]         = useState(null);  // null | 'new' | 'import'
  const [form, setForm]           = useState(EMPTY);
  const [importRows, setImportRows] = useState([]);
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

  // ─── Inline edit ──────────────────────────────────────────────────────────
  const startEdit = (id, field, value) => setEditing({ id, field, value });

  const commitEdit = async () => {
    if (!editing) return;
    const updated = await updateTransaction(editing.id, { [editing.field]: editing.value });
    setRows(prev => prev.map(r => r._id === updated._id ? updated : r));
    // кодын жагсаалт шинэчлэх
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
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    return raw.map(r => {
      const keys = Object.keys(r);
      const dateKey = keys.find(k => /огноо|date|өдөр/i.test(k)) || keys[1];
      const amtKey  = keys.find(k => /дүн|amount|зарлага|орлого|мөнгөн/i.test(k)) || keys[2];
      const descKey = keys.find(k => /утга|тайлбар|description/i.test(k)) || keys[3];
      const dtKey   = keys.find(k => /^dt$/i.test(k));
      const ctKey   = keys.find(k => /^ct$/i.test(k));
      const codeKey = keys.find(k => /код|code/i.test(k));

      const amt = parseFloat(String(r[amtKey] || '').replace(/[^0-9.-]/g, '')) || 0;
      return {
        date: normalizeDate(r[dateKey]),
        amount: amt,
        description: String(r[descKey] || '').trim(),
        dt:   dtKey   ? String(r[dtKey]).trim()   : '',
        ct:   ctKey   ? String(r[ctKey]).trim()   : '',
        code: codeKey ? String(r[codeKey]).trim() : '',
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
    } catch (err) {
      alert('Файл уншихад алдаа: ' + err.message);
    }
    e.target.value = '';
  };

  const saveImport = async () => {
    setSaving(true);
    try {
      const res = await importTransactions({ rows: importRows });
      alert(`${res.inserted} мөр нэмэгдлээ, ${res.skipped} давхардал алгасав`);
      setModal(null);
      setImportRows([]);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Алдаа'); }
    finally { setSaving(false); }
  };

  // ─── Totals ───────────────────────────────────────────────────────────────
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const Cell = ({ row, field, wide }) => {
    const isEditing = editing?.id === row._id && editing?.field === field;
    if (isEditing) return (
      <td style={{ padding: '4px 6px', minWidth: wide ? 180 : 80 }}>
        <div className="flex items-center gap-1">
          <input
            className="z-input text-xs"
            style={{ padding: '4px 6px', minWidth: wide ? 160 : 60 }}
            value={editing.value}
            autoFocus
            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          />
          <button className="z-btn z-btn-primary z-btn-sm p-1" onClick={commitEdit}><Check size={11} /></button>
          <button className="z-btn z-btn-secondary z-btn-sm p-1" onClick={cancelEdit}><X size={11} /></button>
        </div>
      </td>
    );
    return (
      <td
        className="cursor-pointer hover:bg-yellow-50 transition-colors"
        style={{ padding: '10px 14px' }}
        onDoubleClick={() => startEdit(row._id, field, row[field] || '')}
        title="Давхар дарж засах"
      >
        {row[field] || <span className="text-slate-300 text-xs">—</span>}
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
        <div className="flex gap-2 ml-auto">
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
        <table className="z-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>№</th>
              <th style={{ width: 96 }}>Огноо</th>
              <th style={{ width: 120 }}>Дүн /₮/</th>
              <th>Гүйлгээний утга</th>
              <th style={{ width: 70 }}>dt</th>
              <th style={{ width: 70 }}>ct</th>
              <th style={{ width: 80 }}>Код</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-400 py-10">Гүйлгээ байхгүй</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r._id}>
                <td className="text-slate-400 text-center">{i + 1}</td>
                <td>{fmtDate(r.date)}</td>
                <td className="font-semibold text-right">{fmt(r.amount)}</td>
                <Cell row={r} field="description" wide />
                <Cell row={r} field="dt" />
                <Cell row={r} field="ct" />
                <Cell row={r} field="code" />
                <td>
                  <button className="z-btn z-btn-danger z-btn-sm p-1" onClick={() => remove(r._id)}>
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right font-bold text-slate-600 px-3 py-2 text-xs">Нийт дүн:</td>
              <td className="font-bold text-slate-800 text-right px-3 py-2">{fmt(total)}</td>
              <td colSpan={5} className="text-xs text-slate-400 px-3">{rows.length} мөр</td>
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
