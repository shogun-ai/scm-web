// Server-side resolver + routes for the D17 permission catalog. Matrix read failures fall back to role defaults.
import { PERMISSION_ROLES, PERMISSION_GROUPS, PERMISSION_KEYS, catalog, effectiveMatrix, resolvePermissions, isPermissionKey } from '../shared/permissions.js';

export function parseMatrix(raw) {
  if (!raw) return null;
  try { const value = typeof raw === 'string' ? JSON.parse(raw) : raw; return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; }
}

// loadMatrix: async () => matrix|null
export function createPermissionService({ loadMatrix = async () => null, logger = console } = {}) {
  const matrix = async () => { try { return (await loadMatrix()) || null; } catch { logger.error?.('[permissions] matrix load failed, using defaults'); return null; } };
  return {
    matrix,
    async permissionsFor(user) { return resolvePermissions(user, await matrix()); },
    async has(user, key) { return isPermissionKey(key) && (await this.permissionsFor(user)).has(key); },
    // Express middleware: 403 unless the user holds ANY of the keys.
    require(...keys) {
      return async (req, res, next) => {
        try {
          const granted = await this.permissionsFor(req.user);
          if (keys.some(key => granted.has(key))) return next();
          return res.status(403).json({ message: 'Энэ үйлдлийг хийх эрхгүй байна.', code: 'FORBIDDEN' });
        } catch { return res.status(500).json({ message: 'Алдаа гарлаа.' }); }
      };
    },
  };
}

export function registerPermissionRoutes({ app, authenticateUser, requireAdmin, service }) {
  // GET catalog + effective matrix (admin only: it describes every role).
  app.get('/api/config/permission-catalog', authenticateUser, requireAdmin, async (_req, res) => {
    try {
      res.json({ roles: PERMISSION_ROLES, groups: PERMISSION_GROUPS, permissions: catalog(), effective: effectiveMatrix(await service.matrix()) });
    } catch { res.status(500).json({ message: 'Алдаа гарлаа.' }); }
  });
  // The caller's own granted keys (any authenticated user) so the UI can hide actions.
  app.get('/api/me/permissions', authenticateUser, async (req, res) => {
    try {
      const granted = await service.permissionsFor(req.user);
      res.json({ keys: PERMISSION_KEYS.filter(key => granted.has(key)) });
    } catch { res.status(500).json({ message: 'Алдаа гарлаа.' }); }
  });
}
