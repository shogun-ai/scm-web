import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { requestSafetyNotices } from '../safetyNoticesApi';
import { normalizeHeroSliderInterval } from '../../../shared/heroSliderConfig.js';
import SafetyNotices from './SafetyNotices';

export default function PromotionSlider({ promotions, fallbackBg, homeSlide, intervalSeconds = 15, onOpen, onProducts, initialSlideKind = 'home' }) {
    const [notices, setNotices] = useState([]);
    const [active, setActive] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(() => document.hidden);
    const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const safePromotions = Array.isArray(promotions) ? promotions.filter(item => item && typeof item === 'object') : [];
    const slides = [homeSlide, ...(notices.length ? [{ kind: 'safety' }] : []), ...safePromotions];
    const activeIndex = active < slides.length ? active : 0;
    const current = slides[activeIndex];
    const duration = normalizeHeroSliderInterval(intervalSeconds);

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
        if (slides.length <= 1 || duration === 0 || hovered || focused || hidden || reducedMotion) return undefined;
        const timer = window.setTimeout(() => setActive((activeIndex + 1) % slides.length), duration * 1000);
        return () => window.clearTimeout(timer);
    }, [activeIndex, slides.length, duration, hovered, focused, hidden, reducedMotion]);

    const go = direction => setActive((activeIndex + direction + slides.length) % slides.length);

    return (
        <div
            className="absolute inset-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]"
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
                <div className="relative z-10 h-full overflow-y-auto px-12 pb-24 pt-24 text-center md:px-20">
                    <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center space-y-7 text-white motion-safe:animate-fade-in-up">
                        <img
                            src={current.logo}
                            alt="Solongo Capital Logo"
                            className={`${current.logoClassName} drop-shadow-[0_18px_45px_rgba(0,0,0,0.45)]`}
                        />
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#00A651] shadow-[0_0_18px_rgba(0,166,81,0.9)]"></span>
                            Solongo Capital
                        </div>
                        <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-7xl leading-[1.05] tracking-normal drop-shadow-2xl">
                            {current.line1} <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A651] to-emerald-400">{current.highlight}</span> {current.line2}
                        </h1>
                        <p className="font-sans font-normal text-base md:text-lg lg:text-xl text-blue-50 max-w-2xl mx-auto leading-relaxed opacity-95">
                            {current.description}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl pt-1">
                            {['Хурдан шийдэл', 'Ил тод нөхцөл', 'Найдвартай түнш'].map((label) => (
                                <div key={label} className="sc-glass-panel rounded-lg px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
                                    {label}
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={onProducts}
                                className="sc-primary-button inline-flex min-h-12 items-center justify-center rounded-full px-9 py-4 font-sans text-xs font-extrabold uppercase tracking-widest transition-all duration-300"
                            >
                                {current.button}
                            </button>
                            <button
                                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                                className="sc-secondary-button inline-flex min-h-12 items-center justify-center rounded-full px-9 py-4 font-sans text-xs font-bold uppercase tracking-widest text-white transition-all duration-300"
                            >
                                Холбоо барих
                            </button>
                        </div>
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
                    <button type="button" onClick={() => go(-1)} className="absolute left-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#031827]/60 text-white backdrop-blur-md transition hover:border-[#D4AF37] hover:bg-white hover:text-[#003B5C] focus-visible:outline-2 focus-visible:outline-[#D4AF37] md:left-5 md:h-12 md:w-12" aria-label="Өмнөх слайд"><ChevronLeft size={26} aria-hidden="true" /></button>
                    <button type="button" onClick={() => go(1)} className="absolute right-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#031827]/60 text-white backdrop-blur-md transition hover:border-[#D4AF37] hover:bg-white hover:text-[#003B5C] focus-visible:outline-2 focus-visible:outline-[#D4AF37] md:right-5 md:h-12 md:w-12" aria-label="Дараах слайд"><ChevronRight size={26} aria-hidden="true" /></button>
                </>
            )}
        </div>
    );
}
