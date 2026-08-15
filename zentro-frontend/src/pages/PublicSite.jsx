import { useEffect, useState } from 'react';
import { getPublicConfig, submitPublicLoanRequest } from '../api';
import { normalizeSiteConfig } from '../siteDefaults';
import { applyPublicMetadata } from '../siteMetadata';
import SitePage from './SitePage';

export default function PublicSite({ onLogin }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getPublicConfig()
      .then(data => setConfig(normalizeSiteConfig(data)))
      .catch(() => setConfig(normalizeSiteConfig({})));
  }, []);

  useEffect(() => {
    if (config) applyPublicMetadata(config);
  }, [config]);

  if (!config) return <div className="zp-site-boot" aria-busy="true"><header><img src="/favicon.svg" alt="Zentro Prime Capital" /></header><main /></div>;

  return <SitePage rawConfig={config} onLogin={onLogin} onSubmit={submitPublicLoanRequest} />;
}
