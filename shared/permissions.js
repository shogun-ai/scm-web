// Single source of truth for task-management permissions (D17). Pure, no I/O.
// Matrix storage (SiteConfig 'permissions_matrix') stays `{ [role]: { 'section:action': level } }`.
// New keys are stored additively under section `perm`: matrix[role]['perm:<key>'] = 'full' (granted) | 'none' (denied).
// Legacy LOS cells are only ever READ and can only GRANT (never deny), so no existing access is lost and no data is rewritten.

export const PERMISSION_ROLES = [
  { key: 'admin', label: 'Админ' },
  { key: 'director', label: 'Захирал' },
  { key: 'loan_officer', label: 'Зээлийн ажилтан' },
  { key: 'finance_manager', label: 'Санхүүгийн менежер' },
];

export const PERMISSION_GROUPS = [
  { key: 'loan_requests', label: 'Зээлийн хүсэлт' },
  { key: 'loan_forms', label: 'Хүсэлтийн маягт' },
  { key: 'trusts', label: 'Итгэлцлийн хүсэлт' },
  { key: 'document_ai', label: 'Баримт AI' },
  { key: 'content', label: 'Контент' },
  { key: 'admin', label: 'Удирдлага' },
];

export const PERM_SECTION = 'perm';
const STAFF = ['admin', 'director', 'loan_officer', 'finance_manager'];
const MANAGERS = ['admin', 'director'];
const LEVELS_GRANTING = new Set(['full']);
const RANK = { none: 0, view: 1, partial: 2, full: 3 };

// legacy: [{ section, action, minimum }] — a saved legacy cell at/above `minimum` grants the new key.
// adminOnly: only the admin role can ever hold it (matrix cannot grant it to others).
export const PERMISSIONS = [
  { key: 'loan_requests.view_all', label: 'Бүх зээлийн хүсэлт харах', group: 'loan_requests', defaultRoles: MANAGERS, legacy: [] },
  { key: 'loan_requests.view_assigned', label: 'Өөрт хуваарилсан хүсэлт харах', group: 'loan_requests', defaultRoles: STAFF, legacy: [{ section: 'los_app', action: 'Хүсэлтийн жагсаалт харах', minimum: 'view' }] },
  { key: 'loan_requests.assign', label: 'Хариуцагч хуваарилах', group: 'loan_requests', defaultRoles: MANAGERS, legacy: [{ section: 'los_app', action: 'Хариуцагч томилох', minimum: 'full' }] },
  { key: 'loan_requests.change_status', label: 'Төлөв / үр дүн өөрчлөх', group: 'loan_requests', defaultRoles: STAFF, legacy: [{ section: 'los_app', action: 'Статус шинэчлэх', minimum: 'full' }] },
  { key: 'loan_requests.request_docs', label: 'Нэмэлт материал хүсэх', group: 'loan_requests', defaultRoles: STAFF, legacy: [{ section: 'los_app', action: 'Статус шинэчлэх', minimum: 'full' }] },
  { key: 'loan_requests.message', label: 'Харилцагчид имэйл бичих', group: 'loan_requests', defaultRoles: STAFF, legacy: [{ section: 'los_app', action: 'Хүсэлт засах', minimum: 'full' }] },
  { key: 'loan_requests.notes_files', label: 'Тэмдэглэл / файл нэмэх', group: 'loan_requests', defaultRoles: STAFF, legacy: [{ section: 'los_app', action: 'Хүсэлт засах', minimum: 'full' }] },
  { key: 'loan_requests.reopen', label: 'Хүсэлтийг дахин нээх', group: 'loan_requests', defaultRoles: MANAGERS, legacy: [] },
  { key: 'loan_requests.delete', label: 'Хүсэлт устгах (зөвхөн админ, унтраалга асаалттай үед)', group: 'loan_requests', defaultRoles: ['admin'], adminOnly: true, legacy: [] },
  { key: 'loan_forms.configure', label: 'Хүсэлтийн маягт тохируулах', group: 'loan_forms', defaultRoles: ['admin'], adminOnly: true, legacy: [] },
  { key: 'trusts.view', label: 'Итгэлцлийн хүсэлт харах', group: 'trusts', defaultRoles: STAFF, legacy: [{ section: 'trusts', action: 'Жагсаалт харах', minimum: 'view' }] },
  { key: 'trusts.message', label: 'Итгэлцлийн хүсэлтэд имэйл бичих', group: 'trusts', defaultRoles: STAFF, legacy: [{ section: 'trusts', action: 'Статус шинэчлэх', minimum: 'full' }] },
  { key: 'document_ai.use', label: 'Баримт AI уншилт ашиглах', group: 'document_ai', defaultRoles: ['admin', 'director', 'loan_officer'], legacy: [{ section: 'los_app', action: 'Иргэний үнэмлэх AI уншуулах', minimum: 'full' }] },
  { key: 'content.edit', label: 'Контент / файл / чатбот засах', group: 'content', defaultRoles: ['admin'], legacy: [{ section: 'cms', action: 'Hero / Нүүр хуудас засах', minimum: 'full' }] },
  { key: 'admin.users_permissions_logs', label: 'Хэрэглэгч / эрх / лог удирдах', group: 'admin', defaultRoles: ['admin'], legacy: [{ section: 'users', action: 'Эрх / роль өгөх', minimum: 'full' }] },
];

