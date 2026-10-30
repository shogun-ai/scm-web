import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FINANCIAL_DATE } from '../data/constants';

export default function AboutSection({ governanceItems, handleGovernanceClick, getSectionBackgroundStyle }) {
  const { cfg, financialStats, navigateTo } = useAppContext();
  const values = [
    [cfg.about_mission_title || 'Эрхэм зорилго', cfg.about_mission_text || 'Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан шийдлээр хангах.'],
    [cfg.about_vision_title || 'Алсын хараа', cfg.about_vision_text || 'Итгэлд суурилсан, дижитал, хэрэглэгч төвтэй байгууллага болох.'],
    [cfg.about_values_title || 'Үнэ цэнэ', cfg.about_values_text || 'Шударга ёс, Ил тод байдал, Хамтын ажиллагаа, Инноваци.'],
  ];

  return (
    <div id="about-intro" className="text-[#102D43]">
      <section style={getSectionBackgroundStyle?.('about', null, { fixed: false, surface: '#FFFFFF' })} className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-20 mb-14">
            <div><span className="text-xs font-semibold tracking-[0.18em] text-[#706044] block mb-4">БИДНИЙ ТУХАЙ</span><h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">{cfg.about_title || 'Бид хэн бэ?'}</h2></div>
            <p className="text-lg md:text-xl leading-relaxed text-[#596975]"><span className="font-semibold text-[#102D43]">Солонго Капитал ББСБ ХХК</span> {cfg.about_intro || 'нь харилцагч төвтэй үйлчилгээг эрхэмлэн, санхүүгийн салбарт шинэ жишиг тогтоохоор зорин ажиллаж байна.'}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map(([title, text], i) => <div key={title} className="border-t border-[#102D43]/20 pt-6"><span className="text-sm text-[#8A6A2D] tabular-nums">0{i + 1}</span><h3 className="font-display text-xl font-bold mt-4 mb-3">{title}</h3><p className="text-[#596975] leading-relaxed text-sm">{text}</p></div>)}
          </div>
        </div>
      </section>
      <section id="financials" style={getSectionBackgroundStyle?.('financials', null, { fixed: false, surface: '#EEF2F2' })} className="bg-[#EEF2F2] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-20">
            <div>
              <span className="text-xs font-semibold tracking-[0.18em] text-[#706044] block mb-4">{cfg.financial_section_label || 'Бидний амжилт'}</span>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">{cfg.financial_section_title || 'Санхүүгийн үзүүлэлтүүд'}</h2>
              <p className="text-[#596975] text-sm leading-relaxed mt-5">{cfg.financial_section_desc || 'Бид богино хугацааны өндөр ашигт бус, урт хугацаанд тогтвортой, хүртээмжтэй санхүүгийн экосистемийг бүтээхийг зорьдог.'}</p>
              <p className="text-[#596975] text-xs mt-4">{cfg.financial_date || FINANCIAL_DATE}</p>
              <button type="button" onClick={() => navigateTo('financials')} className="flex items-center gap-3 mt-7 text-sm font-semibold py-2 hover:text-[#8A6A2D]">Санхүүгийн тайлан <ArrowRight size={17} /></button>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8 content-center">
              {(Array.isArray(financialStats) ? financialStats : []).map((stat, i) => <div key={i} className="flex flex-col border-t border-[#102D43]/20 pt-5"><dt className="order-2 text-[#596975] text-xs leading-relaxed">{stat.label}</dt><dd className="order-1 text-2xl md:text-3xl font-display font-bold tabular-nums tracking-tight mb-2">{stat.val}</dd></div>)}
            </dl>
          </div>
        </div>
      </section>
      <section id="governance" style={getSectionBackgroundStyle?.('governance', null, { fixed: false, surface: '#FFFFFF' })} className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-5 mb-8"><h2 className="font-display font-bold text-3xl tracking-tight">Компанийн засаглал</h2><p className="text-[#596975] text-sm max-w-md leading-relaxed">Бид ил тод, нээлттэй байдал болон бизнесийн ёс зүйг дээдэлнэ.</p></div>
          <div className="grid md:grid-cols-3 gap-4">
            {(Array.isArray(governanceItems) ? governanceItems : []).map((item, idx) => {
              const Icon = item.icon;
              return <button type="button" key={idx} onClick={() => handleGovernanceClick(item)} className="group flex items-center gap-4 text-left rounded-xl border border-[#102D43]/15 p-5 hover:bg-[#F8F7F3] hover:border-[#102D43]/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#102D43]"><Icon size={25} strokeWidth={1.5} className="shrink-0 text-[#8A6A2D]" /><span className="font-semibold text-sm flex-1">{item.title}</span><ArrowRight size={17} className="shrink-0 transition-transform group-hover:translate-x-1" /></button>;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
