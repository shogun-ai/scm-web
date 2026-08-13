import { useEffect, useState } from 'react';
import { getPublicConfig, submitPublicLoanRequest } from '../api';
import { normalizeSiteConfig } from '../siteDefaults';
import SitePage from './SitePage';

export default function PublicSite({ onLogin }) {
  const [config, setConfig] = useState(() => normalizeSiteConfig({}));

  useEffect(() => {
    getPublicConfig()
      .then(data => setConfig(normalizeSiteConfig(data)))
      .catch(() => setConfig(normalizeSiteConfig({})));
  }, []);

  return <SitePage rawConfig={config} onLogin={onLogin} onSubmit={submitPublicLoanRequest} />;
}
