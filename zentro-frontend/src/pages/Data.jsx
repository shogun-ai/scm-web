import { useEffect, useState } from 'react';
import { getImportBatches, deleteImportBatch } from '../api';
import { FileText, Trash2, FileSpreadsheet } from 'lucide-react';

export default function Data() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => getImportBatches().then(b => { setBatches(b); setLoading(false); });
  useEffect(() => { load(); }, []);

  const remove = async (id, filename) => {
    if (!confirm(`"${filename}" файлын ${batches.find(b => b._id === id)?.rowCount || 0} мөр бүгд устгагдана. Үргэлжлүүлэх үү?`)) return;
    await deleteImportBatch(id);
    setBatches(prev => prev.filter(b => b._id !== id));
  };

  if (loading) return <div className="text-slate-400 text-sm p-6">Уншиж байна...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="z-card">
        <h2 className="font-bold text-slate-800 mb-1">Оруулсан файлуудын түүх</h2>
        <p className="text-xs text-slate-400 mb-4">Файл устгахад тухайн файлаас орсон бүх гүйлгээний мөр устана.</p>

        {batches.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Одоогоор файл оруулаагүй байна</p>
            <p className="text-xs mt-1">Гүйлгээ цэснээс банкны хуулга оруулна уу</p>
          </div>
        )}

        <div className="z-table-wrap">
          {batches.length > 0 && (
            <table className="z-table">
              <thead>
                <tr>
                  <th>Файлын нэр</th>
                  <th>Төрөл</th>
                  <th>Нэмэгдсэн мөр</th>
                  <th>Давхардал</th>
                  <th>Оруулсан огноо</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {b.source === 'pdf'
                          ? <FileText size={14} className="text-red-500 flex-shrink-0" />
                          : <FileSpreadsheet size={14} className="text-green-600 flex-shrink-0" />
                        }
                        <span className="font-semibold text-slate-700 text-xs">{b.filename}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`z-badge ${b.source === 'pdf' ? 'z-badge-red' : 'z-badge-green'}`}>
                        {b.source === 'pdf' ? 'PDF' : 'Excel'}
                      </span>
                    </td>
                    <td className="font-bold text-blue-700">{b.rowCount}</td>
                    <td className="text-slate-400">{b.skipped}</td>
                    <td className="text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleString('mn-MN')}
                    </td>
                    <td>
                      <button
                        className="z-btn z-btn-danger z-btn-sm"
                        onClick={() => remove(b._id, b.filename)}
                      >
                        <Trash2 size={12} /> Устгах
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
