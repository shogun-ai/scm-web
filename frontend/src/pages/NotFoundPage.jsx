import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Home } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import logoMetal from '../assets/logo-metal.png';

const NotFoundPage = () => {
  const { navigateTo } = useAppContext();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div
      className="sc-public-page min-h-screen relative flex flex-col items-center justify-center text-center px-4 md:px-6 bg-[#f7f8f6] text-[#062842] pt-28 pb-16"
    >
      <Helmet>
        <title>404 — Хуудас олдсонгүй | Solongo Capital</title>
        <meta name="description" content="Таны хайсан хуудас олдсонгүй." />
      </Helmet>


      <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto space-y-8">
        <img
          src={logoMetal}
          alt="Solongo Capital"
          className="h-14 object-contain opacity-70"
        />

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-10 py-12 flex flex-col items-center space-y-6 w-full">
          <p className="text-[#D4AF37] font-display font-semibold text-8xl leading-none">404</p>
          <div className="w-12 h-0.5 bg-[#D4AF37] rounded-full"></div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-[#062842]">
            Хуудас олдсонгүй
          </h1>
          <p className="font-sans text-slate-600 text-sm md:text-base leading-relaxed">
            Таны хайсан хуудас байхгүй эсвэл нүүлгэгдсэн байна.<br />
            Нүүр хуудас руу буцаж үйлчилгээгээ үргэлжлүүлнэ үү.
          </p>
          <button
            onClick={() => navigateTo('home')}
            className="mt-2 flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c49b2e] text-[#041621] font-display font-bold px-8 py-3.5 rounded-xl transition shadow-lg shadow-black/30  text-sm"
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
