const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com');

export async function requestSafetyNotices({ token, notices, revision, signal } = {}) {
  const isSave = notices !== undefined;
  const response = await fetch(`${API_URL}/api/${token ? 'admin/' : ''}safety-notices`, {
    method: isSave ? 'PUT' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isSave ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(isSave ? { body: JSON.stringify({ notices, revision }) } : {}),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    const messages = {
      401: 'Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.',
      403: 'Зөвхөн админ сэрэмжлүүлэг удирдах эрхтэй.',
      409: 'Өөр админ мэдээллийг өөрчилсөн байна. Жагсаалтыг дахин ачаалаад өөрчлөлтөө хийнэ үү.',
      429: 'Хэт олон хүсэлт илгээсэн байна. Түр хүлээгээд дахин оролдоно уу.',
    };
    throw new Error(messages[response.status] || 'Сэрэмжлүүлгийн мэдээллийг боловсруулахад алдаа гарлаа. Дахин оролдоно уу.');
  }
  const data = await response.json();
  if (!Array.isArray(data?.notices) || data.notices.some(item => !item || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.body !== 'string') || (token && !Number.isSafeInteger(data.revision))) {
    throw new Error('Сэрэмжлүүлгийн мэдээлэл буруу байна. Дахин ачаална уу.');
  }
  return data;
}
