import React, { useEffect } from 'react';
import { BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';
import { useAppContext } from '../context/AppContext';

const PromotionDetailPage = () => {
    const { selectedItem, navigateTo } = useAppContext();
    const promotion = selectedItem;

    useEffect(() => { window.scrollTo(0, 0); }, []);
    const widgets = Array.isArray(promotion?.widgets) ? promotion.widgets : [];
    const bg = promotion?.backgroundImageUrl || BACKGROUNDS.detail_page;

    return (
        <div className="sc-public-page min-h-screen relative text-[#062842] bg-[#f7f8f6]">
            <div className="relative min-h-[340px] text-white flex items-end px-4 md:px-6 pb-16 pt-28 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>
                <div className="absolute inset-0 sc-overlay-80"></div>
                <BackButton onClick={() => navigateTo('home')} />
                <div className="relative z-10 max-w-6xl mx-auto w-full">
                    <span className="text-[#D4AF37] font-bold uppercase tracking-[0.25em] text-xs mb-5 block">{promotion?.subtitle || 'Мэдээлэл'}</span>
                    <h1 className="font-display font-bold text-3xl md:text-4xl leading-tight max-w-4xl">{promotion?.title}</h1>
                    {promotion?.excerpt && <p className="text-white/80 text-lg md:text-2xl mt-6 max-w-3xl leading-relaxed">{promotion.excerpt}</p>}
                </div>
            </div>
            <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-16 grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-10">
                <article className="prose max-w-none">
                    {(promotion?.body || '').split('\n').filter(Boolean).map((para, idx) => (
                        <p key={idx} className="text-slate-600 text-base leading-8 mb-6">{para}</p>
                    ))}
                </article>
                <aside className="space-y-4">
                    {widgets.map((widget, idx) => (
                        <div key={idx} className="border border-slate-200 bg-white rounded-2xl p-6 backdrop-blur-sm">
                            {widget.meta && <span className="text-[#D4AF37] text-[11px] font-bold uppercase tracking-widest">{widget.meta}</span>}
                            <h3 className="font-display font-bold text-xl text-[#062842] mt-2 mb-3">{widget.title}</h3>
                            <p className={`text-slate-600 leading-relaxed ${widget.type === 'stat' ? 'text-2xl font-bold text-[#D4AF37]' : ''}`}>{widget.content}</p>
                        </div>
                    ))}
                </aside>
            </div>
        </div>
    );
};

export default PromotionDetailPage;
