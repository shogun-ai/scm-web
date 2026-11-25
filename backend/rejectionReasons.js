// Loan rejection reason templates (SiteConfig `loan_rejection_reasons`).
// Value: array of { id, title (<=60), text (<=1000) }, max 20. Staff pick one to prefill the rejection note that is emailed to the applicant.
export const REJECTION_REASONS_KEY = 'loan_rejection_reasons';
export const MAX_REASONS = 20;
export const MAX_TITLE = 60;
export const MAX_TEXT = 1000;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const ALLOWED_KEYS = ['id', 'title', 'text'];

export const DEFAULT_REJECTION_REASONS = Object.freeze([
  { id: 'income', title: 'Өр орлогын харьцаа хангалтгүй', text: 'Таны сарын орлогод эзлэх нийт зээлийн төлбөрийн харьцаа (өр орлогын харьцаа) манай шаардлагаас өндөр байгаа тул хүссэн зээлийг олгох боломжгүй байна.' },
  { id: 'collateral', title: 'Барьцаа шаардлага хангаагүй', text: 'Санал болгосон барьцаа хөрөнгө манай барьцааны шаардлагыг (үнэлгээ, өмчлөл, бүртгэл) хангахгүй байна.' },
  { id: 'credit_history', title: 'Зээлийн муу түүхтэй буюу зээлийн оноо хангалтгүй', text: 'Зээлийн мэдээллийн санд хугацаа хэтэрсэн буюу чанаргүй зээлийн бүртгэл байгаа эсвэл зээлийн оноо шаардлага хангахгүй байгаа тул энэ удаад зөвшөөрөх боломжгүй.' },
  { id: 'documents', title: 'Баримт бүрдээгүй', text: 'Шаардлагатай баримт бичиг хугацаандаа бүрэн ирүүлэгдээгүй байна.' },
  { id: 'mismatch', title: 'Мэдээлэл зөрүүтэй', text: 'Хүсэлтэд дурдсан мэдээлэл болон ирүүлсэн баримт хооронд зөрүү илэрсэн.' },
  { id: 'product_terms', title: 'Бүтээгдэхүүний нөхцөлд нийцээгүй', text: 'Хүсэлт тухайн бүтээгдэхүүний нөхцөл (нас, хугацаа, дүн гэх мэт)-д нийцэхгүй байна.' },
].map(item => Object.freeze(item)));

export const defaultRejectionReasons = () => DEFAULT_REJECTION_REASONS.map(item => ({ ...item }));

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Strict validation for PUT -> { value } | { error }.
export function validateRejectionReasons(input) {
  if (!Array.isArray(input)) return { error: 'Жагсаалт буруу байна.' };
  if (input.length > MAX_REASONS) return { error: `Хамгийн ихдээ ${MAX_REASONS} загвар байна.` };
  const seen = new Set();
  const value = [];
  for (let index = 0; index < input.length; index += 1) {
    const item = input[index];
    const label = `#${index + 1}`;
    if (!isPlainObject(item) || Object.keys(item).some(key => !ALLOWED_KEYS.includes(key))) return { error: `Загвар ${label}: зөвшөөрөгдөөгүй талбар байна.` };
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!ID_RE.test(id)) return { error: `Загвар ${label}: ID буруу байна.` };
    if (seen.has(id)) return { error: `Загвар ${label}: ID давхардсан байна.` };
    if (!title) return { error: `Загвар ${label}: гарчиг хоосон байна.` };
    if (title.length > MAX_TITLE) return { error: `Загвар ${label}: гарчиг ${MAX_TITLE} тэмдэгтээс хэтрэхгүй.` };
    if (!text) return { error: `Загвар ${label}: текст хоосон байна.` };
    if (text.length > MAX_TEXT) return { error: `Загвар ${label}: текст ${MAX_TEXT} тэмдэгтээс хэтрэхгүй.` };
    seen.add(id);
    value.push({ id, title, text });
  }
  return { value };
}

// Reads the stored list; absent/corrupt -> defaults. Invalid stored entries are dropped rather than failing the request.
export function normalizeStoredReasons(stored) {
  if (!Array.isArray(stored)) return defaultRejectionReasons();
  const seen = new Set();
  const out = [];
  for (const item of stored.slice(0, MAX_REASONS)) {
    const checked = validateRejectionReasons([item]);
    if (checked.error || seen.has(checked.value[0].id)) continue;
    seen.add(checked.value[0].id);
    out.push(checked.value[0]);
  }
  return out;
}

export async function readRejectionReasons(SiteConfig) {
  const doc = await SiteConfig.findOne({ key: REJECTION_REASONS_KEY }).lean();
  return normalizeStoredReasons(doc?.value);
}

// GET: staff who may change loan status (and admins via requireAdmin-equivalent perms). PUT: admin only.
export function registerRejectionReasonRoutes({ app, SiteConfig, authenticateUser, requireAdmin, getPermissions, createLog = async () => {}, now = () => new Date() }) {
  const fail = res => res.status(500).json({ message: 'Алдаа гарлаа.' });
  app.get('/api/loan-rejection-reasons', authenticateUser, async (req, res) => {
    try {
      const perms = await getPermissions(req.user);
      if (!perms?.has('loan_requests.change_status')) return res.status(403).json({ message: 'Энэ үйлдлийг хийх эрхгүй байна.', code: 'FORBIDDEN' });
      res.json({ reasons: await readRejectionReasons(SiteConfig) });
    } catch { fail(res); }
  });
  app.put('/api/loan-rejection-reasons', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const body = req.body;
      if (!isPlainObject(body) || Object.keys(body).some(key => key !== 'reasons')) return res.status(400).json({ message: 'Хүсэлт буруу байна.' });
      const checked = validateRejectionReasons(body.reasons);
      if (checked.error) return res.status(400).json({ message: checked.error });
      await SiteConfig.findOneAndUpdate({ key: REJECTION_REASONS_KEY }, { $set: { value: checked.value, label: 'Татгалзсан шалтгааны загвар', group: 'internal', updatedAt: now() } }, { upsert: true });
      await createLog(req.user, 'admin_settings_changed', `${REJECTION_REASONS_KEY} count=${checked.value.length}`);
      res.json({ reasons: checked.value });
    } catch { fail(res); }
  });
}