export const PERMISSION_KEYS = PERMISSIONS.map(item => item.key);
const BY_KEY = new Map(PERMISSIONS.map(item => [item.key, item]));
export const isPermissionKey = key => BY_KEY.has(key);
export const matrixCellKey = key => `${PERM_SECTION}:${key}`;

export const rolesOfUser = user => [...new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(role => typeof role === 'string' && role))];
const cellsOf = (matrix, role) => (matrix && typeof matrix === 'object' && matrix[role] && typeof matrix[role] === 'object' ? matrix[role] : {});

// Does one role hold one permission under the saved matrix (matrix may be null/{}).
export function roleHasPermission(role, key, matrix = null) {
  const def = BY_KEY.get(key);
  if (!def) return false;
  if (role === 'admin') return true;
  if (def.adminOnly) return false;
  const cells = cellsOf(matrix, role);
  const explicit = cells[matrixCellKey(key)];
  if (typeof explicit === 'string' && explicit in RANK) return LEVELS_GRANTING.has(explicit);
  if (def.defaultRoles.includes(role)) return true;
  return def.legacy.some(({ section, action, minimum }) => (RANK[cells[`${section}:${action}`]] || 0) >= (RANK[minimum] ?? RANK.full));
}

export const userHasNewPermission = (user, key, matrix = null) => rolesOfUser(user).some(role => roleHasPermission(role, key, matrix));

export function resolvePermissions(user, matrix = null) {
  return new Set(PERMISSION_KEYS.filter(key => userHasNewPermission(user, key, matrix)));
}

// Effective boolean matrix for the frontend: { role: { key: boolean } }.
export function effectiveMatrix(matrix = null, roles = PERMISSION_ROLES) {
  return Object.fromEntries(roles.map(role => [role.key, Object.fromEntries(PERMISSION_KEYS.map(key => [key, roleHasPermission(role.key, key, matrix)]))]));
}

export function catalog() {
  return PERMISSIONS.map(({ key, label, group, defaultRoles, adminOnly }) => ({ key, label, group, defaultRoles: [...defaultRoles], adminOnly: Boolean(adminOnly) }));
}

// Validates a PUT body for the matrix save endpoint: drops admin (locked) and malformed cells, rejects locked/unknown perm cells.
const LEVELS = new Set(Object.keys(RANK));
export function sanitizeMatrix(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const out = {};
  for (const [role, cells] of Object.entries(body)) {
    if (role === 'admin' || role === '__proto__' || role.length > 40 || !cells || typeof cells !== 'object' || Array.isArray(cells)) continue;
    const clean = {};
    for (const [cell, level] of Object.entries(cells)) {
      if (cell === '__proto__' || cell.length > 120 || typeof level !== 'string' || !LEVELS.has(level)) continue;
      if (cell.startsWith(`${PERM_SECTION}:`)) {
        const def = BY_KEY.get(cell.slice(PERM_SECTION.length + 1));
        if (!def || def.adminOnly) continue;
      }
      clean[cell] = level;
    }
    out[role] = clean;
  }
  return out;
}
