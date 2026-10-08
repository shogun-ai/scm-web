import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Home } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import logoMetal from '../assets/logo-metal.png';

const NotFoundPage = () => {
  const { navigateTo } = useAppContext();

  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center text-center px-4 md:px-6 text-white"
      style={{
        backgroundImage: `url(${BACKGROUNDS.detail_page})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Helmet>
        <title>404 — Хуудас олдсонгүй | Solongo Capital</title>
        <meta name="description" content="Таны хайсан хуудас олдсонгүй." />
      </Helmet>

      <div className="absolute inset-0 sc-overlay-90"></div>

      <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto space-y-8">
        <img
          src={logoMetal}
          alt="Solongo Capital"
          className="h-14 object-contain brightness-0 invert opacity-70"
        />

        <div className="sc-glass-panel rounded-2xl px-10 py-12 flex flex-col items-center space-y-6 w-full">
          <p className="text-[#D4AF37] font-display font-black text-8xl leading-none">404</p>
          <div className="w-12 h-0.5 bg-[#D4AF37] rounded-full"></div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white">
            Хуудас олдсонгүй
          </h1>
          <p className="font-sans text-gray-300 text-sm md:text-base leading-relaxed">
            Таны хайсан хуудас байхгүй эсвэл нүүлгэгдсэн байна.<br />
            Нүүр хуудас руу буцаж үйлчилгээгээ үргэлжлүүлнэ үү.
          </p>
          <button
            onClick={() => navigateTo('home')}
            className="mt-2 flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c49b2e] text-[#041621] font-display font-bold px-8 py-3.5 rounded-xl transition shadow-lg shadow-black/30 uppercase tracking-wider text-sm"
          >
            <Home size={18} />
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
