import React from 'react';

const ShareholderInfo = () => {
  return (
    <section className="py-20 w-full flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Арын фоны чимэглэл (Glow Effect) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37] opacity-10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* 100% Circle Visual - GOLD */}
      <div className="relative w-56 h-56 md:w-64 md:h-64 mb-12 group cursor-default z-10">
        {/* Background Circle */}
        <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37]/20 scale-110"></div>
        <div className="absolute inset-0 rounded-full border-[10px] border-white/5"></div>
        
        {/* Active Circle (100%) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]" viewBox="0 0 100 100">
          <circle 
            cx="50" cy="50" r="46" 
            fill="transparent" 
            stroke="#D4AF37" 
            strokeWidth="6"
            strokeDasharray="289.02" // 2 * pi * 46
            strokeDashoffset="0" // 100%
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in">
          <span className="text-5xl md:text-6xl font-display font-bold text-white drop-shadow-lg tracking-tighter">100<span className="text-3xl text-[#D4AF37]">%</span></span>
          <span className="text-[10px] md:text-xs text-[#D4AF37] uppercase tracking-[0.3em] mt-2 font-bold border-t border-[#D4AF37]/50 pt-2 px-4">Эзэмшил</span>
        </div>
      </div>

      {/* Text Content */}
      <div className="max-w-4xl text-center space-y-8 animate-fade-in-up z-10 px-4">
        
        <div className="space-y-2">
            <h3 className="text-white/60 text-sm uppercase tracking-[0.2em] font-sans">
              Хувьцаа эзэмшигч
            </h3>
            {/* Нэрийг томоор, агуу харагдуулах */}
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight">
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F4E285] to-[#D4AF37]">Б.Дөлгөөн</span>
            </h1>
        </div>

        {/* Чимэглэлийн зураас */}
        <div className="flex items-center justify-center gap-4 opacity-50">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]"></div>
            <div className="w-2 h-2 rotate-45 border border-[#D4AF37]"></div>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]"></div>
        </div>

        <p className="text-blue-100/80 font-sans leading-relaxed text-lg md:text-xl max-w-2xl mx-auto font-light">
          "Солонго Капитал ББСБ" ХХК нь Монгол Улсын иргэний 100% өмчлөлд байдаг, дотоодын хөрөнгө оруулалттай компани юм.
        </p>

      </div>
    </section>
  );
};

export default ShareholderInfo;