import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';

const SECTIONS = [
  {
    num: '01',
    title: 'Ерөнхий заалт',
    body: `Энэхүү үйлчилгээний нөхцөл нь Solongo Capital ББСБ ХХК (цаашид "Компани" гэх)-ийн www.scm.mn вэбсайтыг ашигладаг бүх хэрэглэгчид (цаашид "Та" эсвэл "Харилцагч" гэх) хамаарна. Манай вэбсайтыг ашигласнаар та эдгээр нөхцөлийг бүрэн зөвшөөрсөн гэж тооцогдоно. Зөвшөөрөхгүй бол вэбсайтыг ашиглахаа зогсооно уу.`,
  },
  {
    num: '02',
    title: 'Онлайн маягт илгээх нөхцөл',
    body: `Вэбсайтад байрлах холбоо барих болон хүсэлт илгээх маягтуудыг ашиглахдаа:\n• Зөвхөн үнэн зөв, бодит мэдээлэл оруулна\n• Бусдын нэрийг зөвшөөрөлгүй ашиглахгүй\n• Хамгаалагдсан мэдээлэл, вирус, хортой кодыг илгээхгүй\n• Манай системийг хэт ачаалахаар зориудаар хүсэлт илгээхгүй\n\nДүрэм зөрчсөн тохиолдолд Компани таны хандалтыг хязгаарлах эрхтэй.`,
  },
  {
    num: '03',
    title: 'Зээлийн хүсэлтэд хамаарах нөхцөл',
    body: `Зээлийн хүсэлт гаргахдаа дараах нөхцөлийг хүлээн зөвшөөрнө:\n• Вэбсайтаар илгээсэн хүсэлт нь зөвхөн урьдчилсан мэдээлэл бөгөөд зээл олгох баталгаа биш\n• Зээл олгох эсэхийг Компани дотоод дүрэм, журмын дагуу шийдвэрлэнэ\n• Та зээлийн мэдээллийн санд бүртгүүлэхийг зөвшөөрнө\n• Хүсэлтийн дагуу Компанийн ажилтан тантай холбоо барих эрхтэй`,
  },
  {
    num: '04',
    title: 'Хариуцлагын хязгаарлалт',
    body: `Компани дараах тохиолдолд хариуцлага хүлээхгүй:\n• Вэбсайтын түр зогсолт, техникийн алдаанаас үүссэн хохирол\n• Гуравдагч этгээдийн үйлдлээс үүссэн аливаа хохирол\n• Харилцагчийн буруу мэдээлэл оруулснаас үүссэн асуудал\n• Давагдашгүй хүчин зүйл (гэнэтийн гамшиг, дайн, цар тахал гэх мэт)\n\nВэбсайт "байгаагаар нь" үйлчилдэг бөгөөд тасралтгүй ажиллах баталгааг өгөхгүй.`,
  },
  {
    num: '05',
    title: 'Мэдээллийн үнэн зөв байдал',
    body: `Харилцагч вэбсайтаар дамжуулан өгч буй мэдээллийнхээ үнэн зөв байдлыг бүрэн хариуцна. Худал, буруу эсвэл дутуу мэдээлэл өгсөн нь илэрвэл Компани хамтын ажиллагааг нэн даруй зогсоох, холбогдох хуулийн дагуу арга хэмжээ авах эрхтэй. Энэ нь Монгол Улсын Эрүүгийн хуулийн холбогдох зүйл заалтуудад хамрагдах боломжтойг анхаарна уу.`,
  },
  {
    num: '06',
    title: 'Өөрчлөлт оруулах эрх',
    body: `Компани энэхүү үйлчилгээний нөхцөлд урьдчилан мэдэгдэлгүйгээр өөрчлөлт оруулах эрхтэй. Өөрчлөлтүүд нь вэбсайтад нийтлэгдсэн цагаасаа хүчин төгөлдөр болно. Та вэбсайтыг тогтмол ашиглаж байгаа нь шинэ нөхцөлийг зөвшөөрсөн гэж тооцогдоно. Томоохон өөрчлөлтийн үед бид и-мэйлээр мэдэгдэл илгээхийг хичээнэ.`,
  },
  {
    num: '07',
    title: 'Холбоо барих',
    body: `Үйлчилгээний нөхцөлтэй холбоотой асуулт, гомдлоо дараах хаягаар хүргүүлнэ үү:\n\nSolongo Capital ББСБ ХХК\nХан-Уул дүүрэг, 20 хороо, Чингисийн өргөн чөлөө,\nМишээл оффис төв, М3 цамхаг, 12 давхар, 1207 тоот\nУтас: 7599-1919, 7599-9191\nИ-мэйл: info@scm.mn`,
  },
];

const TermsPage = () => {
  const { navigateTo } = useAppContext();

  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: `url(${BACKGROUNDS.detail_page})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Helmet>
        <title>Үйлчилгээний нөхцөл | Solongo Capital</title>
        <meta
          name="description"
          content="Solongo Capital ББСБ-ийн вэбсайт болон үйлчилгээ ашиглах нөхцөл, журам."
        />
      </Helmet>

      <div className="absolute inset-0 sc-overlay-90"></div>
      <BackButton onClick={() => navigateTo('home')} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-28 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-3">
          <span className="text-[#D4AF37]">
            <FileText size={36} strokeWidth={1.5} />
          </span>
          <span className="sc-kicker">Хууль, эрхзүй</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white mb-3">
          Үйлчилгээний нөхцөл
        </h1>
        <p className="text-gray-400 text-sm mb-12">
          Сүүлд шинэчлэгдсэн: 2025 оны 01 сарын 01
        </p>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((sec) => (
            <div key={sec.num} className="sc-glass-panel rounded-2xl p-6 md:p-8">
              <div className="flex items-start gap-4 mb-3">
                <span className="font-display font-black text-[#D4AF37] text-xl leading-none mt-0.5 shrink-0">
                  {sec.num}
                </span>
                <h2 className="font-display font-bold text-lg md:text-xl text-white">
                  {sec.title}
                </h2>
              </div>
              <div className="pl-9">
                {sec.body.split('\n').map((line, i) =>
                  line.startsWith('•') ? (
                    <div key={i} className="flex items-start gap-2 text-gray-300 text-sm leading-relaxed mb-1">
                      <span className="text-[#00A651] font-bold shrink-0 mt-0.5">•</span>
                      <span>{line.slice(1).trim()}</span>
                    </div>
                  ) : (
                    <p key={i} className="text-gray-300 text-sm leading-relaxed mb-2 last:mb-0 whitespace-pre-line">
                      {line}
                    </p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 font-display font-bold px-8 py-3 rounded-xl transition text-sm uppercase tracking-wider"
          >
            Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
