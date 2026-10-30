import React, { useState, useId } from 'react';

const FAQ_ITEMS = [
  {
    question: 'Зээлийн өргөдлийг яаж илгээх вэ?',
    answer:
      'Манай вэбсайтын "Зээлийн хүсэлт" товчийг дараад онлайн маягтыг бөглөнө үү. Маягтыг дүүргэж, шаардлагатай баримт бичгүүдийг хавсаргаад илгээнэ үү. Хүсэлтийн явц, шийдвэрлэх хугацааг манай ажилтнаас тодруулна уу.',
  },
  {
    question: 'Зээл батлагдахад хэр хугацаа шаардлагатай вэ?',
    answer:
      'Шийдвэрлэх хугацаа нь баримт бичгийн бүрдэл, нягталт болон барьцаа хөрөнгийн үнэлгээнээс хамаарна. Өөрийн хүсэлтийн хугацааг зээлийн ажилтнаас тодруулна уу.',
  },
  {
    question: 'Зээлийн хүү хэд вэ?',
    answer:
      'Зээлийн хүү нь сонгосон бүтээгдэхүүн, хугацаа, барьцаа хөрөнгөөс хамаарна. Бүтээгдэхүүний дэлгэрэнгүй хэсэгт нийтэлсэн нөхцөлтэй танилцаж, зээлийн ажилтнаас тодруулна уу. Тооцоолуур хэсгээс жишиг тооцоо харж болно.',
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
    <div className="border-b border-[#102D43]/15 overflow-hidden">
      <button
        id={headingId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full flex items-center justify-between gap-4 px-1 py-6 text-left hover:bg-[#102D43]/[0.025] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset"
      >
        <span className="font-display font-bold text-base md:text-lg text-[#102D43] leading-snug">
          {item.question}
        </span>
        <span
          aria-hidden="true"
          className={`flex-shrink-0 w-7 h-7 rounded-full border border-[#102D43]/25 flex items-center justify-center text-[#102D43] font-bold text-lg transition-transform duration-300 ${
            isOpen ? 'rotate-45 bg-[#102D43]/5' : ''
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
        <p className="pl-1 pr-10 pb-6 text-sm md:text-base text-[#596975] leading-relaxed font-sans">
          {item.answer}
        </p>
      </div>
    </div>
  );
};

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => setOpenIndex((prev) => (prev === idx ? null : idx));

  return (
    <section
      id="faq"
      className="bg-[#F8F7F3] text-[#102D43]"

    >

      <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 py-20 md:py-24">
        <div className="mb-8 md:mb-12">
          <span className="text-xs font-semibold tracking-[0.18em] text-[#706044] mb-4 block">Түгээмэл асуулт</span>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-[#102D43] tracking-tight">
            Танд ямар асуулт байна вэ?
          </h2>

        </div>

        <div className="border-t border-[#102D43]/15" role="list">
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
