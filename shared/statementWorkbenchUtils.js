export const INCOME_TYPES = [
  { key: 'salary', label: 'Цалин, тогтмол орлого', shortLabel: 'Цалин', defaultEligiblePercent: 100 },
  { key: 'passive', label: 'Идэвхгүй орлого', shortLabel: 'Идэвхгүй', defaultEligiblePercent: 100 },
  { key: 'contract', label: 'Гэрээт, үйлчилгээний орлого', shortLabel: 'Гэрээт', defaultEligiblePercent: 70 },
  { key: 'cash_sale', label: 'Бэлэн борлуулалтын орлого', shortLabel: 'Борлуулалт', defaultEligiblePercent: 50 },
  { key: 'other', label: 'Бусад, баталгаажуулаагүй орлого', shortLabel: 'Бусад', defaultEligiblePercent: 10 },
];

export const EXPENSE_GROUPS = [
  { key: 'A', label: 'Өрийн үүрэг', detail: 'Зээл, ипотек, лизинг, кредит карт, BNPL' },
  { key: 'B', label: 'Тогтмол зардал', detail: 'Түрээс, коммунал, холбоо, даатгал, татвар' },
  { key: 'C', label: 'Зайлшгүй зардал', detail: 'Хүнс, шатахуун, эмнэлэг, гэр ахуй' },
  { key: 'D', label: 'Сонгон зардал', detail: 'Хоол, үзвэр, аялал, худалдаа, тоглоом' },
  { key: 'E', label: 'Бизнесийн зардал', detail: 'Нийлүүлэгч, бараа материал, цалин, тоног төхөөрөмж' },
  { key: 'F', label: 'Зардал бус урсгал', detail: 'Өөрийн дансны шилжүүлэг, ATM, шимтгэл, хадгаламж' },
  { key: 'U', label: 'Ангилагдаагүй', detail: 'Ажилтны хяналт шаардлагатай' },
];

export const DEFAULT_INCOME_WEIGHTS = Object.fromEntries(
  INCOME_TYPES.map((item) => [item.key, item.defaultEligiblePercent]),
);

const textOf = (value) => String(value || '').trim();
const lower = (value) => textOf(value).toLowerCase();
const amountOf = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const list = (value) => (Array.isArray(value) ? value : []);
const unique = (values) => [...new Set(values.filter(Boolean))];
const hasAny = (text, terms) => terms.some((term) => text.includes(term));
const genericCategory = (value) => !textOf(value) || /ангилагдаагүй|unclassified|other|бусад/i.test(value);

const incomeMatchers = [
  { key: 'salary', category: 'Хөдөлмөрийн орлого', terms: ['цалин', 'salary', 'payroll', 'цалингийн'] },
  { key: 'passive', category: 'Идэвхгүй орлого', terms: ['түрээс', 'rent', 'ногдол', 'dividend', 'хүү', 'interest'] },
  { key: 'contract', category: 'Гэрээт, үйлчилгээний орлого', terms: ['гэрээ', 'contract', 'төслийн', 'project', 'үйлчилгээ', 'service'] },
  { key: 'cash_sale', category: 'Бэлэн борлуулалтын орлого', terms: ['борлуул', 'sale', 'pos', 'merchant', 'касс', 'cash'] },
];

