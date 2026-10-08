import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';
import Breadcrumb from '../components/Breadcrumb';
import { useAppContext } from '../context/AppContext';

const ProductDetailPage = () => {
    const { selectedItem, navigateTo, scrollToSection } = useAppContext();
    const product = selectedItem;

    // Hooks must be called unconditionally — before any early return
    const getInitialTab = () => {
        if (!product) return 'individual';
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t) return t;
        if (product.isCarLoan) return 'purchase';
        if (product.individual) return 'individual';
        if (product.organization) return 'organization';
        return 'individual';
    };
    const getInitialSubTab = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('sub') || 'individual';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [subTab, setSubTab] = useState(getInitialSubTab);

    useEffect(() => window.scrollTo(0, 0), []);

    if (!product) {
        return (
            <div className="min-h-screen bg-[#041621] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-white/50">Бүтээгдэхүүн олдсонгүй.</p>
                    <button
                        onClick={() => navigateTo('home')}
                        className="px-6 py-2 bg-[#003B5C] text-white rounded-xl font-bold hover:bg-[#002d47] transition"
                    >
                        Нүүр хуудас руу буцах
                    </button>
                </div>
            </div>
        );
    }

    const productKey = product.productKey || product.id;

    const updateUrl = (tab, sub) => {
        const params = new URLSearchParams();
        params.set('tab', tab);
        if (product.isCarLoan) params.set('sub', sub);
        window.history.pushState({}, '', `/products/${productKey}?${params.toString()}`);
    };

    const handleSetActiveTab = (tab) => {
        setActiveTab(tab);
        updateUrl(tab, subTab);
    };

    const handleSetSubTab = (sub) => {
        setSubTab(sub);
        updateUrl(activeTab, sub);
    };

    const isTrust = product.id === 4;

    const getStandardTabs = () => {
        const tabs = [];
        if (product.individual) tabs.push({ key: 'individual', label: 'Иргэн' });
        if (product.organization) tabs.push({ key: 'organization', label: 'Байгууллага' });
        return tabs;
    };

    const getData = () => {
        if (product.isCarLoan) {
            const base = product[activeTab];
            return base?.[subTab] || null;
        }
        return product[activeTab] || null;
    };
    const currentData = getData();

    const headerBg = product.headerImage || BACKGROUNDS.detail_page;
    const ProductIcon = product.icon;

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 md:px-6 relative text-white"
             style={{ backgroundImage: `url(${BACKGROUNDS.detail_page})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
        >
            <Helmet>
                <title>{product?.title || 'Бүтээгдэхүүн'} | Solongo Capital</title>
                <meta name="description" content={product?.description?.slice(0, 150) || ''} />
            </Helmet>
            <div className="absolute inset-0 sc-overlay-90 pointer-events-none"></div>
            <BackButton onClick={() => navigateTo('home')} />

            <div className="max-w-5xl mx-auto relative z-10 pt-10">
                <Breadcrumb items={[
                  { label: 'Нүүр', onClick: () => navigateTo('home') },
                  { label: 'Бүтээгдэхүүн', onClick: () => { navigateTo('home'); setTimeout(() => scrollToSection('products'), 100); } },
                  { label: selectedItem?.name || selectedItem?.title },
                ]} />
                <div className="bg-white/5 backdrop-blur-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-fade-in-up">

                    <div
                        className="relative h-64 md:h-80 overflow-hidden flex items-end p-8 md:p-12"
                        style={{ backgroundImage: `url(${headerBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                        <div className="absolute inset-0 sc-grad-bottom"></div>
                        <div className="relative z-10 text-white w-full">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-[#D4AF37]"><ProductIcon size={48} strokeWidth={1.5} /></span>
                                <h1 className="font-display font-bold text-3xl md:text-5xl leading-tight text-[#D4AF37]">{product.title}</h1>
                            </div>
                            <p className="font-sans text-blue-100 text-sm md:text-lg max-w-2xl opacity-90">{product.description}</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-14">
                         {isTrust ? (
                             <div className="animate-fade-in text-center py-10">
                                 <h3 className="font-display font-bold text-xl md:text-2xl text-white mb-6">
                                     Та манай итгэлцлийн үйлчилгээг сонирхож байвал доорх товчийг дарж хүсэлт илгээнэ үү.
                                 </h3>
                                 <p className="text-gray-300 mb-10 max-w-2xl mx-auto">
                                     Бид таны мөнгөн хөрөнгийг найдвартай өсгөж, зах зээлийн өндөр өгөөжийг санал болгож байна.
                                 </p>

                                 <div className="flex flex-col md:flex-row justify-center gap-6">
                                     <button
                                         onClick={() => navigateTo('trust_request')}
                                         className="bg-[#00A651] text-white px-10 py-4 rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg shadow-green-900/20 uppercase tracking-wider"
                                     >
                                         Итгэлцлийн хүсэлт илгээх
                                     </button>

                                     <button
                                         onClick={() => navigateTo('trust_calculator')}
                                         className="border-2 border-white/30 text-white px-10 py-4 rounded-xl font-display font-bold hover:bg-white/10 transition uppercase tracking-wider"
                                     >
                                         Тооцоолуур
                                     </button>
                                 </div>
                             </div>
                         ) : (
                             <>
                                {product.isCarLoan ? (
                                    <div className="mb-10">
                                        <div className="flex space-x-2 bg-white/10 p-1.5 rounded-xl mb-6 w-full overflow-x-auto border border-white/5">
                                            <button onClick={() => handleSetActiveTab('purchase')} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'purchase' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Автомашины зээл</button>
                                            <button onClick={() => handleSetActiveTab('collateral')} className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'collateral' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Автомашин барьцаалсан зээл</button>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className="flex space-x-1 bg-white/5 p-1 rounded-lg border border-white/10">
                                                <button onClick={() => handleSetSubTab('individual')} className={`px-6 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${subTab === 'individual' ? 'bg-[#00A651] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Иргэн</button>
                                                <button onClick={() => handleSetSubTab('organization')} className={`px-6 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${subTab === 'organization' ? 'bg-[#00A651] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Байгууллага</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    getStandardTabs().length > 0 && (
                                        <div className="flex space-x-1 bg-white/10 p-1 rounded-xl mb-10 w-full md:w-fit overflow-x-auto border border-white/5">
                                            {getStandardTabs().map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => handleSetActiveTab(tab.key)}
                                                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-[#D4AF37] text-white shadow-sm' : 'text-gray-300 hover:text-white'}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    )
                                )}

                                {currentData ? (
                                    <div className="grid md:grid-cols-2 gap-8 md:gap-10 animate-fade-in">
                                        <div>
                                            <h3 className="font-display font-bold text-xl text-[#D4AF37] mb-5 border-b border-white/10 pb-2">Нөхцөл</h3>
                                            <ul className="space-y-3">
                                                {(currentData.conditions || []).map((c, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#007A3D] font-bold mt-0.5">•</span> {c}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-xl text-[#D4AF37] mb-5 border-b border-white/10 pb-2">Тавигдах шаардлага</h3>
                                            <ul className="space-y-3">
                                                {(currentData.requirements || []).map((r, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-200"><span className="text-[#007A3D] font-bold mt-0.5">✓</span> {r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-white/40 text-sm">
                                        Энэ бүтээгдэхүүний мэдээлэл удахгүй нэмэгдэнэ.
                                    </div>
                                )}

                                <div className="mt-14 pt-10 border-t border-white/10 flex flex-col md:flex-row gap-4">
                                    <button onClick={() => navigateTo('loan_request')} className="flex-1 bg-[#00A651] text-white py-4 rounded-xl font-display font-bold hover:bg-[#008f45] transition shadow-lg shadow-green-900/20">Зээлийн хүсэлт илгээх</button>
                                    <button onClick={() => navigateTo('calculator')} className="flex-1 border-2 border-white/30 text-white py-4 rounded-xl font-display font-bold hover:bg-white/10 transition">Зээлийн тооцоолуур</button>
                                </div>
                             </>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
