import React from 'react';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function ContactSection({ getSectionBackgroundStyle }) {
  const { cfg, navigateTo } = useAppContext();
  const address = cfg.contact_address || 'Улаанбаатар хот, Хан-Уул дүүрэг, 20 хороо, Чингисийн өргөн чөлөө, Мишээл оффис төв, М3 цамхаг 12 давхар, 1207 тоот';
  const phones = String(cfg.contact_phone || '7599 1919, 7599 9191').split(/[,;]/).map((phone) => phone.trim()).filter(Boolean);
  const email = cfg.contact_email || 'info@scm.mn';
  const mapsUrl = cfg.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <section
      id="contact"
      className="bg-[#0B2336] text-white relative"
      style={cfg.contact_image
        ? { backgroundImage: `url(${cfg.contact_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : getSectionBackgroundStyle?.('contact', null, { fixed: false, surface: '#0B2336' })
      }
    >
      {cfg.contact_image && <div className="absolute inset-0 bg-[#0B2336]/80" aria-hidden="true" />}
      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 grid lg:grid-cols-2 gap-12 lg:gap-24 py-20 md:py-24">
        <div>
          <span className="text-xs font-semibold tracking-[0.18em] text-[#D8C6A5] mb-4 block">ХОЛБОО БАРИХ</span>
          <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight mb-10">Ярилцаад эхэлье.</h2>
          <div className="space-y-7">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 hover:text-[#D8C6A5] transition"><MapPin size={21} className="text-[#D8C6A5] shrink-0 mt-1" /><div><p className="text-white/60 text-xs mb-2">Хаяг · Газрын зураг харах ↗</p><p className="font-medium text-sm md:text-base leading-relaxed">{address}</p></div></a>
            <div className="flex items-start gap-4"><Phone size={21} className="text-[#D8C6A5] shrink-0 mt-1" /><div><p className="text-white/60 text-xs mb-2">Утас</p><div className="flex flex-wrap gap-x-4 gap-y-2">{phones.map((phone) => <a key={phone} href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="font-medium text-lg tabular-nums hover:text-[#D8C6A5]">{phone}</a>)}</div></div></div>
            <div className="flex items-start gap-4"><Mail size={21} className="text-[#D8C6A5] shrink-0 mt-1" /><div className="min-w-0"><p className="text-white/60 text-xs mb-2">И-мэйл</p><a href={`mailto:${email}`} className="font-medium text-lg break-words hover:text-[#D8C6A5]">{email}</a></div></div>
          </div>
        </div>
        <div className="lg:self-center">
          <div className="border-t border-white/20 pt-7">
            <h3 className="font-display text-2xl font-semibold mb-3">Дараагийн алхмаа сонгоорой</h3>
            <p className="text-white/65 text-sm leading-relaxed mb-7">Зээлийн хүсэлтээ онлайнаар илгээх эсвэл итгэлцлийн үйлчилгээний талаар бидэнтэй холбогдоорой.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => navigateTo('loan_request')} className="inline-flex justify-center items-center gap-3 rounded-lg bg-[#E5D5B5] text-[#102D43] px-5 py-3.5 font-semibold text-sm hover:bg-[#F0E4CF] transition">Зээлийн хүсэлт илгээх <ArrowRight size={17} /></button>
              <button type="button" onClick={() => navigateTo('trust_request')} className="rounded-lg border border-white/30 px-5 py-3.5 font-semibold text-sm hover:bg-white/10 transition">Итгэлцлийн хүсэлт</button>
            </div>
          </div>
        </div>
      </div>
      <footer className="relative z-10 border-t border-white/15 px-5 md:px-8 py-7">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-5 text-xs text-white/60">
          <div className="flex flex-wrap gap-x-5 gap-y-2"><span>&copy; {new Date().getFullYear()} Солонго Капитал ББСБ</span>{cfg.license_number && <span>СЗХ лиценз: {cfg.license_number}</span>}{cfg.founded_year && <span>{cfg.founded_year} онд байгуулагдсан</span>}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-3"><a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigateTo('privacy_policy'); }} className="hover:text-white transition">Нууцлалын бодлого</a><a href="/terms" onClick={(e) => { e.preventDefault(); navigateTo('terms'); }} className="hover:text-white transition">Үйлчилгээний нөхцөл</a></div>
        </div>
        <div className="max-w-7xl mx-auto mt-5"><button type="button" onClick={() => navigateTo('shogun_studio')} className="text-xs text-[#D8C6A5] hover:text-white py-2 transition">Website by ShogunAi Studio</button></div>
      </footer>
    </section>
  );
}
