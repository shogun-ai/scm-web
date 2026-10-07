import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PromotionSlider from './components/PromotionSlider';
import HeroSliderSettings from './components/HeroSliderSettings';
import SafetyNoticesAdmin from './components/SafetyNoticesAdmin';
import logoGold from './assets/logo-gold-vertical.png';
import logoWhite from './assets/logo-white.png';
import './index.css';
import { DEFAULT_SAFETY_NOTICES, validateSafetyNoticeUpdate } from '../../backend/safetyNotices.js';
import { isValidHeroSliderInterval, normalizeHeroSliderInterval } from '../../shared/heroSliderConfig.js';

export function SafetyPreview({ admin }) {
  const [interval, setInterval] = useState(() => normalizeHeroSliderInterval(localStorage.getItem('scm-slider-preview-interval')));
  const [saved, setSaved] = useState(false);
  const heroBackground = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1950&q=80';
  return <>
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-[#03131f] px-6 py-3 text-xs text-white">
      <strong className="text-[#e8c966]">Локал туршилт</strong>
      <a className="underline" href="/safety-preview.html">Нүүрний слайдер</a>
      <a className="underline" href="/safety-preview.html?view=admin">Админ удирдлага</a>
      <span className="text-white/50">Өөрчлөлт зөвхөн энэ браузерт хадгалагдана.</span>
    </nav>
    {admin ? <div className="min-h-screen space-y-8 bg-slate-50 p-6 text-slate-800 [color-scheme:light]">
      <div className="max-w-4xl space-y-3">
        <HeroSliderSettings value={interval} onChange={value => { setInterval(value); setSaved(false); }} />
        <button type="button" disabled={!isValidHeroSliderInterval(interval)} className="rounded-xl bg-[#003B5C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50" onClick={() => { localStorage.setItem('scm-slider-preview-interval', String(interval)); setSaved(true); }}>Хугацааг хадгалах</button>
        {saved && <p role="status" className="text-sm text-emerald-700">Хугацаа хадгалагдлаа. Нүүрний слайдерыг дахин нээж шалгана уу.</p>}
      </div>
      <SafetyNoticesAdmin token="local-preview" />
    </div> : <section className="relative h-[calc(100svh-40px)] min-h-[640px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/10 px-6 py-6 md:px-16">
        <img src={logoWhite} alt="Solongo Capital" className="h-8 w-auto md:h-10" />
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 md:block">Таны санхүүгийн найдвартай түнш</span>
      </div>
      <PromotionSlider
        promotions={[]}
        fallbackBg={heroBackground}
        intervalSeconds={interval}
        initialSlideKind="safety"
        onOpen={() => {}}
        onProducts={() => {}}
        homeSlide={{ kind: 'home', backgroundImageUrl: heroBackground, logo: logoGold, logoClassName: 'h-24 md:h-32 object-contain mb-4', line1: 'Бизнесийн', highlight: 'Өсөлтийг', line2: 'Дэмжинэ', description: 'Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.', button: 'Бүтээгдэхүүн үзэх' }}
      />
    </section>}
  </>;
}

// Local development preview only. No requests or writes to a production API.
if (import.meta.env.DEV) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (url, options = {}) => {
    if (!String(url).includes('/safety-notices')) return nativeFetch(url, options);
    if (window.failSafety) return new Response('{}', { status: 503 });
    let data = JSON.parse(localStorage.getItem('scm-safety-preview') || 'null') || { notices: DEFAULT_SAFETY_NOTICES, revision: 0 };
    if (options.method === 'PUT') {
      try {
        const update = validateSafetyNoticeUpdate(JSON.parse(options.body));
        if (window.conflictSafety || update.revision !== data.revision) return new Response('{}', { status: 409 });
        data = { notices: update.notices, revision: data.revision + 1 };
        localStorage.setItem('scm-safety-preview', JSON.stringify(data));
      } catch {
        return new Response('{}', { status: 400 });
      }
    }
    return new Response(JSON.stringify(String(url).includes('/admin/') ? data : { notices: data.notices.filter(item => item.isPublished).sort((a, b) => a.order - b.order) }), { headers: { 'Content-Type': 'application/json' } });
  };
  const admin = new URLSearchParams(location.search).get('view') === 'admin';
  createRoot(document.getElementById('root')).render(<SafetyPreview admin={admin} />);
}
