import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS, FINANCIAL_DATE } from '../data/constants';
import ScrollDownArrow from '../components/ScrollDownArrow';

export default function AboutSection({ governanceItems, getSectionBackgroundStyle, handleGovernanceClick }) {
  const { cfg, financialStats, navigateTo } = useAppContext();

  return (
    <div id="about-intro" className="relative">
      <section className="min-h-screen relative flex items-center justify-center text-center px-6 py-24 sc-section-band" style={getSectionBackgroundStyle('about', BACKGROUNDS.about)}>
        <div className="absolute inset-0 sc-overlay-70"></div>
        <div className="relative z-10 max-w-5xl space-y-12 animate-fade-in-up">
            <div className="space-y-6">
                <h2 className="font-display font-extrabold text-4xl md:text-6xl text-white leading-tight drop-shadow-xl">{cfg.about_title || 'Бид хэн бэ?'}</h2>
                <p className="font-sans text-xl md:text-2xl text-white/90 leading-relaxed font-light">
                    <span className="text-[#D4AF37] font-bold">Солонго Капитал ББСБ ХХК</span> {cfg.about_intro || 'нь харилцагч төвтэй үйлчилгээг эрхэмлэн, санхүүгийн салбарт шинэ жишиг тогтоохоор зорин ажиллаж байна.'}
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                <div className="sc-glass-panel rounded-lg p-6">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">{cfg.about_mission_title || 'Эрхэм зорилго'}</h4>
                    <p className="font-sans text-white/80 leading-relaxed">{cfg.about_mission_text || 'Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан шийдлээр хангах.'}</p>
                </div>
                <div className="sc-glass-panel rounded-lg p-6">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">{cfg.about_vision_title || 'Алсын хараа'}</h4>
                    <p className="font-sans text-white/80 leading-relaxed">{cfg.about_vision_text || 'Итгэлд суурилсан, дижитал, хэрэглэгч төвтэй байгууллага болох.'}</p>
                </div>
                <div className="sc-glass-panel rounded-lg p-6">
                    <h4 className="font-display font-bold text-2xl text-[#D4AF37] mb-3">{cfg.about_values_title || 'Үнэ цэнэ'}</h4>
                    <p className="font-sans text-white/80 leading-relaxed">{cfg.about_values_text || 'Шударга ёс, Ил тод байдал, Хамтын ажиллагаа, Инноваци.'}</p>
                </div>
            </div>
        </div>
        <ScrollDownArrow targetId="financials" color="text-white/50" />
      </section>

      <section id="financials" className="py-24 relative min-h-[90vh] flex items-center sc-section-band" style={getSectionBackgroundStyle('financials', BACKGROUNDS.financials)}>
        <div className="absolute inset-0 sc-overlay-80"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
            <div className="text-center mb-16">
                <span className="sc-kicker mb-3 block">{cfg.financial_section_label || 'Бидний амжилт'}</span>
                <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white">{cfg.financial_section_title || 'Санхүүгийн үзүүлэлтүүд'}</h2>
                <p className="text-[#C0C0C0] text-lg md:text-xl max-w-4xl mx-auto mt-6 font-light leading-relaxed">
                    {cfg.financial_section_desc || 'Бид богино хугацааны өндөр ашигт бус, урт хугацаанд тогтвортой, хүртээмжтэй санхүүгийн экосистемийг бүтээхийг зорьдог.'}
                </p>
                <p className="text-blue-200/60 font-sans text-sm mt-4">{cfg.financial_date || FINANCIAL_DATE}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-center">
                {financialStats.map((stat, i) => (
                <div key={i} className="sc-glass-panel sc-card-lift rounded-lg px-3 md:px-5 py-6 transition duration-300">
                    <div className="text-2xl md:text-5xl font-display font-bold text-[#D4AF37] mb-2 tabular-nums tracking-tight">{stat.val}</div>
                    <div className="text-[10px] md:text-xs font-display font-medium tracking-widest uppercase text-white/80">{stat.label}</div>
                </div>
                ))}
            </div>
            <div className="text-center mt-16">
                <button onClick={() => navigateTo('financials')} className="sc-secondary-button rounded-full px-7 py-3 text-white font-display font-bold uppercase tracking-wider text-xs transition">
                    Санхүүгийн тайлан дэлгэрэнгүй →
                </button>
            </div>
        </div>
        <ScrollDownArrow targetId="governance" />
      </section>

      <section id="governance" className="py-24 relative min-h-[90vh] flex flex-col justify-center sc-section-band" style={getSectionBackgroundStyle('governance', BACKGROUNDS.governance)}>
        <div className="absolute inset-0 sc-overlay-85"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
            <div className="text-center mb-16">
              <span className="sc-kicker mb-3 block">Ил тод байдал</span>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white">Компанийн засаглал</h2>
              <p className="text-white/60 max-w-2xl mx-auto mt-4 font-sans text-sm">Бид ил тод, нээлттэй байдал болон бизнесийн ёс зүйг дээдэлнэ.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {governanceItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                      <div
                          key={idx}
                          onClick={() => handleGovernanceClick(item)}
                          className="sc-glass-panel sc-card-lift group cursor-pointer flex flex-col items-center text-center rounded-lg p-7 transition-all duration-300"
                      >
                      <div className="mb-6 text-[#D4AF37] transition-transform duration-300 group-hover:scale-110">
                          <Icon size={48} strokeWidth={1} />
                      </div>
                      <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-[#D4AF37] transition">{item.title}</h3>
                      <div className="w-10 h-0.5 bg-white/20 group-hover:bg-[#D4AF37] transition mb-4"></div>
                      {item.isLink ? <span className="text-white/50 text-xs uppercase tracking-wider">Дэлгэрэнгүй →</span> : <span className="text-white/50 text-xl font-bold">+</span>}
                      </div>
                  )
              })}
            </div>
        </div>
        <ScrollDownArrow targetId="products" color="text-[#003B5C]/50" />
      </section>
    </div>
  );
}