const expenseMatchers = [
  { key: 'A', category: 'Өрийн үүрэг', terms: ['зээл', 'loan', 'лизинг', 'leasing', 'ипотек', 'credit', 'кредит', 'bnpl', 'repay', 'installment'] },
  { key: 'B', category: 'Тогтмол зардал', terms: ['түрээс', 'rent', 'цахилгаан', 'ус ', 'дулаан', 'internet', 'интернет', 'утас', 'даатгал', 'татвар', 'ндш', 'ххоат'] },
  { key: 'C', category: 'Зайлшгүй зардал', terms: ['хүнс', 'supermarket', 'market', 'шатахуун', 'fuel', 'эм ', 'эмийн', 'pharmacy', 'hospital', 'эмнэлэг', 'гэр ахуй'] },
  { key: 'D', category: 'Сонгон зардал', terms: ['ресторан', 'restaurant', 'coffee', 'cafe', 'зоог', 'үзвэр', 'gaming', 'казино', 'casino', 'bet', 'бооцоо', 'travel', 'аялал', 'гоо сайхан'] },
  { key: 'E', category: 'Бизнесийн зардал', terms: ['нийлүүлэгч', 'supplier', 'бараа материал', 'inventory', 'маркетинг', 'marketing', 'тоног', 'equipment', 'ажилтны цалин', 'office'] },
  { key: 'F', category: 'Зардал бус урсгал', terms: ['atm', 'бэлэн мөнгө', 'cash withdrawal', 'данс хооронд', 'шилжүүлэг', 'шимтгэл', 'commission', 'хадгаламж'] },
];

const incomeLabel = (key) => INCOME_TYPES.find((item) => item.key === key)?.label || INCOME_TYPES.at(-1).label;
const expenseLabel = (key) => EXPENSE_GROUPS.find((item) => item.key === key)?.label || EXPENSE_GROUPS.at(-1).label;

export const transactionKey = (transaction, index) => [
  transaction.date || '',
  transaction.direction || '',
  amountOf(transaction.amount),
  textOf(transaction.description).slice(0, 80),
  index,
].join('|');

const findRule = (transaction, rules) => {
  const description = lower(transaction.description);
  return list(rules).find((rule) => {
    const keyword = lower(rule.keyword);
    return keyword
      && description.includes(keyword)
      && (rule.direction === 'any' || rule.direction === transaction.direction);
  });
};

export function classifyTransaction(transaction, index, { rules = [], overrides = {}, incomeWeights = {} } = {}) {
  const direction = transaction.direction === 'income' ? 'income' : 'expense';
  const stableIndex = Number.isInteger(transaction.transactionIndex) ? transaction.transactionIndex : index;
  const key = transactionKey({ ...transaction, direction }, stableIndex);
  const override = overrides[key] || {};
  const description = `${lower(transaction.description)} ${lower(transaction.category)}`;
  const rule = findRule({ ...transaction, direction }, rules);
  const matcher = direction === 'income'
    ? incomeMatchers.find((item) => hasAny(description, item.terms))
    : expenseMatchers.find((item) => hasAny(description, item.terms));

  const rawCategory = textOf(transaction.category);
  const incomeType = direction === 'income'
    ? (override.incomeType || rule?.incomeType || matcher?.key || 'other')
    : '';
  const expenseGroup = direction === 'expense'
    ? (override.expenseGroup || rule?.expenseGroup || matcher?.key || 'U')
    : '';
  const inferredCategory = direction === 'income'
    ? (matcher?.category || incomeLabel(incomeType))
    : (matcher?.category || expenseLabel(expenseGroup));
  const category = override.category
    || rule?.category
    || (!genericCategory(rawCategory) ? rawCategory : inferredCategory);
  const eligiblePercent = direction === 'income'
    ? Math.max(0, Math.min(100, Number(override.eligiblePercent ?? incomeWeights[incomeType] ?? DEFAULT_INCOME_WEIGHTS[incomeType] ?? 0)))
    : 0;
  const confidence = override.category || override.incomeType || override.expenseGroup || override.eligiblePercent !== undefined
    ? 'reviewed'
    : rule ? 'rule'
      : matcher ? 'ai'
        : 'review';

  return {
    ...transaction,
    id: key,
    direction,
    amount: amountOf(transaction.amount),
    incomeType,
    expenseGroup,
    category,
    eligiblePercent,
    confidence,
    ruleMatched: Boolean(rule),
    manuallyReviewed: confidence === 'reviewed',
  };
}

const monthFor = (transaction) => textOf(transaction.month) || textOf(transaction.date).slice(0, 7) || 'Тодорхойгүй';

