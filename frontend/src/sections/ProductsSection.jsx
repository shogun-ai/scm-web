import React from 'react';
import { ArrowRight, Calculator } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function ProductsSection({ getSectionBackgroundStyle }) {
  const { products, navigateTo } = useAppContext();

  return (
    <section id="products" style={getSectionBackgroundStyle?.('products', null, { fixed: false, surface: '#F8F7F3' })} className="bg-[#F8F7F3] py-20 md:py-28 text-[#102D43]">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-[0.18em] text-[#706044] block mb-4">БҮТЭЭГДЭХҮҮН, ҮЙЛЧИЛГЭЭ</span>
            <h2 className="font-display font-bold text-3xl md:text-5xl leading-tight tracking-tight">Таны хэрэгцээнд тохирох<br className="hidden md:block" /> санхүүгийн шийдэл</h2>
          </div>
          <p className="text-[#596975] max-w-sm leading-relaxed">Бүтээгдэхүүнээ сонгож, нөхцөл болон бүрдүүлэх материалыг дэлгэрэнгүй хараарай.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {(Array.isArray(products) ? products : []).map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className="group flex flex-col items-start rounded-2xl border border-[#102D43]/10 bg-white p-6 md:p-8 transition duration-200 hover:border-[#102D43]/30 hover:shadow-lg">
                <div className="mb-6 rounded-xl bg-[#F2F4F4] p-3 text-[#102D43]"><Icon size={26} strokeWidth={1.6} /></div>
                <h3 className="font-display text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-[#596975] text-sm leading-relaxed mb-7 flex-grow">{item.shortDesc}</p>
                <button type="button" onClick={() => navigateTo('product_detail', item)} className="flex items-center gap-3 text-sm font-semibold text-[#102D43] rounded-md py-2 hover:text-[#8A6A2D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#102D43]">
                  Нөхцөлтэй танилцах <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </button>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-5 border-t border-[#102D43]/15 pt-7">
          <p className="flex items-center gap-3 font-semibold text-sm"><Calculator size={20} strokeWidth={1.6} /> Шийдвэр гаргахаасаа өмнө тооцоолоорой</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <button type="button" onClick={() => navigateTo('calculator')} className="text-sm underline underline-offset-4 hover:text-[#8A6A2D]">Зээлийн тооцоолуур →</button>
            <button type="button" onClick={() => navigateTo('trust_calculator')} className="text-sm underline underline-offset-4 hover:text-[#8A6A2D]">Итгэлцлийн тооцоолуур →</button>
          </div>
        </div>
      </div>
    </section>
  );
}
