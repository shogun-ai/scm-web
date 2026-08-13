import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Car, Gem, KeyRound, Menu, Phone, ShieldCheck, X } from 'lucide-react';
import { getPublicConfig, submitPublicLoanRequest } from '../api';

const fallbackImages = [
  'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=85',
];

const flowPhrases = [
  'Машинаа унаад зээлээ ав',
  'Машинаа тавиад зээлээ ав',
  'Үнэт металлаа барьцаалаад зээлээ ав',
  'Барьцаагүй шуурхай зээлээ ав',
];

const fallbackProducts = [
  { name: 'Машин барьцаалсан шуурхай зээл', flowTitle: flowPhrases[0], rate: 'Сарын 3.0%-аас', term: '1-24 сар', amount: 'Үнэлгээний 70% хүртэл', description: 'Машинаа унаад зээлээ авна.', image: fallbackImages[0] },
  { name: 'Машин байршуулах зээл', flowTitle: flowPhrases[1], rate: 'Сарын 2.5%-аас', term: '1-12 сар', amount: 'Үнэлгээний 80% хүртэл', description: 'Орлого нотлохгүй, барьцаагаа байршуулна.', image: fallbackImages[1] },
  { name: 'Үнэт металл барьцаалсан зээл', flowTitle: flowPhrases[2], rate: 'Уян хатан', term: '1-6 сар', amount: 'Үнэлгээнд суурилна', description: 'Алт, мөнгө, үнэт эдлэл.', image: fallbackImages[2] },
  { name: 'Барьцаагүй шуурхай зээл', flowTitle: flowPhrases[3], rate: 'Эрсдэлээр', term: '1-6 сар', amount: 'Лимитээр', description: 'Богино хугацааны хэрэгцээнд.', image: fallbackImages[3] },
];

function BrandMark({ config }) {
  const brand = config?.brandName || 'Zentro Prime Capital';
  return <>{config?.logoUrl ? <img className="zp-logo-img" src={config.logoUrl} alt={brand} /> : <span>Z</span>}{brand}</>;
}