const aggregateMonths = (rows) => {
  const byMonth = new Map();
  rows.forEach((row) => {
    const month = monthFor(row);
    const current = byMonth.get(month) || { month, income: 0, expense: 0, netCashFlow: 0, transactionCount: 0, sourceIds: [] };
    current[row.direction === 'income' ? 'income' : 'expense'] += amountOf(row.amount);
    current.transactionCount += 1;
    current.sourceIds = unique([...current.sourceIds, row.sourceId]);
    current.netCashFlow = current.income - current.expense;
    byMonth.set(month, current);
  });
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
};

export function mergeAnalyses(parts = []) {
  const accounts = list(parts).map(({ file, result = {} }, index) => {
    const sourceId = `source-${index + 1}`;
    const frontSheet = result.frontSheet || {};
    return {
      ...frontSheet,
      sourceId,
      sourceName: file?.name || `Дансны хуулга ${index + 1}`,
      sourceSize: Number(file?.size || 0),
      monthlySummary: list(result.monthlySummary).map((item) => ({ ...item, sourceId })),
      incomeSources: list(result.incomeSources),
      expenseCategories: list(result.expenseCategories),
      cashFlowBehaviour: result.cashFlowBehaviour || {},
      notableTransactions: list(result.notableTransactions).map((item) => ({ ...item, sourceId })),
      analysisReport: result.analysisReport || {},
      warnings: list(result.warnings),
    };
  });
  const transactions = list(parts).flatMap(({ result = {} }, index) => {
    const account = accounts[index];
    return list(result.transactions).map((item) => ({
      ...item,
      sourceId: account.sourceId,
      sourceName: account.sourceName,
      accountNumber: account.accountNumber || '',
      bankName: account.bankName || '',
    }));
  }).map((item, index) => ({ ...item, transactionIndex: index }));
  const monthRows = list(parts).flatMap(({ result = {} }, index) => list(result.monthlySummary).map((item) => ({ ...item, sourceId: accounts[index].sourceId })));
  const monthlySummary = monthRows.length
    ? aggregateMonths(monthRows.flatMap((item) => [
      { ...item, direction: 'income', amount: item.income, month: item.month },
      { ...item, direction: 'expense', amount: item.expense, month: item.month },
    ]))
    : aggregateMonths(transactions);
  const currencies = unique(accounts.map((item) => textOf(item.currency).toUpperCase()).filter((item) => item && item !== 'UNKNOWN'));
  const coveredMonths = monthlySummary.filter((item) => item.month !== 'Тодорхойгүй').length || Math.max(1, ...accounts.map((item) => Number(item.coveredMonths || 1)));
  const totalIncome = transactions.filter((item) => item.direction === 'income').reduce((sum, item) => sum + amountOf(item.amount), 0);
  const totalExpense = transactions.filter((item) => item.direction === 'expense').reduce((sum, item) => sum + amountOf(item.amount), 0);

  return {
    accounts,
    transactions,
    monthlySummary,
    warnings: accounts.flatMap((item) => item.warnings.map((warning) => ({ sourceId: item.sourceId, text: warning }))),
    notableTransactions: accounts.flatMap((item) => item.notableTransactions),
    reports: accounts.map((item) => ({ sourceId: item.sourceId, sourceName: item.sourceName, report: item.analysisReport, behaviour: item.cashFlowBehaviour })),
    frontSheet: {
      customerName: accounts.find((item) => item.customerName)?.customerName || '',
      currency: currencies.length === 1 ? currencies[0] : currencies.length > 1 ? 'MIXED' : 'UNKNOWN',
      currencies,
      coveredMonths,
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
    },
  };
}

