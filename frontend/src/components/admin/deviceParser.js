// userAgent-аас хөтөч + үйлдлийн систем (энгийн задлагч).
export function parseUserAgent(ua) {
  const text = String(ua || '');
  if (!text) return { browser: 'Үл мэдэгдэх хөтөч', os: 'Үл мэдэгдэх систем', label: 'Үл мэдэгдэх төхөөрөмж' };
  let browser = 'Үл мэдэгдэх хөтөч';
  if (/Edg(e|A|iOS)?\//.test(text)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(text)) browser = 'Opera';
  else if (/SamsungBrowser\//.test(text)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS\//.test(text)) browser = 'Firefox';
  else if (/Chrome\/|CriOS\//.test(text)) browser = 'Chrome';
  else if (/Safari\//.test(text)) browser = 'Safari';
  else if (/curl\//i.test(text)) browser = 'curl';

  let os = 'Үл мэдэгдэх систем';
  if (/Windows NT/.test(text)) os = 'Windows';
  else if (/Android/.test(text)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(text)) os = 'iOS';
  else if (/Mac OS X|Macintosh/.test(text)) os = 'macOS';
  else if (/CrOS/.test(text)) os = 'ChromeOS';
  else if (/Linux/.test(text)) os = 'Linux';

  return { browser, os, label: `${browser} · ${os}` };
}
