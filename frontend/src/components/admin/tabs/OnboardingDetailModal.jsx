import { Calendar, Save, UserCheck, XCircle } from 'lucide-react';

// Харилцагч бүртгэлийн дэлгэрэнгүй цонх.
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function OnboardingDetailModal({ ONBOARDING_STATUS_OPTIONS, closeOnboardingDetail, formatOnboardingInterests, formatSafeDate, getOnboardingCompanyName, getOnboardingCustomerType, getOnboardingCustomerTypeLabel, getOnboardingDateValue, getOnboardingDisplayName, getOnboardingId, getOnboardingProductInterests, getOnboardingStatusClass, getOnboardingStatusLabel, onboardingDraft, onboardingSaving, saveOnboardingSubmission, selectedOnboarding, setOnboardingDraft, updateOnboardingDraft, usersList }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto relative animate-scale-up border border-white/20 p-10">
        <button onClick={closeOnboardingDetail} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition">
          <XCircle size={32}/>
        </button>

        <div className="space-y-8">
          <div className="flex items-start gap-6 border-b border-gray-100 pb-8 pr-12">
            <div className="w-20 h-20 bg-[#003B5C]/5 rounded-[28px] flex items-center justify-center border border-[#003B5C]/10">
              <UserCheck size={36} className="text-[#003B5C]"/>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#007A3D]">Харилцагч бүртгэл</p>
              <h2 className="text-3xl font-black text-[#003B5C] mt-1">{getOnboardingDisplayName(selectedOnboarding)}</h2>
              <p className="text-gray-400 mt-2 font-bold flex items-center gap-2">
                <Calendar size={16}/> {formatSafeDate(getOnboardingDateValue(selectedOnboarding))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">Төрөл</p>
              <p className="font-black text-[#003B5C]">{getOnboardingCustomerTypeLabel(getOnboardingCustomerType(selectedOnboarding))}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">Төлөв</p>
              <span className={`px-2 py-1 rounded text-xs font-bold ${getOnboardingStatusClass(onboardingDraft.status)}`}>
                {getOnboardingStatusLabel(onboardingDraft.status)}
              </span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">Хариуцагч</p>
              <p className="font-black text-[#003B5C]">{onboardingDraft.assigneeName || '-'}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase">ID</p>
              <p className="font-black text-[#003B5C]">{String(getOnboardingId(selectedOnboarding) || '-').slice(-8)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
            <section className="bg-slate-50/70 rounded-2xl border border-slate-100 p-6 space-y-3">
              <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-[#D4AF37] pl-4 tracking-widest">Харилцагч</h3>
              <p>Нэр: <b>{selectedOnboarding.contact?.name || selectedOnboarding.customerName || selectedOnboarding.fullName || selectedOnboarding.name || [selectedOnboarding.personal?.lastName, selectedOnboarding.personal?.firstName].filter(Boolean).join(' ') || [selectedOnboarding.lastname, selectedOnboarding.firstname].filter(Boolean).join(' ') || '-'}</b></p>
              <p>Компани: <b>{getOnboardingCompanyName(selectedOnboarding)}</b></p>
              <p>Регистр: <b>{selectedOnboarding.personal?.registerNumber || selectedOnboarding.business?.registrationNumber || selectedOnboarding.regNo || selectedOnboarding.orgRegNo || selectedOnboarding.registrationNo || '-'}</b></p>
              <p>Утас: <b className="text-green-600">{selectedOnboarding.contact?.phone || selectedOnboarding.phone || selectedOnboarding.mobile || selectedOnboarding.customer?.phone || '-'}</b></p>
              <p>И-мэйл: <b>{selectedOnboarding.contact?.email || selectedOnboarding.email || selectedOnboarding.customer?.email || '-'}</b></p>
            </section>

            <section className="bg-slate-50/70 rounded-2xl border border-slate-100 p-6 space-y-3">
              <h3 className="font-bold text-gray-400 uppercase text-xs border-l-4 border-green-500 pl-4 tracking-widest">Сонирхол</h3>
              <p>Бүтээгдэхүүн: <b>{formatOnboardingInterests(getOnboardingProductInterests(selectedOnboarding))}</b></p>
              <p>Эх сурвалж: <b>{selectedOnboarding.metadata?.source || selectedOnboarding.source || selectedOnboarding.channel || '-'}</b></p>
              <p>Холбогдох хэлбэр: <b>{selectedOnboarding.contact?.preferredChannel || selectedOnboarding.preferredContact || selectedOnboarding.contactPreference || '-'}</b></p>
              <p className="leading-6">Хэрэгцээ: <b>{selectedOnboarding.preferences?.serviceNeeds || selectedOnboarding.serviceNeeds || '-'}</b></p>
              <p className="leading-6">Тайлбар: <b>{selectedOnboarding.preferences?.notes || selectedOnboarding.message || selectedOnboarding.note || selectedOnboarding.description || '-'}</b></p>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-black text-[#003B5C]">Дотоод ажилбар</h3>
              <span className="text-xs font-bold text-slate-400">PUT /api/onboarding/{getOnboardingId(selectedOnboarding) || ':id'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Төлөв</label>
                <select
                  value={onboardingDraft.status}
                  onChange={e => updateOnboardingDraft('status', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
                >
                  {onboardingDraft.status && !ONBOARDING_STATUS_OPTIONS.some(option => option.value === onboardingDraft.status) && (
                    <option value={onboardingDraft.status}>{getOnboardingStatusLabel(onboardingDraft.status)}</option>
                  )}
                  {ONBOARDING_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Хариуцагч</label>
                <select
                  value={onboardingDraft.assigneeUserId || ''}
                  onChange={e => {
                    const userId = e.target.value;
                    const selectableUsers = Array.isArray(usersList) ? usersList : [];
                    const selectedUser = selectableUsers.find(item => item._id === userId || item.id === userId);
                    setOnboardingDraft(prev => ({
                      ...(prev || {}),
                      assigneeUserId: userId,
                      assigneeName: selectedUser?.name || '',
                    }));
                  }}
                  className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
                >
                  <option value="">Сонгох</option>
                  {(Array.isArray(usersList) ? usersList : []).map(item => (
                    <option key={item._id || item.id || item.email} value={item._id || item.id || ''}>{item.name || item.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Хариуцагч нэр</label>
                <input
                  value={onboardingDraft.assigneeName || ''}
                  onChange={e => updateOnboardingDraft('assigneeName', e.target.value)}
                  placeholder="Нэр гараар оруулах"
                  className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Холбогдсон тэмдэглэл</label>
                <textarea
                  rows={4}
                  value={onboardingDraft.contactNote || ''}
                  onChange={e => updateOnboardingDraft('contactNote', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm bg-slate-50 resize-none focus:outline-none focus:border-[#003B5C]"
                  placeholder="Харилцагчтай холбогдсон тэмдэглэл..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Хянагчийн тэмдэглэл</label>
                <textarea
                  rows={4}
                  value={onboardingDraft.reviewerNote || ''}
                  onChange={e => updateOnboardingDraft('reviewerNote', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm bg-slate-50 resize-none focus:outline-none focus:border-[#003B5C]"
                  placeholder="Дотоод хяналтын тэмдэглэл..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Таг</label>
              <input
                value={onboardingDraft.tags || ''}
                onChange={e => updateOnboardingDraft('tags', e.target.value)}
                placeholder="vip, business, follow-up"
                className="w-full p-3 border rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-[#003B5C]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeOnboardingDetail}
                className="px-6 py-3 rounded-xl border font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Болих
              </button>
              <button
                onClick={saveOnboardingSubmission}
                disabled={onboardingSaving}
                className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#002a42] disabled:opacity-50"
              >
                <Save size={16}/> {onboardingSaving ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
