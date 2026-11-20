import { useState } from 'react';
import { ChevronLeft, Info, Phone, Video } from 'lucide-react';
import logo from '../../assets/logo-colored.png';

const PAGE_NAME = 'Солонго Капитал ББСБ';

const NODE_SECTION = { restart: 'menu', menu: 'menu', loans: 'loans', trust: 'trust', payment: 'payment', contact: 'contact' };

const SECTION_TEXT = {
  menu: 'Сайн байна уу! Солонго Капитал ББСБ. Танд юугаар туслах вэ?',
  loans: 'Идэвхтэй зээлийн бүтээгдэхүүнүүд:',
  trust: 'Итгэлцлийн үйлчилгээ:',
  payment: 'Төлбөр хүлээн авах данснууд:',
  contact: 'Холбоо барих мэдээлэл:',
};

const QUICK = {
  menu: [['Зээл', 'loans'], ['Итгэлцэл', 'trust'], ['Идэвхтэй зээлийн зар', 'ads'], ['Төлөлт хийх', 'payment']],
  loans: [['Итгэлцэл', 'trust'], ['Цэс', 'restart']],
  trust: [['Зээл', 'loans'], ['Цэс', 'restart']],
  payment: [['Цэс', 'restart']],
  contact: [['Зээл', 'loans'], ['Цэс', 'restart']],
};

const MOCK = {
  terms: 'Нөхцөл, шаардлагын мессеж энд гарна.',
  apply: 'Хүсэлт гаргах: Messenger дотор товч хүсэлтийн маягт нээгдэнэ.',
  calculator: 'Тооцоолуур нээгдэнэ (вэбсайт).',
  url: 'Холбоос нээгдэнэ.',
  call: 'Утасны дуудлага эхэлнэ.',
  post: 'Постын зураг, бүтэн текст харагдана.',
  ads: 'Page-ийн сүүлийн 6 постын карт харагдана.',
};

export default function MessengerEmulator({ section, cards, defaultImageUrl, onNavigate }) {
  const [mockState, setMock] = useState({ section, text: '' });
  const mock = mockState.section === section ? mockState.text : '';

  const visible = (Array.isArray(cards) ? cards : []).filter((c) => c && c.active !== false);
  const go = (nodeId) => {
    const target = NODE_SECTION[nodeId];
    if (target) onNavigate(target); else if (nodeId === 'ads') setMock({ section, text: MOCK.ads });
  };
  const pressButton = (b) => {
    if (b.type === 'node') go(b.value);
    else setMock({ section, text: MOCK[b.type] || '' });
  };

  return <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-white shadow-xl" aria-label="Messenger урьдчилсан харагдац">
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <ChevronLeft size={20} className="text-[#0084FF]" aria-hidden="true" />
      <img src={logo} alt="" className="h-8 w-8 rounded-full border border-slate-200 bg-white object-contain" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">{PAGE_NAME}</p>
        <p className="text-[11px] leading-tight text-slate-500">Идэвхтэй</p>
      </div>
      <Phone size={17} className="text-[#0084FF]" aria-hidden="true" />
      <Video size={18} className="text-[#0084FF]" aria-hidden="true" />
      <Info size={17} className="text-[#0084FF]" aria-hidden="true" />
    </div>

    <div className="h-[520px] space-y-2 overflow-y-auto bg-white px-3 py-3">
      <div className="flex items-end gap-2">
        <img src={logo} alt="" className="h-6 w-6 shrink-0 rounded-full border border-slate-200 object-contain" />
        <p className="max-w-[78%] rounded-2xl bg-[#F0F0F0] px-3 py-2 text-[13px] leading-snug text-slate-900">{SECTION_TEXT[section] || SECTION_TEXT.menu}</p>
      </div>

      {visible.length === 0 ? <p className="pl-8 text-xs text-slate-400">Идэвхтэй карт алга.</p> : (
        <div className="flex snap-x gap-2 overflow-x-auto pb-2 pl-8" tabIndex={0} aria-label="Картууд">
          {visible.map((card) => {
            const img = card.imageUrl || defaultImageUrl;
            return <div key={card.id} className="w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="aspect-[1.91/1] w-full bg-slate-100">
                {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="px-3 py-2">
                <p className="text-[14px] font-bold leading-tight text-slate-900">{card.title || 'Гарчиг'}</p>
                {card.subtitle && <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{card.subtitle}</p>}
              </div>
              {(card.buttons || []).map((b, i) => <button key={i} type="button" onClick={() => pressButton(b)} className="block min-h-9 w-full border-t border-slate-200 px-3 py-2 text-center text-[13px] font-semibold text-[#0084FF] hover:bg-slate-50">{b.title || 'Товч'}</button>)}
            </div>;
          })}
        </div>
      )}

      {mock && <div className="flex items-end gap-2" role="status">
        <img src={logo} alt="" className="h-6 w-6 shrink-0 rounded-full border border-slate-200 object-contain" />
        <p className="max-w-[78%] rounded-2xl bg-[#F0F0F0] px-3 py-2 text-[12px] italic leading-snug text-slate-600">{mock}</p>
      </div>}
    </div>

    <div className="flex flex-wrap justify-end gap-1.5 border-t border-slate-100 bg-white px-3 py-2">
      {(QUICK[section] || QUICK.menu).map(([label, node]) => <button key={label} type="button" onClick={() => go(node)} className="rounded-full border border-[#0084FF] px-3 py-1 text-[12px] font-medium text-[#0084FF] hover:bg-[#0084FF]/10">{label}</button>)}
    </div>
  </div>;
}
