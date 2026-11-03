import { Ban, CreditCard, ShieldCheck, TriangleAlert } from 'lucide-react';
import { safePosterUrl } from '../safetyNoticesApi';

const reminders = [
  { icon: <Ban size={22} strokeWidth={1.5} aria-hidden="true" />, title: 'Оролцохгүй байх', body: 'Цахим мөрийтэй тоглоом, бооцоо, төлбөрт тааварт бүү оролцоорой.' },
  { icon: <CreditCard size={22} strokeWidth={1.5} aria-hidden="true" />, title: 'Дансаа хамгаалах', body: 'Данс, картаа бусдад ашиглуулж, мөрийтэй тоглоомын мөнгө дамжуулахгүй байхыг анхааруулж байна.' },
  { icon: <ShieldCheck size={22} strokeWidth={1.5} aria-hidden="true" />, title: 'Санхүүгээ хамгаалах', body: 'Хурдан ашиг олох амлалтад автахгүй, өөрийн болон гэр бүлийн санхүүг эрсдэлээс хамгаалаарай.' },
];

export default function GamblingWarning({ posterUrl }) {
  return (
    <section className="relative h-full overflow-y-auto overscroll-contain bg-[#061f32] text-white" aria-labelledby="gambling-warning-title" tabIndex={0}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 85% 25%, rgba(212,175,55,.14), transparent 55%)' }} />
      <div className="relative mx-auto flex min-h-full max-w-[1440px] items-center px-6 pb-28 pt-28 sm:px-14 md:px-20 lg:px-24">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="min-w-0">
            <p className="mb-6 flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#e8c966]">
              <TriangleAlert className="shrink-0" size={22} aria-hidden="true" /> Аюулгүй байдлын сэрэмжлүүлэг зөвлөмж #2
            </p>
            <h2 id="gambling-warning-title" className="break-words font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl xl:text-5xl">
              МӨРИЙТЭЙ ТОГЛООМООС <span className="text-[#e8c966]">ТАТГАЛЗЪЯ</span>
            </h2>
            <div aria-hidden="true" className="my-7 h-px w-16 bg-[#d4af37]" />
            <p className="max-w-xl text-base leading-8 text-[#cad7de]">Мөрийтэй тоглоом нь мөнгөн алдагдал, өр төлбөр, санхүүгийн хүндрэлд хүргэх эрсдэлтэй.</p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#cad7de]">Төлбөрт таавар, бооцоот тоглоом, цахим мөрийтэй тоглоомын үйл ажиллагаа эрхлэхийг хуулиар хориглосон.</p>
            <p className="mt-3 text-xs leading-6 text-[#cad7de]">Холбогдох зохицуулалт: Эрүүгийн хуулийн 20.18, 20.19 дүгээр зүйл.</p>
            <a href="https://fiu.mongolbank.mn/mn/r/2220" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#e8c966] underline underline-offset-4 hover:text-white">Хуулийн мэдээлэл <span className="sr-only">(шинэ цонхонд нээгдэнэ)</span></a>
            {safePosterUrl(posterUrl) && <a href={safePosterUrl(posterUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-11 w-fit items-center rounded-full border border-[#e8c966]/60 px-5 py-3 text-sm font-semibold text-[#e8c966] hover:bg-white/10">Постер үзэх<span className="sr-only">(шинэ цонхонд нээгдэнэ)</span></a>}
            <p className="mt-6 max-w-xl border-l-2 border-[#d4af37] pl-5 text-lg font-semibold leading-8 text-white">Өнөөдрийн зөв сонголт —<br />маргаашийн санхүүгийн хамгаалалт.</p>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {reminders.map(({ icon, title, body }) => (
              <article key={title} className="py-5 md:py-6">
                <h3 className="mb-3 flex items-center gap-3 text-base font-semibold md:text-lg"><span className="shrink-0 text-[#e8c966]">{icon}</span>{title}</h3>
                <p className="text-sm leading-7 text-[#b7c9d4] md:pl-9">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
