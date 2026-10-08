import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import BackButton from '../components/BackButton';

const SECTIONS = [
  {
    num: '01',
    title: 'Ерөнхий заалт',
    body: `Solongo Capital ББСБ ХХК (цаашид "бид" гэх) нь харилцагчийн хувийн мэдээллийг хамгаалах, нууцлалыг хангах талаар хатуу бодлого баримталдаг. Энэхүү нууцлалын бодлого нь манай вэбсайт болон үйлчилгээгээ ашигладаг бүх хэрэглэгчид хамаарна. Та манай үйлчилгээг ашигласнаар энэхүү нууцлалын бодлогыг зөвшөөрсөн гэж үзнэ.`,
  },
  {
    num: '02',
    title: 'Цуглуулдаг мэдээлэл',
    body: `Бид дараах мэдээллийг цуглуулж болно:\n• Овог, нэр, регистрийн дугаар\n• Утасны дугаар, и-мэйл хаяг, гэрийн хаяг\n• Ажил эрхлэлт, орлогын мэдээлэл\n• Банкны данс болон санхүүгийн мэдээлэл (зээлийн хүсэлт гаргасан тохиолдолд)\n• Вэбсайтад нэвтрэх, хуудас үзэх мэдээлэл (cookies ашиглан)`,
  },
  {
    num: '03',
    title: 'Мэдээлэл ашиглах',
    body: `Цуглуулсан мэдээллийг дараах зориулалтаар ашиглана:\n• Зээлийн болон санхүүгийн үйлчилгээ үзүүлэх\n• Харилцагчийн хүсэлтийг боловсруулах, холбоо барих\n• Хуулиар шаардагдах мэдээлэл шалгах (KYC/AML)\n• Үйлчилгээний чанарыг сайжруулах, судалгаа хийх\n• Зөвшөөрөл авсан тохиолдолд маркетингийн мэдэгдэл илгээх`,
  },
  {
    num: '04',
    title: 'Мэдээлэл хамгаалах',
    body: `Бид харилцагчийн мэдээллийг дараах техникийн арга хэмжээгээр хамгаална:\n• SSL/TLS шифрлэлт ашиглан дамжуулалтын аюулгүй байдлыг хангана\n• Мэдээллийн санд хандах эрхийг хязгаарлана\n• Ажилтнуудыг нууцлалын талаар тогтмол сургална\n• Хандалтын бүртгэл хөтөлж, хяналт тавина`,
  },
  {
    num: '05',
    title: 'Гуравдагч этгээдэд дамжуулах',
    body: `Харилцагчийн хувийн мэдээллийг гуравдагч этгээдэд дамжуулахгүй. Дараах тохиолдолд л хуулийн шаардлагаар мэдээллийг дамжуулна:\n• Монгол Улсын хуулиар шаардагдах үед (Монгол банк, татварын байгууллага гэх мэт)\n• Шүүхийн шийдвэр, прокурорын тогтоолоор\n• Харилцагчийн тодорхой зөвшөөрлөөр`,
  },
  {
    num: '06',
    title: 'Харилцагчийн эрх',
    body: `Та дараах эрхтэй:\n• Өөрийн мэдээллийг үзэх, засах хүсэлт гаргах\n• Буруу мэдээллийг засуулах шаардлага тавих\n• Тодорхой нөхцөлд мэдээллийг устгуулах хүсэлт гаргах\n• Маркетингийн мэдэгдэл хүлээн авахаас татгалзах\n\nХүсэлтийг доорх холбоо барих хаягаар илгээнэ үү.`,
  },
  {
    num: '07',
    title: 'Холбоо барих',
    body: `Нууцлалын бодлогтой холбоотой асуулт, хүсэлтийг дараах хаягаар илгээнэ үү:\n\nSolongo Capital ББСБ ХХК\nХан-Уул дүүрэг, 20 хороо, Чингисийн өргөн чөлөө,\nМишээл оффис төв, М3 цамхаг, 12 давхар, 1207 тоот\nУтас: 7599-1919, 7599-9191\nИ-мэйл: info@scm.mn`,
  },
];

const PrivacyPolicyPage = () => {
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
        <title>Нууцлалын бодлого | Solongo Capital</title>
        <meta
          name="description"
          content="Solongo Capital ББСБ-ийн нууцлалын бодлого. Харилцагчийн хувийн мэдээллийг хамгаалах, ашиглах журам."
        />
      </Helmet>

      <div className="absolute inset-0 sc-overlay-90"></div>
      <BackButton onClick={() => navigateTo('home')} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 pt-28 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-3">
          <span className="text-[#D4AF37]">
            <ShieldCheck size={36} strokeWidth={1.5} />
          </span>
          <span className="sc-kicker">Хууль, эрхзүй</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white mb-3">
          Нууцлалын бодлого
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

export default PrivacyPolicyPage;
