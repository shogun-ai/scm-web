export const LOAN_APR_CONFIG_KEY = 'loan_apr_settings';

export const DEFAULT_LOAN_APR_CONFIG = Object.freeze({
  serviceFeeLabel: 'Зээлийн үйлчилгээний шимтгэл (яаралтай/ажлын бус цаг)',
  serviceFeeOptions: Object.freeze([50000, 100000]),
  insuranceLabel: 'Даатгалын зардал',
  defaultInsuranceCost: 0,
  title: 'Зээлийн бодит өртөг',
  calculationNote: 'Зээлийн дүн дээр нийт зардлыг нэмж, сар бүр тэнцүү төлбөр төлдөг зарчмаар тооцно. Уг төлбөрүүдийн өнөөгийн үнэ цэнийг анхны зээлийн дүнтэй тэнцүүлэх сарын дотоод өгөөжийн хувийг (IRR) олж, 12-оор үржүүлэн жилийн бодит өртгийг хувиар илэрхийлнэ.',
  bulletCalculationNote: 'Зээлийн дүн дээр нийт зардлыг нэмж, сар бүр зөвхөн хүүгийн төлбөр + зардлын тэнцүү хувийг төлж, хугацааны эцэст үндсэн зээлийг нэг дор буцаан төлдөг зарчмаар тооцно. Уг төлбөрүүдийн өнөөгийн үнэ цэнийг анхны зээлийн дүнтэй тэнцүүлэх сарын дотоод өгөөжийн хувийг (IRR) олж, 12-оор үржүүлэн жилийн бодит өртгийг хувиар илэрхийлнэ.',
  explanationIntro: '“Банкны хүү бодох аргачлал, хүү, шимтгэл, хураамжийн мэдээллийн ил тод байдлын журам”-ын заалтаас:',
  includedTitle: '2.4 Зээл судлах үед болон зээл олгосноос хойш 1 жилийн хугацаанд зээлдэгчийн төлөх дараах шимтгэл, хураамжийг зээлийн бодит өртөг тооцоход оруулна:',
  includedText: [
    '2.4.1 Зээлдүүлэгчид төлөх бүх төрлийн шимтгэл, хураамж, зардал;',
    '2.4.2 Зээлдүүлэгчийн шаардлагаар даатгалын үйлчилгээнд төлөх нийт зардал. Үүнд орон сууцны ипотекийн зээл хамаарахгүй;',
    '2.4.3 Зээлдүүлэгчийн шаардлагаар барьцаа хөрөнгийн чанар, байдал, үнэлгээ тогтоохтой холбоотой нийт зардал. Үүнд Монголбанкнаас баталсан журам, зааврын шаардлагаар хийгдэж байгаа үнэлгээ хамаарахгүй;',
    '2.4.4 Зээлдүүлэгчийн шаардлагаар зээлдэгч гуравдагч этгээдээс авч буй бусад үйлчилгээний зардал;',
    '2.4.5 Зээлдүүлэгч, нийлүүлэгч, зээлдэгч гэсэн 3 талын оролцоотой санхүүгийн түрээс, фидуцийн (автомашины гэх мэт) гэрээний хүрээнд олгож буй зээлийн нийлүүлэгчээс зээлдүүлэгчид төлж буй шимтгэл, хураамж, зардал.',
  ].join('\n'),
  excludedTitle: '2.5 Зээлдэгчийн төлөх дараах шимтгэл, хураамжийг зээлийн бодит өртөг тооцоход оруулахгүй:',
  excludedText: [
    '2.5.1 Улсын бүртгэлтэй холбоотой шимтгэл, хураамж;',
    '2.5.2 Зээлийн болон барьцааны гэрээ баталгаажуулахтай холбоотой нотариатын төлбөр;',
    '2.5.3 Зээлдэгчийн хүсэлтээр зээл, барьцааны гэрээнд өөрчлөлт оруулахтай холбоотой шимтгэл, хураамж;',
    '2.5.4 Зээлдэгч зээлийн гэрээ зөрчсөнөөс үүсэх зардал, шимтгэл, хураамж;',
    '2.5.5 Зээлийн данс хөтлөх, гүйлгээ хийх, залруулга хийх, хуулга гаргах, тодорхойлолт авахтай холбоотой шимтгэл, хураамж.',
  ].join('\n'),
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isMoney = value => Number.isSafeInteger(value) && value >= 0;
const validFees = value => Array.isArray(value) && value.length === 2
  && value.every(isMoney) && value[0] !== value[1];
const textLimits = {
  serviceFeeLabel: 500, insuranceLabel: 500, title: 500,
  calculationNote: 5000, bulletCalculationNote: 5000, explanationIntro: 5000,
  includedTitle: 5000, includedText: 20000, excludedTitle: 5000, excludedText: 20000,
};
function validField(key, value) {
  if (key === 'serviceFeeOptions') return validFees(value);
  if (key === 'defaultInsuranceCost') return isMoney(value);
  return typeof value === 'string' && value.length <= textLimits[key];
}

export function normalizeLoanAprConfig(raw) {
  const source = isObject(raw) ? raw : {};
  return Object.fromEntries(Object.entries(DEFAULT_LOAN_APR_CONFIG).map(([key, fallback]) => {
    const value = Object.hasOwn(source, key) && validField(key, source[key]) ? source[key] : fallback;
    return [key, Array.isArray(value) ? [...value] : value];
  }));
}

export function isValidLoanAprConfig(raw) {
  return isObject(raw)
    && Object.keys(raw).every(key => Object.hasOwn(DEFAULT_LOAN_APR_CONFIG, key))
    && Object.keys(DEFAULT_LOAN_APR_CONFIG).every(key => Object.hasOwn(raw, key) && validField(key, raw[key]));
}
