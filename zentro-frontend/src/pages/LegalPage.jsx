import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { getPublicConfig } from '../api';
import { normalizeSiteConfig } from '../siteDefaults';
import { applyLegalMetadata } from '../siteMetadata';

const UPDATED_AT = '2026 оны 8 дугаар сарын 24';
const DEFAULT_EMAIL = 'admin@zentrocapitalgroup.com';

function Brand({ config }) {
  const name = config.brandName || 'Zentro Prime Capital';
  return (
    <a className="zl-brand" href="/" aria-label={`${name} нүүр хуудас`}>
      {config.logoUrl ? <img src={config.logoUrl} alt={name} /> : <span>Z</span>}
      <b>{name}</b>
    </a>
  );
}

function PrivacyPolicy({ email }) {
  return (
    <div className="zl-content">
      <section>
        <span>01</span>
        <div><h2>Бидний тухай</h2><p>“Зентро Прайм Капитал” ХХК нь автомашин болон бусад барьцаанд суурилсан шуурхай зээлийн үйлчилгээ үзүүлдэг. Энэхүү бодлого нь манай вебсайт, Facebook Page, Messenger чат болон үйлчилгээний бусад сувгаар авсан хувийн мэдээллийг хэрхэн ашиглахыг тайлбарлана.</p></div>
      </section>
      <section>
        <span>02</span>
        <div><h2>Цуглуулах мэдээлэл</h2><p>Бид таны овог нэр, утасны дугаар, и-мэйл, регистрийн дугаар болон холбогдох таних мэдээллийг авч болно. Зээлийн хүсэлт гаргах үед бүтээгдэхүүний төрөл, хүссэн дүн, хугацаа, орлого, барьцаа хөрөнгийн мэдээлэл болон таны өгсөн материал цугларна.</p><p>Facebook Messenger ашиглах үед Page-д хамаарах хэрэглэгчийн ID, илгээсэн мессеж, сонгосон цэс, зарын лавлагаа болон харилцааны огноо бүртгэгдэж болно. Вебсайт ашиглах үед төхөөрөмж, IP хаяг, хөтчийн төрөл, ажиллагааны лог зэрэг техникийн мэдээлэл автоматаар үүсэж болно.</p></div>
      </section>
      <section>
        <span>03</span>
        <div><h2>Ашиглах зорилго</h2><p>Мэдээллийг таны хүсэлтийг хүлээн авах, тантай холбогдох, барьцаа болон зээлийн боломжийг урьдчилан үнэлэх, гэрээ үйлчилгээ бэлтгэх, төлөлт хянах, хэрэглэгчийн дэмжлэг үзүүлэх, залилан болон аюулгүй байдлын эрсдэлийг бууруулах зорилгоор ашиглана.</p><p>Мөн хууль, зохицуулагч байгууллагын шаардлага биелүүлэх, дотоод аудит, тайлан, үйлчилгээний чанар болон системийн найдвартай ажиллагааг сайжруулахад шаардлагатай хэмжээнд боловсруулна.</p></div>
      </section>
      <section>
        <span>04</span>
        <div><h2>Facebook ба Messenger</h2><p>Манай Facebook Page-ийн чатбот нь автомашины зар харуулах, зээлийн ерөнхий мэдээлэл өгөх, хүсэлт бүртгэхэд ашиглагдана. Чатботоор өгсөн мэдээлэл нь Zentro-ийн харилцагчийн удирдлагын системд Facebook эх сурвалжтай хүсэлт хэлбэрээр хадгалагдаж болно.</p><p>Facebook болон Messenger-ийн өөрийн өгөгдөл боловсруулах ажиллагаа Meta-ийн нөхцөл, нууцлалын бодлогоор давхар зохицуулагдана.</p></div>
      </section>
      <section>
        <span>05</span>
        <div><h2>Мэдээлэл хуваалцах</h2><p>Бид хувийн мэдээллийг худалдахгүй. Үйлчилгээг ажиллуулахад зайлшгүй шаардлагатай эрх бүхий ажилтан, мэдээллийн технологи, хостинг, харилцаа холбоо болон төлбөрийн үйлчилгээ үзүүлэгчидтэй нууцлал, аюулгүй байдлын нөхцөлтэйгөөр хуваалцаж болно.</p><p>Хуульд заасан үндэслэлээр шүүх, цагдаа, зохицуулагч болон бусад эрх бүхий байгууллагад мэдээлэл гаргаж өгч болно.</p></div>
      </section>
      <section>
        <span>06</span>
        <div><h2>Хадгалалт ба хамгаалалт</h2><p>Мэдээллийг үйлчилгээ үзүүлэх, гэрээний үүрэг биелүүлэх, маргаан шийдвэрлэх болон хуульд заасан хугацаанд шаардлагатай хэмжээгээр хадгална. Хандалтын эрх, ажиллагааны лог, нууц үг болон дамжуулалтын хамгаалалт зэрэг зохистой техникийн болон зохион байгуулалтын арга хэмжээ хэрэглэнэ.</p></div>
      </section>
      <section>
        <span>07</span>
        <div><h2>Таны эрх</h2><p>Та өөрийн мэдээлэлтэй танилцах, алдаатай мэдээллээ засуулах, зөвшөөрлөө буцаах, боловсруулахыг хязгаарлуулах эсвэл хуульд зөвшөөрсөн хүрээнд устгуулах хүсэлт гаргаж болно. Зарим гэрээ, төлбөр, аудитын мэдээллийг хууль болон гэрээний шаардлагаар үргэлжлүүлэн хадгалах боломжтой.</p><p>Хүсэлтээ <a href={`mailto:${email}`}>{email}</a> хаягаар илгээх эсвэл <a href="/data-deletion">мэдээлэл устгах заавар</a>-ыг ашиглана уу.</p></div>
      </section>
      <section>
        <span>08</span>
        <div><h2>Бодлогын өөрчлөлт</h2><p>Үйлчилгээ, хууль эрх зүйн шаардлага өөрчлөгдөхөд энэхүү бодлогыг шинэчилж болно. Шинэчилсэн огноог энэ хуудсанд байршуулна. Нууцлалтай холбоотой асуултыг <a href={`mailto:${email}`}>{email}</a> хаягаар хүлээн авна.</p></div>
      </section>
    </div>
  );
}