export function appendAnalysis(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const offset = list(existing.accounts).length;
  const sourceMap = new Map(list(incoming.accounts).map((account, index) => [account.sourceId, `source-${offset + index + 1}`]));
  const accounts = [
    ...list(existing.accounts),
    ...list(incoming.accounts).map((account) => ({ ...account, sourceId: sourceMap.get(account.sourceId) })),
  ];
  const transactions = [
    ...list(existing.transactions),
    ...list(incoming.transactions).map((item) => ({ ...item, sourceId: sourceMap.get(item.sourceId) || item.sourceId })),
  ].map((item, index) => ({ ...item, transactionIndex: index }));
  const monthlyRows = accounts.flatMap((account) => list(account.monthlySummary).map((item) => ({ ...item, sourceId: account.sourceId })));
  const monthlySummary = monthlyRows.length
    ? aggregateMonths(monthlyRows.flatMap((item) => [
      { ...item, direction: 'income', amount: item.income, month: item.month },
      { ...item, direction: 'expense', amount: item.expense, month: item.month },
    ]))
    : aggregateMonths(transactions);
  const warnings = [
    ...list(existing.warnings),
    ...list(incoming.warnings).map((item) => ({ ...item, sourceId: sourceMap.get(item.sourceId) || item.sourceId })),
  ];
  const notableTransactions = [
    ...list(existing.notableTransactions),
    ...list(incoming.notableTransactions).map((item) => ({ ...item, sourceId: sourceMap.get(item.sourceId) || item.sourceId })),
  ];
  const reports = [
    ...list(existing.reports),
    ...list(incoming.reports).map((item) => ({ ...item, sourceId: sourceMap.get(item.sourceId) || item.sourceId })),
  ];
  const currencies = unique(accounts.map((item) => textOf(item.currency).toUpperCase()).filter((item) => item && item !== 'UNKNOWN'));
  const coveredMonths = monthlySummary.filter((item) => item.month !== 'Тодорхойгүй').length || Math.max(1, ...accounts.map((item) => Number(item.coveredMonths || 1)));
  const totalIncome = transactions.filter((item) => item.direction === 'income').reduce((total, item) => total + amountOf(item.amount), 0);
  const totalExpense = transactions.filter((item) => item.direction === 'expense').reduce((total, item) => total + amountOf(item.amount), 0);
  return {
    ...existing,
    accounts,
    transactions,
    monthlySummary,
    warnings,
    notableTransactions,
    reports,
    frontSheet: {
      ...(existing.frontSheet || {}),
      customerName: existing.frontSheet?.customerName || incoming.frontSheet?.customerName || '',
      currency: currencies.length === 1 ? currencies[0] : currencies.length > 1 ? 'MIXED' : 'UNKNOWN',
      currencies,
      coveredMonths,
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
    },
  };
}

export function scopeAnalysis(analysis, sourceId) {
  if (!analysis || !sourceId || sourceId === 'combined') return analysis;
  const account = list(analysis.accounts).find((item) => item.sourceId === sourceId);
  if (!account) return analysis;
  const transactions = list(analysis.transactions)
    .map((item, index) => ({ ...item, transactionIndex: Number.isInteger(item.transactionIndex) ? item.transactionIndex : index }))
    .filter((item) => item.sourceId === sourceId);
  const monthlySummary = list(account.monthlySummary).length ? account.monthlySummary : aggregateMonths(transactions);
  return {
    ...analysis,
    accounts: [account],
    transactions,
    monthlySummary,
    warnings: list(analysis.warnings).filter((item) => item.sourceId === sourceId),
    notableTransactions: list(analysis.notableTransactions).filter((item) => item.sourceId === sourceId),
    reports: list(analysis.reports).filter((item) => item.sourceId === sourceId),
    frontSheet: {
      ...account,
      coveredMonths: monthlySummary.length || Number(account.coveredMonths || 1),
      totalIncome: transactions.filter((item) => item.direction === 'income').reduce((sum, item) => sum + amountOf(item.amount), 0),
      totalExpense: transactions.filter((item) => item.direction === 'expense').reduce((sum, item) => sum + amountOf(item.amount), 0),
    },
  };
}

const sum = (items, selector) => items.reduce((total, item) => total + Number(selector(item) || 0), 0);
const mean = (values) => values.length ? sum(values, (value) => value) / values.length : 0;
const standardDeviation = (values) => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
};

