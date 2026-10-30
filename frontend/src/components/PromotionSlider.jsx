import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Calculator, MoveUpRight } from 'lucide-react';
import { requestSafetyNotices } from '../safetyNoticesApi';
import { normalizeHeroSliderInterval } from '../../../shared/heroSliderConfig.js';
import SafetyNotices from './SafetyNotices';

export default function PromotionSlider({ promotions, fallbackBg, homeSlide, intervalSeconds = 15, onOpen, onProducts, onRequest, onCalculator, onTrustCalculator, onContact, initialSlideKind = 'home' }) {
    const [notices, setNotices] = useState([]);
    const [active, setActive] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [paused, setPaused] = useState(false);
    const [heroHeight, setHeroHeight] = useState(0);
    const sliderRef = useRef(null);
    const [hidden, setHidden] = useState(() => document.hidden);
    const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const safePromotions = Array.isArray(promotions) ? promotions.filter(item => item && typeof item === 'object') : [];
    const slides = [homeSlide, ...(notices.length ? [{ kind: 'safety' }] : []), ...safePromotions];
    const activeIndex = active < slides.length ? active : 0;
    const current = slides[activeIndex];
    const duration = normalizeHeroSliderInterval(intervalSeconds);

    useEffect(() => {
        if (current?.kind !== 'home' || !sliderRef.current) return;
        const measure = () => setHeroHeight(sliderRef.current?.getBoundingClientRect().height || 0);
        const observer = new ResizeObserver(measure);
        observer.observe(sliderRef.current);
        return () => observer.disconnect();
    }, [current?.kind]);

    useEffect(() => {
        const controller = new AbortController();
        let mounted = true;
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        requestSafetyNotices({ signal: controller.signal })
            .then(data => {
                if (!mounted) return;
                const published = data.notices.filter(item => item.isPublished);
                setNotices(published);
                if (initialSlideKind === 'safety' && published.length) setActive(1);
            })
            .catch(() => { /* Optional notices must not interrupt the homepage. */ })
            .finally(() => window.clearTimeout(timeout));
        return () => {
            mounted = false;
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [initialSlideKind]);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = event => setReducedMotion(event.matches);
        const onVisibilityChange = () => setHidden(document.hidden);
        media.addEventListener('change', onMotionChange);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            media.removeEventListener('change', onMotionChange);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    useEffect(() => {
        if (slides.length <= 1 || duration === 0 || paused || hovered || focused || hidden || reducedMotion) return undefined;
        const timer = window.setTimeout(() => setActive((activeIndex + 1) % slides.length), duration * 1000);
        return () => window.clearTimeout(timer);
    }, [activeIndex, slides.length, duration, paused, hovered, focused, hidden, reducedMotion]);

    const go = direction => setActive((activeIndex + direction + slides.length) % slides.length);

    return (
        <div
            ref={sliderRef}
            className="relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]"
            style={current?.kind !== 'home' ? { height: heroHeight || 'clamp(760px, 90svh, 960px)' } : undefined}
            role="region"
            aria-roledescription="слайд"
            aria-label="Нүүр хуудасны мэдээлэл"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    go(event.key === 'ArrowLeft' ? -1 : 1);
                }
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
            }}
            data-active-slide={current?.kind || 'promotion'}
        >
            <div className="absolute inset-0 flex transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                {slides.map((slide, idx) => (
                    <div
                        key={slide._id || slide.slug || slide.kind || idx}
                        className="min-w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.backgroundImageUrl || fallbackBg})` }}
                    />
                ))}
            </div>
            <div className={`absolute inset-0 transition-colors duration-700 ${current?.kind === 'home' ? 'sc-hero-vignette' : current?.kind === 'safety' ? 'bg-[#041b2b]/95' : 'sc-overlay-70'}`}></div>
            {current?.kind === 'safety' ? (
                <div className="absolute inset-0 z-10">
                    <SafetyNotices notices={notices} />
                </div>
            ) : current?.kind === 'home' ? (
                <div className="relative z-10">
                    <div className="sc-hero-layout mx-auto grid max-w-7xl items-center gap-12 px-6 pb-28 pt-32 text-white lg:grid-cols-[1.45fr_0.8fr] lg:gap-16 lg:px-10 lg:pt-36">
                      <div className="motion-safe:animate-fade-in-up">
                        <p className="mb-7 flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-[#e6cf87]"><span className="h-px w-9 bg-[#d4af37]" aria-hidden="true" />ТАНЫ САНХҮҮГИЙН ТҮНШ</p>
                        <h1 className="sc-hero-title font-display font-semibold leading-[1.12] tracking-tight">
                            {current.line1}<br />
                            <span className="text-[#72d1b0]">{current.highlight}</span> {current.line2}
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-[1.8] text-slate-200 md:text-lg">
                            {current.description}
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <button type="button" onClick={onProducts} className="sc-primary-button inline-flex min-h-12 items-center justify-center gap-4 rounded-xl px-6 py-4 text-sm font-semibold transition">
                                {current.button}<ArrowRight size={18} aria-hidden="true" />
                            </button>
                            <button type="button" onClick={onContact || (() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }))} className="inline-flex min-h-12 items-center gap-3 px-2 py-3 text-sm font-medium text-white transition hover:text-[#e6cf87]">
                                Холбоо барих<MoveUpRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-6">
                            {['Хурдан шийдэл', 'Ил тод нөхцөл', 'Найдвартай түнш'].map((label) => (
                                <li key={label} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[#D4AF37]"></span>
                                    {label}
                                </li>
                            ))}
                        </ul>
                      </div>
                      {onRequest && <aside className="sc-hero-actions rounded-2xl border border-white/20 p-6 md:p-8">
                        <p className="mb-3 text-xs font-medium text-[#e6cf87]">ЭХЛЭХЭД ХЯЛБАР</p>
                        <h2 className="text-2xl font-semibold leading-snug">Танд ямар шийдэл<br className="hidden lg:block" /> хэрэгтэй вэ?</h2>
                        <p className="mb-6 mt-3 text-sm leading-relaxed text-slate-300">Тооцоогоо хийж, хэрэгцээндээ тохирсон үйлчилгээг сонгоорой.</p>
                        <button type="button" onClick={onRequest} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-white px-5 py-4 text-left text-sm font-semibold text-[#062842] transition hover:bg-[#f2e3b4]">Зээлийн хүсэлт гаргах<ArrowRight size={18} aria-hidden="true" /></button>
                        {onCalculator && <button type="button" onClick={onCalculator} className="mt-2 flex min-h-14 w-full items-center gap-3 border-b border-white/15 px-1 py-4 text-left text-sm text-white transition hover:text-[#e6cf87]"><Calculator size={18} aria-hidden="true" />Зээлийн тооцоолуур<MoveUpRight size={16} className="ml-auto" aria-hidden="true" /></button>}
                        {onTrustCalculator && <button type="button" onClick={onTrustCalculator} className="flex min-h-14 w-full items-center gap-3 px-1 py-4 text-left text-sm text-white transition hover:text-[#e6cf87]"><Calculator size={18} aria-hidden="true" />Итгэлцлийн тооцоолуур<MoveUpRight size={16} className="ml-auto" aria-hidden="true" /></button>}
                      </aside>}
                    </div>
                </div>
            ) : (
                <div className="relative z-10 h-full overflow-y-auto">
                    <div className="mx-auto flex min-h-full w-full max-w-7xl items-center px-14 pb-24 pt-24 md:px-24">
                        <div className="max-w-3xl text-white motion-safe:animate-fade-in-up">
                            <span className="text-[#D4AF37] font-sans font-bold uppercase tracking-[0.25em] text-xs mb-5 block">{current.subtitle || 'Шинэ мэдээ'}</span>
                            <h1 className="font-display font-bold text-4xl md:text-7xl leading-tight mb-6 drop-shadow-xl">{current.title}</h1>
                            <p className="font-sans text-lg md:text-2xl text-white/85 leading-relaxed max-w-2xl mb-10 font-light">{current.excerpt}</p>
                            <button
                                onClick={() => onOpen(current)}
                                className="sc-primary-button inline-flex items-center gap-3 rounded-full px-7 py-3.5 font-display text-xs font-bold uppercase tracking-wider transition shadow-xl"
                            >
                                {current.ctaLabel || 'Дэлгэрэнгүй'} <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {slides.length > 1 && (
                <>
                    <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 text-white lg:right-10">
                      <span className="mr-3 text-xs tabular-nums text-slate-300" aria-live="off">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
                      <button type="button" onClick={() => go(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#062842]/80 transition hover:bg-white hover:text-[#062842]" aria-label="Өмнөх слайд"><ChevronLeft size={20} aria-hidden="true" /></button>
                      <button type="button" onClick={() => go(1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#062842]/80 transition hover:bg-white hover:text-[#062842]" aria-label="Дараах слайд"><ChevronRight size={20} aria-hidden="true" /></button>
                      {duration > 0 && !reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#062842]/80 transition hover:bg-white hover:text-[#062842]" aria-label={paused ? 'Слайдын автомат шилжилтийг үргэлжлүүлэх' : 'Слайдын автомат шилжилтийг түр зогсоох'} aria-pressed={paused}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>}
                    </div>
                </>
            )}
        </div>
    );
}
