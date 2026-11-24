import { Activity, Eye } from 'lucide-react';

// Харилцагч бүртгэл (цэс одоогоор нуугдсан).
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function OnboardingTab({ fetchOnboardingSubmissions, formatOnboardingInterests, formatSafeDate, getOnboardingAssigneeName, getOnboardingCompanyName, getOnboardingCustomerType, getOnboardingCustomerTypeLabel, getOnboardingDateValue, getOnboardingDisplayName, getOnboardingId, getOnboardingProductInterests, getOnboardingStatusClass, getOnboardingStatusLabel, loading, onboardingError, onboardingSubmissions, openOnboardingDetail }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#007A3D]">CRM</p>
          <h2 className="text-2xl font-bold text-[#003B5C]">Харилцагч бүртгэл</h2>
        </div>
        <button
          onClick={() => fetchOnboardingSubmissions()}
          className="inline-flex items-center gap-2 bg-white border text-[#003B5C] px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50"
        >
          <Activity size={16} /> Шинэчлэх
        </button>
      </div>

      {onboardingError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
          {onboardingError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="p-4">Огноо</th>
                <th className="p-4">Нэр / компани</th>
                <th className="p-4">Төрөл</th>
                <th className="p-4">Утас / и-мэйл</th>
                <th className="p-4">Сонирхсон бүтээгдэхүүн</th>
                <th className="p-4">Төлөв</th>
                <th className="p-4">Хариуцагч</th>
                <th className="p-4">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {onboardingSubmissions.map((submission, idx) => {
                const onboardingId = getOnboardingId(submission) || `onboarding-${idx}`;
                const phone = submission.contact?.phone || submission.phone || submission.mobile || submission.customer?.phone;
                const email = submission.contact?.email || submission.email || submission.customer?.email;
                const contactText = [phone, email].filter(Boolean).join(' / ') || '-';
                const customerType = getOnboardingCustomerType(submission);

                return (
                  <tr key={onboardingId} className="hover:bg-slate-50">
                    <td className="p-4 whitespace-nowrap text-gray-500">{formatSafeDate(getOnboardingDateValue(submission))}</td>
                    <td className="p-4">
                      <p className="font-bold text-[#003B5C]">{getOnboardingDisplayName(submission)}</p>
                      {getOnboardingCompanyName(submission) !== '-' && (
                        <p className="text-xs text-gray-400 mt-0.5">{getOnboardingCompanyName(submission)}</p>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">{getOnboardingCustomerTypeLabel(customerType)}</td>
                    <td className="p-4 max-w-[220px]">
                      <span className="block truncate">{contactText}</span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="block truncate">{formatOnboardingInterests(getOnboardingProductInterests(submission))}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getOnboardingStatusClass(submission.status)}`}>
                        {getOnboardingStatusLabel(submission.status)}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">{getOnboardingAssigneeName(submission)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => openOnboardingDetail(submission)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        aria-label="Харилцагч бүртгэл харах"
                      >
                        <Eye size={18}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {onboardingSubmissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    {loading ? 'Ачааллаж байна...' : 'Харилцагчийн бүртгэл байхгүй байна.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
