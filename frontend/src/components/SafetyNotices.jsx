import { useRef } from 'react';
import { ShieldCheck, LockKeyhole, Link2, ScanLine, ArrowUpRight } from 'lucide-react';
import SafetyGuide from './SafetyGuide';

const icons = [Link2, ScanLine, ShieldCheck];

export default function SafetyNotices({ notices = [] }) {
  const dialogRef = useRef(null);
  const safeNotices = Array.isArray(notices) ? notices : [];
  const [featured, ...remaining] = safeNotices;
  if (!featured) return null;

  return (
    <div className="relative h-full overflow-y-auto overscroll-contain bg-[#061f32] text-white" tabIndex={0} aria-label="Сэрэмжлүүлэг, зөвлөмж">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 min-h-full bg-[#061f32]" />
      {featured.imageUrl && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 min-h-full opacity-[0.16]">
          <img src={featured.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 min-h-full" style={{ background: 'linear-gradient(100deg, #061f32 38%, rgba(6,31,50,.55) 72%, rgba(6,31,50,.85))' }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 82% 30%, rgba(212,175,55,.15), transparent 50%), radial-gradient(ellipse at 5% 100%, rgba(0,166,81,.10), transparent 50%)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to right, transparent, black)' }} />
      <div className="relative mx-auto flex min-h-full max-w-[1440px] items-center px-14 pb-24 pt-28 md:px-20 lg:px-24">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="min-w-0">
            <div className="mb-7 inline-flex items-center gap-3 text-[#e8c966]">
              <ShieldCheck size={20} strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] md:text-xs">Сэрэмжлүүлэг · Зөвлөмж</span>
            </div>
            <h2 className="break-words font-display text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-[3.6rem]" style={{ lineHeight: 1.16 }}>{featured.title}</h2>
            <div className="my-7 h-px w-16 bg-[#d4af37]" />
            <p className="max-w-xl whitespace-pre-wrap break-words text-sm leading-7 text-[#cad7de] md:text-base md:leading-8">{featured.body.length > 500 ? `${featured.body.slice(0, 500)}…` : featured.body}</p>
            <button type="button" onClick={() => dialogRef.current?.showModal()} className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#d4af37]/60 bg-[#d4af37] px-5 py-3 text-sm font-bold text-[#061f32] transition hover:bg-[#e8c966]">Бүх зөвлөмжийг унших <ArrowUpRight size={18} aria-hidden="true" /></button>
            <div aria-hidden="true" className="mt-8 flex items-center gap-4 text-[#e8c966] md:mt-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5"><LockKeyhole size={20} strokeWidth={1.5} /></div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tracking-[0.18em] text-[#d9c98c]">
                <span>OTP</span><span className="text-white/20">/</span><span>••••••</span><span className="text-white/20">/</span><span>CVV</span>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            {featured.imageUrl ? (
              <div className="relative mx-auto mb-7 hidden h-56 w-56 lg:block">
                <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-[#d4af37]/40 via-transparent to-transparent blur-xl" />
                <img src={featured.imageUrl} alt={featured.title} loading="lazy" className="relative h-full w-full rounded-[1.75rem] border border-[#d4af37]/40 object-cover shadow-[0_25px_60px_rgba(0,0,0,0.45)]" />
              </div>
            ) : (
              <div aria-hidden="true" className="relative mx-auto mb-7 hidden h-36 w-36 items-center justify-center lg:flex">
                <div className="absolute inset-0 rounded-full border border-[#d4af37]/10" />
                <div className="absolute inset-3 rounded-full border border-[#d4af37]/20" />
                <div className="absolute inset-6 rounded-full bg-[#d4af37]/5 shadow-[0_0_65px_rgba(212,175,55,0.10)]" />
                <ShieldCheck className="relative text-[#e8c966]" size={60} strokeWidth={1} />
                <span className="absolute right-4 top-5 h-1.5 w-1.5 rounded-full bg-[#e8c966]" />
              </div>
            )}
            <div className="divide-y divide-white/10 border-y border-white/10">
              {remaining.slice(0, 2).map((notice, index) => {
                const Icon = icons[index % icons.length];
                const summary = notice.body.split('\n\n')[0].replace(/^[-•]\s*/, '').replace(/\n[-•]\s*/g, ' ');
                return (
                  <article key={notice.id} className="py-6 md:py-7">
                    <div className="mb-3 flex items-start gap-3">
                      {notice.imageUrl ? (
                        <img src={notice.imageUrl} alt={notice.title} loading="lazy" className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-[#d4af37]/30 object-cover" />
                      ) : (
                        <Icon className="mt-0.5 shrink-0 text-[#e8c966]" size={20} strokeWidth={1.5} aria-hidden="true" />
                      )}
                      <h3 className="min-w-0 break-words text-base font-semibold leading-snug text-white md:text-lg">{notice.title}</h3>
                    </div>
                    <p className="break-words text-sm leading-7 text-[#b7c9d4] md:pl-8">{summary.length > 170 ? `${summary.slice(0, 170)}…` : summary}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <SafetyGuide notices={safeNotices} dialogRef={dialogRef} />
    </div>
  );
}
