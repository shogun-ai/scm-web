import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS, IS_VERTICAL_HERO_LOGO, USE_GOLD_LOGO } from '../data/constants';
import PromotionSlider from '../components/PromotionSlider';
import ScrollDownArrow from '../components/ScrollDownArrow';
import logoWhite from '../assets/logo-white.png';
import logoWhiteVertical from '../assets/logo-white-vertical.png';
import logoGoldVertical from '../assets/logo-gold-vertical.png';

export default function HeroSection({ heroText }) {
  const { promotions, cfg, navigateTo, scrollToSection } = useAppContext();

  return (
    <section id="home" className="relative h-screen text-left sc-section-band">
      <PromotionSlider
        promotions={promotions}
        fallbackBg={BACKGROUNDS.hero}
        intervalSeconds={cfg.hero_slider_interval ?? 15}
        onOpen={(item) => navigateTo('promotion_detail', item)}
        onProducts={() => scrollToSection('products')}
        homeSlide={{
          kind: 'home',
          backgroundImageUrl: BACKGROUNDS.hero,
          logo: IS_VERTICAL_HERO_LOGO ? (USE_GOLD_LOGO ? logoGoldVertical : logoWhiteVertical) : logoWhite,
          logoClassName: `${IS_VERTICAL_HERO_LOGO ? 'h-32 md:h-40 lg:h-52' : 'h-24 md:h-32'} object-contain mb-4 opacity-90`,
          line1: heroText.line1,
          highlight: heroText.highlight,
          line2: heroText.line2,
          description: heroText.description,
          button: heroText.button
        }}
      />
      <img
        src={IS_VERTICAL_HERO_LOGO ? (USE_GOLD_LOGO ? logoGoldVertical : logoWhiteVertical) : logoWhite}
        alt="Solongo Capital Logo"
        className="hidden"
      />
      <div className="hidden absolute inset-0 sc-overlay-80 mix-blend-multiply"></div>
      <div className="hidden relative z-10 max-w-5xl space-y-8 text-white animate-fade-in-up px-4 flex-col items-center">
        <img
          src={
            IS_VERTICAL_HERO_LOGO
            ? (USE_GOLD_LOGO ? logoGoldVertical : logoWhiteVertical)
            : logoWhite
          }
          alt="Solongo Capital Logo"
          className={`${IS_VERTICAL_HERO_LOGO ? 'h-32 md:h-40 lg:h-52' : 'h-24 md:h-32'} object-contain mb-4 opacity-90`}
        />
        <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-7xl leading-[1.1] tracking-tight">
            {heroText.line1} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A651] to-emerald-400">{heroText.highlight}</span> {heroText.line2}
        </h1>
        <p className="font-sans font-normal text-base md:text-lg lg:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed opacity-90">
            {heroText.description}
        </p>
        <div className="pt-8">
            <button
              onClick={() => scrollToSection('products')}
              className="px-10 py-4 bg-transparent border border-white/40 text-white font-sans font-semibold rounded-full transition-all duration-300 hover:bg-white/10 hover:border-white uppercase tracking-widest text-xs"
            >
              {heroText.button}
            </button>
        </div>
      </div>
      <ScrollDownArrow targetId="about-intro" />
    </section>
  );
}
