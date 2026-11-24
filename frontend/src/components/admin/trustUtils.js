import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../loanTask/api';

export const isTrustClosed = trust => ['resolved', 'closed', 'rejected', 'completed', 'done'].includes(String(trust?.status || '').toLowerCase());

// Loads the caller's permission keys (/api/me/permissions) once per drawer. null while loading.
export function useTrustPermissions(apiUrl) {
  const [perms, setPerms] = useState(null);
  useEffect(() => {
    let alive = true;
    axios.get(`${apiUrl}/api/me/permissions`, { headers: getAuthHeaders(), timeout: 15000 })
      .then(res => { if (alive) setPerms(new Set(Array.isArray(res.data?.keys) ? res.data.keys : [])); })
      .catch(() => { if (alive) setPerms(new Set()); });
    return () => { alive = false; };
  }, [apiUrl]);
  return perms;
}
