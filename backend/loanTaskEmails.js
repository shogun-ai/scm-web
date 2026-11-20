// Mongolian email templates for the loan task flow. Pure functions.
// Privacy: only the request number, product names, document labels and links. Never names, register numbers, amounts or files.

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const productLine = (productName, subProductName) => [clean(productName), clean(subProductName)].filter(Boolean).join(' — ');
export const ubDateTime = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
};

export function layout(lines, { link, linkLabel } = {}) {
  const text = [...lines, ...(link ? ['', `${linkLabel}: ${link}`] : [])].join('\n');
  const htmlBody = lines.map(line => (line ? `<p style="margin:0 0 12px">${escapeHtml(line)}</p>` : '')).join('');
  const button = link ? `<p style="margin:16px 0"><a href="${escapeHtml(link)}" style="background:#003B5C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(linkLabel)}</a></p>` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#102d43;line-height:1.5">${htmlBody}${button}</div>`;
  return { text, html };
}

export const footer = companyPhone => ['', 'Асуух зүйл байвал энэ имэйлд хариу бичнэ үү.', ...(clean(companyPhone) ? [`Лавлах утас: ${clean(companyPhone)}`] : []), 'SCM — Солонго Капитал ББСБ'];

export function applicantAcknowledgement({ reference, productName, subProductName, companyPhone } = {}) {
  const ref = clean(reference);
  return {
    template: 'applicant_ack',
    subject: `Таны зээлийн хүсэлт хүлээн авлаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      'Таны зээлийн хүсэлтийг хүлээн авлаа.',
      `Хүсэлтийн дугаар: ${ref}`,
      `Бүтээгдэхүүн: ${productLine(productName, subProductName)}`,
      'Манай ажилтан ажлын 1-2 өдөрт тантай холбогдоно.',
      ...footer(companyPhone),
    ]),
  };
}

export function staffAssignment({ reference, productName, subProductName, adminUrl } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_assignment',
    subject: `Танд зээлийн хүсэлт хуваарилагдлаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      'Танд шинэ зээлийн хүсэлт хуваарилагдлаа.',
      `Хүсэлтийн дугаар: ${ref}`,
      `Бүтээгдэхүүн: ${productLine(productName, subProductName)}`,
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}

export function applicantDocumentRequest({ reference, productName, subProductName, items = [], note, uploadUrl, expiresAt, companyPhone } = {}) {
  const ref = clean(reference);
  const labels = (Array.isArray(items) ? items : []).map(clean).filter(Boolean).slice(0, 10);
  const staffNote = String(note ?? '').split(/\r?\n/).map(clean).filter(Boolean).slice(0, 20);
  return {
    template: 'applicant_doc_request',
    subject: `Нэмэлт баримт шаардлагатай — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `Таны ${ref} дугаартай зээлийн хүсэлтийг (${productLine(productName, subProductName)}) шийдвэрлэхэд дараах нэмэлт баримт шаардлагатай байна:`,
      ...labels.map(label => `• ${label}`),
      ...(staffNote.length ? ['', 'Ажилтны тайлбар:', ...staffNote, ''] : []),
      `Доорх холбоосоор баримтаа ${ubDateTime(expiresAt)} (Улаанбаатарын цаг)-аас өмнө оруулна уу. Холбоосыг бусдад дамжуулахгүй байхыг хүсье.`,
      ...footer(companyPhone),
    ], { link: clean(uploadUrl), linkLabel: 'Баримт оруулах' }),
  };
}

export function staffApplicantUpload({ reference, productName, subProductName, count, adminUrl } = {}) {
  const ref = clean(reference);
  return {
    template: 'staff_applicant_upload',
    subject: `Харилцагч нэмэлт баримт орууллаа — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `${ref} дугаартай хүсэлтэд харилцагч ${Number(count) || 0} файл орууллаа.`,
      `Бүтээгдэхүүн: ${productLine(productName, subProductName)}`,
    ], { link: clean(adminUrl), linkLabel: 'Админ хэсэгт нээх' }),
  };
}

// D15: free-text message typed by staff. Only that text, the request number and the footer are included.
export function applicantMessage({ reference, message, companyPhone } = {}) {
  const ref = clean(reference);
  const lines = String(message ?? '').split(/\r?\n/).map(clean).filter(Boolean).slice(0, 40);
  return {
    template: 'applicant_message',
    subject: `Таны зээлийн хүсэлт — ${ref}`,
    ...layout([
      'Сайн байна уу,',
      `Таны ${ref} дугаартай зээлийн хүсэлтийн талаар ажилтнаас мессеж ирлээ:`,
      '',
      ...lines,
      ...footer(companyPhone),
    ]),
  };
}
