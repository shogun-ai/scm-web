import { useEffect, useState } from 'react';
import { getFinancialStatement, fmt, fmtDate } from '../api';

export default function Funding() {
  const [data, setData] = useState(null);

  // SPA-д navigate хийх бүрт шинээр mount → data автоматаар refresh хийгдэнэ
  useEffect(() => {
    getFinancialStatement().then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-400 p-6">Уншиж байна...</div>;

  const f = data.funding;

  return (
    <div className="flex flex-col gap-6">

      {/* Дүнгийн хураангуй */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard label="Нийт авсан зээл"    value={fmt(f.received)}      color="blue" />
        <SCard label="Үндсэн буцаасан"    value={fmt(f.principalPaid)} color="green" />
        <SCard label="Хүүгийн зардал"     value={fmt(f.interestPaid)}  color="yellow" />
        <SCard label="Одоогийн үлдэгдэл"  value={fmt(f.outstanding)}   color="red" />
      </div>

      {/* Авсан зээлүүд */}
      <div className="z-card">
        <h2 className="font-bold text-slate-800 mb-1">Авсан зээл (эх үүсвэр)</h2>
        <p className="text-xs text-slate-400 mb-4">ct = 2,021 / 2,020 кодтой гүйлгээнүүд — банк болон хөрөнгө оруулагчаас авсан зээл</p>
        {f.recentReceived.length === 0
          ? <p className="text-slate-400 text-sm py-4">ct=2,021 эсвэл ct=2,020 кодтой гүйлгээ байхгүй байна</p>
          : <TxTable rows={f.recentReceived} />
        }
      </div>

      {/* Буцаасан төлөлт */}
      <div className="z-card">
        <h2 className="font-bold text-slate-800 mb-1">Буцаасан зээл ба хүүгийн зардал</h2>
        <p className="text-xs text-slate-400 mb-4">dt = 2,021 / 2,020 / 5,121 / 5,120 / 2,024 кодтой гүйлгээнүүд — банкруу буцаан төлсөн</p>
        {f.recentPaid.length === 0
          ? <p className="text-slate-400 text-sm py-4">Буцаасан гүйлгээ байхгүй байна</p>
          : <TxTable rows={f.recentPaid} />
        }
      </div>

    </div>
  );
}

function TxTable({ rows }) {
  return (
    <div className="z-table-wrap">
      <table className="z-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Огноо</th>
            <th>dt</th>
            <th>ct</th>
            <th>Гүйлгээний утга</th>
            <th className="text-right">Дүн (₮)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(tx => (
            <tr key={tx._id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{fmtDate(tx.date)}</td>
              <td style={{ fontFamily: 'monospace', color: '#2563eb', whiteSpace: 'nowrap' }}>{tx.dt || '—'}</td>
              <td style={{ fontFamily: 'monospace', color: '#16a34a', whiteSpace: 'nowrap' }}>{tx.ct || '—'}</td>
              <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(tx.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SCard({ label, value, color }) {
  const bg   = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', yellow: 'bg-yellow-50 border-yellow-200', red: 'bg-red-50 border-red-200' };
  const text = { blue: 'text-blue-800', green: 'text-green-800', yellow: 'text-yellow-700', red: 'text-red-700' };
  return (
    <div className={`border rounded-xl p-3 ${bg[color]}`}>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${text[color]}`}>{value} ₮</p>
    </div>
  );
}
