// Mongolian email templates for trust requests and user invites (D16). Pure functions; all text is escaped by layout().
// Privacy: staff notification carries only the reference, a masked phone and the admin link. No amounts or full names.
import { clean, layout, footer, ubDateTime } from './loanTaskEmails.js';

export const maskPhone = value => {
  const digits = clean(value).replace(/\s+/g, '');
  return digits.length > 4 ? `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}` : digits;
};

export function trustAcknowledgement({ reference, phone, companyPhone } = {}) {
  const ref = clean(reference);
  return {
    template: 'trust_ack',
    subject: `Таны итгэлцлийн хүсэлтийг хүлээн авлаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      'Таны итгэлцлийн хүсэлтийг хүлээн авлаа.',
      `Лавлах дугаар: ${ref}`,
      ...(clean(phone) ? [`Бүртгэлтэй утас: ${clean(phone)}`] : []),
      'Манай ажилтан тантай удахгүй холбогдоно.',
      ...footer(companyPhone),
    ]),
  };
}

export function staffTrustNotification({ reference, phone, adminUrl } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_trust_notification',
    subject: `Шинэ итгэлцлийн хүсэлт — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      'Шинэ итгэлцлийн хүсэлт ирлээ.',
      `Лавлах дугаар: ${ref}`,
      ...(clean(phone) ? [`Утас: ${maskPhone(phone)}`] : []),
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}

export function trustMessage({ reference, message, companyPhone } = {}) {
  const ref = clean(reference);
  const lines = String(message ?? '').split(/\r?\n/).map(clean).filter(Boolean).slice(0, 40);
  return {
    template: 'trust_message',
    subject: `Таны итгэлцлийн хүсэлт — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `Таны ${ref} дугаартай итгэлцлийн хүсэлтийн талаар ажилтнаас мессеж ирлээ:`,
      '',
      ...lines,
      ...footer(companyPhone),
    ]),
  };
}

// The only secret is the one-time link itself.
export function userInvite({ name, setPasswordUrl, expiresAt } = {}) {
  return {
    template: 'user_invite',
    subject: 'SCM админ системд урилга',
    ...layout([
      `Сайн байна уу${clean(name) ? `, ${clean(name)}` : ''},`,
      'Танд SCM админ системд нэвтрэх эрх олгогдлоо.',
      `Доорх холбоосоор нууц үгээ ${ubDateTime(expiresAt)} (Улаанбаатарын цаг)-аас өмнө тогтооно уу. Холбоос нэг удаа ашиглагдана.`,
      'Хэрэв та энэ урилгыг хүлээж аваагүй бол энэ имэйлийг үл тоомсорлоно уу.',
    ], { link: clean(setPasswordUrl), linkLabel: 'Нууц үг тогтоох' }),
  };
}
