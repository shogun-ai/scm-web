import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  Save,
  UploadCloud,
  UserCheck,
  X,
} from 'lucide-react';

const HEADER_ALIASES = {
  borrowerName: ['borrowername', 'customername', 'clientname', 'name', 'hariltsagch', 'zeeldegch', 'ovogner'],
  regNo: ['regno', 'registernumber', 'registrationnumber', 'register', 'rd', 'registernum', 'registerid'],
  loanId: ['loanid', 'contractno', 'contractnumber', 'accountno', 'accountnumber', 'loanaccount', 'exposureid', 'zeeliindugaar', 'gereeniidugaar'],
  productName: ['product', 'productname', 'loantype', 'facilitytype', 'zeeliintorol'],
  branch: ['branch', 'branchname', 'salbar'],
  loanOfficer: ['loanofficer', 'officer', 'officername', 'relationshipmanager', 'rm', 'owner', 'ajiltan', 'ediinzasagch'],
  phone: ['phone', 'mobileno', 'phonenumber', 'utas'],
  collateral: ['collateral', 'collateraltype', 'baritsaa'],
  currency: ['currency', 'ccy', 'valut'],
  outstandingBalance: ['outstandingbalance', 'balance', 'principalbalance', 'currentbalance', 'eodbalance', 'uldegdel'],
  overdueAmount: ['overdueamount', 'pastdueamount', 'arrearsamount', 'nplamount', 'hetersendun'],
  overdueDays: ['overduedays', 'daysoverdue', 'dayspastdue', 'dpd', 'hetersenhonog', 'honog'],
  classification: ['classification', 'stage', 'qualityclass', 'statusclass', 'angilal', 'chanar'],
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'promise_to_pay', label: 'Promise to pay' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'legal', label: 'Legal' },
  { value: 'resolved', label: 'Resolved' },
];

const PREVIEW_COLUMNS = [
  { key: 'regNo', label: 'Регистр' },
  { key: 'borrowerName', label: 'Зээлдэгч' },
  { key: 'loanId', label: 'Зээл' },
  { key: 'productName', label: 'Бүтээгдэхүүн' },
  { key: 'loanOfficer', label: 'Эдийн засагч' },
  { key: 'overdueDays', label: 'DPD' },
  { key: 'overdueAmount', label: 'Хэвийн болгох дүн' },
  { key: 'outstandingBalance', label: 'Үлдэгдэл' },
  { key: 'classification', label: 'Ангилал' },
];

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[\s_\-./()]+/g, '');

const asNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? '')
    .replace(/\(([^)]+)\)/g, '-$1')
    .replace(/[^0-9,.-]/g, '')
    .replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanText = (value) => String(value ?? '').trim();
