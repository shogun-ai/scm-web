import { useEffect, useState } from 'react';
import { getPublicConfig, submitPublicLoanRequest } from '../api';
import { normalizeSiteConfig } from '../siteDefaults';
import { applyPublicMetadata } from '../siteMetadata';
import SitePage from './SitePage';

const PUBLIC_CONFIG_CACHE_KEY = 'zentro_public_config_v2';

function initialPublicConfig() {
  try {
    const cached = window.localStorage.getItem(PUBLIC_CONFIG_CACHE_KEY);
    if (cached) return normalizeSiteConfig(JSON.parse(cached));
  } catch {
    // A stale or oversized cache should never block the public page.
  }
  return normalizeSiteConfig({});
}

export default function PublicSite({ onLogin }) {
  const [config, setConfig] = useState(initialPublicConfig);

  useEffect(() => {
    let active = true;
    getPublicConfig()
      .then(data => {
        if (!active) return;
        const normalized = normalizeSiteConfig(data);
        setConfig(normalized);
        try { window.localStorage.setItem(PUBLIC_CONFIG_CACHE_KEY, JSON.stringify(data)); } catch { /* cache is optional */ }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (config) applyPublicMetadata(config);
  }, [config]);

  return <SitePage rawConfig={config} onLogin={onLogin} onSubmit={submitPublicLoanRequest} />;
}
