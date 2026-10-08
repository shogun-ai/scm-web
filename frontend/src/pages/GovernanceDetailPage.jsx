import React, { useEffect } from 'react';
import BackButton from '../components/BackButton';
import { useAppContext } from '../context/AppContext';

const GovernanceDetailPage = () => {
    const { selectedGovernance, navigateTo } = useAppContext();
    const item = selectedGovernance;

    useEffect(() => window.scrollTo(0, 0), []);
    const IconComponent = item.icon;

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center px-4 md:px-6 text-center"
             style={{
                 backgroundImage: `url(${item.bgImage})`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
                 backgroundAttachment: 'fixed'
             }}
        >
            <div className="absolute inset-0 sc-overlay-80"></div>
            <BackButton onClick={() => navigateTo('home')} />

            <div className="relative z-10 w-full max-w-7xl animate-fade-in-up pt-24 pb-10">
                <div className="space-y-8 flex flex-col items-center w-full">
                    <div className="text-6xl md:text-8xl mb-2 text-[#D4AF37] opacity-90 drop-shadow-2xl">
                        <IconComponent size={80} strokeWidth={1} />
                    </div>
                    <h1 className="font-display font-bold text-3xl md:text-5xl text-white leading-tight drop-shadow-md">
                        {item.title}
                    </h1>
                    <div className="w-24 h-1 bg-[#D4AF37] mx-auto rounded-full"></div>

                    {item.component ? (
                        <div className="w-full overflow-x-auto mt-4 pb-10">
                            {item.component}
                        </div>
                    ) : (
                        <p className="font-sans text-lg md:text-2xl text-blue-50 leading-relaxed font-light max-w-3xl mx-auto">
                            {item.content}
                        </p>
                    )}

                    {!item.component && <p className="text-white/40 text-sm italic mt-8">Дэлгэрэнгүй мэдээлэл удахгүй шинэчлэгдэнэ...</p>}
                </div>
            </div>
        </div>
    );
};

export default GovernanceDetailPage;
