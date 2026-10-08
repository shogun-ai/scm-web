import { ChevronLeft } from 'lucide-react';

export default function BackButton({ onClick, currentView }) {
  if (currentView === 'home') return null;

  return (
    <button onClick={onClick} className="fixed top-24 left-4 md:left-8 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#003B5C]/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-full text-white font-sans font-semibold uppercase tracking-wider text-xs hover:bg-[#003B5C] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 shadow-lg group">
      <ChevronLeft size={15} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
      Нүүр
    </button>
  );
}
