import React, { useState, useId } from 'react';
import { BACKGROUNDS } from '../data/constants';

const FAQ_ITEMS = [
  {
    question: 'Зээлийн өргөдлийг яаж илгээх вэ?',
    answer:
      'Манай вэбсайтын "Зээлийн хүсэлт" товчийг дараад онлайн маягтыг бөглөнө үү. Маягтыг дүүргэж, шаардлагатай баримт бичгүүдийг хавсаргаад илгээнэ үү. Манай ажилтан 24 цагийн дотор тантай холбогдоно.',
  },
  {
    question: 'Зээл батлагдахад хэр хугацаа шаардлагатай вэ?',
    answer:
      'Зээлийн хүсэлтийг хүлээн авснаас хойш ажлын 1-3 өдрийн дотор шийдвэр гардаг. Барьцаа хөрөнгийн үнэлгээ болон баримт бичгийн нягталт дуусмагц эцсийн хариуг мэдэгдэнэ.',
  },
  {
    question: 'Зээлийн хүү хэд вэ?',
    answer:
      'Зээлийн хүү нь зээлийн төрөл, хугацаа, барьцаа хөрөнгөөс хамааран сарын 1.5%-2.5% байдаг. Дэлгэрэнгүй нөхцөлийг зээлийн ажилтантай тохиролцоно. Тооцоолуур хэсгээс жишиг тооцоо харж болно.',
  },
  {
    question: 'Итгэлцлийн хөрөнгө оруулалт гэж юу вэ?',
    answer:
      'Итгэлцлийн хөрөнгө оруулалт нь таны мөнгийг мэргэжлийн баг удирдаж, зах зээлийн дунджаас өндөр өгөөж авах боломжтой санхүүгийн бүтээгдэхүүн юм. Бид таны хөрөнгийг найдвартай, ил тод байдлаар удирдана.',
  },
  {
    question: 'Онлайн маягт дүүргэхэд ямар баримт бичиг хэрэгтэй вэ?',
    answer:
      'Иргэний үнэмлэх (скан эсвэл зураг), оршин суугаа хаягийн лавлагаа, НДШ-ийн 3 сарын лавлагаа, дансны 12 сарын хуулга, зээлийн мэдээллийн лавлагаа шаардлагатай. Байгууллагын хувьд нэмэлтээр улсын бүртгэлийн гэрчилгээ, санхүүгийн тайлан хэрэгтэй.',
  },
  {
    question: 'Холбоо барих утас, цагийн хуваарь?',
    answer:
      'Утас: 7599 1919, 7599 9191 — Даваа-Баасан: 09:00-18:00 цаг. И-мэйл: info@scm.mn. Хан-Уул дүүрэг, Мишээл оффис төв, М3 цамхаг 12 давхар, 1207 тоот.',
  },
];

const FAQItem = ({ item, isOpen, onToggle }) => {
  const answerId = useId();
  const headingId = useId();

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
      <button
        id={headingId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset"
      >
        <span className="font-display font-bold text-base md:text-lg text-white leading-snug">
          {item.question}
        </span>
        <span
          aria-hidden="true"
          className={`flex-shrink-0 w-7 h-7 rounded-full border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-bold text-lg transition-transform duration-300 ${
            isOpen ? 'rotate-45 bg-[#D4AF37]/10' : ''
          }`}
        >
          +
        </span>
      </button>

      <div
        id={answerId}
        role="region"
        aria-labelledby={headingId}
        hidden={!isOpen}
      >
        <p className="px-6 pb-6 text-sm md:text-base text-gray-300 leading-relaxed font-sans">
          {item.answer}
        </p>
      </div>
    </div>
  );
};

export default function FAQSection({ getSectionBackgroundStyle }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => setOpenIndex((prev) => (prev === idx ? null : idx));

  const sectionStyle = getSectionBackgroundStyle
    ? getSectionBackgroundStyle('blog', BACKGROUNDS.about, { fixed: false })
    : { backgroundImage: `url(${BACKGROUNDS.about})`, backgroundSize: 'cover' };

  return (
    <section
      id="faq"
      className="relative min-h-fit text-white sc-section-band"
      style={sectionStyle}
    >
      <div className="absolute inset-0 sc-overlay-90" aria-hidden="true" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-24">
        <div className="text-center mb-14">
          <span className="sc-kicker mb-2 block">Түгээмэл асуулт</span>
          <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white">
            Танд ямар асуулт байна вэ?
          </h2>
          <div className="w-16 h-1 bg-[#D4AF37] mx-auto mt-6 rounded-full" />
        </div>

        <div className="space-y-3" role="list">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} role="listitem">
              <FAQItem
                item={item}
                isOpen={openIndex === idx}
                onToggle={() => toggle(idx)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
