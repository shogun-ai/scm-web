import { ArrowLeft } from 'lucide-react';

export default function PublicPageShell({ title, description, eyebrow = 'Мэдээлэл', onBack, children }) {
  return (
    <div className="sc-public-page min-h-screen bg-[#f7f8f6] text-[#062842] pb-20">
      <header className="bg-[#062842] text-white pt-28 pb-10 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {onBack && <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"><ArrowLeft size={16} /> Нүүр хуудас</button>}
          <p className="text-sm font-medium text-[#e2c56e] mb-3">{eyebrow}</p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{title}</h1>
          {description && <p className="mt-4 max-w-3xl text-base leading-7 text-white/75">{description}</p>}
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">{children}</div>
    </div>
  );
}
