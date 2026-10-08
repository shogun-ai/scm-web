import React, { useEffect } from 'react';
import { BACKGROUNDS } from '../data/constants';
import { useAppContext } from '../context/AppContext';

const ChatInfoDetailPage = () => {
    const { selectedItem, navigateTo } = useAppContext();
    const { product, section, audience } = selectedItem;

    useEffect(() => window.scrollTo(0, 0), []);
    const isDocuments = section === 'documents';
    const field = isDocuments ? 'requirements' : 'conditions';
    const title = isDocuments ? 'Бүрдүүлэх баримт бичиг' : 'Үйлчилгээний нөхцөл';
    const headerBg = product.headerImage || product.bgImage || BACKGROUNDS.detail_page;
    const productIntro = !isDocuments ? (product.chatbotText || product.description || product.shortDesc || '') : '';

    const collectGroups = (type) => {
        const groups = [];
        const baseItems = product?.[type]?.[field] || [];
        if (baseItems.length) groups.push({ label: null, items: baseItems });
        if (product?.purchase?.[type]?.[field]?.length) {
            groups.push({ label: product.purchase.label || 'Автомашины зээл', items: product.purchase[type][field] });
        }
        if (product?.collateral?.[type]?.[field]?.length) {
            groups.push({ label: product.collateral.label || 'Автомашин барьцаалсан зээл', items: product.collateral[type][field] });
        }
        return groups;
    };

    const sections = [
        { key: 'individual', label: 'Иргэн' },
        { key: 'organization', label: 'Байгууллага' }
    ].filter(item => !audience || item.key === audience)
      .map(item => ({ ...item, groups: collectGroups(item.key) }))
      .filter(item => item.groups.length);

    return (
        <div className="min-h-screen bg-slate-50 pb-14 text-slate-800">
            <div className="relative h-56 bg-cover bg-center" style={{ backgroundImage: `url(${headerBg})` }}>
                <div className="absolute inset-0 bg-[#003B5C]/75"></div>
                <button onClick={() => navigateTo('home')} className="absolute left-4 top-5 z-10 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">Буцах</button>
                <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
                    <p className="text-xs font-semibold uppercase text-[#D4AF37]">Солонго Капитал</p>
                    <h1 className="mt-2 text-2xl font-bold">{product.title}</h1>
                    <p className="mt-2 text-sm text-white/85">{title}</p>
                </div>
            </div>
            <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
                {productIntro && (
                    <section className="rounded-lg border border-[#003B5C]/10 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#007A3D]">Товч танилцуулга</p>
                        <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-700">
                            {productIntro.split('\n').filter(Boolean).map((line, index) => (
                                <p key={index}>{line.replace(/\*\*/g, '')}</p>
                            ))}
                        </div>
                    </section>
                )}
                {sections.map(sectionItem => (
                    <section key={sectionItem.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-[#003B5C] px-4 py-3 text-sm font-bold text-white">{sectionItem.label}</div>
                        <div className="space-y-4 p-4">
                            {sectionItem.groups.map((group, groupIndex) => (
                                <div key={`${sectionItem.key}-${groupIndex}`}>
                                    {group.label && <h3 className="mb-2 text-sm font-bold text-[#003B5C]">{group.label}</h3>}
                                    <ul className="space-y-2">
                                        {group.items.map((item, index) => (
                                            <li key={index} className="flex gap-3 rounded-md bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00A651] text-xs font-bold text-white">{index + 1}</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
                {!sections.length && (
                    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">Мэдээлэл одоогоор бүртгэгдээгүй байна.</div>
                )}
            </main>
        </div>
    );
};

export default ChatInfoDetailPage;
