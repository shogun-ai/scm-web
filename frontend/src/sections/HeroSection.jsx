import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import PromotionSlider from '../components/PromotionSlider';

export default function HeroSection({ heroText }) {
  const { promotions, cfg, navigateTo, scrollToSection } = useAppContext();

  return (
    <section id="home" className="sc-home-hero relative text-left sc-section-band">
      <PromotionSlider
        promotions={promotions}
        fallbackBg={BACKGROUNDS.hero}
        intervalSeconds={cfg.hero_slider_interval ?? 15}
        onOpen={(item) => navigateTo('promotion_detail', item)}
        onProducts={() => scrollToSection('products')}
        onRequest={() => navigateTo('loan_request')}
        onCalculator={() => navigateTo('calculator')}
        onTrustCalculator={() => navigateTo('trust_calculator')}
        onContact={() => scrollToSection('contact')}
        homeSlide={{
          kind: 'home',
          backgroundImageUrl: BACKGROUNDS.hero,
          line1: heroText.line1,
          highlight: heroText.highlight,
          line2: heroText.line2,
          description: heroText.description,
          button: heroText.button
        }}
      />
    </section>
  );
}
