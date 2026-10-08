import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import logoMetal from '../assets/logo-metal.png';

export default function ContactSection({ getSectionBackgroundStyle }) {
  const { cfg, navigateTo } = useAppContext();

  return (
    <section id="contact" className="relative min-h-screen flex items-center text-white sc-section-band" style={getSectionBackgroundStyle('contact', BACKGROUNDS.contact, { fixed: false })}>
      <div className="absolute inset-0 sc-overlay-92"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-24">
          <div className="sc-glass-panel rounded-lg p-6 md:p-9">
            <img src={logoMetal} alt="Solongo Capital Metal" className="h-16 mb-10 object-contain brightness-0 invert opacity-80" />
            <span className="sc-kicker mb-2 block">Бидэнтэй нэгдээрэй</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl mb-10">Холбоо барих</h2>
            <div className="space-y-8">
                <a href={cfg?.maps_url || 'https://maps.google.com'} target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group hover:opacity-80 transition cursor-pointer">
                  <span className="w-12 h-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D] group-hover:bg-[#00A651] group-hover:text-white transition"><MapPin size={20} /></span>
                  <div>
                      <p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Хаяг</p>
                      <p className="font-display font-semibold text-lg leading-snug">{cfg.contact_address || 'Улаанбаатар хот, Хан-Уул дүүрэг, 20 хороо, Чингисийн өргөн чөлөө, Мишээл оффис төв, М3 цамхаг 12 давхар, 1207 тоот'}</p>
                  </div>
                </a>
                <div className="flex items-start gap-6 group"><span className="w-12 h-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D]"><Phone size={20} /></span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">Утас</p><p className="font-display font-semibold text-xl tabular-nums">{cfg.contact_phone || '7599 1919, 7599 9191'}</p></div></div>
                <div className="flex items-start gap-6 group"><span className="w-12 h-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-xl text-[#007A3D]"><Mail size={20} /></span><div><p className="text-gray-400 text-xs font-display uppercase tracking-wider mb-1">И-мэйл</p><p className="font-display font-semibold text-xl break-words">{cfg.contact_email || 'info@scm.mn'}</p></div></div>
            </div>
          </div>

          <div className="p-0 lg:p-8 flex items-center justify-center">
            {cfg.contact_image ? (
              <img src={cfg.contact_image} alt="Холбоо барих" loading="lazy" className="w-full max-h-96 object-cover rounded-lg shadow-2xl" />
            ) : (
              <div className="sc-glass-panel w-full max-h-96 h-64 rounded-lg flex items-center justify-center text-white/45 text-sm">
                Зураг оруулаагүй байна
              </div>
            )}
          </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-0 w-full border-t border-white/10 pt-6 pb-4 px-4">
          {/* Trust strip */}
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40 mb-4">
            <div className="flex items-center gap-6 flex-wrap justify-center md:justify-start">
              <span>&copy; {new Date().getFullYear()} Solongo Capital ББСБ</span>
              {cfg?.license_number && (
                <span>СЗХ лиценз: {cfg.license_number}</span>
              )}
              {cfg?.founded_year && (
                <span>{cfg.founded_year} онд байгуулагдсан</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/privacy-policy"
                onClick={(e) => { e.preventDefault(); navigateTo('privacy_policy'); }}
                className="hover:text-white/70 transition-colors cursor-pointer"
              >
                Нууцлалын бодлого
              </a>
              <a
                href="/terms"
                onClick={(e) => { e.preventDefault(); navigateTo('terms'); }}
                className="hover:text-white/70 transition-colors cursor-pointer"
              >
                Үйлчилгээний нөхцөл
              </a>
            </div>
          </div>
          <div className="text-center">
            <button
                onClick={() => navigateTo('shogun_studio')}
                className="relative z-[60] pointer-events-auto text-xs font-sans font-bold tracking-wider hover:opacity-80 transition-opacity cursor-pointer inline-block py-2 px-4"
            >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F4E285] to-[#D4AF37]">
                    Website by ShogunAi Studio
                </span>
            </button>
          </div>
      </div>
    </section>
  );
}
