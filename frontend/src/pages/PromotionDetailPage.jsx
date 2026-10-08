import React, { useEffect } from 'react';
import { BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';
import { useAppContext } from '../context/AppContext';

const PromotionDetailPage = () => {
    const { selectedItem, navigateTo } = useAppContext();
    const promotion = selectedItem;

    useEffect(() => window.scrollTo(0, 0), []);
    const widgets = promotion?.widgets || [];
    const bg = promotion?.backgroundImageUrl || BACKGROUNDS.detail_page;

    return (
        <div className="min-h-screen relative text-white bg-[#07111f]">
            <div className="relative min-h-[58vh] flex items-end px-4 md:px-6 pb-16 pt-28 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>
                <div className="absolute inset-0 sc-overlay-80"></div>
                <BackButton onClick={() => navigateTo('home')} />
                <div className="relative z-10 max-w-6xl mx-auto w-full">
                    <span className="text-[#D4AF37] font-bold uppercase tracking-[0.25em] text-xs mb-5 block">{promotion?.subtitle || 'Мэдээлэл'}</span>
                    <h1 className="font-display font-bold text-4xl md:text-6xl leading-tight max-w-4xl">{promotion?.title}</h1>
                    {promotion?.excerpt && <p className="text-white/80 text-lg md:text-2xl mt-6 max-w-3xl leading-relaxed">{promotion.excerpt}</p>}
                </div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-10">
                <article className="prose prose-invert max-w-none">
                    {(promotion?.body || '').split('\n').filter(Boolean).map((para, idx) => (
                        <p key={idx} className="text-white/80 text-lg leading-8 mb-6">{para}</p>
                    ))}
                </article>
                <aside className="space-y-4">
                    {widgets.map((widget, idx) => (
                        <div key={idx} className="border border-white/10 bg-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
                            {widget.meta && <span className="text-[#D4AF37] text-[11px] font-bold uppercase tracking-widest">{widget.meta}</span>}
                            <h3 className="font-display font-bold text-xl text-white mt-2 mb-3">{widget.title}</h3>
                            <p className={`text-white/75 leading-relaxed ${widget.type === 'stat' ? 'text-2xl font-bold text-[#D4AF37]' : ''}`}>{widget.content}</p>
                        </div>
                    ))}
                </aside>
            </div>
        </div>
    );
};

export default PromotionDetailPage;
