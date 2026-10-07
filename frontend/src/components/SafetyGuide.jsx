import { X, ShieldCheck, Phone } from 'lucide-react';

function TextLine({ text }) {
  const value = text.trim();
  const linkClass = 'font-semibold text-[#e8c966] underline decoration-[#e8c966]/40 underline-offset-4 hover:text-white';
  if (/^https?:\/\/[^\s]+$/i.test(value)) return <a href={value} target="_blank" rel="noopener noreferrer" className={linkClass}>{value}</a>;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) return <a href={`mailto:${value}`} className={linkClass}>{value}</a>;
  if (/^\d[\d -]{1,15}\d$/.test(value)) return <a href={`tel:${value.replace(/[ -]/g, '')}`} className="inline-flex items-center gap-2 text-xl font-bold text-[#e8c966]"><Phone size={17} aria-hidden="true" />{value}</a>;
  return value;
}

function NoticeBody({ body }) {
  return <div className="space-y-5 text-sm leading-7 text-[#c5d5df] md:text-base md:leading-8">
    {body.split(/\n\s*\n/).map((block, index) => {
      const lines = block.split('\n').filter(Boolean);
      if (lines.every(line => /^[-•]\s/.test(line))) return <ul key={index} className="space-y-3 pl-5 marker:text-[#d4af37]" style={{ listStyleType: 'disc' }}>{lines.map((line, i) => <li key={i}>{line.replace(/^[-•]\s/, '')}</li>)}</ul>;
      return <div key={index} className="space-y-2">{lines.map((line, i) => <p key={i} className={`${/^\d+\. /.test(line) && lines.length === 2 ? 'font-semibold text-white' : ''} break-words`}><TextLine text={line} /></p>)}</div>;
    })}
  </div>;
}

export default function SafetyGuide({ notices, dialogRef }) {
  return <dialog ref={dialogRef} aria-labelledby="safety-guide-title" className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto bg-[#061f32] p-0 text-white backdrop:bg-black/80">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#061f32]/95 px-5 py-4 backdrop-blur-lg md:px-10">
      <div className="flex items-center gap-3"><ShieldCheck className="shrink-0 text-[#e8c966]" size={22} /><h2 id="safety-guide-title" className="text-sm font-bold md:text-lg">Сэрэмжлүүлэг, аюулгүй байдлын зөвлөмж</h2></div>
      <button autoFocus type="button" onClick={() => dialogRef.current?.close()} className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10" aria-label="Зөвлөмжийг хаах"><span className="hidden sm:inline">Хаах</span><X size={20} /></button>
    </header>
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:px-10 lg:grid-cols-[260px_1fr] lg:gap-16 lg:py-16">
      <nav aria-label="Зөвлөмжийн агуулга" className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#e8c966]">Агуулга</p>
        <div className="flex flex-col gap-1">{notices.map((notice, index) => <button key={notice.id} type="button" onClick={() => dialogRef.current?.querySelector(`[data-notice-index="${index}"]`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })} className="flex gap-3 rounded-lg px-2 py-3 text-left text-sm leading-6 text-[#b7c9d4] hover:bg-white/5 hover:text-white"><span className="text-[#d4af37]">{String(index + 1).padStart(2, '0')}</span><span>{notice.title}</span></button>)}</div>
      </nav>
      <div className="min-w-0 space-y-12">{notices.map((notice, index) => <section key={notice.id} data-notice-index={index} className={`scroll-mt-28 ${notice.id === 'emergency' ? 'rounded-2xl border border-[#d4af37]/50 bg-[#d4af37]/10 p-6 md:p-8' : 'border-b border-white/10 pb-10'}`}>
        <h3 className="mb-6 break-words text-xl font-bold leading-snug text-white md:text-2xl">{notice.title}</h3>
        <NoticeBody body={notice.body} />
      </section>)}</div>
    </div>
  </dialog>;
}
