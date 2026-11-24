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

export function staffTrustNotification({ reference, phone, adminUrl, unassigned = false } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_trust_notification',
    subject: unassigned ? `Шинэ итгэлцлийн хүсэлт (хуваарилаагүй) — ${ref}` : `Шинэ итгэлцлийн хүсэлт — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      unassigned ? 'Шинэ итгэлцлийн хүсэлт ирлээ. Хариуцагч хуваарилаагүй байна.' : 'Шинэ итгэлцлийн хүсэлт ирлээ.',
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

export const maskEmail = email => {
  const [local = '', domain = ''] = String(email || '').split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(local.length - 1, 6)))}@${domain}`;
};

// D24: additional material request for a trust request. Only labels, the reference and the one-time link.
export function trustDocumentRequest({ reference, items = [], note, uploadUrl, expiresAt, companyPhone } = {}) {
  const ref = clean(reference);
  const labels = (Array.isArray(items) ? items : []).map(clean).filter(Boolean).slice(0, 10);
  const staffNote = String(note ?? '').split(/\r?\n/).map(clean).filter(Boolean).slice(0, 20);
  return {
    template: 'trust_doc_request',
    subject: `Нэмэлт материал шаардлагатай — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `Таны ${ref} дугаартай итгэлцлийн хүсэлтийг шийдвэрлэхэд дараах нэмэлт материал шаардлагатай байна:`,
      ...labels.map(label => `• ${label}`),
      ...(staffNote.length ? ['', 'Ажилтны тайлбар:', ...staffNote, ''] : []),
      `Доорх холбоосоор материалаа ${ubDateTime(expiresAt)} (Улаанбаатарын цаг)-аас өмнө оруулна уу. Холбоосыг бусдад дамжуулахгүй байхыг хүсье.`,
      ...footer(companyPhone),
    ], { link: clean(uploadUrl), linkLabel: 'Материал оруулах' }),
  };
}

export function staffTrustUpload({ reference, count, adminUrl } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_trust_upload',
    subject: `Харилцагч итгэлцлийн материал орууллаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `${ref} дугаартай итгэлцлийн хүсэлтэд харилцагч ${Number(count) || 0} файл орууллаа.`,
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}

// D24 daily reminder: per staff member the open requests assigned to them. No applicant names, phones, amounts or documents.
// items: [{ reference, productName, statusLabel, assignedDays, changedDays }] (loans); trustItems: same without productName.
export function dailyDigest({ items = [], total, trustItems = [], trustTotal, adminUrl, dateLabel } = {}) {
  const list = (Array.isArray(items) ? items : []).slice(0, 50);
  const trusts = (Array.isArray(trustItems) ? trustItems : []).slice(0, 50);
  const count = Number.isInteger(total) ? total : list.length;
  const trustCount = Number.isInteger(trustTotal) ? trustTotal : trusts.length;
  const days = value => (Number.isInteger(value) && value >= 0 ? `${value} хоног` : '—');
  const line = (item, fallback) => `• ${clean(item.reference)} — ${clean(item.productName) || fallback} — ${clean(item.statusLabel)} (хуваарилагдсанаас ${days(item.assignedDays)}, сүүлд өөрчилсөнөөс ${days(item.changedDays)})`;
  const loanRest = count - list.length;
  const trustRest = trustCount - trusts.length;
  const open = count + trustCount;
  return {
    template: 'daily_digest',
    subject: `Өдөр тутмын сануулга — ${open} нээлттэй хүсэлт`,
    ...layout([
      'Сайн байна уу,',
      open > 0 ? `${clean(dateLabel)} байдлаар танд хуваарилагдсан шийдвэрлэгдээгүй хүсэлтүүд:` : 'Танд хуваарилагдсан нээлттэй хүсэлт одоогоор алга.',
      ...(count > 0 ? ['', `Зээлийн хүсэлт (${count}):`, ...list.map(item => line(item, 'Зээл')), ...(loanRest > 0 ? [`… болон өөр ${loanRest} хүсэлт.`] : [])] : []),
      ...(trustCount > 0 ? ['', `Итгэлцлийн хүсэлт (${trustCount}):`, ...trusts.map(item => line(item, 'Итгэлцэл')), ...(trustRest > 0 ? [`… болон өөр ${trustRest} хүсэлт.`] : [])] : []),
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}

// D25: staff member receives a trust request. Reference, masked phone and the admin link only.
export function staffTrustAssignment({ reference, phone, adminUrl } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_trust_assignment',
    subject: `Танд итгэлцлийн хүсэлт хуваарилагдлаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      'Танд шинэ итгэлцлийн хүсэлт хуваарилагдлаа.',
      `Лавлах дугаар: ${ref}`,
      ...(clean(phone) ? [`Утас: ${maskPhone(phone)}`] : []),
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}
