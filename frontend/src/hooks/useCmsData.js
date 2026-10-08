import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { API_URL, PRODUCT_KEY_MAP } from '../data/constants';
import { productsData } from '../data/products';

const hasBrokenEncoding = (value = '') => /[ÐÑÒÓ]|â|�/.test(String(value));

const normalizeFinancialStats = (stats = []) => {
  const safeStats = Array.isArray(stats) ? stats : [];
  const byOrder = new Map();

  safeStats.forEach((stat) => {
    const orderKey = Number.isFinite(Number(stat.order)) ? Number(stat.order) : `id-${stat._id}`;
    const normalized = { val: stat.value, label: stat.label, order: stat.order, _id: stat._id };
    const existing = byOrder.get(orderKey);
    const currentScore = Number(hasBrokenEncoding(stat.label)) + Number(hasBrokenEncoding(stat.value));
    const existingScore = existing ? Number(hasBrokenEncoding(existing.label)) + Number(hasBrokenEncoding(existing.val)) : Infinity;

    if (!existing || currentScore < existingScore) {
      byOrder.set(orderKey, normalized);
    }
  });

  return Array.from(byOrder.values())
    .filter(stat => !hasBrokenEncoding(stat.label) && !hasBrokenEncoding(stat.val))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
};

/**
 * Backend-с cfg, financialStats, products, promotions ачаалдаг hook.
 * @returns {{ cfg, financialStats, products, setProducts, promotions }}
 */
export function useCmsData() {
  const [cfg, setCfg] = useState({});
  const [financialStats, setFinancialStats] = useState([]);
  const [products, setProducts] = useState(() =>
    productsData.map(product => ({
      ...product,
      productKey: PRODUCT_KEY_MAP[product.id] || product.productKey,
    }))
  );
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/config/flat`).then(r => r.json()).then(setCfg).catch((err) => {
      console.error('[useCmsData] Failed to fetch config:', err?.message || err);
    });
    fetch(`${API_URL}/api/stats`).then(r => r.json())
      .then(d => setFinancialStats(normalizeFinancialStats(d)))
      .catch((err) => {
        console.error('[useCmsData] Failed to fetch stats:', err?.message || err);
      });
    fetch(`${API_URL}/api/products/content`).then(r => r.json())
      .then(dbProds => {
        if (!Array.isArray(dbProds)) return;
        const existingKeys = Object.values(PRODUCT_KEY_MAP);
        const mapped = productsData.map(p => {
          const key = PRODUCT_KEY_MAP[p.id];
          const db = dbProds.find(d => d.productKey === key);
          if (!db) return p;
          return {
            ...p,
            productKey: key,
            title: db.title || p.title,
            shortDesc: db.shortDesc || p.shortDesc,
            description: db.description || p.description,
            chatbotText: db.chatbotText || p.description || p.shortDesc,
            bgImage: db.bgImageUrl ? db.bgImageUrl : p.bgImage,
            headerImage: db.headerImageUrl ? db.headerImageUrl : p.headerImage,
            ...(db.individual?.conditions?.length > 0 ? { individual: db.individual } : {}),
            ...(db.organization?.conditions?.length > 0 ? { organization: db.organization } : {}),
            ...(db.purchase?.individual?.conditions?.length > 0 ? { purchase: db.purchase } : {}),
            ...(db.collateral?.individual?.conditions?.length > 0 ? { collateral: db.collateral } : {}),
          };
        });
        // DB-д байгаа гэхдээ productsData-д байхгүй шинэ бүтээгдэхүүнүүдийг нэмэх
        const newProds = dbProds
          .filter(d => !existingKeys.includes(d.productKey))
          .map(d => ({
            id: `db_${d.productKey}`,
            title: d.title || d.productKey,
            icon: Briefcase,
            shortDesc: d.shortDesc || '',
            description: d.description || '',
            bgImage: d.bgImageUrl || null,
            headerImage: d.headerImageUrl || null,
            individual: d.individual,
            organization: d.organization,
            chatbotText: d.chatbotText,
          }));
        setProducts([...mapped, ...newProds]);
      }).catch((err) => {
        console.error('[useCmsData] Failed to fetch products:', err?.message || err);
      });
    fetch(`${API_URL}/api/promotions`).then(r => r.json()).then(d => setPromotions(Array.isArray(d) ? d : [])).catch((err) => {
      console.error('[useCmsData] Failed to fetch promotions:', err?.message || err);
    });
  }, []);

  return { cfg, financialStats, products, setProducts, promotions };
}
