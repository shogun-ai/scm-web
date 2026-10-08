import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import ScrollDownArrow from '../components/ScrollDownArrow';

export default function ProductsSection({ getSectionBackgroundStyle }) {
  const { products, navigateTo } = useAppContext();

  return (
    <section id="products" className="py-24 relative min-h-screen flex items-center sc-section-band" style={getSectionBackgroundStyle('products', BACKGROUNDS.products)}>
      <div className="absolute inset-0 sc-overlay-90"></div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="sc-kicker mb-4 block">Бидний шийдэл</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white leading-tight">Бүтээгдэхүүн үйлчилгээ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((item) => {
              const Icon = item.icon;
              return (
                  <div
                    key={item.id}
                    className="sc-glass-panel sc-card-lift group flex h-full flex-col items-start rounded-lg p-6 transition-all duration-300"
                  >
                    <div className="mb-6 w-fit rounded-lg bg-white/10 p-4 text-white shadow-sm transition-colors duration-300 group-hover:bg-[#D4AF37] group-hover:text-[#062842]">
                        <Icon size={32} />
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="font-sans text-body text-gray-400 mb-6 leading-relaxed flex-grow group-hover:text-gray-300 transition">{item.shortDesc}</p>
                    <button onClick={() => navigateTo('product_detail', item)} className="mt-auto flex cursor-pointer items-center gap-2 rounded-full border border-[#D4AF37]/35 px-4 py-2 text-xs font-display font-bold uppercase tracking-wider text-[#D4AF37] transition group-hover:bg-[#D4AF37] group-hover:text-[#062842]">
                    Дэлгэрэнгүй <ArrowRight size={14} />
                    </button>
                  </div>
              )
            })}
          </div>
      </div>

<ScrollDownArrow targetId="blog" color="text-white/50" />
   </section>
  );
}
