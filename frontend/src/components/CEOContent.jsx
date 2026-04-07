import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import axios from 'axios';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

const FALLBACK = {
  ceo_name: 'Б.Золбоо',
  ceo_title: 'Гүйцэтгэх захирал',
  ceo_image: '/board/zolboo.jpg',
  ceo_signature: '/signature.png',
  ceo_headline: 'Итгэлцэл дээр Ирээдүйг бүтээнэ',
  ceo_message: 'Эрхэм харилцагч, хүндэт түншүүд та бүхний амар амгаланг айлтгая.\n\n"Солонго Капитал ББСБ" нь байгуулагдсан цагаасаа эхлэн харилцагч төвтэй үйлчилгээ, шинэлэг бүтээгдэхүүнийг зах зээлд нэвтрүүлж, Монгол Улсын санхүүгийн салбарын хөгжилд өөрийн хувь нэмрийг оруулахыг зорин ажиллаж байна.\n\nБид зөвхөн санхүүгийн үйлчилгээ үзүүлэгч бус, таны бизнесийн өсөлтийг дэмжигч, найдвартай түнш байхыг эрхэмлэдэг.\n\nБидэнд итгэл хүлээлгэн хамтран ажилладаг та бүхэндээ талархал илэрхийлье.',
};

const CEOContent = () => {
  const [cfg, setCfg] = useState(FALLBACK);

  useEffect(() => {
    axios.get(`${API_URL}/api/config/flat`)
      .then(res => {
        const d = res.data;
        if (d.ceo_name) setCfg(prev => ({ ...prev, ...d }));
      })
      .catch(() => {});
  }, []);

  const paragraphs = (cfg.ceo_message || '').split('\n\n').filter(Boolean);

  return (
    <section className="py-12 w-full relative">
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">

          {/* ЗУРАГ */}
          <div className="w-full md:w-2/5 flex justify-center md:justify-end relative group">
            <div className="absolute top-4 -right-4 w-full h-full border-2 border-[#D4AF37]/30 rounded-2xl md:translate-x-4 md:translate-y-4 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2"></div>
            <div className="absolute -inset-4 bg-[#D4AF37] opacity-10 blur-2xl rounded-full pointer-events-none"></div>
            <div className="relative w-72 h-96 md:w-80 md:h-[450px] overflow-hidden rounded-2xl shadow-2xl border border-white/10">
              <img
                src={cfg.ceo_image}
                alt="CEO"
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003B5C] via-transparent to-transparent opacity-60"></div>
            </div>
          </div>

          {/* ТЕКСТ */}
          <div className="w-full md:w-3/5 text-left space-y-6">
            <Quote size={60} className="text-[#D4AF37] opacity-20" />
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F4E285]">
                {cfg.ceo_headline}
              </span>
            </h2>
            <div className="space-y-4 font-sans text-blue-100/90 text-sm md:text-base leading-relaxed font-light text-justify">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="pt-8 border-t border-white/10 flex items-center gap-8">
              <div>
                <h4 className="text-xl md:text-2xl font-display font-bold text-white">{cfg.ceo_name}</h4>
                <p className="text-[#D4AF37] text-xs uppercase tracking-widest font-bold mt-1">{cfg.ceo_title}</p>
              </div>
              <div className="opacity-90 mix-blend-screen pt-2">
                <img src={cfg.ceo_signature || '/signature.png'} alt="Гарын үсэг"
                  className="h-20 md:h-45 w-auto object-contain brightness-0 invert filter contrast-150 drop-shadow-sm" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default CEOContent;
