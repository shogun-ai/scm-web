import React, { useState, useEffect } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { API_URL, BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';
import { useAppContext } from '../context/AppContext';

const FinancialReportsPage = () => {
    const { navigateTo } = useAppContext();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetch(`${API_URL}/api/policies?category=report&displayOnWeb=true`)
            .then(r => r.json()).then(d => setFiles(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const getFileUrl = (f) => f.fileUrl || `${API_URL}/policies/${f.fileName}`;

    return (
        <div className="min-h-screen font-sans text-slate-800 pt-20 pb-20 px-4 md:px-6 relative" style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
             <div className="absolute inset-0 sc-overlay-90 pointer-events-none"></div>
             <BackButton onClick={() => navigateTo('home')} />
             <div className="max-w-4xl mx-auto relative z-10 pt-10">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl p-8 md:p-10 animate-fade-in-up">
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-[#D4AF37] mb-2">Санхүүгийн тайлангууд</h2>
                    {loading ? <p className="text-white/60 mt-8">Уншиж байна...</p> : (
                    <div className="space-y-4 mt-8">
                        {files.length === 0 && <p className="text-white/50 text-sm">Тайлан байхгүй байна.</p>}
                        {files.map((file, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-white/10 rounded-xl hover:bg-white/5 transition gap-4">
                                <div className="flex items-center gap-4">
                                    <FileText className="text-[#D4AF37]" size={32} />
                                    <div><h4 className="font-bold text-white text-sm">{file.title}</h4><span className="text-xs text-gray-400">PDF</span></div>
                                </div>
                                <button onClick={() => setPdfUrl(getFileUrl(file))}
                                    className="text-[#007A3D] font-bold text-xs uppercase hover:underline ml-auto md:ml-0 flex items-center gap-1">
                                    Харах <ArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
             </div>
             {pdfUrl && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="flex justify-between items-center p-4 bg-[#003B5C]">
                        <span className="text-white font-bold text-sm">PDF Харах</span>
                        <button onClick={() => setPdfUrl(null)} className="text-white hover:text-red-400 font-bold text-lg px-4">✕ Хаах</button>
                    </div>
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`} className="flex-1 w-full" title="PDF Viewer" />
                </div>
             )}
        </div>
    );
};

export default FinancialReportsPage;
