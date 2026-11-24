// D25: automatic assignment settings for loan and trust requests (SiteConfig `assignment_settings`).
// Value shape: { loan: { mode: 'auto'|'manual', staffId: string|null }, trust: { mode, staffId } }. Default: both manual.
import { isRequestStaff } from './loanIntake.js';

export const ASSIGNMENT_KEY = 'assignment_settings';
export const ASSIGNMENT_KINDS = ['loan', 'trust'];
export const ASSIGNMENT_MODES = ['auto', 'manual'];
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const normalizeEntry = value => {
  const mode = value?.mode === 'auto' ? 'auto' : 'manual';
  const staffId = typeof value?.staffId === 'string' && OBJECT_ID_RE.test(value.staffId) ? value.staffId : null;
  // Auto without a staff member is meaningless; fall back to manual.
  return mode === 'auto' && staffId ? { mode, staffId } : { mode: 'manual', staffId: null };
};
export const normalizeAssignment = value => ({ loan: normalizeEntry(value?.loan), trust: normalizeEntry(value?.trust) });

export async function readAssignmentSettings(SiteConfig) {
  const doc = await SiteConfig.findOne({ key: ASSIGNMENT_KEY }).lean();
  return normalizeAssignment(doc?.value);
}

export const isActiveRequestStaff = user => Boolean(user) && user.isActive !== false && isRequestStaff(user);

// Active request staff by id (never throws on bad ids).
export async function findActiveRequestStaff(User, id) {
  if (typeof id !== 'string' || !OBJECT_ID_RE.test(id)) return null;
  const staff = await User.findById(id).select('_id name email notificationEmail role roles isActive').lean();
  return isActiveRequestStaff(staff) ? staff : null;
}

export const notifyEmailOf = user => {
  const preferred = typeof user?.notificationEmail === 'string' ? user.notificationEmail.trim() : '';
  return preferred || (typeof user?.email === 'string' ? user.email.trim() : '');
};

// Validates a PUT patch `{ loan?: {mode, staffId}, trust?: {...} }` against the current settings.
// -> { value } (merged, normalized) | { errors }. Auto mode requires an active request staff member.
export async function validateAssignmentPatch(patch, current, User) {
  const errors = {};
  const isObject = patch && typeof patch === 'object' && !Array.isArray(patch);
  const kinds = isObject ? Object.keys(patch) : [];
  if (!isObject || !kinds.length || kinds.some(kind => !ASSIGNMENT_KINDS.includes(kind))) return { errors: { assignment: 'Хуваарилалтын тохиргоо буруу байна.' } };
  const next = { ...normalizeAssignment(current) };
  for (const kind of kinds) {
    const entry = patch[kind];
    const keys = entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.keys(entry) : null;
    if (!keys || keys.some(key => !['mode', 'staffId'].includes(key)) || !ASSIGNMENT_MODES.includes(entry.mode)) { errors[kind] = 'Горим буруу байна.'; continue; }
    if (entry.mode === 'manual') { next[kind] = { mode: 'manual', staffId: null }; continue; }
    if (typeof entry.staffId !== 'string' || !OBJECT_ID_RE.test(entry.staffId)) { errors[kind] = 'Автомат горимд ажилтан сонгоно уу.'; continue; }
    if (!(await findActiveRequestStaff(User, entry.staffId))) { errors[kind] = 'Идэвхтэй ажилтан олдсонгүй.'; continue; }
    next[kind] = { mode: 'auto', staffId: entry.staffId };
  }
  return Object.keys(errors).length ? { errors } : { value: next };
}
