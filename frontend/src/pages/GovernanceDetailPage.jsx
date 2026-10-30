import React, { useEffect } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import { useAppContext } from '../context/AppContext';

const GovernanceDetailPage = () => {
    const { selectedGovernance, navigateTo } = useAppContext();
    const item = selectedGovernance;

    useEffect(() => { window.scrollTo(0, 0); }, []);
    const IconComponent = item.icon;

    return (
      <PublicPageShell title={item.title} eyebrow="Компанийн засаглал" onBack={() => navigateTo('home')}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-8">
          <IconComponent size={36} strokeWidth={1.5} className="text-[#007A3D] mb-4" />
          {item.component ? <div className="w-full overflow-x-auto">{item.component}</div> : <p className="max-w-3xl text-base leading-8 text-slate-600">{item.content}</p>}
        </div>
      </PublicPageShell>
    );
};
export default GovernanceDetailPage;