function DataDeletion({ email }) {
  return (
    <div className="zl-content">
      <section>
        <span>01</span>
        <div><h2>Хүсэлт илгээх</h2><p><a href={`mailto:${email}?subject=${encodeURIComponent('Хувийн мэдээлэл устгах хүсэлт')}`}>{email}</a> хаяг руу “Хувийн мэдээлэл устгах хүсэлт” гарчигтай и-мэйл илгээнэ.</p></div>
      </section>
      <section>
        <span>02</span>
        <div><h2>Таны өгөх мэдээлэл</h2><p>Хүсэлтэд овог нэр, бүртгүүлсэн утасны дугаар, Facebook Messenger ашигласан бол Facebook профайлын холбоос болон устгуулах мэдээллийн төрлийг бичнэ. Регистрийн дугаар, нууц үг, банкны картын бүрэн мэдээллийг и-мэйлээр илгээх шаардлагагүй.</p></div>
      </section>
      <section>
        <span>03</span>
        <div><h2>Танилт баталгаажуулах</h2><p>Бусдын мэдээллийг зөвшөөрөлгүй устгахаас хамгаалахын тулд манай ажилтан бүртгэлтэй утас, Messenger эсвэл бусад тохиромжтой сувгаар хүсэлт гаргагчийг баталгаажуулж болно.</p></div>
      </section>
      <section>
        <span>04</span>
        <div><h2>Шийдвэрлэлт</h2><p>Баталгаажсан хүсэлтийг хүлээн авсны дараа холбогдох мэдээллийг идэвхтэй системээс устгах эсвэл таних боломжгүй болгоно. Хүсэлтийн явц, үр дүнг таны өгсөн холбоо барих сувгаар мэдэгдэнэ.</p></div>
      </section>
      <section>
        <span>05</span>
        <div><h2>Хадгалах шаардлагатай мэдээлэл</h2><p>Хүчин төгөлдөр зээл, төлбөр, гэрээ, аудит, залилангаас хамгаалах болон хуульд заасан тайлагналтай холбоотой мэдээллийг устгах боломжгүй байж болно. Ийм тохиолдолд хадгалах үндэслэл, хязгаарлалтыг хүсэлт гаргагчид тайлбарлана.</p></div>
      </section>
    </div>
  );
}

export default function LegalPage({ type = 'privacy' }) {
  const [config, setConfig] = useState(() => normalizeSiteConfig({}));
  const deletion = type === 'deletion';
  const email = config.email || DEFAULT_EMAIL;
  const title = deletion ? 'Хувийн мэдээлэл устгах' : 'Нууцлалын бодлого';
  const description = deletion
    ? 'Zentro Prime Capital-д хадгалагдсан хувийн мэдээллээ устгуулах хүсэлт гаргах заавар.'
    : 'Zentro Prime Capital-ийн вебсайт, Facebook Page болон Messenger үйлчилгээнд мөрдөх нууцлалын бодлого.';

  useEffect(() => {
    let active = true;
    getPublicConfig().then(value => {
      if (active) setConfig(normalizeSiteConfig(value));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    applyLegalMetadata(title, description, deletion ? '/data-deletion' : '/privacy', config.faviconUrl);
  }, [config.faviconUrl, deletion, description, title]);

  return (
    <div className="zl-page">
      <header className="zl-nav">
        <Brand config={config} />
        <a className="zl-back" href="/"><ArrowLeft size={16} /> Нүүр хуудас</a>
      </header>
      <main>
        <section className="zl-hero">
          <div><span>{deletion ? 'DATA REQUEST' : 'PRIVACY'}</span><h1>{title}</h1></div>
          <div className="zl-hero-note">{deletion ? <Trash2 size={20} /> : <ShieldCheck size={20} />}<p>{description}</p><small>Сүүлд шинэчилсэн: {UPDATED_AT}</small></div>
        </section>
        {deletion ? <DataDeletion email={email} /> : <PrivacyPolicy email={email} />}
        <section className="zl-contact">
          <Mail size={22} />
          <div><span>ХОЛБОО БАРИХ</span><h2>{email}</h2></div>
          <a href={`mailto:${email}`}>И-мэйл илгээх</a>
        </section>
      </main>
      <footer className="zl-footer"><span>© {new Date().getFullYear()} {config.brandName || 'Zentro Prime Capital'}</span><div><a href="/privacy">Нууцлалын бодлого</a><a href="/data-deletion">Мэдээлэл устгах</a></div></footer>
    </div>
  );
}