const stabilityFor = (monthlyRows) => {
  const values = monthlyRows.map((item) => Number(item.income || 0)).filter((value) => value > 0);
  if (values.length < 2) return { key: 'unknown', label: 'Хангалттай хугацаа ажиглагдаагүй', coefficient: null };
  const average = mean(values);
  const coefficient = average ? standardDeviation(values) / average : 1;
  if (coefficient <= 0.3) return { key: 'high', label: 'Тогтвортой', coefficient };
  if (coefficient <= 0.6) return { key: 'medium', label: 'Хэлбэлзэлтэй', coefficient };
  return { key: 'low', label: 'Тогтворгүй', coefficient };
};

const scoreFor = ({ monthlyEligibleIncome, dti, dtiLimit, netCashFlow, stability, cashWithdrawalRatio, unclassifiedCount, credit }) => {
  const criteria = [
    { label: 'Зээлд тооцох орлого', score: monthlyEligibleIncome > 0 ? 15 : 0, max: 15 },
    { label: 'Орлогын тогтвортой байдал', score: stability.key === 'high' ? 20 : stability.key === 'medium' ? 14 : stability.key === 'low' ? 6 : 8, max: 20 },
    { label: 'Цэвэр мөнгөн урсгал', score: netCashFlow > 0 ? 20 : 0, max: 20 },
    { label: 'ӨОХ / DTI', score: dti === null ? 0 : dti <= dtiLimit ? 20 : dti <= dtiLimit + 10 ? 8 : 0, max: 20 },
    { label: 'Бэлэн мөнгөний сахилга', score: cashWithdrawalRatio <= 15 ? 10 : cashWithdrawalRatio <= 35 ? 6 : 1, max: 10 },
    { label: 'ЗМС төлөлтийн түүх', score: credit?.summary?.hasOverdue ? 0 : credit ? 10 : 5, max: 10 },
    { label: 'Ангиллын чанар', score: unclassifiedCount === 0 ? 5 : unclassifiedCount <= 3 ? 3 : 0, max: 5 },
  ];
  return { criteria, total: sum(criteria, (item) => item.score), max: sum(criteria, (item) => item.max) };
};

const industrySignalFor = (industryName, incomeRows) => {
  const source = lower(industryName);
  if (!source) return { status: 'not_selected', matchedTransactions: 0, label: 'ҮА чиглэл сонгоогүй' };
  const terms = source.split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 3);
  const matchedTransactions = incomeRows.filter((item) => {
    const sourceText = lower(`${item.description} ${item.category}`);
    return terms.some((term) => sourceText.includes(term));
  }).length;
  return matchedTransactions
    ? { status: 'matched', matchedTransactions, label: `${matchedTransactions} орлогын гүйлгээнд холбоотой дохио илэрсэн` }
    : { status: 'review', matchedTransactions: 0, label: 'Шууд түлхүүр дохио илрээгүй, ажилтан баталгаажуулна' };
};