const extractReportDate = (value) => {
  const text = cleanText(value);
  const match = text.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const buildCaseKey = (regNo, loanId, borrowerName) => [regNo, loanId, borrowerName].filter(Boolean).join('::');

const deriveClassification = (classification, overdueDays) => {
  const explicit = cleanText(classification);
  if (explicit) return explicit;
  if (overdueDays <= 0) return 'Current';
  if (overdueDays <= 30) return 'Attention';
  if (overdueDays <= 90) return 'Substandard';
  if (overdueDays <= 180) return 'Doubtful';
  return 'Loss';
};

const deriveBucket = (days) => {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
};

const normalizeExposureRow = (rawRow) => {
  const normalizedRow = Object.entries(rawRow || {}).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  const getCandidateValue = (aliases) => {
    for (const alias of aliases) {
      const exactKey = Object.keys(normalizedRow).find((key) => key === alias);
      if (exactKey && normalizedRow[exactKey] !== '') return normalizedRow[exactKey];
    }
    for (const alias of aliases) {
      const containsKey = Object.keys(normalizedRow).find((key) => key.includes(alias) || alias.includes(key));
      if (containsKey && normalizedRow[containsKey] !== '') return normalizedRow[containsKey];
    }
    return '';
  };

  const borrowerName = cleanText(getCandidateValue(HEADER_ALIASES.borrowerName));
  const regNo = cleanText(getCandidateValue(HEADER_ALIASES.regNo));
  const loanId = cleanText(getCandidateValue(HEADER_ALIASES.loanId));
  const overdueDays = Math.max(0, Math.round(asNumber(getCandidateValue(HEADER_ALIASES.overdueDays))));
  const overdueAmount = Math.max(0, asNumber(getCandidateValue(HEADER_ALIASES.overdueAmount)));
  const outstandingBalance = Math.max(0, asNumber(getCandidateValue(HEADER_ALIASES.outstandingBalance)));
  const classification = deriveClassification(getCandidateValue(HEADER_ALIASES.classification), overdueDays);
  const isOverdue = overdueDays > 0 || overdueAmount > 0;

  return {
    borrowerName,
    regNo,
    loanId,
    productName: cleanText(getCandidateValue(HEADER_ALIASES.productName)),
    branch: cleanText(getCandidateValue(HEADER_ALIASES.branch)),
    loanOfficer: cleanText(getCandidateValue(HEADER_ALIASES.loanOfficer)),
    phone: cleanText(getCandidateValue(HEADER_ALIASES.phone)),
    collateral: cleanText(getCandidateValue(HEADER_ALIASES.collateral)),
    currency: cleanText(getCandidateValue(HEADER_ALIASES.currency)) || 'MNT',
    interestRate: 0,
    startDate: '',
    endDate: '',
    originalAmount: 0,
    principalDebt: 0,
    interestDebt: 0,
    regularizationAmount: overdueAmount,
    contactNote: '',
    lastContactDate: '',
    outstandingBalance,
    overdueAmount,
    overdueDays,
    classification,
    overdueBucket: deriveBucket(overdueDays),
    isOverdue,
    caseKey: buildCaseKey(regNo, loanId, borrowerName),
  };
};

const isMeaningfulExposureRow = (row) => (
  Boolean(row.caseKey) &&
  (Boolean(row.borrowerName) || Boolean(row.regNo) || Boolean(row.loanId)) &&
  (row.outstandingBalance > 0 || row.overdueAmount > 0 || row.overdueDays > 0)
);

const parseSampleExposureRows = (matrix) => {
  const reportDate = extractReportDate(matrix?.[0]?.[14]);
  const rows = [];

  for (let rowIndex = 3; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const orderNo = cleanText(row[0]);
    const regNo = cleanText(row[1]);
    const lastName = cleanText(row[2]);
    const firstName = cleanText(row[3]);
    const borrowerName = [lastName, firstName].filter(Boolean).join(' ');
    if (!/^\d+$/.test(orderNo) || !regNo || !borrowerName) continue;

    const productCell = cleanText(row[12]);
    const officerCell = cleanText(row[13]);
    const loanId = productCell.match(/^([A-Z0-9]+)/i)?.[1] || productCell;
    const productName = productCell.includes(' - ') ? productCell.split(' - ').slice(1).join(' - ').trim() : productCell;
    const principalDebt = Math.max(0, asNumber(row[10]));
    const interestDebt = Math.max(0, asNumber(row[11]));
    const regularizationAmount = Math.max(0, asNumber(row[14]));
    const overdueDays = Math.max(0, Math.round(asNumber(row[7])));

    rows.push({
      borrowerName,
      regNo,
      loanId,
      productName,
      branch: '',
      loanOfficer: officerCell.includes(' - ') ? officerCell.split(' - ').slice(1).join(' - ').trim() : officerCell,
      phone: '',
      collateral: '',
      currency: 'MNT',
      interestRate: asNumber(row[4]),
      startDate: cleanText(row[5]),
      endDate: cleanText(row[6]),
      originalAmount: Math.max(0, asNumber(row[8])),
      principalDebt,
      interestDebt,
      regularizationAmount,
      contactNote: cleanText(row[16]),
      lastContactDate: cleanText(row[17]),
      outstandingBalance: Math.max(0, asNumber(row[9])),
      overdueAmount: regularizationAmount || (principalDebt + interestDebt),
      overdueDays,
      classification: deriveClassification(row[15], overdueDays),
      overdueBucket: deriveBucket(overdueDays),
      isOverdue: overdueDays > 0 || regularizationAmount > 0 || principalDebt > 0 || interestDebt > 0,
      caseKey: buildCaseKey(regNo, loanId, borrowerName),
    });
  }

  return { reportDate, rows };
};

const parseExposureWorkbook = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const looksLikeSampleFormat = cleanText(matrix?.[1]?.[0]) === 'Д/д' && cleanText(matrix?.[1]?.[1]).includes('Зээлдэгчийн');

  if (looksLikeSampleFormat) {
    const parsed = parseSampleExposureRows(matrix);
    return {
      sheetName,
      reportDate: parsed.reportDate,
      rows: parsed.rows.filter((row) => row.caseKey && row.isOverdue),
      previewRows: parsed.rows,
    };
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  const normalizedRows = rawRows.map(normalizeExposureRow).filter(isMeaningfulExposureRow);
  return {
    sheetName,
    reportDate: '',
    rows: normalizedRows.filter((row) => row.isOverdue),
    previewRows: normalizedRows,
  };
};

const formatMoney = (value, currency = 'MNT') => {
  const symbol = currency || 'MNT';
  return `${new Intl.NumberFormat('mn-MN').format(Math.round(Number(value || 0)))} ${symbol}`;
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('mn-MN') : '-';
const formatShortDate = (value) => value ? new Date(value).toLocaleDateString('mn-MN') : '-';

const toMeasuresText = (value) => Array.isArray(value) ? value.join('\n') : String(value || '');

const getStatusMeta = (status) => {
  const map = {
    open: { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-100' },
    monitoring: { label: 'Monitoring', className: 'bg-amber-50 text-amber-700 border-amber-100' },
    promise_to_pay: { label: 'Promise to pay', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    escalation: { label: 'Escalation', className: 'bg-orange-50 text-orange-700 border-orange-100' },
    legal: { label: 'Legal', className: 'bg-rose-50 text-rose-700 border-rose-100' },
    resolved: { label: 'Resolved', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  };
  return map[status] || map.open;
};

const LoanExposureMonitor = ({ apiUrl, usersList = [] }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [monitorData, setMonitorData] = useState({ snapshot: null, currentCases: [], newlyOverdueCases: [], history: [] });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const loadLatest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${apiUrl}/api/exposure-monitor/latest`);
      setMonitorData({
        snapshot: res.data?.snapshot || null,
        currentCases: res.data?.currentCases || [],
        newlyOverdueCases: res.data?.newlyOverdueCases || [],
        history: res.data?.history || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Exposure monitor load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    (monitorData.currentCases || []).forEach((item) => {
      nextDrafts[item._id] = {
        assigneeUserId: item.assignee?.userId || '',
        assigneeName: item.assignee?.name || '',
        status: item.status || 'open',
        actionMeasures: toMeasuresText(item.actionMeasures),
        actionPlan: item.actionPlan || '',
        notes: item.notes || '',
      };
    });
    setDrafts(nextDrafts);
  }, [monitorData.currentCases]);

  const filteredCases = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) return monitorData.currentCases || [];
    return (monitorData.currentCases || []).filter((item) => (
      [item.borrowerName, item.regNo, item.loanId, item.productName, item.loanOfficer, item.assignee?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    ));
  }, [deferredSearch, monitorData.currentCases]);

  const setDraftValue = (caseId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [caseId]: {
        ...prev[caseId],
        [key]: value,
      },
    }));
  };

  const appendRecommendedAction = (caseId, action) => {
    const existing = drafts[caseId]?.actionMeasures || '';
    const parts = existing.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (parts.includes(action)) return;
    setDraftValue(caseId, 'actionMeasures', [...parts, action].join('\n'));
  };

  const handleFilePick = async (file) => {
    setSelectedFile(file || null);
    setLocalPreview(null);
    setError('');
    if (!file) return;
    try {
      const parsed = await parseExposureWorkbook(file);
      setLocalPreview(parsed);
      if (parsed.reportDate) setReportDate(parsed.reportDate);
    } catch (err) {
      setError(err.message || 'Excel file parse hiij chadsangui.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Excel file songono uu.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const parsed = localPreview || await parseExposureWorkbook(selectedFile);
      if (!parsed.rows.length) {
        throw new Error('File dotor compare hiih zohikh mor ilersen alga.');
      }
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('reportDate', reportDate || '');
      formData.append('detectedReportDate', parsed.reportDate || '');
      formData.append('snapshotLabel', reportDate || parsed.reportDate || new Date().toISOString().slice(0, 10));
      formData.append('sourceFileName', selectedFile.name);
      formData.append('sheetName', parsed.sheetName || '');
      formData.append('rows', JSON.stringify(parsed.rows));

      const res = await axios.post(`${apiUrl}/api/exposure-monitor/snapshots`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMonitorData({
        snapshot: res.data?.snapshot || null,
        currentCases: res.data?.currentCases || [],
        newlyOverdueCases: res.data?.newlyOverdueCases || [],
        history: res.data?.history || [],
      });
      setSelectedFile(null);
      setLocalPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Excel upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const openSnapshotPreview = async (snapshotId) => {
    if (!snapshotId) return;
    setPreviewing(true);
    setError('');
    try {
      const res = await axios.get(`${apiUrl}/api/exposure-monitor/snapshots/${snapshotId}`);
      setPreviewSnapshot(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Snapshot preview failed.');
    } finally {
      setPreviewing(false);
    }
  };

  const saveCase = async (item) => {
    const draft = drafts[item._id];
    if (!draft) return;

    setSavingId(item._id);
    setError('');
    try {
      const assignee = usersList.find((user) => user._id === draft.assigneeUserId);
      const payload = {
        assignee: draft.assigneeUserId ? {
          userId: assignee?._id || draft.assigneeUserId,
          name: assignee?.name || draft.assigneeName || '',
        } : {
          userId: '',
          name: draft.assigneeName || '',
        },
        status: draft.status,
        actionMeasures: draft.actionMeasures,
        actionPlan: draft.actionPlan,
        notes: draft.notes,
      };
      const res = await axios.put(`${apiUrl}/api/exposure-monitor/cases/${item._id}`, payload);
      setMonitorData((prev) => {
        const nextCases = (prev.currentCases || [])
          .map((current) => current._id === item._id ? res.data : current)
          .filter((current) => current.isCurrentOverdue !== false);
        return {
          ...prev,
          currentCases: nextCases,
          newlyOverdueCases: nextCases.filter((current) => current.isNewlyOverdue),
        };
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Case save failed.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-[28px] p-5 md:p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A651]">Exposure Monitor</p>
            <h3 className="text-xl font-bold text-[#003B5C]">Loan exposure file upload</h3>
            <p className="text-sm text-slate-500 mt-1">
              Огноо оруулаад Excel файлаа хадгална. Өмнөх файл байвал түүнтэй харьцуулна, байхгүй бол зүгээр snapshot хэлбэрээр хадгална.
            </p>
          </div>
          <button
            onClick={loadLatest}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Шинэчлэх
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[180px,1fr,auto] gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Тайлангийн огноо</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C]"
            />
          </label>

          <label className="border-2 border-dashed rounded-2xl px-4 py-4 flex items-center gap-3 cursor-pointer hover:border-[#003B5C]">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#003B5C] truncate">
                {selectedFile ? selectedFile.name : 'Loan exposure Excel file сонгох'}
              </p>
              <p className="text-xs text-slate-400">`.xlsx`, `.xls` file. Сонгоход эхлээд parse хийж preview гаргана.</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="inline-flex items-center justify-center gap-2 bg-[#003B5C] text-white px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Save snapshot
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat
            label="Compare base"
            value={monitorData.history?.[0]?.reportDate || monitorData.history?.[0]?.snapshotLabel || 'First upload'}
            hint={monitorData.history?.length ? 'Latest snapshot-tai compare hiine' : 'Compare hiih umnuh snapshot alga'}
          />
          <MiniStat
            label="Local preview"
            value={localPreview ? `${localPreview.rows.length} overdue rows` : 'File songoogui'}
            hint={localPreview ? `${localPreview.sheetName || '-'} sheet` : 'Excel songohod parse hiisen ur dun end garna'}
          />
          <MiniStat
            label="Status"
            value={uploading ? 'Saving...' : selectedFile ? 'Ready to save' : 'Waiting'}
            hint={localPreview?.reportDate ? `Detected report date: ${localPreview.reportDate}` : 'Report date-g garaar oorchilj bolno'}
          />
        </div>

        {localPreview && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-[24px] p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="font-bold text-[#003B5C]">Файл уншигдлаа</p>
                <p className="text-sm text-slate-600">
                  Sheet: <b>{localPreview.sheetName}</b> {' · '}
                  Detected report date: <b>{localPreview.reportDate || '-'}</b> {' · '}
                  Parsed overdue rows: <b>{localPreview.rows.length}</b>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot({
                    snapshotLabel: reportDate || localPreview.reportDate || 'Local preview',
                    reportDate: reportDate || localPreview.reportDate || '',
                    sourceFileName: selectedFile?.name || '',
                    rows: localPreview.previewRows || localPreview.rows || [],
                  })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-blue-200 text-sm font-semibold text-[#003B5C] hover:bg-slate-50"
                >
                  <Eye size={15} />
                  Preview
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center justify-center gap-2 bg-[#003B5C] text-white px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                  Snapshot хадгалах
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {monitorData.snapshot && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            { label: 'Latest report date', value: monitorData.snapshot.reportDate || monitorData.snapshot.snapshotLabel || '-', tone: 'bg-blue-50 text-blue-700' },
            { label: 'Current overdue', value: monitorData.snapshot.summary?.overdueLoans || 0, tone: 'bg-red-50 text-red-700' },
            { label: 'New overdue', value: monitorData.snapshot.summary?.newlyOverdueCount || 0, tone: 'bg-amber-50 text-amber-700' },
            { label: 'Overdue amount', value: formatMoney(monitorData.snapshot.summary?.overdueAmount || 0), tone: 'bg-orange-50 text-orange-700' },
            { label: 'Outstanding balance', value: formatMoney(monitorData.snapshot.summary?.overdueBalance || 0), tone: 'bg-emerald-50 text-emerald-700' },
          ].map((item) => (
            <div key={item.label} className={`border rounded-2xl p-4 ${item.tone}`}>
              <p className="text-[11px] uppercase font-bold opacity-70 mb-2">{item.label}</p>
              <p className="text-2xl font-black break-words">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {monitorData.snapshot && (
        <div className="bg-white border rounded-2xl p-4 text-sm text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>
            Last upload: <b className="text-[#003B5C]">{formatDateTime(monitorData.snapshot.createdAt)}</b>
          </span>
          <span>
            Source file: <b className="text-[#003B5C]">{monitorData.snapshot.sourceFileName || '-'}</b>
          </span>
          <span>
            Previous snapshot: <b className="text-[#003B5C]">{monitorData.snapshot.comparison?.previousSnapshotLabel || '-'}</b>
          </span>
        </div>
      )}

      {!!monitorData.history?.length && (
        <div className="bg-white border rounded-[28px] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b bg-slate-50 flex items-center gap-2">
            <History size={16} className="text-[#003B5C]" />
            <div>
              <p className="font-bold text-[#003B5C]">Uploaded files history</p>
              <p className="text-xs text-slate-500">Өмнө оруулсан файлууд хадгалагдана. Preview болон download хийж болно.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-3 text-left">Report date</th>
                  <th className="p-3 text-left">File</th>
                  <th className="p-3 text-right">Overdue</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Compare base</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monitorData.history.map((item) => (
                  <tr key={item._id}>
                    <td className="p-3">
                      <div className="font-bold text-[#003B5C]">{item.reportDate || item.snapshotLabel || '-'}</div>
                      <div className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{item.sourceFileName || '-'}</div>
                      <div className="text-xs text-slate-400">{item.sheetName || '-'}</div>
                    </td>
                    <td className="p-3 text-right font-black text-red-600">{item.summary?.overdueLoans || 0}</td>
                    <td className="p-3 text-right font-bold">{formatMoney(item.summary?.overdueAmount || 0)}</td>
                    <td className="p-3 text-slate-600">{item.comparison?.previousSnapshotLabel || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSnapshotPreview(item._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100"
                        >
                          <Eye size={13} />
                          Preview
                        </button>
                        <a
                          href={item.fileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs ${
                            item.fileUrl ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 pointer-events-none'
                          }`}
                        >
                          <Download size={13} />
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!monitorData.newlyOverdueCases?.length && (
        <div className="bg-white border rounded-[28px] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b bg-amber-50 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-700" />
            <div>
              <p className="font-bold text-amber-800">Newly overdue borrowers</p>
              <p className="text-xs text-amber-700">Umnukh snapshot-tai haritsuulahad shineer hetrelteer orj irsen case-uud.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-3 text-left">Borrower</th>
                  <th className="p-3 text-left">Loan</th>
                  <th className="p-3 text-left">Officer</th>
                  <th className="p-3 text-right">DPD</th>
                  <th className="p-3 text-right">Overdue</th>
                  <th className="p-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monitorData.newlyOverdueCases.map((item) => (
                  <tr key={item._id}>
                    <td className="p-3">
                      <div className="font-bold text-[#003B5C]">{item.borrowerName || '-'}</div>
                      <div className="text-xs text-slate-400">{item.regNo || '-'}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{item.loanId || '-'}</div>
                      <div className="text-xs text-slate-400">{item.productName || '-'}</div>
                    </td>
                    <td className="p-3 text-slate-600">{item.loanOfficer || '-'}</td>
                    <td className="p-3 text-right font-black text-red-600">{item.currentOverdueDays || 0}</td>
                    <td className="p-3 text-right font-bold">{formatMoney(item.currentOverdueAmount, item.currency)}</td>
                    <td className="p-3 text-right font-bold">{formatMoney(item.currentOutstandingBalance, item.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-[28px] p-5 md:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-bold text-[#003B5C] text-lg">Current overdue list</p>
            <p className="text-sm text-slate-500">Нэг кейс дээр төвлөрч assign, action plan, note-оо хадгалдаг байдлаар цэгцэллээ.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Open: {monitorData.currentCases?.length || 0}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              New: {monitorData.newlyOverdueCases?.length || 0}
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Borrower / reg / loan / officer..."
              className="w-full md:w-80 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400">
            <Loader2 size={20} className="animate-spin inline-block mr-2" />
            Loading exposure monitor...
          </div>
        ) : !filteredCases.length ? (
          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 py-14 text-center text-emerald-700">
            <CheckCircle2 size={22} className="inline-block mr-2 text-green-600" />
            Current overdue case alga.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCases.map((item, index) => {
              const draft = drafts[item._id] || {};
              return (
                <div key={item._id} className="border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                  <div className="px-4 py-4 bg-slate-50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#003B5C] text-white flex items-center justify-center font-black text-sm">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[#003B5C]">{item.borrowerName || '-'}</p>
                          {item.isNewlyOverdue && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-[0.12em]">
                              New
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${getStatusMeta(draft.status || item.status || 'open').className}`}>
                            {getStatusMeta(draft.status || item.status || 'open').label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.regNo || '-'} · {item.loanId || '-'} · {item.productName || '-'}
                        </p>
                        <p className="text-xs text-slate-400">
                          Officer: {item.loanOfficer || '-'} · Assigned: {item.assignee?.name || draft.assigneeName || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <MetricChip label="DPD" value={`${item.currentOverdueDays || 0} day`} tone="red" />
                      <MetricChip label="Bucket" value={item.overdueBucket || '-'} tone="amber" />
                      <MetricChip label="Overdue" value={formatMoney(item.currentOverdueAmount, item.currency)} tone="orange" />
                      <MetricChip label="Balance" value={formatMoney(item.currentOutstandingBalance, item.currency)} tone="emerald" />
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.1fr,1fr] gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <InfoBox label="Officer" value={item.loanOfficer || '-'} />
                        <InfoBox label="Branch" value={item.branch || '-'} />
                        <InfoBox label="Classification" value={item.classification || '-'} />
                        <InfoBox label="Phone" value={item.phone || '-'} />
                      </div>

                      <label className="space-y-1 block">
                        <span className="text-[11px] font-bold uppercase text-slate-500">Action measures</span>
                        <textarea
                          rows={4}
                          value={draft.actionMeasures || ''}
                          onChange={(e) => setDraftValue(item._id, 'actionMeasures', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white resize-none"
                          placeholder="Measure buriig shine muruur oruulna uu."
                        />
                      </label>

                      {!!item.recommendedActions?.length && (
                        <div className="flex flex-wrap gap-2">
                          {item.recommendedActions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => appendRecommendedAction(item._id, action)}
                              className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                            >
                              + {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="space-y-1 block">
                          <span className="text-[11px] font-bold uppercase text-slate-500">Assign to</span>
                          <select
                            value={draft.assigneeUserId || ''}
                            onChange={(e) => {
                              const user = usersList.find((entry) => entry._id === e.target.value);
                              setDraftValue(item._id, 'assigneeUserId', e.target.value);
                              setDraftValue(item._id, 'assigneeName', user?.name || '');
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white"
                          >
                            <option value="">-- select --</option>
                            {usersList.map((user) => (
                              <option key={user._id} value={user._id}>{user.name}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1 block">
                          <span className="text-[11px] font-bold uppercase text-slate-500">Status</span>
                          <select
                            value={draft.status || 'open'}
                            onChange={(e) => setDraftValue(item._id, 'status', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="space-y-1 block">
                        <span className="text-[11px] font-bold uppercase text-slate-500">Action plan</span>
                        <textarea
                          rows={4}
                          value={draft.actionPlan || ''}
                          onChange={(e) => setDraftValue(item._id, 'actionPlan', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white resize-none"
                          placeholder="Negotiation, follow-up, escalation plan..."
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-[11px] font-bold uppercase text-slate-500">Notes</span>
                        <textarea
                          rows={2}
                          value={draft.notes || ''}
                          onChange={(e) => setDraftValue(item._id, 'notes', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#003B5C] focus:bg-white resize-none"
                          placeholder="Additional notes..."
                        />
                      </label>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <UserCheck size={13} />
                          Current assignee: <b className="text-slate-600">{item.assignee?.name || draft.assigneeName || '-'}</b>
                        </div>
                        <button
                          onClick={() => saveCase(item)}
                          disabled={savingId === item._id}
                          className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {savingId === item._id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          Save case
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(previewSnapshot || previewing) && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A651]">Snapshot Preview</p>
                <h4 className="text-lg font-black text-[#003B5C]">
                  {previewSnapshot?.reportDate || previewSnapshot?.snapshotLabel || 'Loading...'}
                </h4>
                <p className="text-xs text-slate-500">{previewSnapshot?.sourceFileName || ''}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSnapshot(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {previewing && !previewSnapshot ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin inline-block mr-2" />
                  Loading preview...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricChip label="Rows" value={previewSnapshot?.rows?.length || 0} />
                    <MetricChip label="Overdue" value={previewSnapshot?.summary?.overdueLoans || (previewSnapshot?.rows?.filter((row) => row.isOverdue).length || 0)} tone="red" />
                    <MetricChip label="Overdue amount" value={formatMoney(previewSnapshot?.summary?.overdueAmount || 0)} tone="orange" />
                    <MetricChip label="Uploaded" value={formatShortDate(previewSnapshot?.createdAt)} tone="emerald" />
                  </div>

                  <div className="overflow-x-auto border rounded-2xl">
                    <table className="w-full text-sm min-w-[1100px]">
                      <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                        <tr>
                          {PREVIEW_COLUMNS.map((column) => (
                            <th key={column.key} className="p-3 text-left">{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(previewSnapshot?.rows || []).map((row, index) => (
                          <tr key={`${row.caseKey || row.regNo}-${index}`}>
                            {PREVIEW_COLUMNS.map((column) => (
                              <td key={column.key} className="p-3 whitespace-nowrap">
                                {['overdueAmount', 'outstandingBalance'].includes(column.key)
                                  ? formatMoney(row[column.key], row.currency)
                                  : row[column.key] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricChip = ({ label, value, tone = 'blue' }) => {
  const tones = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div className={`border rounded-2xl px-3 py-2 min-w-[110px] ${tones[tone] || tones.blue}`}>
      <p className="text-[10px] uppercase font-bold opacity-70">{label}</p>
      <p className="font-black text-sm">{value}</p>
    </div>
  );
};

const MiniStat = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[11px] uppercase font-bold tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-bold text-[#003B5C]">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{hint}</p>
  </div>
);

const DarkStat = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
    <p className="text-[11px] uppercase font-bold tracking-[0.12em] text-slate-300">{label}</p>
    <p className="mt-2 text-sm font-bold text-white break-words">{value}</p>
  </div>
);

const InfoBox = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 px-3 py-2.5 bg-slate-50">
    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{label}</p>
    <p className="text-sm font-semibold text-slate-700 break-words">{value}</p>
  </div>
);

export default LoanExposureMonitor;