export default function PublicSite({ onLogin }) {
  const [config, setConfig] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', register: '', email: '', productType: '', amount: '', termMonths: '', collateral: '', notes: '' });
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeProduct, setActiveProduct] = useState(0);

  useEffect(() => { getPublicConfig().then(setConfig).catch(() => setConfig({})); }, []);

  const products = useMemo(() => config?.products?.length ? config.products : fallbackProducts, [config]);
  const productSlides = useMemo(() => products.map((product, index) => ({
    ...product,
    flowTitle: product.flowTitle || flowPhrases[index % flowPhrases.length] || product.name,
    image: product.image || product.imageUrl || fallbackImages[index % fallbackImages.length],
  })), [products]);
  const activeSlide = productSlides[activeProduct % Math.max(productSlides.length, 1)] || fallbackProducts[0];
  const brand = config?.brandName || 'Zentro Prime Capital';

  useEffect(() => {
    if (!productSlides.length) return undefined;
    const timer = window.setInterval(() => setActiveProduct(i => (i + 1) % productSlides.length), 4200);
    return () => window.clearInterval(timer);
  }, [productSlides.length]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitPublicLoanRequest({ ...form, answers: { source: 'zentrocapitalgroup.com' } });
      setSent(true);
      setForm({ name: '', phone: '', register: '', email: '', productType: '', amount: '', termMonths: '', collateral: '', notes: '' });
    } finally { setSaving(false); }
  };

  return (
    <div className="zp-site">
      <header className="zp-nav">
        <a className="zp-logo" href="#top"><BrandMark config={config} /></a>
        <nav className="zp-links">
          <a href="#products">Зээл</a>
          <a href="#process">Давуу тал</a>
          <a href="#apply">Хүсэлт</a>
          <a href="#contact">Холбоо барих</a>
        </nav>
        <button className="zp-login" onClick={onLogin}><KeyRound size={16} /> Нэвтрэх</button>
        <button className="zp-menu" onClick={() => setMobile(true)}><Menu size={22} /></button>
      </header>

      {mobile && <div className="zp-drawer"><button onClick={() => setMobile(false)}><X /></button><a href="#products">Зээл</a><a href="#apply">Хүсэлт</a><button onClick={onLogin}>Нэвтрэх</button></div>}

      <main id="top">
        <section className="zp-hero">
          <div className="zp-hero-copy">
            <p className="zp-kicker">Ломбардны зөвшөөрөлтэй шуурхай зээл</p>
            <h1>{config?.heroTitle || 'Машинаа байршуулахгүй, орлого нотлохгүй шуурхай зээл'}</h1>
            <p>{config?.heroText || 'Машинаа унаад барьцаалаад зээлээ ав. Машинаа байршуулбал орлого нотлохгүй шийдвэрлүүлнэ.'}</p>
            <div className="zp-actions"><a href="#apply">Зээлийн хүсэлт өгөх <ArrowRight size={16} /></a><a href={`tel:${config?.phone || '75991919'}`}><Phone size={16} /> {config?.phone || '7599-1919'}</a></div>
          </div>
          <div className="zp-hero-media"><img src={config?.heroImage || fallbackImages[0]} alt="Zentro car loan" /></div>
        </section>

        <section className="zp-band zp-flow" id="process" style={{ backgroundImage: `linear-gradient(90deg, rgba(245,245,241,.94) 0%, rgba(245,245,241,.76) 48%, rgba(17,17,17,.18) 100%), url(${activeSlide.image})` }}>
          <div className="zp-flow-title" key={activeSlide.flowTitle}>
            <p className="zp-kicker">Шуурхай шийдвэрлэлт</p>
            <h2>{activeSlide.flowTitle}</h2>
            <p className="zp-flow-subline">{activeSlide.description || activeSlide.name}</p>
          </div>
        </section>

        <section className="zp-products" id="products">
          <div className="zp-section-head"><h2>Зээлийн бүтээгдэхүүн</h2><p>Админ панелаас нөхцөл, текст, зураг, лого, хүсэлтийн асуултуудыг өөрчилнө.</p></div>
          <div className="zp-product-grid">
            {products.map((p, i) => <article key={`${p.name}-${i}`}><div className="zp-product-icon">{i === 2 ? <Gem /> : i === 3 ? <ShieldCheck /> : <Car />}</div><h3>{p.name}</h3><p>{p.description}</p><dl><div><dt>Хүү</dt><dd>{p.rate}</dd></div><div><dt>Хугацаа</dt><dd>{p.term}</dd></div><div><dt>Дүн</dt><dd>{p.amount}</dd></div></dl></article>)}
          </div>
        </section>

        <section className="zp-apply" id="apply">
          <div><h2>Шуурхай зээлийн хүсэлт</h2><p>Ломбардны зээл олон шат дамжлагагүй. Ажилтан таны хүсэлтийг аваад холбогдоно.</p></div>
          <form onSubmit={submit} className="zp-form">
            {sent && <p className="zp-success">Хүсэлт илгээгдлээ. Манай ажилтан холбогдоно.</p>}
            <div className="zp-two"><input required placeholder="Нэр" value={form.name} onChange={e => set('name', e.target.value)} /><input required placeholder="Утас" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="zp-two"><input placeholder="Регистр" value={form.register} onChange={e => set('register', e.target.value)} /><input placeholder="И-мэйл" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <select value={form.productType} onChange={e => set('productType', e.target.value)}><option value="">Зээлийн төрөл сонгох</option>{products.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
            <div className="zp-two"><input inputMode="numeric" placeholder="Хүсэж буй дүн" value={form.amount} onChange={e => set('amount', e.target.value)} /><input inputMode="numeric" placeholder="Хугацаа /сар/" value={form.termMonths} onChange={e => set('termMonths', e.target.value)} /></div>
            <textarea placeholder="Барьцааны мэдээлэл: машины марк, улсын дугаар, эсвэл бусад барьцаа" value={form.collateral} onChange={e => set('collateral', e.target.value)} />
            <textarea placeholder="Нэмэлт тайлбар" value={form.notes} onChange={e => set('notes', e.target.value)} />
            <button disabled={saving}>{saving ? 'Илгээж байна...' : 'Хүсэлт илгээх'}</button>
          </form>
        </section>
      </main>

      <footer className="zp-footer" id="contact"><b>{brand}</b><span>{config?.address || 'Улаанбаатар хот'}</span><a href={`mailto:${config?.email || 'info@zentrocapitalgroup.com'}`}>{config?.email || 'info@zentrocapitalgroup.com'}</a></footer>
    </div>
  );
}