export function deriveUnderwritingMetrics(analysis, {
  rules = [],
  overrides = {},
  incomeWeights = DEFAULT_INCOME_WEIGHTS,
  dtiLimit = 55,
  credit = null,
  industryName = '',
} = {}) {
  const scoped = analysis || { transactions: [], accounts: [], frontSheet: {} };
  const rows = list(scoped.transactions).map((item, index) => classifyTransaction({ ...item, transactionIndex: Number.isInteger(item.transactionIndex) ? item.transactionIndex : index }, index, { rules, overrides, incomeWeights }));
  const currencies = unique(list(scoped.accounts).map((item) => textOf(item.currency).toUpperCase()).filter((item) => item && item !== 'UNKNOWN'));
  const currency = currencies.length === 1 ? currencies[0] : currencies.length > 1 ? 'MIXED' : textOf(scoped.frontSheet?.currency).toUpperCase() || 'UNKNOWN';
  const mixedCurrency = currencies.length > 1;
  const monthlyRows = list(scoped.monthlySummary).length ? list(scoped.monthlySummary).map((item) => ({ ...item, netCashFlow: Number(item.netCashFlow ?? Number(item.income || 0) - Number(item.expense || 0)) })) : aggregateMonths(rows);
  const coveredMonths = Math.max(1, monthlyRows.filter((item) => item.month !== 'Тодорхойгүй').length || Number(scoped.frontSheet?.coveredMonths || 1));
  const incomeRows = rows.filter((item) => item.direction === 'income');
  const expenseRows = rows.filter((item) => item.direction === 'expense');
  const totalIncome = sum(incomeRows, (item) => item.amount);
  const totalExpense = sum(expenseRows, (item) => item.amount);
  const eligibleIncome = sum(incomeRows, (item) => item.amount * item.eligiblePercent / 100);
  const bankDebtPayment = sum(expenseRows.filter((item) => item.expenseGroup === 'A'), (item) => item.amount) / coveredMonths;
  const bureauDebtPayment = Number(credit?.summary?.estimatedMonthlyPayment || 0);
  const debtPayment = Math.max(bankDebtPayment, bureauDebtPayment);
  const monthlyEligibleIncome = eligibleIncome / coveredMonths;
  const monthlyIncome = totalIncome / coveredMonths;
  const monthlyExpense = totalExpense / coveredMonths;
  const netCashFlow = (totalIncome - totalExpense) / coveredMonths;
  const dti = mixedCurrency || monthlyEligibleIncome <= 0 ? null : debtPayment / monthlyEligibleIncome * 100;
  const cashWithdrawals = sum(expenseRows.filter((item) => hasAny(lower(item.description), ['atm', 'бэлэн мөнгө', 'cash withdrawal'])), (item) => item.amount);
  const cashWithdrawalRatio = totalExpense ? cashWithdrawals / totalExpense * 100 : 0;
  const unclassified = rows.filter((item) => item.confidence === 'review' || item.expenseGroup === 'U' || (item.direction === 'income' && item.incomeType === 'other'));
  const stability = stabilityFor(monthlyRows);
  const incomeBreakdown = INCOME_TYPES.map((type) => {
    const entries = incomeRows.filter((item) => item.incomeType === type.key);
    const total = sum(entries, (item) => item.amount);
    return { ...type, total, eligible: sum(entries, (item) => item.amount * item.eligiblePercent / 100), count: entries.length, sharePercent: totalIncome ? total / totalIncome * 100 : 0 };
  }).filter((item) => item.total > 0 || item.key === 'other');
  const expenseBreakdown = EXPENSE_GROUPS.map((group) => {
    const entries = expenseRows.filter((item) => item.expenseGroup === group.key);
    const total = sum(entries, (item) => item.amount);
    return { ...group, total, count: entries.length, sharePercent: totalExpense ? total / totalExpense * 100 : 0 };
  }).filter((item) => item.total > 0 || item.key === 'U');
  const suspicious = [];
  const addFlag = (tone, title, detail, sourceId = '') => {
    const key = `${title}|${detail}`;
    if (!suspicious.some((item) => item.key === key)) suspicious.push({ key, tone, title, detail, sourceId });
  };
  list(scoped.warnings).forEach((item) => addFlag('amber', 'AI анхааруулга', typeof item === 'string' ? item : item.text, item.sourceId));
  list(scoped.notableTransactions).forEach((item) => addFlag('amber', item.flagReason || 'Анхаарал татсан гүйлгээ', `${item.date || ''} · ${item.description || ''}`, item.sourceId));
  if (cashWithdrawalRatio > 35) addFlag('amber', 'Бэлэн мөнгөний урсгал өндөр', `Зарлагын ${cashWithdrawalRatio.toFixed(1)}% нь ATM эсвэл бэлэн мөнгөтэй холбоотой.`);
  if (rows.some((item) => hasAny(lower(item.description), ['казино', 'casino', 'bet', 'бооцоо', 'gambl']))) addFlag('rose', 'Мөрийтэй тоглоомын шинжтэй гүйлгээ', 'Тухайн гүйлгээг зээлийн судлаач заавал нягтална.');
  if (dti !== null && dti > dtiLimit) addFlag('rose', 'DTI босго хэтэрсэн', `ӨОХ ${dti.toFixed(1)}%, тохируулсан босго ${dtiLimit}%.`);
  if (credit?.summary?.hasOverdue) addFlag('rose', 'ЗМС дээр хугацаа хэтрэлттэй', `${credit.summary.maxOverdueDays || 0} хоногийн хугацаа хэтрэлт илэрсэн.`);
  if (netCashFlow <= 0) addFlag('rose', 'Цэвэр мөнгөн урсгал сөрөг', 'Сарын дундаж орлого нь зарлагыг нөхөхгүй байна.');
  if (mixedCurrency) addFlag('amber', 'Олон валютын данс', 'Хөрвүүлэлтийн ханш оруулаагүй тул DTI болон нийлбэр дүнг тооцоогүй.');
  if (unclassified.length) addFlag('amber', 'Ажилтны ангилал шаардлагатай', `${unclassified.length} гүйлгээ ангилал эсвэл зээлд тооцох жингээ баталгаажуулаагүй.`);

  const score = scoreFor({ monthlyEligibleIncome, dti, dtiLimit, netCashFlow, stability, cashWithdrawalRatio, unclassifiedCount: unclassified.length, credit });
  const industryMatch = industrySignalFor(industryName, incomeRows);
  const reasons = [
    ...(mixedCurrency ? ['Олон валютын дансыг хөрвүүлэлтгүйгээр нэгтгээгүй.'] : []),
    ...(dti !== null && dti > dtiLimit ? ['DTI тохируулсан босгоос өндөр.'] : []),
    ...(netCashFlow <= 0 ? ['Сарын цэвэр мөнгөн урсгал сөрөг.'] : []),
    ...(credit?.summary?.hasOverdue ? ['ЗМС-ийн хугацаа хэтрэлтийг нягтална.'] : []),
    ...(unclassified.length ? [`${unclassified.length} гүйлгээ ажилтны ангилал хүлээж байна.`] : []),
  ];
  const decision = mixedCurrency
    ? { tone: 'amber', title: 'Валютын хөрвүүлэлт шаардлагатай', text: 'Өөр валюттай дансуудыг хөрвүүлэлтгүйгээр нэгтгэхгүй. Дангаар нь хянах эсвэл зөвшөөрөгдсөн ханшаар хөрвүүлнэ.' }
    : !monthlyEligibleIncome
    ? { tone: 'amber', title: 'Мэдээлэл дутуу', text: 'Зээлд тооцох орлогыг баталгаажуулсны дараа DTI тооцно.' }
    : reasons.some((item) => /DTI|сөрөг|хугацаа хэтрэлт/.test(item))
      ? { tone: 'rose', title: 'Нэмэлт хяналт шаардлагатай', text: 'Эцсийн шийдвэрийн өмнө эрсдэлийн дохионуудыг зээлийн судлаач баталгаажуулна.' }
      : { tone: 'emerald', title: 'Урьдчилсан эерэг дохио', text: 'Орлого, DTI болон мөнгөн урсгалын үндсэн шалгуур зөвшөөрөгдөх түвшинд байна.' };

  return {
    rows,
    currency,
    currencies,
    mixedCurrency,
    coveredMonths,
    totalIncome,
    totalExpense,
    eligibleIncome,
    monthlyIncome,
    monthlyExpense,
    monthlyEligibleIncome,
    netCashFlow,
    bankDebtPayment,
    bureauDebtPayment,
    debtPayment,
    dti,
    dtiLimit: Number(dtiLimit || 0),
    cashWithdrawals,
    cashWithdrawalRatio,
    unclassified,
    stability,
    incomeBreakdown,
    expenseBreakdown,
    monthlyRows,
    suspicious,
    score,
    industryMatch,
    decision,
    reasons,
  };
}

export const amount = amountOf;
export const values = list;
