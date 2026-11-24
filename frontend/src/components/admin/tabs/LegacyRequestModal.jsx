import { Calendar, CheckCircle, ClipboardList, FileText, Printer, User, XCircle } from 'lucide-react';

// Хуучин зээлийн хүсэлтийн дэлгэрэнгүй (хэвлэх боломжтой).
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function LegacyRequestModal({ PRODUCT_NAMES, formatCurrency, formatDate, getLoanStatusLabel, handlePrint, handleStatusChange, openLoanResearch, selectedRequest, setSelectedRequest }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div id="printable-content" className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto relative animate-scale-up border border-white/20 p-12">
        <button onClick={() => setSelectedRequest(null)} className="absolute top-8 right-8 text-gray-400 no-print hover:text-red-500 transition duration-300"><XCircle size={36}/></button>
        <div className="space-y-12">
           <div className="flex items-center gap-10 border-b border-gray-100 pb-12">
             {selectedRequest.selfieUrl ? (
               <img src={selectedRequest.selfieUrl} alt="Хэрэглэгчийн зураг" className="w-32 h-32 object-cover rounded-[40px] border-4 border-[#003B5C] shadow-2xl"/>
             ) : (
               <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center border-4 border-slate-100"><User size={48} className="text-slate-200"/></div>
             )}
             <div><h2 className="text-4xl font-black text-[#003B5C]">Хүсэлт №{selectedRequest._id.slice(-6).toUpperCase()}</h2><p className="text-gray-400 mt-3 font-bold flex items-center gap-3"><Calendar size={18}/> {formatDate(selectedRequest.createdAt)}</p></div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Дүн</p><p className="font-black text-2xl text-[#003B5C]">{formatCurrency(selectedRequest.amount)}</p></div>
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Хугацаа</p><p className="font-black text-2xl text-[#003B5C]">{selectedRequest.term} сар</p></div>
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center"><p className="text-[10px] font-black text-gray-400 mb-2">Бүтээгдэхүүн</p><p className="font-bold text-xs text-[#003B5C]">{PRODUCT_NAMES[selectedRequest.selectedProduct] || selectedRequest.selectedProduct}</p></div>
             <div className={`p-8 rounded-[32px] border text-center ${selectedRequest.status === 'resolved' ? 'bg-green-50' : selectedRequest.status === 'rejected' ? 'bg-red-50' : selectedRequest.status === 'studying' ? 'bg-blue-50' : 'bg-orange-50'}`}><p className="text-[10px] font-black text-gray-400 mb-2 uppercase">Төлөв</p><p className="font-black text-xs uppercase">{getLoanStatusLabel(selectedRequest.status)}</p></div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm border-t pt-10">
             <section className="space-y-4">
               <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-[#D4AF37] pl-4 tracking-widest">Мэдээлэл</h3>
               <p>Нэр: <b>{selectedRequest.lastname} {selectedRequest.firstname || selectedRequest.orgName}</b></p>
               <p>Регистр: <b>{selectedRequest.regNo || selectedRequest.orgRegNo}</b></p>
               <p>Утас: <b className="text-green-600">{selectedRequest.phone}</b></p>
               <p>Имэйл: <b>{selectedRequest.email}</b></p>
             </section>

             <section className="space-y-8">
               <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-green-500 pl-4 tracking-widest">Баримтууд</h3>
               {selectedRequest.fileNames?.map((file, idx) => (
                  <a key={idx} href={file} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-5 rounded-[24px] border-2 border-slate-50 hover:bg-slate-100 transition-all duration-300">
                     <div className="flex items-center gap-4"><FileText size={22} className="text-blue-500"/><span className="text-xs font-black text-slate-700 truncate max-w-[200px]">{file.split('/').pop()}</span></div>
                     <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Үзэх</span>
                  </a>
               ))}
             </section>
           </div>
        </div>

        <div className="mt-12 p-8 bg-slate-50/50 flex justify-between items-center border-t no-print rounded-b-[40px]">
          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex items-center gap-4 px-10 py-5 border-2 border-[#003B5C] text-[#003B5C] rounded-[24px] font-black uppercase text-xs hover:bg-[#003B5C] hover:text-white transition-all shadow-xl"><Printer size={22}/> Хэвлэх</button>
            <button onClick={() => openLoanResearch(selectedRequest)} className="flex items-center gap-3 px-8 py-5 bg-amber-100 text-[#003B5C] rounded-[24px] font-black uppercase text-xs hover:bg-[#D4AF37] transition-all shadow-xl"><ClipboardList size={22}/> Судалгаа</button>
          </div>
          {selectedRequest.status !== 'resolved' && selectedRequest.status !== 'rejected' ? (
            <div className="flex gap-3">
              <button onClick={() => handleStatusChange(selectedRequest._id, 'rejected')} className="px-8 py-5 bg-red-600 text-white rounded-[24px] font-black shadow-xl hover:bg-red-700 transition-all flex items-center gap-4 uppercase text-xs"><XCircle size={22}/> Татгалзах</button>
              <button onClick={() => handleStatusChange(selectedRequest._id, 'resolved')} className="px-8 py-5 bg-[#00A651] text-white rounded-[24px] font-black shadow-xl hover:bg-green-700 transition-all flex items-center gap-4 uppercase text-xs"><CheckCircle size={22}/> Шийдсэн</button>
            </div>
          ) : (
            <div className="px-12 py-5 bg-gray-200 text-gray-500 rounded-[24px] font-black flex items-center gap-3 uppercase text-xs tracking-widest">{getLoanStatusLabel(selectedRequest.status)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
