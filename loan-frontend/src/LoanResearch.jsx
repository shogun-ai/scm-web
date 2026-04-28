import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  BadgeCheck,
  Calculator,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Shield,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';

const getAuthToken = () => localStorage.getItem('loan_token') || '';
const authH = () => ({ Authorization: `Bearer ${getAuthToken()}` });

const PRODUCTS = {
  biz_loan: 'Бизнесийн зээл',
  car_purchase_loan: 'Автомашин худалдан авах',
  car_coll_loan: 'Автомашин барьцаалсан зээл',
  cons_loan: 'Хэрэглээний зээл',
  trust: 'Итгэлцлийн зээл',
  credit_card: 'Кредит карт',
  re_loan: 'Дахин санхүүжилт',
  line_loan: 'Зээлийн шугам',
  mortgage: 'Орон сууцны зээл',
};

const initialForm = {
  borrowerType: 'individual',
  lastName: '',
  firstName: '',
  fatherName: '',
  borrowerName: '',
  regNo: '',
  phone: '',
  email: '',
  address: '',
  orgName: '',
  orgRegNo: '',
  contactName: '',
  contactPosition: '',
  contactPhone: '',
  businessSector: '',
  operationYears: '',
  employment: '',
  incomeSource: '',
  creditScore: '',
  otherLoanAmount: '',
  otherLoanBalance: '',
  otherLoans: [],
  classification: 'normal',
  requestedAmount: '',
  termMonths: '',
  purpose: '',
  repaymentSource: '',
  sourceRequestId: '',
  sourceProduct: '',
  profileImageUrl: '',
  requestFileUrls: [],
  requestFiles: [],
  averageMonthlyIncome: '',
  averageMonthlyCost: '',
  monthlyDebtPayment: '',
  monthlyRate: '3.2',
  comment: '',
  // Барьцаа
  collaterals: [],
  // Батлан даагч
  guarantors: [],
  // Зээлийн тооцооллын нөхцөл
  repaymentStartDate: '',
  repaymentType: 'equal',
  graceMonths: '',
  // Ажилтны шийдвэр
  analystDecision: '',
  analystOpinion: '',
  conditions: '',
  riskFlags: [],
};

const emptyOtherLoan = {
  lender: '',
  product: '',
  amount: '',
  balance: '',
  monthlyPayment: '',
  classification: 'normal',
};

const emptyCollateral = {
  collateralType: 'real_estate',
  description: '',
  estimatedValue: '',
  ownerName: '',
  ownerRelation: '',
  hasPlate: 'yes',
  plateNumber: '',
};

const emptyGuarantor = {
  guarantorType: '',
  personType: 'individual',
  name: '',
  regNo: '',
  phone: '',
  address: '',
  employment: '',
  relationship: '',
  monthlyIncome: '',
  creditScore: '',
  otherLoans: [],
  collaterals: [],
};

const COLLATERAL_TYPES = {
  real_estate: 'Үл хөдлөх хөрөнгө',
  vehicle: 'Тээврийн хэрэгсэл',
  equipment: 'Тоног төхөөрөмж',
  deposit: 'Хадгаламж',
  livestock: 'Мал аж ахуй',
  other: 'Бусад',
};

const ANALYST_DECISIONS = {
  approve: { label: 'Зөвшөөрөх', icon: ThumbsUp, color: 'text-green-700 bg-green-50 border-green-300' },
  conditional: { label: 'Нөхцөлтэй зөвшөөрөх', icon: Shield, color: 'text-amber-700 bg-amber-50 border-amber-300' },
  reject: { label: 'Татгалзах', icon: ThumbsDown, color: 'text-red-700 bg-red-50 border-red-300' },
};

const RISK_FLAGS = [
  'Орлогын эх үүсвэр тодорхойгүй',
  'Дансны хуулгад тогтмол орлого харагдахгүй',
  'DTI хэт өндөр (>55%)',
  'Зээлийн ангилал сөрөг (хэвийн бус болон дээш)',
  'Барьцааны дүн хүрэлцэхгүй (LTV>80%)',
  'Бусад банк/ББСБ-д хугацаа хэтэрсэн зээл бий',
  'НД-ийн шимтгэл тогтмол биш',
  'Бизнесийн үйл ажиллагаа алдагдалтай',
  'Зохистой харьцааны шаардлага хангахгүй',
  'Батлан даагчийн орлого хүрэлцэхгүй',
];

const classificationLabels = {
  normal: 'Хэвийн',
  attention: 'Анхаарал хандуулах',
  substandard: 'Хэвийн бус',
  doubtful: 'Эргэлзээтэй',
  bad: 'Муу',
};

const parseNumber = (value) => {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => `${Math.round(value || 0).toLocaleString('mn-MN')} ₮`;

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const getDisplayName = (form) => (
  form.borrowerType === 'organization'
    ? (form.orgName || form.borrowerName)
    : ([form.firstName, form.fatherName].filter(Boolean).join(' ') || form.lastName || form.borrowerName)
);

const getDisplayRegNo = (form) => (
  form.borrowerType === 'organization' ? (form.orgRegNo || form.regNo) : form.regNo
);

const getDisplayPhone = (form) => (
  form.borrowerType === 'organization' ? (form.contactPhone || form.phone) : form.phone
);

const REQUEST_FILE_LABELS = {
  file_selfie: 'Профайл зураг',
  file_id: 'Иргэний үнэмлэх / лавлагаа',
  file_address: 'Оршин суугаа хаяг',
  file_social: 'Нийгмийн даатгалын лавлагаа',
  file_bank: 'Дансны хуулга',
  file_org_cert: 'Улсын бүртгэлийн гэрчилгээ',
  file_charter: 'Байгууллагын дүрэм',
  file_finance: 'Санхүүгийн тайлан',
  file_org_bank: 'Дансны хуулга',
  file_prop_cert: 'Үл хөдлөхийн гэрчилгээ',
  file_prop_map: 'Кадастр / гэрээ',
  file_car_cert: 'Тээврийн хэрэгслийн гэрчилгээ',
  file_car_photos: 'Машины зураг',
  legacy: 'Бусад материал',
};

const BANK_STATEMENT_FIELDS = new Set(['file_bank', 'file_org_bank']);

const getFileNameFromUrl = (url = '') => {
  const clean = String(url).split('?')[0];
  try {
    return decodeURIComponent(clean.split('/').pop() || clean);
  } catch (error) {
    return clean.split('/').pop() || clean;
  }
};

const isBankStatementFile = (file = {}) => (
  BANK_STATEMENT_FIELDS.has(file.fieldName)
  || /bank|statement|хуулга|khuulga|dans/i.test(`${file.fileName || ''} ${file.fileUrl || ''}`)
);

const normalizeRequestFiles = (request = {}) => {
  const details = Array.isArray(request.fileDetails) && request.fileDetails.length
    ? request.fileDetails
    : (request.fileNames || []).map((url, index) => ({
        fieldName: 'legacy',
        fileName: getFileNameFromUrl(url) || `Файл ${index + 1}`,
        fileUrl: url,
      }));

  return details.map((file, index) => {
    const normalized = {
      id: `${file.fieldName || 'legacy'}-${file.fileUrl || file.fileName || index}`,
      fieldName: file.fieldName || 'legacy',
      fileName: file.fileName || getFileNameFromUrl(file.fileUrl) || `Файл ${index + 1}`,
      fileUrl: file.fileUrl || file.url || '',
      mimeType: file.mimeType || '',
      size: file.size || 0,
    };
    return {
      ...normalized,
      category: REQUEST_FILE_LABELS[normalized.fieldName] || 'Бусад материал',
      isBankStatement: isBankStatementFile(normalized),
    };
  });
};

const groupFilesByCategory = (files = []) => files.reduce((groups, file) => {
  const category = file.category || 'Бусад материал';
  return { ...groups, [category]: [...(groups[category] || []), file] };
}, {});

const mergeCategoryRows = (items, nameKey, totalAmount) => {
  const map = new Map();
  items.forEach((item) => {
    const name = item?.[nameKey] || 'Бусад';
    const previous = map.get(name) || { ...item, [nameKey]: name, amount: 0, sharePercent: 0 };
    previous.amount += Number(item?.amount || 0);
    previous.frequency = previous.frequency || item?.frequency || '';
    map.set(name, previous);
  });
  return Array.from(map.values()).map((item) => ({
    ...item,
    sharePercent: totalAmount ? (Number(item.amount || 0) / totalAmount) * 100 : 0,
  }));
};

const mergeStatementAnalyses = (items = []) => {
  const validItems = items.filter((item) => item?.analysis);
  if (!validItems.length) return null;
  if (validItems.length === 1) {
    return {
      ...validItems[0].analysis,
      accounts: validItems.map((item) => ({
        key: item.key,
        label: item.label,
        accountNumber: item.analysis.frontSheet?.accountNumber || '',
        bankName: item.analysis.frontSheet?.bankName || '',
        periodStart: item.analysis.frontSheet?.periodStart || '',
        periodEnd: item.analysis.frontSheet?.periodEnd || '',
        coveredMonths: item.analysis.frontSheet?.coveredMonths || '',
        totalIncome: item.analysis.frontSheet?.totalIncome || 0,
        totalExpense: item.analysis.frontSheet?.totalExpense || 0,
        netCashFlow: item.analysis.frontSheet?.netCashFlow || 0,
      })),
    };
  }

  const monthMap = new Map();
  validItems.forEach(({ analysis }) => {
    (analysis.monthlySummary || []).forEach((row) => {
      const previous = monthMap.get(row.month) || {
        month: row.month,
        income: 0,
        expense: 0,
        netCashFlow: 0,
        startingBalance: 0,
        endingBalance: 0,
        transactionCount: 0,
      };
      previous.income += Number(row.income || 0);
      previous.expense += Number(row.expense || 0);
      previous.netCashFlow += Number(row.netCashFlow || 0);
      previous.startingBalance += Number(row.startingBalance || 0);
      previous.endingBalance += Number(row.endingBalance || 0);
      previous.transactionCount += Number(row.transactionCount || 0);
      monthMap.set(row.month, previous);
    });
  });

  const monthlySummary = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  const totalIncome = monthlySummary.reduce((sum, row) => sum + Number(row.income || 0), 0);
  const totalExpense = monthlySummary.reduce((sum, row) => sum + Number(row.expense || 0), 0);
  const netCashFlow = totalIncome - totalExpense;
  const coveredMonths = monthlySummary.length || 1;
  const frontSheets = validItems.map((item) => item.analysis.frontSheet || {});
  const uniqueAccounts = [...new Set(frontSheets.map((sheet) => sheet.accountNumber).filter(Boolean))];
  const uniqueBanks = [...new Set(frontSheets.map((sheet) => sheet.bankName).filter(Boolean))];
  const periodStarts = frontSheets.map((sheet) => sheet.periodStart).filter(Boolean).sort();
  const periodEnds = frontSheets.map((sheet) => sheet.periodEnd).filter(Boolean).sort();

  return {
    frontSheet: {
      ...(frontSheets[0] || {}),
      accountNumber: uniqueAccounts.length ? uniqueAccounts.join(', ') : `${validItems.length} данс`,
      bankName: uniqueBanks.join(', '),
      periodStart: periodStarts[0] || '',
      periodEnd: periodEnds[periodEnds.length - 1] || '',
      coveredMonths,
      startingBalance: frontSheets.reduce((sum, sheet) => sum + Number(sheet.startingBalance || 0), 0),
      endingBalance: frontSheets.reduce((sum, sheet) => sum + Number(sheet.endingBalance || 0), 0),
      totalIncome,
      totalExpense,
      netCashFlow,
      averageMonthlyIncome: totalIncome / coveredMonths,
      averageMonthlyExpense: totalExpense / coveredMonths,
      averageMonthlyNetCashFlow: netCashFlow / coveredMonths,
      mainIncomeSource: [...new Set(frontSheets.map((sheet) => sheet.mainIncomeSource).filter(Boolean))].join(', '),
      mainExpensePattern: [...new Set(frontSheets.map((sheet) => sheet.mainExpensePattern).filter(Boolean))].join(', '),
      keyRisks: [...new Set(frontSheets.map((sheet) => sheet.keyRisks).filter(Boolean))].join(' | '),
      spendingBehavior: [...new Set(frontSheets.map((sheet) => sheet.spendingBehavior).filter(Boolean))].join(' | '),
      avgTransactionsPerMonth: frontSheets.reduce((sum, s) => sum + Number(s.avgTransactionsPerMonth || 0), 0) / (frontSheets.length || 1),
      hasLoanRepayments: frontSheets.some((s) => s.hasLoanRepayments === 'тийм') ? 'тийм' : frontSheets.every((s) => s.hasLoanRepayments === 'үгүй') ? 'үгүй' : 'тодорхойгүй',
      loanRepaymentDetails: [...new Set(frontSheets.map((sheet) => sheet.loanRepaymentDetails).filter(Boolean))].join(' | '),
      cashWithdrawalFrequency: [...new Set(frontSheets.map((sheet) => sheet.cashWithdrawalFrequency).filter(Boolean))].join(' | '),
    },
    monthlySummary,
    transactions: validItems.flatMap((item) => item.analysis.transactions || []),
    incomeSources: mergeCategoryRows(validItems.flatMap((item) => item.analysis.incomeSources || []), 'source', totalIncome),
    expenseCategories: mergeCategoryRows(validItems.flatMap((item) => item.analysis.expenseCategories || []), 'category', totalExpense),
    cashFlowBehaviour: {
      incomeBehaviour: [...new Set(validItems.map((item) => item.analysis.cashFlowBehaviour?.incomeBehaviour).filter(Boolean))].join(' | '),
      expenseBehaviour: [...new Set(validItems.map((item) => item.analysis.cashFlowBehaviour?.expenseBehaviour).filter(Boolean))].join(' | '),
      netCashFlowBehaviour: [...new Set(validItems.map((item) => item.analysis.cashFlowBehaviour?.netCashFlowBehaviour).filter(Boolean))].join(' | '),
      conclusion: [...new Set(validItems.map((item) => item.analysis.cashFlowBehaviour?.conclusion).filter(Boolean))].join(' | '),
    },
    notableTransactions: validItems.flatMap((item) => item.analysis.notableTransactions || []),
    analysisReport: validItems.length === 1
      ? (validItems[0].analysis.analysisReport || null)
      : (() => {
          // For multiple accounts, use first account's report as base (merged context)
          const first = validItems[0].analysis.analysisReport || {};
          return {
            summaryRows: first.summaryRows || [],
            incomeScoring: first.incomeScoring || [],
            incomeClassification: validItems.flatMap((item) => item.analysis.analysisReport?.incomeClassification || []),
            expenseClassification: validItems.flatMap((item) => item.analysis.analysisReport?.expenseClassification || []),
            behaviorPatterns: first.behaviorPatterns || { incomePattern: '', expensePattern: '', payrollCycle: '', cashDependency: '', ownerRelatedFlow: '', cashBuffer: '' },
            creditScoring: first.creditScoring || { criteria: [], totalScore: 0, maxScore: 100 },
          };
        })(),
    warnings: [...new Set(validItems.flatMap((item) => item.analysis.warnings || []))],
    accounts: validItems.map((item) => ({
      key: item.key,
      label: item.label,
      accountNumber: item.analysis.frontSheet?.accountNumber || '',
      bankName: item.analysis.frontSheet?.bankName || '',
      periodStart: item.analysis.frontSheet?.periodStart || '',
      periodEnd: item.analysis.frontSheet?.periodEnd || '',
      coveredMonths: item.analysis.frontSheet?.coveredMonths || '',
      totalIncome: item.analysis.frontSheet?.totalIncome || 0,
      totalExpense: item.analysis.frontSheet?.totalExpense || 0,
      netCashFlow: item.analysis.frontSheet?.netCashFlow || 0,
    })),
  };
};

const normalizeLoanRequest = (request) => {
  if (!request) return initialForm;
  const isOrg = request.userType === 'organization';
  const requestFiles = normalizeRequestFiles(request);
  const appData = request.applicationData || {};
  const borrower = appData.borrower || {};
  const org = appData.org || {};
  const loanReq = appData.loanRequest || {};

  // Credit bureau — active loans + score
  const cbData = appData.creditBureau?.creditBureauData || {};
  const activeLoans = (cbData.primaryLoans || [])
    .filter(l => l.balance > 0)
    .map(l => ({
      lender: l.institution || '',
      product: l.loanType || '',
      amount: String(Math.round(l.originalAmount || 0)),
      balance: String(Math.round(l.balance || 0)),
      monthlyPayment: String(Math.round(l.estimatedMonthlyPayment || 0)),
      classification: l.isOverdue ? (l.overdueDays > 90 ? 'doubtful' : 'substandard') : 'normal',
    }));

  // Bank statement — merge ALL accounts from incomeResearch (or legacy collaterals)
  const irBsArr = appData.incomeResearch?.bankStatementAnalyses;
  let bsFs = {};
  if (Array.isArray(irBsArr) && irBsArr.length > 0) {
    const bsItems = irBsArr.map((a, i) => ({ key: `norm-bs-${i}`, label: `Данс ${i + 1}`, analysis: a }));
    const merged = mergeStatementAnalyses(bsItems);
    bsFs = merged?.frontSheet || {};
  } else {
    const bsColl = (appData.collaterals || []).find(c => c.type === 'bank_statement' && c.fields?.frontSheet);
    bsFs = bsColl?.fields?.frontSheet || {};
  }
  const avgIncome = bsFs.averageMonthlyIncome || borrower.monthlyIncome || '';
  const avgExpense = bsFs.averageMonthlyExpense || '';
  // Social insurance avg salary if available
  const siAvgSalary = appData.incomeResearch?.socialInsuranceAnalysis?.averageSalary || '';

  // Collaterals (real_estate, vehicle, contract) with officer valuation coverage amount
  const appCollaterals = (appData.collaterals || [])
    .filter(c => ['real_estate', 'vehicle', 'contract'].includes(c.type))
    .map(c => {
      const oAmt = Number(c.valuation?.officerAmount || 0);
      const rate = Number(c.valuation?.coverageRate || 100);
      const coveredAmt = oAmt * rate / 100;
      const f = c.fields || {};
      const desc = [f.propertyType || f.make, f.ownerName].filter(Boolean).join(' — ');
      const plateNum = c.plateNumber || f.plateNumber || '';
      return {
        collateralType: c.type === 'real_estate' ? 'real_estate' : c.type === 'vehicle' ? 'vehicle' : 'other',
        description: desc || c.type,
        estimatedValue: String(coveredAmt || oAmt || ''),
        ownerName: f.ownerName || '',
        ownerRelation: c.ownerRelation || '',
        hasPlate: c.hasPlate || (plateNum ? 'yes' : 'no'),
        plateNumber: plateNum,
      };
    });

  // Guarantors — preserve full profile, creditBureau, and collaterals
  const appGuarantors = (appData.guarantors || []).map(g => {
    const p = g.person || {};
    const o = g.org || {};
    const isInd = g.personType !== 'organization';
    const cbData = g.creditBureau?.creditBureauData || {};
    const ficoScore = g.creditBureau?.ficoData?.ficoScore;
    const gCollaterals = (g.collaterals || []).map(c => {
      const f = c.fields || {};
      const oAmt = Number(c.valuation?.officerAmount || 0);
      const covRate = Number(c.valuation?.coverageRate || 100);
      const coveredAmt = oAmt && covRate ? Math.round(oAmt * covRate / 100) : oAmt;
      const gPlateNum = c.plateNumber || f.plateNumber || '';
      const desc = f.propertyAddress || f.propertyType || c.type || '';
      return {
        collateralType: c.type === 'real_estate' ? 'real_estate' : c.type === 'vehicle' ? 'vehicle' : 'other',
        description: desc,
        estimatedValue: String(coveredAmt || ''),
        ownerName: f.ownerName || (isInd ? ([p.firstName, p.fatherName].filter(Boolean).join(' ') || `${p.lastName || ''}`.trim()) : (o.orgName || '')),
        ownerRelation: c.ownerRelation || (isInd ? (g.guarantorType || '') : ''),
        hasPlate: c.hasPlate || (gPlateNum ? 'yes' : 'no'),
        plateNumber: gPlateNum,
      };
    });
    return {
      guarantorType: g.guarantorType || '',
      personType: g.personType || 'individual',
      name: isInd ? ([p.firstName, p.fatherName].filter(Boolean).join(' ') || `${p.lastName || ''}`.trim()) : (o.orgName || ''),
      regNo: isInd ? (p.regNo || '') : (o.orgRegNo || ''),
      phone: isInd ? (p.phone || '') : (o.contactPhone || ''),
      address: isInd ? (p.address || '') : (o.address || ''),
      employment: isInd ? (p.employmentType || '') : '',
      relationship: g.guarantorType || '',
      monthlyIncome: isInd ? String(p.monthlyIncome || '') : String(o.monthlyRevenue || ''),
      creditScore: ficoScore != null
        ? String(Math.round(ficoScore))
        : (cbData.creditBureauScore ? String(Math.round(cbData.creditBureauScore)) : ''),
      otherLoans: (cbData.primaryLoans || []).filter(l => l.balance > 0).map(l => ({
        lender: l.institution || '',
        balance: String(Math.round(l.balance || 0)),
        monthlyPayment: String(Math.round(l.estimatedMonthlyPayment || 0)),
      })),
      collaterals: gCollaterals,
    };
  });

  const borrowerType = appData.borrowerType || (isOrg ? 'organization' : 'individual');

  return {
    ...initialForm,
    borrowerType,
    lastName: borrower.lastName || request.lastname || '',
    firstName: borrower.firstName || request.firstname || '',
    fatherName: borrower.fatherName || request.fatherName || '',
    borrowerName: borrowerType === 'organization'
      ? (org.orgName || request.orgName || '')
      : [borrower.firstName || request.firstname, borrower.fatherName || request.fatherName].filter(Boolean).join(' ')
        || [borrower.lastName || request.lastname, borrower.firstName || request.firstname].filter(Boolean).join(' '),
    regNo: borrowerType === 'organization' ? (org.orgRegNo || request.orgRegNo || '') : (borrower.regNo || request.regNo || ''),
    phone: borrowerType === 'organization' ? (org.contactPhone || request.contactPhone || '') : (borrower.phone || request.phone || ''),
    email: borrower.email || request.email || '',
    address: borrower.address || request.address || '',
    orgName: org.orgName || request.orgName || '',
    orgRegNo: org.orgRegNo || request.orgRegNo || '',
    contactName: org.contactName || request.contactName || '',
    contactPosition: org.contactPosition || request.contactPosition || '',
    contactPhone: org.contactPhone || request.contactPhone || '',
    requestedAmount: loanReq.amount ? String(loanReq.amount) : (request.amount ? String(request.amount) : ''),
    termMonths: loanReq.term ? String(loanReq.term) : (request.term ? String(request.term) : ''),
    purpose: loanReq.purpose || request.purpose || '',
    repaymentSource: bsFs.repaymentSource || loanReq.repaymentSource || request.repaymentSource || '',
    sourceRequestId: request._id || '',
    sourceProduct: loanReq.product || request.selectedProduct || '',
    profileImageUrl: borrower.profileImageUrl || request.selfieUrl ||
      (request.fileDetails?.find(f => f.fieldName === 'file_selfie')?.fileUrl) || '',
    requestFileUrls: request.fileNames || [],
    requestFiles,
    averageMonthlyIncome: avgIncome ? String(Math.round(Number(avgIncome))) : (siAvgSalary ? String(Math.round(Number(siAvgSalary))) : ''),
    averageMonthlyCost: avgExpense ? String(Math.round(Number(avgExpense))) : '',
    monthlyDebtPayment: cbData.summary?.estimatedMonthlyPayment
      ? String(Math.round(cbData.summary.estimatedMonthlyPayment)) : '',
    creditScore: appData.creditBureau?.ficoData?.ficoScore != null
      ? String(Math.round(appData.creditBureau.ficoData.ficoScore))
      : (cbData.creditBureauScore ? String(Math.round(cbData.creditBureauScore)) : ''),
    classification: cbData.summary?.hasOverdue
      ? (cbData.summary.maxOverdueDays > 90 ? 'doubtful' : 'substandard') : 'normal',
    otherLoans: activeLoans.length ? activeLoans : [],
    collaterals: appCollaterals.length ? appCollaterals : [],
    guarantors: appGuarantors.length ? appGuarantors : [],
    // Individual borrower extra fields
    employment: borrower.employmentType || '',
    incomeSource: bsFs.mainIncomeSource || borrower.incomeSource || '',
    // Org extra fields
    businessSector: org.industry || '',
    operationYears: org.operationYears || '',
    comment: cbData.summary?.institutionSummary || '',
  };
};

const calculatePayment = (principal, months, monthlyRatePercent) => {
  if (!principal || !months) return 0;
  const rate = monthlyRatePercent / 100;
  if (!rate) return principal / months;
  return principal * ((rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1));
};

const buildAmortizationRows = (principal, months, monthlyRatePercent, startDateStr) => {
  if (!principal || !months) return [];
  const rate = monthlyRatePercent / 100;
  const payment = calculatePayment(principal, months, monthlyRatePercent);
  let balance = principal;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  return Array.from({ length: months }, (_, i) => {
    const interest = balance * rate;
    const principalPart = Math.max(0, payment - interest);
    const prevBalance = balance;
    balance = Math.max(0, balance - principalPart);
    let dateLabel = '';
    let calendarDays = null;
    if (startDate && !isNaN(startDate)) {
      const cur = new Date(startDate);
      cur.setMonth(cur.getMonth() + i);
      dateLabel = `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}/${String(cur.getDate()).padStart(2, '0')}`;
      if (i === 0) {
        calendarDays = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      } else {
        const prev = new Date(startDate);
        prev.setMonth(prev.getMonth() + i - 1);
        calendarDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
      }
    }
    return {
      month: i + 1,
      dateLabel,
      calendarDays,
      openingBalance: prevBalance,
      payment,
      interest,
      principal: principalPart,
      closingBalance: balance,
    };
  });
};

const buildOutputs = (form, context = {}) => {
  const { hasCreditRef = false, hasStatementAnalysis = false, hasSocialInsurance = false } = context;
  const requestedAmount = parseNumber(form.requestedAmount);
  const termMonths = parseNumber(form.termMonths);
  const income = parseNumber(form.averageMonthlyIncome);
  const cost = parseNumber(form.averageMonthlyCost);
  const loans = Array.isArray(form.otherLoans) ? form.otherLoans : [];
  const otherLoanTotalAmount = loans.reduce((sum, loan) => sum + parseNumber(loan.amount), parseNumber(form.otherLoanAmount));
  const otherLoanBalance = loans.reduce((sum, loan) => sum + parseNumber(loan.balance), parseNumber(form.otherLoanBalance));
  const otherLoanMonthlyPayment = loans.reduce((sum, loan) => sum + parseNumber(loan.monthlyPayment), 0);
  const monthlyDebt = parseNumber(form.monthlyDebtPayment) + otherLoanMonthlyPayment;
  const creditScore = parseNumber(form.creditScore);
  const monthlyRate = parseNumber(form.monthlyRate);
  const monthlyPayment = calculatePayment(requestedAmount, termMonths, monthlyRate);
  const netIncome = income - cost;
  const freeCashFlow = netIncome - monthlyDebt - monthlyPayment;
  const dti = income ? ((monthlyDebt + monthlyPayment) / income) * 100 : 0;

  // --- Барьцаа ---
  const collaterals = Array.isArray(form.collaterals) ? form.collaterals : [];
  const totalCollateralValue = collaterals.reduce((sum, c) => sum + parseNumber(c.estimatedValue), 0);
  const ltvRatio = totalCollateralValue > 0 && requestedAmount > 0
    ? (requestedAmount / totalCollateralValue) * 100
    : null;
  const collateralCoverage = totalCollateralValue > 0 && requestedAmount > 0
    ? totalCollateralValue / requestedAmount
    : 0;

  // --- Батлан даагч ---
  const guarantors = Array.isArray(form.guarantors) ? form.guarantors : [];
  const totalGuarantorIncome = guarantors.reduce((sum, g) => sum + parseNumber(g.monthlyIncome), 0);
  const guarantorCollaterals = guarantors.flatMap(g => Array.isArray(g.collaterals) ? g.collaterals : []);
  const guarantorCollateralValue = guarantorCollaterals.reduce((sum, c) => sum + parseNumber(c.estimatedValue), 0);
  const combinedCollateralValue = totalCollateralValue + guarantorCollateralValue;
  const combinedCollateralCoverage = combinedCollateralValue > 0 && requestedAmount > 0
    ? combinedCollateralValue / requestedAmount : 0;
  const bestGuarantorScore = guarantors.reduce((best, g) => {
    const s = parseNumber(g.creditScore);
    return s > best ? s : best;
  }, 0);

  const classificationPenalty = {
    normal: 0,
    attention: 8,
    substandard: 18,
    doubtful: 30,
    bad: 45,
  }[form.classification] || 0;

  const effectiveCreditScore = Math.max(creditScore, bestGuarantorScore);
  const scorePart = effectiveCreditScore ? Math.min(45, Math.max(0, (effectiveCreditScore / 850) * 45)) : 20;
  const dtiPart = Math.max(0, 25 - Math.max(0, dti - 35) * 0.7);
  const cashPart = freeCashFlow > 0 ? Math.min(20, (freeCashFlow / Math.max(monthlyPayment, 1)) * 12) : 0;
  const debtPart = otherLoanBalance > requestedAmount ? 4 : 10;
  const collateralPart = combinedCollateralCoverage >= 1.5 ? 10 : combinedCollateralCoverage >= 1.0 ? 6 : combinedCollateralCoverage > 0 ? 3 : 0;
  const guarantorPart = totalGuarantorIncome >= monthlyPayment ? 5 : totalGuarantorIncome > 0 ? 2 : 0;

  const rawScore = scorePart + dtiPart + cashPart + debtPart + collateralPart + guarantorPart - classificationPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const scoreBreakdown = [
    { label: 'Кредит скор', value: Math.round(scorePart), max: 45, color: 'bg-blue-500',
      reason: effectiveCreditScore ? `Кредит скор ${effectiveCreditScore}/850 — оноо: ${Math.round(scorePart)}/45` : 'Кредит скор оруулаагүй — дундаж оноо (20/45) тооцогдлоо' },
    { label: 'DTI харьцаа', value: Math.round(dtiPart), max: 25, color: 'bg-indigo-500',
      reason: income > 0 ? `DTI ${dti.toFixed(1)}% — оноо: ${Math.round(dtiPart)}/25` : 'Орлого оруулаагүй — DTI тооцоолол хийгдэхгүй' },
    { label: 'Чөлөөт урсгал', value: Math.round(cashPart), max: 20, color: 'bg-teal-500',
      reason: freeCashFlow > 0 ? `FCF ${formatMoney(freeCashFlow)} — зээлийн сарын төлбөрт харьцуулсан илүүдэл сайн` : `FCF ${formatMoney(freeCashFlow)} — сөрөг буюу хангалтгүй` },
    { label: 'Өрийн ачаалал', value: Math.round(debtPart), max: 10, color: 'bg-cyan-500',
      reason: otherLoanBalance > 0 ? `Нийт өрийн үлдэгдэл ${formatMoney(otherLoanBalance)} — зээлийн дүнтэй харьцуулахад ${otherLoanBalance > requestedAmount ? 'их (4/10)' : 'бага (10/10)'}` : 'Бусад зээл байхгүй — дээд оноо (10/10)' },
    { label: 'Барьцааны хамрагдац', value: Math.round(collateralPart), max: 10, color: 'bg-green-500',
      reason: combinedCollateralValue > 0 ? `Барьцааны хамрагдац ${(combinedCollateralCoverage * 100).toFixed(0)}% — оноо: ${Math.round(collateralPart)}/10` : 'Барьцаа хөрөнгө байхгүй' },
    { label: 'Батлан даагч', value: Math.round(guarantorPart), max: 5, color: 'bg-lime-500',
      reason: totalGuarantorIncome > 0 ? `Батлан даагчийн нийт орлого ${formatMoney(totalGuarantorIncome)} — ${totalGuarantorIncome >= monthlyPayment ? 'сарын төлбөрийг хангана' : 'сарын төлбөрийг хангахгүй'}` : 'Батлан даагч байхгүй' },
    { label: 'Ангиллын хасалт', value: -Math.round(classificationPenalty), max: 0, color: 'bg-red-400',
      reason: classificationPenalty > 0 ? `Ангилал: ${classificationLabels[form.classification] || form.classification} — хасалт: -${Math.round(classificationPenalty)} оноо` : 'Хэвийн ангилал — хасалт байхгүй' },
  ];

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'E';
  const decision =
    score >= 75 && freeCashFlow > 0
      ? 'Судалгааг үргэлжлүүлэх боломжтой'
      : score >= 55
        ? 'Нэмэлт баримт, баталгаажуулалт шаардлагатай'
        : 'Эрсдэл өндөр, дахин үнэлгээ хийх шаардлагатай';

  // --- Detailed decision rationale: reasons + required documents ---
  const decisionRationale = (() => {
    const reasons = [];
    const docs = [];

    // Credit score
    if (!effectiveCreditScore) {
      reasons.push('Кредит скор оруулаагүй тул зээлийн түүхийг баталгаажуулах боломжгүй байна.');
      if (!hasCreditRef) docs.push('Зээлийн мэдээллийн сангийн лавлагаа (Кредит бюро тайлан)');
    } else if (effectiveCreditScore < 580) {
      reasons.push(`Кредит скор ${effectiveCreditScore} — хамгийн бага шалгуурыг хангахгүй байна (580+). Хугацаа хэтрэлт эсвэл муу зээлийн түүх байж болзошгүй.`);
      if (!hasCreditRef) docs.push('Зээлийн мэдээллийн сангийн лавлагаа — хугацаа хэтрэлт, чөлөөлөлтийн тайлбар');
      else docs.push('Хугацаа хэтрэлтийн шалтгааны тайлбар бичиг');
    } else if (effectiveCreditScore < 680) {
      reasons.push(`Кредит скор ${effectiveCreditScore} — дунд зэргийн эрсдэл (680-аас доош).`);
      if (!hasCreditRef) docs.push('Зээлийн мэдээллийн сангийн дэлгэрэнгүй тайлан');
    }

    // FCF
    if (freeCashFlow <= 0) {
      reasons.push(`Чөлөөт мөнгөн урсгал (FCF) ${formatMoney(freeCashFlow)} — сөрөг байна. Орлого нь зарлага болон зээлийн төлөлтийг давахгүй байна.`);
      if (!hasStatementAnalysis) docs.push('Дансны хуулга (сүүлийн 3–6 сар) — орлогын баталгаажуулалт');
      if (!hasSocialInsurance) docs.push('Нийгмийн даатгалын лавлагаа — цалингийн баталгаажуулалт');
      if (hasStatementAnalysis || hasSocialInsurance) docs.push('Орлого нэмэгдүүлэх боломж, нэмэлт орлогын эх үүсвэрийг нотлох баримт');
    } else if (freeCashFlow < monthlyPayment * 0.3) {
      reasons.push(`Чөлөөт мөнгөн урсгал (FCF) ${formatMoney(freeCashFlow)} — зээлийн сарын төлбөрөөс хангалтгүй нөөц.`);
      if (!hasStatementAnalysis) docs.push('Нэмэлт орлогын эх үүсвэрийн баримт (хөлсний ажил, бизнес гэх мэт)');
      else docs.push('Нэмэлт орлогын эх үүсвэр байвал нотлох баримт');
    }

    // DTI
    if (dti > 60) {
      reasons.push(`DTI ${dti.toFixed(1)}% — орлогын 60%-иас дээш өрийн дарамт байна. Зээлийн чадавхи хязгаарлагдмал.`);
      docs.push('Одоогийн зээлүүдийн эргэн төлөлтийн хуваарь, дуусах хугацаа');
    } else if (dti > 40) {
      reasons.push(`DTI ${dti.toFixed(1)}% — зөвшөөрөгдөх хязгаарт (40%) ойр байна.`);
    }

    // Other debt load
    if (otherLoanBalance > requestedAmount) {
      reasons.push(`Одоогийн нийт зээлийн үлдэгдэл (${formatMoney(otherLoanBalance)}) нь хүссэн зээлийн дүнгээс (${formatMoney(requestedAmount)}) их байна.`);
      docs.push('Одоогийн зээлүүдийн үлдэгдэл, сарын төлбөрийн тодорхойлолт');
    }

    // Collateral
    if (combinedCollateralValue === 0) {
      reasons.push('Барьцаа хөрөнгө оруулаагүй — зээлийн эрсдлийг нөхөх хөрөнгийн баталгаа байхгүй.');
      docs.push('Барьцаа хөрөнгийн гэрчилгээ, үнэлгээний тайлан');
      docs.push('Эрхийн гэрчилгээ, кадастрын лавлагаа (үл хөдлөх хөрөнгийн хувьд)');
    } else if (combinedCollateralCoverage < 1.0) {
      reasons.push(`Барьцааны хамрагдац ${(combinedCollateralCoverage * 100).toFixed(0)}% — зээлийн дүнд хүрэхгүй байна (≥100% шаардлагатай).`);
      docs.push('Нэмэлт барьцаа хөрөнгийн бүртгэл эсвэл батлан даагч');
    }

    // Guarantor
    if (totalGuarantorIncome === 0 && (score < 75 || freeCashFlow <= 0)) {
      reasons.push('Батлан даагч, хамтран зээлдэгч байхгүй — нэмэлт баталгаа шаардлагатай.');
      docs.push('Батлан даагчийн баримт бичиг (иргэний үнэмлэх, орлогын тодорхойлолт, кредит скор)');
    }

    // Classification
    if (classificationPenalty > 0) {
      reasons.push(`Зээлийн ангилал "${classificationLabels[form.classification] || form.classification}" — хугацаа хэтрэлт эсвэл чанаргүй зээлийн түүх байна.`);
      docs.push('Хугацаа хэтрэлтийн шалтгааны тайлбар бичиг');
      docs.push('Хэтэрсэн зээлийн төлбөрийн баталгаажуулалт эсвэл тооцоо нийлсний акт');
    }

    // Income not verified
    if (!income) {
      reasons.push('Орлогын мэдээлэл оруулаагүй — тооцоолол хийх боломжгүй байна.');
      if (!hasSocialInsurance) docs.push('Цалингийн тодорхойлолт / Нийгмийн даатгалын лавлагаа');
      if (!hasStatementAnalysis) docs.push('Дансны хуулга (сүүлийн 3–6 сар)');
    }

    return { reasons, docs: [...new Set(docs)] };
  })();

  // --- Cash flow хуваарь (12 сар харагдана, full amortization тусад нь) ---
  const monthsToShow = Math.max(1, Math.min(termMonths || 6, 12));
  let openingBalance = 0;
  const cashFlowRows = Array.from({ length: monthsToShow }, (_, index) => {
    const cashIn = income;
    const cashOut = cost + monthlyDebt + monthlyPayment;
    const closingBalance = openingBalance + cashIn - cashOut;
    const row = {
      month: index + 1,
      openingBalance,
      income: cashIn,
      cost,
      existingDebt: monthlyDebt,
      loanPayment: monthlyPayment,
      closingBalance,
    };
    openingBalance = closingBalance;
    return row;
  });

  // --- Амортизацийн хуваарь (бүх сар, хүү+үндсэн задаргаатай) ---
  const amortizationRows = buildAmortizationRows(requestedAmount, termMonths, monthlyRate, form.repaymentStartDate);

  const behavior = {
    income:
      income <= 0
        ? 'Орлогын тоон мэдээлэл оруулаагүй.'
        : income >= cost + monthlyDebt + monthlyPayment
          ? 'Орлого нь үндсэн зарлага болон зээлийн төлөлтийг даах дүр зурагтай.'
          : 'Орлого нь нийт зарлага, төлөлтөөс бага байна.',
    cost:
      cost <= 0
        ? 'Зардлын мэдээлэл оруулаагүй.'
        : income && cost / income <= 0.55
          ? 'Зардлын түвшин орлоготой харьцуулахад боломжийн байна.'
          : 'Зардлын түвшин өндөр байна.',
    cashFlow:
      freeCashFlow > 0
        ? 'Сарын чөлөөт мөнгөн урсгал эерэг байна.'
        : 'Сарын чөлөөт мөнгөн урсгал сөрөг байна.',
  };

  return {
    frontSheet: {
      borrowerType: form.borrowerType === 'individual' ? 'Иргэн' : 'Байгууллага',
      borrowerName: getDisplayName(form),
      regNo: getDisplayRegNo(form),
      phone: getDisplayPhone(form),
      email: form.email,
      purpose: form.purpose,
      requestedAmount,
      termMonths,
      monthlyRate,
      classification: classificationLabels[form.classification] || form.classification,
      decision,
    },
    incomeExpense: {
      income,
      cost,
      netIncome,
      monthlyDebt,
      monthlyPayment,
      freeCashFlow,
      dti,
      otherLoanTotalAmount,
      otherLoanBalance,
      otherLoanMonthlyPayment,
    },
    collateral: {
      items: collaterals,
      totalValue: totalCollateralValue,
      ltvRatio,
      coverage: collateralCoverage,
      guarantorCollateralValue,
      combinedValue: combinedCollateralValue,
      combinedCoverage: combinedCollateralCoverage,
    },
    guarantorSummary: {
      items: guarantors,
      totalIncome: totalGuarantorIncome,
      coverageRatio: monthlyPayment > 0 ? totalGuarantorIncome / monthlyPayment : 0,
      bestCreditScore: bestGuarantorScore,
      totalCollateralValue: guarantorCollateralValue,
    },
    cashFlowRows,
    amortizationRows,
    creditScore: {
      inputScore: creditScore,
      calculatedScore: score,
      grade,
      decision,
      scoreBreakdown,
      decisionRationale,
    },
    behavior,
  };
};

const outputCards = [
  { key: 'front', title: 'Front sheet' },
  { key: 'income', title: 'Орлого зарлагын байдал' },
  { key: 'cash', title: 'Cash flow' },
  { key: 'score', title: 'Credit score' },
  { key: 'behavior', title: 'Cash flow / income / cost behaviour' },
];

const Field = ({ label, children }) => (
  <label className="space-y-1.5">
    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
  </label>
);

const LoanResearch = ({ apiUrl, prefillRequest, studyRequests = [], onSelectStudyRequest, embeddedMode = false, onGoToDataCollection }) => {
  const [form, setForm] = useState(initialForm);
  const [bankStatements, setBankStatements] = useState([]);
  const [socialInsurance, setSocialInsurance] = useState(null);
  const [creditReference, setCreditReference] = useState(null);
  const [creditReferenceStatus, setCreditReferenceStatus] = useState('');
  const [researches, setResearches] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzingStatement, setAnalyzingStatement] = useState(false);
  const [analyzingStatementKey, setAnalyzingStatementKey] = useState('');
  const [statementAnalysis, setStatementAnalysis] = useState(null);
  const [statementAnalysisItems, setStatementAnalysisItems] = useState([]);
  const [statementError, setStatementError] = useState('');
  // Амортизацийн хуваарь дэлгэх/хураах
  const [showFullAmortization, setShowFullAmortization] = useState(false);
  // Toast notification
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  // Зээлийн мэдээллийн лавлагаа AI
  const [creditRefAnalysis, setCreditRefAnalysis] = useState(null);
  const [analyzingCreditRef, setAnalyzingCreditRef] = useState(false);
  const [creditRefError, setCreditRefError] = useState('');
  // FICO / Sainscore дүн
  const [ficoAnalysis, setFicoAnalysis] = useState(null);
  // Нийгмийн даатгалын лавлагаа
  const [siAnalysis, setSiAnalysis] = useState(null);
  // View mode: 'list' = show request list, 'detail' = show tab layout
  const [viewMode, setViewMode] = useState('list');
  // Active tab in detail view
  const [researchTab, setResearchTab] = useState('profile');
  // RAG: Ижил төстэй өмнөх зээлүүд
  const [similarLoans, setSimilarLoans] = useState([]);
  const [similarSource, setSimilarSource] = useState('');
  const similarDebounceRef = useRef(null);

  const outputs = useMemo(() => buildOutputs(form, {
    hasCreditRef: !!creditRefAnalysis,
    hasStatementAnalysis: !!(statementAnalysis?.frontSheet?.totalIncome),
    hasSocialInsurance: !!(siAnalysis?.averageSalary > 0),
  }), [form, creditRefAnalysis, statementAnalysis, siAnalysis]);
  const outputsWithAnalysis = useMemo(() => ({
    ...outputs,
    statementAnalysis,
    statementAnalysisItems,
  }), [outputs, statementAnalysis, statementAnalysisItems]);
  const sortedStudyRequests = useMemo(() => (
    [...studyRequests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  ), [studyRequests]);
  const bankStatementPreviews = useMemo(() => (
    bankStatements.map((file) => ({
      key: `local-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      isPdf: file.type === 'application/pdf' || /\.pdf$/i.test(file.name),
    }))
  ), [bankStatements]);
  const requestFilesByCategory = useMemo(() => groupFilesByCategory(form.requestFiles || []), [form.requestFiles]);

  const selectedResearch = useMemo(
    () => researches.find((item) => item._id === selectedId),
    [researches, selectedId]
  );

  const displayedOutputs = selectedResearch?.outputs || outputsWithAnalysis;
  const displayedStatementAnalysis = selectedResearch?.outputs?.statementAnalysis || statementAnalysis;
  const displayedStatementItems = selectedResearch?.outputs?.statementAnalysisItems || statementAnalysisItems;
  const displayedForm = selectedResearch?.borrower || form;

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchSimilarLoans = (currentForm, currentOutputs) => {
    if (similarDebounceRef.current) clearTimeout(similarDebounceRef.current);
    // Хангалттай мэдээлэл оруулаагүй бол хайхгүй
    if (!parseNumber(currentForm.requestedAmount) || !parseNumber(currentForm.termMonths)) return;
    similarDebounceRef.current = setTimeout(async () => {
      try {
        const borrowerPayload = {
          ...currentForm,
          borrowerName: getDisplayName(currentForm),
          regNo: getDisplayRegNo(currentForm),
          phone: getDisplayPhone(currentForm),
        };
        const res = await axios.post(`${apiUrl}/api/loan-research/similar`, {
          borrower: borrowerPayload,
          outputs: currentOutputs,
          limit: 5,
        }, { headers: authH() });
        setSimilarLoans(res.data?.results || []);
        setSimilarSource(res.data?.source || '');
      } catch {
        // Чимээгүй алдаа — RAG нь туслах feature
      }
    }, 1200);
  };

  const updateField = (key, value) => {
    setSelectedId(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // --- Барьцааны handler-ууд ---
  const addCollateral = () => {
    setSelectedId(null);
    setForm((prev) => ({ ...prev, collaterals: [...(prev.collaterals || []), { ...emptyCollateral }] }));
  };
  const updateCollateral = (index, key, value) => {
    setSelectedId(null);
    setForm((prev) => ({
      ...prev,
      collaterals: (prev.collaterals || []).map((c, i) => i === index ? { ...c, [key]: value } : c),
    }));
  };
  const removeCollateral = (index) => {
    setSelectedId(null);
    setForm((prev) => ({ ...prev, collaterals: (prev.collaterals || []).filter((_, i) => i !== index) }));
  };

  // --- Батлан даагчийн handler-ууд ---
  const addGuarantor = () => {
    setSelectedId(null);
    setForm((prev) => ({ ...prev, guarantors: [...(prev.guarantors || []), { ...emptyGuarantor }] }));
  };
  const updateGuarantor = (index, key, value) => {
    setSelectedId(null);
    setForm((prev) => ({
      ...prev,
      guarantors: (prev.guarantors || []).map((g, i) => i === index ? { ...g, [key]: value } : g),
    }));
  };
  const removeGuarantor = (index) => {
    setSelectedId(null);
    setForm((prev) => ({ ...prev, guarantors: (prev.guarantors || []).filter((_, i) => i !== index) }));
  };

  // --- Эрсдэлийн тэмдэглэгээ ---
  const toggleRiskFlag = (flag) => {
    setSelectedId(null);
    setForm((prev) => {
      const current = prev.analystRisks || [];
      return {
        ...prev,
        analystRisks: current.includes(flag) ? current.filter((r) => r !== flag) : [...current, flag],
      };
    });
  };

  // --- Зээлийн мэдээллийн лавлагаа AI уншилт ---
  const analyzeCreditReference = async ({ files = [], fileUrls = [] }) => {
    if (!files.length && !fileUrls.length) {
      showToast('Зээлийн мэдээллийн лавлагааны файл сонгоно уу.', 'error');
      return;
    }
    setSelectedId(null);
    setAnalyzingCreditRef(true);
    setCreditRefError('');
    try {
      const payload = new FormData();
      const borrowerPayload = { ...form, borrowerName: getDisplayName(form), regNo: getDisplayRegNo(form), phone: getDisplayPhone(form) };
      payload.append('borrower', JSON.stringify(borrowerPayload));
      files.forEach((file) => payload.append('bankStatements', file));
      if (fileUrls.length) payload.append('fileUrls', JSON.stringify(fileUrls));

      const res = await axios.post(`${apiUrl}/api/loan-research/analyze-credit-reference`, payload, {
        headers: { 'Content-Type': 'multipart/form-data', ...authH() },
      });
      const analysis = res.data;
      setCreditRefAnalysis(analysis);

      // Auto-fill: идэвхтэй зээлүүдийг otherLoans-д нэмнэ
      const activeLoans = (analysis.primaryLoans || [])
        .filter((loan) => loan.balance > 0)
        .map((loan) => ({
          lender: loan.institution || '',
          product: loan.loanType || '',
          amount: String(Math.round(loan.originalAmount || 0)),
          balance: String(Math.round(loan.balance || 0)),
          monthlyPayment: String(Math.round(loan.estimatedMonthlyPayment || 0)),
          classification: loan.isOverdue ? (loan.overdueDays > 90 ? 'doubtful' : 'substandard') : 'normal',
        }));

      if (activeLoans.length > 0) {
        setForm((prev) => ({
          ...prev,
          otherLoans: activeLoans,
          // Хэрэв creditBureauScore байвал creditScore-д оруулна
          creditScore: analysis.creditBureauScore
            ? String(Math.round(analysis.creditBureauScore))
            : prev.creditScore,
        }));
        showToast(`${activeLoans.length} идэвхтэй зээл "Бусад зээл" хэсэгт бөглөгдлөө.`);
      } else {
        showToast('Идэвхтэй үлдэгдэлтэй зээл олдсонгүй.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Зээлийн лавлагаа уншихад алдаа гарлаа.';
      setCreditRefError(msg);
      showToast(msg, 'error');
    } finally {
      setAnalyzingCreditRef(false);
    }
  };

  const fetchResearches = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/loan-research`, { headers: authH() });
      setResearches(res.data || []);
    } catch (error) {
      console.error('Loan research fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearches();
  }, []);

  // Sync form fields from saved research when user selects one from the list
  useEffect(() => {
    if (!selectedId) return;
    const research = researches.find(r => r._id === selectedId);
    if (research?.borrower) {
      setForm(prev => ({ ...prev, ...research.borrower }));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    bankStatementPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [bankStatementPreviews]);

  // Ref to track which prefillRequest ID has already had its saved-research overlay applied.
  // Prevents re-applying after user edits or when researches array updates again.
  const overlayAppliedForRef = useRef(null);

  useEffect(() => {
    if (!prefillRequest) return;
    setSelectedId(null);
    overlayAppliedForRef.current = null; // reset so overlay can re-apply for this request
    setForm(normalizeLoanRequest(prefillRequest));
    setBankStatements([]);
    setSocialInsurance(null);
    setCreditReference(null);
    setCreditReferenceStatus('Зээлийн хүсэлтээс мэдээлэл автоматаар бөглөгдлөө.');
    setStatementError('');
    setCreditRefError('');

    // Auto-populate bank statement analysis from incomeResearch (new) or legacy collaterals
    const appData = prefillRequest.applicationData || {};
    const irBsArr = appData.incomeResearch?.bankStatementAnalyses;
    const irBsAnalysis = Array.isArray(irBsArr) && irBsArr.length > 0 ? irBsArr[0] : null;
    const bsColls = !irBsAnalysis ? (appData.collaterals || []).filter(c => c.type === 'bank_statement' && c.fields?.frontSheet) : [];
    if (irBsAnalysis) {
      const items = (irBsArr || []).map((a, i) => ({ key: `appdata-ir-bs-${i}`, label: `Дансны хуулга ${irBsArr.length > 1 ? i + 1 : ''}`.trim(), analysis: a }));
      const merged = mergeStatementAnalyses(items);
      setStatementAnalysisItems(items);
      setStatementAnalysis(merged);
    } else if (bsColls.length) {
      const items = bsColls.map((c, i) => ({
        key: `appdata-bs-${i}`,
        label: `Дансны хуулга ${bsColls.length > 1 ? i + 1 : ''}`.trim(),
        analysis: c.fields,
      }));
      const merged = mergeStatementAnalyses(items);
      setStatementAnalysisItems(items);
      setStatementAnalysis(merged);
    } else {
      setStatementAnalysis(null);
      setStatementAnalysisItems([]);
    }

    // Auto-populate credit reference analysis from applicationData
    const cbData = appData.creditBureau?.creditBureauData;
    if (cbData && (cbData.primaryLoans?.length || cbData.registrationNumber)) {
      setCreditRefAnalysis(cbData);
    } else {
      setCreditRefAnalysis(null);
    }

    // FICO / Sainscore
    const ficoData = appData.creditBureau?.ficoData;
    setFicoAnalysis(ficoData?.ficoScore != null ? ficoData : null);

    // Нийгмийн даатгалын лавлагаа
    const siData = appData.incomeResearch?.socialInsuranceAnalysis;
    setSiAnalysis(siData?.totalInsuranceMonths > 0 ? siData : null);

    setViewMode('detail');
    setResearchTab('profile');

    // Also populate guarantors' credit bureaus from appData.guarantors
    // (already in form via normalizeLoanRequest)
  }, [prefillRequest?.seedKey, prefillRequest?._id]);

  // Overlay saved-research fields onto form once researches have loaded.
  // Runs whenever researches changes (i.e. after fetchResearches resolves),
  // but only applies once per prefillRequest (guarded by ref).
  useEffect(() => {
    if (!prefillRequest?._id || !researches.length) return;
    if (overlayAppliedForRef.current === prefillRequest._id) return;
    overlayAppliedForRef.current = prefillRequest._id;
    const OVERLAY_FIELDS = ['monthlyRate', 'averageMonthlyIncome', 'averageMonthlyCost',
      'monthlyDebtPayment', 'creditScore', 'classification', 'purpose', 'comment',
      'analystOpinion', 'analystDecision', 'conditions', 'riskFlags',
      'repaymentType', 'repaymentStartDate', 'graceMonths'];
    const linked = researches
      .filter(r => r.borrower?.sourceRequestId === prefillRequest._id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
    if (!linked?.borrower) return;
    setForm(prev => {
      const updated = { ...prev };
      OVERLAY_FIELDS.forEach(f => {
        const val = linked.borrower[f];
        if (val !== undefined && val !== '' && val !== null) updated[f] = val;
      });
      return updated;
    });
  }, [prefillRequest?._id, researches]); // eslint-disable-line react-hooks/exhaustive-deps

  // RAG trigger: үндсэн санхүүгийн өгөгдөл өөрчлөгдөхөд ижил зээл хайх
  useEffect(() => {
    if (!selectedId) fetchSimilarLoans(form, outputs);
  }, [
    form.requestedAmount, form.termMonths, form.averageMonthlyIncome,
    form.averageMonthlyCost, form.classification, form.borrowerType,
    form.monthlyRate, outputs.incomeExpense?.dti,
  ]);

  const handleBankStatementChange = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedId(null);
    setBankStatements((prev) => {
      const byKey = new Map(prev.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      files.forEach((file) => {
        if (byKey.size < 5) byKey.set(`${file.name}-${file.size}-${file.lastModified}`, file);
      });
      return Array.from(byKey.values()).slice(0, 5);
    });
    setStatementError('');
    event.target.value = '';
  };

  const removeBankStatement = (index) => {
    setSelectedId(null);
    const file = bankStatements[index];
    const key = file ? `local-${file.name}-${file.size}-${file.lastModified}` : '';
    setBankStatements((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    const nextItems = statementAnalysisItems.filter((item) => item.key !== key);
    setStatementAnalysisItems(nextItems);
    setStatementAnalysis(mergeStatementAnalyses(nextItems));
    setStatementError('');
  };

  const analyzeBankStatements = async () => {
    if (!bankStatements.length) {
      showToast('Эхлээд дансны хуулга PDF/image/CSV файл сонгоно уу.', 'error');
      return;
    }

    const payload = new FormData();
    const borrowerPayload = {
      ...form,
      borrowerName: getDisplayName(form),
      regNo: getDisplayRegNo(form),
      phone: getDisplayPhone(form),
    };
    payload.append('borrower', JSON.stringify(borrowerPayload));
    bankStatements.forEach((file) => payload.append('bankStatements', file));

    setAnalyzingStatement(true);
    setStatementError('');
    try {
      const res = await axios.post(`${apiUrl}/api/loan-research/analyze-statement`, payload, {
        headers: { 'Content-Type': 'multipart/form-data', ...authH() },
      });
      const analysis = res.data;
      setStatementAnalysis(analysis);
      setForm((prev) => ({
        ...prev,
        averageMonthlyIncome: analysis.frontSheet?.averageMonthlyIncome ? String(Math.round(analysis.frontSheet.averageMonthlyIncome)) : prev.averageMonthlyIncome,
        averageMonthlyCost: analysis.frontSheet?.averageMonthlyExpense ? String(Math.round(analysis.frontSheet.averageMonthlyExpense)) : prev.averageMonthlyCost,
        incomeSource: analysis.frontSheet?.mainIncomeSource || prev.incomeSource,
        repaymentSource: analysis.frontSheet?.repaymentSource || prev.repaymentSource,
        comment: analysis.cashFlowBehaviour?.conclusion || prev.comment,
      }));
    } catch (error) {
      setStatementError(error.response?.data?.message || 'AI уншилт хийх үед алдаа гарлаа.');
    } finally {
      setAnalyzingStatement(false);
    }
  };

  const applyStatementAnalysisToForm = (analysis) => {
    setForm((prev) => ({
      ...prev,
      averageMonthlyIncome: analysis?.frontSheet?.averageMonthlyIncome ? String(Math.round(analysis.frontSheet.averageMonthlyIncome)) : prev.averageMonthlyIncome,
      averageMonthlyCost: analysis?.frontSheet?.averageMonthlyExpense ? String(Math.round(analysis.frontSheet.averageMonthlyExpense)) : prev.averageMonthlyCost,
      incomeSource: analysis?.frontSheet?.mainIncomeSource || prev.incomeSource,
      repaymentSource: analysis?.frontSheet?.repaymentSource || prev.repaymentSource,
      comment: analysis?.cashFlowBehaviour?.conclusion || prev.comment,
    }));
  };

  const analyzeStatementSource = async ({ key, label, files = [], fileUrls = [] }) => {
    if (!files.length && !fileUrls.length) {
      alert('Эхлээд дансны хуулга файл сонгоно уу.');
      return;
    }

    const payload = new FormData();
    const borrowerPayload = {
      ...form,
      borrowerName: getDisplayName(form),
      regNo: getDisplayRegNo(form),
      phone: getDisplayPhone(form),
    };
    payload.append('borrower', JSON.stringify(borrowerPayload));
    files.forEach((file) => payload.append('bankStatements', file));
    if (fileUrls.length) payload.append('fileUrls', JSON.stringify(fileUrls));

    setSelectedId(null);
    setAnalyzingStatement(true);
    setAnalyzingStatementKey(key);
    setStatementError('');
    try {
      const res = await axios.post(`${apiUrl}/api/loan-research/analyze-statement`, payload, {
        headers: { 'Content-Type': 'multipart/form-data', ...authH() },
      });
      const analysis = res.data;
      const nextItems = [
        ...statementAnalysisItems.filter((item) => item.key !== key),
        {
          key,
          label,
          fileUrls,
          fileNames: files.map((file) => file.name),
          analysis,
        },
      ];
      const merged = mergeStatementAnalyses(nextItems);
      setStatementAnalysisItems(nextItems);
      setStatementAnalysis(merged);
      applyStatementAnalysisToForm(merged);
    } catch (error) {
      setStatementError(error.response?.data?.message || 'AI уншилт хийх үед алдаа гарлаа.');
    } finally {
      setAnalyzingStatement(false);
      setAnalyzingStatementKey('');
    }
  };

  const addOtherLoan = (loan = {}) => {
    setSelectedId(null);
    setForm((prev) => ({
      ...prev,
      otherLoans: [...(prev.otherLoans || []), { ...emptyOtherLoan, ...loan }],
    }));
  };

  const updateOtherLoan = (index, key, value) => {
    setSelectedId(null);
    setForm((prev) => ({
      ...prev,
      otherLoans: (prev.otherLoans || []).map((loan, loanIndex) => (
        loanIndex === index ? { ...loan, [key]: value } : loan
      )),
    }));
  };

  const removeOtherLoan = (index) => {
    setSelectedId(null);
    setForm((prev) => ({
      ...prev,
      otherLoans: (prev.otherLoans || []).filter((_, loanIndex) => loanIndex !== index),
    }));
  };

  const parseCreditReferenceText = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.loans) ? parsed.loans : []);
      if (items.length) {
        return items.map((item) => ({
          lender: item.lender || item.bank || item.creditor || '',
          product: item.product || item.type || item.loanType || '',
          amount: item.amount || item.loanAmount || '',
          balance: item.balance || item.remainingBalance || '',
          monthlyPayment: item.monthlyPayment || item.payment || '',
          classification: item.classification || 'normal',
        }));
      }
    } catch (error) {
      // fall through to delimited parsing
    }

    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const firstCells = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase());
    const hasHeader = firstCells.some((cell) => ['lender', 'bank', 'product', 'amount', 'balance', 'payment', 'classification'].includes(cell));
    const headers = hasHeader ? firstCells : ['lender', 'product', 'amount', 'balance', 'monthlypayment', 'classification'];
    const rows = hasHeader ? lines.slice(1) : lines;

    return rows.map((line) => {
      const cells = line.split(delimiter).map((cell) => cell.trim());
      const valueFor = (...keys) => {
        const idx = headers.findIndex((header) => keys.includes(header.replace(/\s+/g, '').toLowerCase()));
        return idx >= 0 ? cells[idx] || '' : '';
      };
      return {
        lender: valueFor('lender', 'bank', 'creditor') || cells[0] || '',
        product: valueFor('product', 'type', 'loantype') || cells[1] || '',
        amount: valueFor('amount', 'loanamount') || cells[2] || '',
        balance: valueFor('balance', 'remainingbalance') || cells[3] || '',
        monthlyPayment: valueFor('monthlypayment', 'payment') || cells[4] || '',
        classification: valueFor('classification', 'class') || cells[5] || 'normal',
      };
    }).filter((loan) => loan.lender || loan.product || loan.amount || loan.balance);
  };

  const handleCreditReferenceChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedId(null);
    setCreditReference(file);
    setCreditReferenceStatus('');
    if (!file) return;

    const readable = /\.(csv|txt|json)$/i.test(file.name) || /^(text\/|application\/json)/.test(file.type || '');
    if (!readable) {
      setCreditReferenceStatus('Файл хадгалагдана. Автоматаар унших нь CSV, TXT, JSON дээр ажиллана.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const parsedLoans = parseCreditReferenceText(reader.result);
      if (!parsedLoans.length) {
        setCreditReferenceStatus('Файлаас зээлийн мөр танигдсангүй. Гараар нэмэх боломжтой.');
        return;
      }
      setForm((prev) => ({ ...prev, otherLoans: parsedLoans }));
      setCreditReferenceStatus(`${parsedLoans.length} зээлийн мэдээлэл файлаас бөглөгдлөө.`);
    };
    reader.onerror = () => setCreditReferenceStatus('Файл унших үед алдаа гарлаа.');
    reader.readAsText(file, 'utf-8');
  };

  const saveResearch = async () => {
    if (!getDisplayName(form) || !getDisplayRegNo(form) || !form.requestedAmount || !form.termMonths) {
      showToast('Зээлдэгчийн нэр, РД/Регистр, хүсэж буй дүн, хугацааг бөглөнө үү.', 'error');
      return;
    }

    const borrowerPayload = {
      ...form,
      borrowerName: getDisplayName(form),
      regNo: getDisplayRegNo(form),
      phone: getDisplayPhone(form),
      otherLoanAmount: outputs.incomeExpense.otherLoanTotalAmount,
      otherLoanBalance: outputs.incomeExpense.otherLoanBalance,
      otherLoanMonthlyPayment: outputs.incomeExpense.otherLoanMonthlyPayment,
    };

    const payload = new FormData();
    payload.append('borrower', JSON.stringify(borrowerPayload));
    payload.append('outputs', JSON.stringify(outputsWithAnalysis));
    bankStatements.forEach((file) => payload.append('bankStatements', file));
    if (socialInsurance) payload.append('socialInsurance', socialInsurance);
    if (creditReference) payload.append('creditReference', creditReference);

    setSaving(true);
    try {
      const res = await axios.post(`${apiUrl}/api/loan-research`, payload, {
        headers: { 'Content-Type': 'multipart/form-data', ...authH() },
      });
      await fetchResearches();
      setSelectedId(res.data?._id || null);
      setBankStatements([]);
      setSocialInsurance(null);
      setCreditReference(null);
      showToast('Зээлийн судалгаа амжилттай хадгалагдлаа.');
    } catch (error) {
      showToast(error.response?.data?.message || 'Хадгалах үед алдаа гарлаа.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const printOutput = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      showToast('Popup blocker идэвхтэй байна. Browser дээр popup зөвшөөрнө үү.', 'error');
      return;
    }

    const amortRows = displayedOutputs.amortizationRows || [];
    const f = displayedForm;
    const isOrg = f.borrowerType === 'organization';
    const colls = displayedOutputs.collateral?.items || [];
    const grtrs = (f.guarantors || []);
    const stmtFs = displayedStatementAnalysis?.frontSheet || {};
    const stmtAccounts = displayedStatementAnalysis?.accounts || [];
    const cbRef = creditRefAnalysis || null;
    const cbLoans = cbRef?.primaryLoans || cbRef?.loans || [];
    const si = siAnalysis || null;
    const ie = displayedOutputs.incomeExpense || {};
    const cs = displayedOutputs.creditScore || {};
    const fs = displayedOutputs.frontSheet || {};
    const grade = cs.grade || '—';
    const score = cs.calculatedScore || 0;
    const dti = ie.dti || 0;
    const fcf = ie.freeCashFlow || 0;
    const analystDecisionKey = displayedForm.analystDecision || '';
    const analystDecisionLabel = ANALYST_DECISIONS[analystDecisionKey]?.label || '';
    const decisionBg = analystDecisionKey === 'approve' ? '#dcfce7' : analystDecisionKey === 'reject' ? '#fee2e2' : analystDecisionKey === 'conditional' ? '#fef3c7' : '#f1f5f9';
    const decisionColor = analystDecisionKey === 'approve' ? '#15803d' : analystDecisionKey === 'reject' ? '#b91c1c' : analystDecisionKey === 'conditional' ? '#92400e' : '#334155';
    const gradeBg = grade <= 'B' ? '#dcfce7' : grade <= 'C' ? '#fef3c7' : '#fee2e2';
    const gradeColor = grade <= 'B' ? '#15803d' : grade <= 'C' ? '#92400e' : '#b91c1c';
    const dtiColor = dti <= 40 ? '#15803d' : dti <= 55 ? '#92400e' : '#b91c1c';
    const fcfColor = fcf >= 0 ? '#15803d' : '#b91c1c';
    const printDate = new Date().toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });

    const kpiCard = (label, value, color = '#0f172a', sub = '') =>
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px">${label}</div>
        <div style="font-size:20px;font-weight:800;color:${color};line-height:1">${value}</div>
        ${sub ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px">${sub}</div>` : ''}
      </div>`;

    const sectionTitle = (num, title, color = '#003B5C') =>
      `<div style="display:flex;align-items:center;gap:10px;margin:28px 0 10px">
        <div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${num}</div>
        <div style="font-size:14px;font-weight:800;color:${color};flex:1">${title}</div>
        <div style="height:1px;background:#e2e8f0;flex:1"></div>
      </div>`;

    const rowStyle = (i) => i % 2 === 0 ? 'background:#fff' : 'background:#f8fafc';

    const scoreBar = (label, value, max, color) => {
      const pct = max > 0 ? Math.round((value / max) * 100) : 0;
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:#475569">${label}</span>
          <span style="font-weight:700;color:#0f172a">${value} / ${max}</span>
        </div>
        <div style="background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
        </div>
      </div>`;
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Зээлийн судалгаа — ${esc(getDisplayName(f))}</title>
          <style>
            @page { margin: 18mm 16mm; size: A4; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 7px 10px; font-size: 11px; text-align: left; vertical-align: top; }
            thead th { background: #f1f5f9; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .label-cell { background: #f1f5f9 !important; font-weight: 600; color: #475569; width: 160px; white-space: nowrap; }
            .positive { color: #15803d; font-weight: 600; }
            .negative { color: #b91c1c; font-weight: 600; }
            .warn { color: #92400e; font-weight: 600; }
            .page-break { page-break-before: always; }
            .no-break { page-break-inside: avoid; }
          </style>
        </head>
        <body>

          <!-- ══════════════ PAGE HEADER ══════════════ -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #003B5C;margin-bottom:20px">
            <div>
              <div style="font-size:9px;color:#00A651;font-weight:700;text-transform:uppercase;letter-spacing:.12em">Solongo Capital · Зээлийн хэлтэс</div>
              <div style="font-size:22px;font-weight:900;color:#003B5C;margin-top:2px">Зээлийн судалгаа</div>
            </div>
            <div style="text-align:right;font-size:10px;color:#64748b">
              <div>Огноо: <b>${printDate}</b></div>
              ${fs.sourceProduct ? `<div style="margin-top:2px">Бүтээгдэхүүн: <b>${esc(PRODUCTS[fs.sourceProduct] || fs.sourceProduct)}</b></div>` : ''}
            </div>
          </div>

          <!-- ══════════════ BORROWER IDENTITY ══════════════ -->
          <div class="no-break" style="display:flex;gap:18px;margin-bottom:20px">
            ${f.profileImageUrl
              ? `<img src="${esc(f.profileImageUrl)}" style="width:90px;height:105px;object-fit:cover;border-radius:10px;border:2px solid #003B5C;flex-shrink:0" />`
              : `<div style="width:90px;height:105px;border-radius:10px;background:#e2e8f0;border:2px dashed #94a3b8;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#94a3b8;flex-shrink:0">${(isOrg ? (f.orgName || f.borrowerName) : (f.firstName || f.lastName || '?')).charAt(0).toUpperCase()}</div>`}
            <div style="flex:1">
              <div style="font-size:22px;font-weight:900;color:#003B5C;line-height:1.1">${esc(getDisplayName(f))}</div>
              ${!isOrg && f.lastName ? `<div style="font-size:12px;color:#64748b;margin-top:2px">Овог: ${esc(f.lastName)}</div>` : ''}
              <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#475569">
                ${getDisplayRegNo(f) ? `<span>📋 ${esc(getDisplayRegNo(f))}</span>` : ''}
                ${getDisplayPhone(f) ? `<span>📞 ${esc(getDisplayPhone(f))}</span>` : ''}
                ${f.email ? `<span>✉ ${esc(f.email)}</span>` : ''}
              </div>
              ${f.address ? `<div style="margin-top:4px;font-size:11px;color:#475569">📍 ${esc(f.address)}</div>` : ''}
              <div style="margin-top:4px;font-size:11px;color:#475569">
                ${isOrg
                  ? [f.businessSector, f.operationYears ? f.operationYears + ' жилийн түүхтэй' : ''].filter(Boolean).join(' · ')
                  : [f.employment, f.incomeSource].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style="min-width:180px;text-align:right;flex-shrink:0">
              <div style="font-size:26px;font-weight:900;color:#003B5C">${formatMoney(fs.requestedAmount)}</div>
              <div style="font-size:11px;color:#64748b">${fs.termMonths || 0} сар · ${fs.monthlyRate || 0}%/сар</div>
              <div style="margin-top:6px;display:inline-block;padding:5px 14px;background:${gradeBg};border-radius:8px;font-weight:800;font-size:13px;color:${gradeColor}">
                Grade ${esc(grade)} · ${score} оноо
              </div>
              ${analystDecisionLabel ? `
              <div style="margin-top:6px;display:block;padding:6px 14px;background:${decisionBg};border-radius:8px;font-weight:800;font-size:12px;color:${decisionColor}">
                ${esc(analystDecisionLabel)}
              </div>` : ''}
            </div>
          </div>

          <!-- ══════════════ KPI STRIP ══════════════ -->
          <div class="no-break" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px">
            ${kpiCard('Сарын орлого', formatMoney(ie.income), '#15803d')}
            ${kpiCard('Сарын зарлага', formatMoney(ie.cost), '#b91c1c')}
            ${kpiCard('Сарын төлбөр', formatMoney(ie.monthlyPayment), '#003B5C')}
            ${kpiCard('DTI', dti.toFixed(1) + '%', dtiColor, dti <= 40 ? 'Хэвийн' : dti <= 55 ? 'Анхааруулга' : 'Өндөр')}
            ${kpiCard('FCF', formatMoney(fcf), fcfColor, fcf >= 0 ? 'Эерэг' : 'Сөрөг')}
            ${kpiCard('LTV', (displayedOutputs.collateral?.combinedValue || 0) > 0 ? ((fs.requestedAmount || 0) / displayedOutputs.collateral.combinedValue * 100).toFixed(1) + '%' : '—', '#003B5C', 'Барьцааны харьцаа')}
          </div>

          <!-- ══════════════ 1. ЗЭЭЛИЙН МЭДЭЭЛЭЛ ══════════════ -->
          ${sectionTitle('1', 'Зээлийн мэдээлэл')}
          <div class="no-break">
          <table><tbody>
            <tr>
              <td class="label-cell">Зээлийн дүн</td><td style="font-weight:700;font-size:14px;color:#003B5C">${formatMoney(fs.requestedAmount)}</td>
              <td class="label-cell">Хугацаа</td><td>${fs.termMonths || '—'} сар</td>
            </tr>
            <tr>
              <td class="label-cell">Сарын хүү</td><td>${fs.monthlyRate || '—'}%</td>
              <td class="label-cell">Зориулалт</td><td>${esc(fs.purpose)}</td>
            </tr>
            <tr>
              <td class="label-cell">Эргэн төлөлтийн эх үүсвэр</td><td>${esc(f.repaymentSource)}</td>
              <td class="label-cell">Сарын төлбөр</td><td style="font-weight:700">${formatMoney(ie.monthlyPayment)}</td>
            </tr>
            <tr>
              <td class="label-cell">Зээлийн ангилал</td><td>${esc(classificationLabels[f.classification] || f.classification)}</td>
              <td class="label-cell">Эхэлж төлөх огноо</td><td>${esc(f.repaymentStartDate) || '—'}</td>
            </tr>
            ${amortRows.length > 0 ? `<tr>
              <td class="label-cell">Нийт хүүгийн зардал</td><td class="negative">${formatMoney(amortRows.reduce((s,r) => s + (r.interest||0), 0))}</td>
              <td class="label-cell">Нийт эргэн төлөлт</td><td style="font-weight:700">${formatMoney(amortRows.reduce((s,r) => s + (r.payment||0), 0))}</td>
            </tr>` : ''}
          </tbody></table>
          </div>

          <!-- ══════════════ 2. ОРЛОГЫН ДҮГНЭЛТ ══════════════ -->
          ${sectionTitle('2', 'Орлогын дүгнэлт')}
          <div class="no-break">
          <table><tbody>
            <tr>
              <td class="label-cell">Сарын дундаж орлого</td><td class="positive">${formatMoney(ie.income)}</td>
              <td class="label-cell">Сарын зарлага</td><td class="negative">${formatMoney(ie.cost)}</td>
            </tr>
            <tr>
              <td class="label-cell">Одоогийн өрийн төлбөр</td><td class="negative">${formatMoney(ie.monthlyDebt)}</td>
              <td class="label-cell">Шинэ зээлийн сарын төлбөр</td><td class="negative">${formatMoney(ie.monthlyPayment)}</td>
            </tr>
            <tr>
              <td class="label-cell">Чөлөөт мөнгөн урсгал (FCF)</td>
              <td style="font-weight:700;color:${fcfColor}">${formatMoney(fcf)}</td>
              <td class="label-cell">DTI (Өрийн дарамт)</td>
              <td style="font-weight:700;color:${dtiColor}">${dti.toFixed(1)}% ${dti <= 40 ? '✓' : dti <= 55 ? '⚠' : '✗'}</td>
            </tr>
            ${(grtrs.length > 0 && displayedOutputs.guarantorSummary?.totalIncome > 0) ? `<tr>
              <td class="label-cell">Батлан даагчийн нийт орлого</td><td class="positive">${formatMoney(displayedOutputs.guarantorSummary.totalIncome)}</td>
              <td class="label-cell">Нийлсэн орлого</td><td class="positive">${formatMoney((ie.income || 0) + (displayedOutputs.guarantorSummary.totalIncome || 0))}</td>
            </tr>` : ''}
          </tbody></table>
          </div>

          ${stmtFs.totalIncome ? `
          <div class="no-break" style="margin-top:10px">
          <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Дансны хуулга — дүн шинжилгээ</div>
          <table><tbody>
            <tr>
              <td class="label-cell">Банк / Данс</td><td>${esc(stmtFs.bankName)}${stmtFs.accountNumber ? ' · ' + esc(stmtFs.accountNumber) : ''}</td>
              <td class="label-cell">Хугацаа</td><td>${esc(stmtFs.periodStart)} — ${esc(stmtFs.periodEnd)} (${stmtFs.coveredMonths || 0} сар)</td>
            </tr>
            <tr>
              <td class="label-cell">Нийт орлого</td><td class="positive">${formatMoney(stmtFs.totalIncome)}</td>
              <td class="label-cell">Дундаж/сар</td><td class="positive">${formatMoney(stmtFs.averageMonthlyIncome)}</td>
            </tr>
            <tr>
              <td class="label-cell">Орлогын тогтвортой байдал</td><td>${esc(stmtFs.incomeStability) || '—'}</td>
              <td class="label-cell">Cash flow чанар</td><td>${esc(stmtFs.cashFlowQuality) || '—'}</td>
            </tr>
            ${stmtFs.keyRisks ? `<tr><td class="label-cell" style="color:#b91c1c">Гол эрсдэл</td><td colspan="3" class="negative">${esc(stmtFs.keyRisks)}</td></tr>` : ''}
          </tbody></table>
          ${stmtAccounts.length > 1 ? `
          <table style="margin-top:6px"><thead><tr>
            <th>Данс</th><th>Банк</th><th style="text-align:right">Нийт орлого</th><th style="text-align:right">Нийт зарлага</th><th style="text-align:right">Цэвэр урсгал</th>
          </tr></thead><tbody>
          ${stmtAccounts.map((a, i) => `<tr style="${rowStyle(i)}">
            <td>${esc(a.accountNumber || a.label || '—')}</td><td>${esc(a.bankName || '—')}</td>
            <td style="text-align:right" class="positive">${formatMoney(a.totalIncome)}</td>
            <td style="text-align:right" class="negative">${formatMoney(a.totalExpense)}</td>
            <td style="text-align:right;font-weight:600;color:${(a.netCashFlow||0)>=0?'#15803d':'#b91c1c'}">${formatMoney(a.netCashFlow)}</td>
          </tr>`).join('')}
          </tbody></table>` : ''}
          </div>` : ''}

          ${si?.averageSalary > 0 ? `
          <div class="no-break" style="margin-top:10px">
          <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Нийгмийн даатгал</div>
          <table><tbody>
            <tr>
              <td class="label-cell">НД дундаж цалин</td><td class="positive">${formatMoney(si.averageSalary)}</td>
              <td class="label-cell">НД хугацаа</td><td>${si.totalInsuranceMonths || si.employmentMonths || '—'} сар</td>
            </tr>
            ${si.employerName ? `<tr><td class="label-cell">Ажил олгогч</td><td colspan="3">${esc(si.employerName)}</td></tr>` : ''}
          </tbody></table>
          </div>` : ''}

          <!-- ══════════════ 3. ЗЭЭЛИЙН МЭД. ЛАВЛАГАА ══════════════ -->
          ${cbRef ? `
          ${sectionTitle('3', 'Зээлийн мэдээллийн сангийн лавлагаа')}
          <div class="no-break">
          <table><tbody>
            <tr>
              <td class="label-cell">Идэвхтэй зээл</td><td>${cbRef.summary?.activeLoansCount || 0}</td>
              <td class="label-cell">Нийт үлдэгдэл</td><td style="font-weight:700">${formatMoney(cbRef.summary?.totalBalance)}</td>
            </tr>
            <tr>
              <td class="label-cell">Хугацаа хэтрэлт</td>
              <td style="font-weight:700;color:${cbRef.summary?.hasOverdue ? '#b91c1c' : '#15803d'}">${cbRef.summary?.hasOverdue ? '⚠ Тийм · ' + (cbRef.summary?.maxOverdueDays || 0) + ' хоног' : '✓ Үгүй'}</td>
              ${cbRef.creditBureauScore ? `<td class="label-cell">Кредит скор</td><td style="font-weight:700">${esc(cbRef.creditBureauScore)}</td>` : `<td class="label-cell">Байгууллагын дүн</td><td>${esc(cbRef.summary?.institutionSummary)}</td>`}
            </tr>
            ${cbRef.finalRating ? `<tr><td class="label-cell">Эцсийн үнэлгээ</td><td colspan="3" style="font-weight:700">${esc(cbRef.finalRating)}</td></tr>` : ''}
          </tbody></table>
          ${cbLoans.length > 0 ? `
          <table style="margin-top:6px"><thead><tr>
            <th>Байгууллага</th><th>Бүтээгдэхүүн</th><th style="text-align:right">Дүн</th><th style="text-align:right">Үлдэгдэл</th><th>Ангилал</th><th style="text-align:right">Хэтрэлт</th>
          </tr></thead><tbody>
          ${cbLoans.slice(0, 15).map((l, i) => `<tr style="${rowStyle(i)}">
            <td>${esc(l.institution || l.lender || '—')}</td>
            <td>${esc(l.productType || l.product || '—')}</td>
            <td style="text-align:right">${formatMoney(parseNumber(l.approvedAmount || l.amount))}</td>
            <td style="text-align:right;font-weight:600">${formatMoney(parseNumber(l.currentBalance || l.balance))}</td>
            <td style="color:${l.classification === 'normal' ? '#15803d' : l.classification === 'attention' ? '#92400e' : '#b91c1c'}">${esc(classificationLabels[l.classification] || l.classification || '—')}</td>
            <td style="text-align:right;${(parseNumber(l.overdueDays) > 0) ? 'color:#b91c1c;font-weight:600' : ''}">${parseNumber(l.overdueDays) > 0 ? l.overdueDays + ' хоног' : '—'}</td>
          </tr>`).join('')}
          </tbody></table>` : ''}
          </div>` : ''}

          <!-- ══════════════ 4. БАТЛАН ДААГЧ ══════════════ -->
          ${grtrs.length ? `
          ${sectionTitle('4', 'Батлан даагч / Хамтран зээлдэгч')}
          <div class="no-break">
          <table><thead><tr>
            <th>Нэр</th><th>РД</th><th>Утас</th><th>Харьцаа</th><th style="text-align:right">Сарын орлого</th><th style="text-align:right">Кредит скор</th><th>Барьцаа</th>
          </tr></thead><tbody>
          ${grtrs.map((g, i) => {
            const gCollStr = (g.collaterals || []).map(c => {
              const lbl = c.collateralType === 'vehicle'
                ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
                : (c.description || c.collateralType);
              return `${lbl} (${formatMoney(parseNumber(c.estimatedValue))})`;
            }).join(', ');
            return `<tr style="${rowStyle(i)}">
              <td style="font-weight:600">${esc(g.name || '—')}</td>
              <td>${esc(g.regNo || '—')}</td>
              <td>${esc(g.phone || '—')}</td>
              <td>${esc(g.guarantorType || g.relationship || '—')}</td>
              <td style="text-align:right" class="positive">${g.monthlyIncome ? formatMoney(parseNumber(g.monthlyIncome)) : '—'}</td>
              <td style="text-align:right;font-weight:600;color:${parseNumber(g.creditScore) >= 700 ? '#15803d' : parseNumber(g.creditScore) >= 550 ? '#92400e' : parseNumber(g.creditScore) > 0 ? '#b91c1c' : '#94a3b8'}">${g.creditScore || '—'}</td>
              <td style="font-size:10px">${gCollStr || '—'}</td>
            </tr>`;
          }).join('')}
          </tbody></table>
          </div>` : ''}

          <!-- ══════════════ 5. БАРЬЦАА ХӨРӨНГӨ ══════════════ -->
          ${colls.length ? `
          ${sectionTitle('5', 'Барьцаа хөрөнгө')}
          <div class="no-break">
          <table><thead><tr>
            <th>Төрөл</th><th>Дугаар / Тайлбар</th><th>Өмчлөлийн хамаарал</th><th>Эзэмшигч</th><th style="text-align:right">Үнэлгээ ₮</th>
          </tr></thead><tbody>
          ${colls.map((c, i) => {
            const cLabel = c.collateralType === 'vehicle'
              ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
              : esc(c.description);
            return `<tr style="${rowStyle(i)}">
              <td style="font-weight:600">${esc(COLLATERAL_TYPES[c.collateralType] || c.collateralType)}</td>
              <td>${cLabel}</td>
              <td>${esc(c.ownerRelation || '—')}</td>
              <td>${esc(c.ownerName || '—')}</td>
              <td style="text-align:right;font-weight:700">${formatMoney(parseNumber(c.estimatedValue))}</td>
            </tr>`;
          }).join('')}
          </tbody></table>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
            <div style="background:#f1f5f9;border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:10px;color:#64748b;margin-bottom:4px">Нийт барьцааны дүн</div>
              <div style="font-weight:800;font-size:16px;color:#003B5C">${formatMoney(displayedOutputs.collateral?.combinedValue ?? displayedOutputs.collateral?.totalValue)}</div>
            </div>
            <div style="background:#f1f5f9;border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:10px;color:#64748b;margin-bottom:4px">Зээлийн дүн</div>
              <div style="font-weight:800;font-size:16px;color:#0f172a">${formatMoney(fs.requestedAmount)}</div>
            </div>
            <div style="background:${(displayedOutputs.collateral?.combinedValue||0) > 0 && (fs.requestedAmount||0)/(displayedOutputs.collateral?.combinedValue||1)*100 <= 70 ? '#dcfce7' : (displayedOutputs.collateral?.combinedValue||0) > 0 && (fs.requestedAmount||0)/(displayedOutputs.collateral?.combinedValue||1)*100 <= 85 ? '#fef3c7' : '#fee2e2'};border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:10px;color:#64748b;margin-bottom:4px">LTV харьцаа</div>
              <div style="font-weight:800;font-size:16px;color:${(displayedOutputs.collateral?.combinedValue||0) > 0 && (fs.requestedAmount||0)/(displayedOutputs.collateral?.combinedValue||1)*100 <= 70 ? '#15803d' : (displayedOutputs.collateral?.combinedValue||0) > 0 && (fs.requestedAmount||0)/(displayedOutputs.collateral?.combinedValue||1)*100 <= 85 ? '#92400e' : '#b91c1c'}">
                ${(displayedOutputs.collateral?.combinedValue || 0) > 0 ? ((fs.requestedAmount || 0) / displayedOutputs.collateral.combinedValue * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>
          </div>
          </div>` : ''}

          <!-- ══════════════ 6. КРЕДИТ ОНОО ══════════════ -->
          ${sectionTitle('6', 'Кредит оноо ба үнэлгээ')}
          <div class="no-break" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Онооны задаргаа</div>
              ${(cs.scoreBreakdown || []).map(s => scoreBar(s.label, s.value, s.max, s.value >= s.max * 0.7 ? '#22c55e' : s.value >= s.max * 0.4 ? '#f59e0b' : '#ef4444')).join('')}
              <div style="border-top:2px solid #003B5C;margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:12px;font-weight:700;color:#475569">Нийт оноо</span>
                <span style="font-size:18px;font-weight:900;color:#003B5C">${score} / 100</span>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Үнэлгээ</div>
              <div style="background:${gradeBg};border-radius:10px;padding:14px;text-align:center;margin-bottom:10px">
                <div style="font-size:11px;color:#64748b;margin-bottom:4px">Зэрэглэл</div>
                <div style="font-size:32px;font-weight:900;color:${gradeColor}">Grade ${esc(grade)}</div>
                <div style="font-size:11px;color:${gradeColor};margin-top:4px">${esc(cs.decision || '—')}</div>
              </div>
              ${(cs.decisionRationale?.reasons || []).length > 0 ? `
              <div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:10px">
                <div style="font-size:10px;font-weight:700;color:#92400e;margin-bottom:6px;text-transform:uppercase">Анхаарах зүйлс</div>
                ${(cs.decisionRationale.reasons || []).map(r => `<div style="font-size:10px;color:#78350f;margin-bottom:3px">• ${esc(r)}</div>`).join('')}
              </div>` : ''}
              ${(cs.decisionRationale?.docs || []).length > 0 ? `
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-top:8px">
                <div style="font-size:10px;font-weight:700;color:#1e40af;margin-bottom:6px;text-transform:uppercase">Нэмэлт шаардагдах баримт</div>
                ${(cs.decisionRationale.docs || []).map(d => `<div style="font-size:10px;color:#1e3a8a;margin-bottom:3px">→ ${esc(d)}</div>`).join('')}
              </div>` : ''}
            </div>
          </div>

          <!-- ══════════════ 7. АЖИЛТНЫ САНАЛ ══════════════ -->
          ${(displayedForm.analystOpinion || displayedForm.analystDecision) ? `
          ${sectionTitle('7', 'Зээлийн ажилтны санал, дүгнэлт')}
          <div class="no-break">
          ${displayedForm.analystDecision ? `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${decisionBg};border-radius:10px;margin-bottom:10px">
            <div style="font-size:16px;font-weight:900;color:${decisionColor}">${esc(analystDecisionLabel)}</div>
          </div>` : ''}
          ${displayedForm.analystOpinion ? `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:12px;line-height:1.7;white-space:pre-wrap;color:#334155">${esc(displayedForm.analystOpinion)}</div>` : ''}
          ${displayedForm.conditions ? `
          <div style="margin-top:8px;padding:10px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:#15803d;margin-bottom:4px;text-transform:uppercase">Нөхцөл</div>
            <div style="font-size:11px;color:#14532d">${esc(displayedForm.conditions)}</div>
          </div>` : ''}
          ${(displayedForm.riskFlags || []).length ? `
          <div style="margin-top:8px;padding:10px 14px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:#b91c1c;margin-bottom:4px;text-transform:uppercase">Эрсдэлийн тэмдэглэгээ</div>
            ${(displayedForm.riskFlags || []).map(r => `<div style="font-size:11px;color:#7f1d1d;margin-bottom:2px">⚠ ${esc(r)}</div>`).join('')}
          </div>` : ''}
          </div>` : ''}

          <!-- ══════════════ 8. ЭРГЭН ТӨЛӨЛТИЙН ХУВААРЬ ══════════════ -->
          ${amortRows.length > 0 ? `
          <div class="page-break"></div>
          ${sectionTitle('8', 'Эргэн төлөлтийн хуваарь')}
          <div class="no-break">
          <table><thead><tr>
            <th>№</th><th>Огноо</th><th style="text-align:right">Эхний үлдэгдэл</th><th style="text-align:right">Сарын төлбөр</th><th style="text-align:right">Хүү</th><th style="text-align:right">Хүү тооцох хоног</th><th style="text-align:right">Үндсэн</th><th style="text-align:right">Эцсийн үлдэгдэл</th>
          </tr></thead><tbody>
          ${amortRows.map((r, i) => `<tr style="${rowStyle(i)}">
            <td style="color:#94a3b8">${r.month}</td>
            <td>${esc(r.dateLabel || r.month)}</td>
            <td style="text-align:right">${formatMoney(r.openingBalance)}</td>
            <td style="text-align:right;font-weight:600">${formatMoney(r.payment)}</td>
            <td style="text-align:right" class="negative">${formatMoney(r.interest)}</td>
            <td style="text-align:right;color:#64748b">${r.calendarDays || '—'}</td>
            <td style="text-align:right">${formatMoney(r.principal)}</td>
            <td style="text-align:right;font-weight:600">${formatMoney(r.closingBalance)}</td>
          </tr>`).join('')}
          <tr style="background:#f1f5f9;font-weight:700">
            <td colspan="2" style="text-align:right;font-weight:700">Нийт</td>
            <td></td>
            <td style="text-align:right">${formatMoney(amortRows.reduce((s,r) => s+(r.payment||0), 0))}</td>
            <td style="text-align:right" class="negative">${formatMoney(amortRows.reduce((s,r) => s+(r.interest||0), 0))}</td>
            <td></td>
            <td style="text-align:right">${formatMoney(amortRows.reduce((s,r) => s+(r.principal||0), 0))}</td>
            <td></td>
          </tr>
          </tbody></table>
          </div>` : ''}

          <!-- ══════════════ FOOTER ══════════════ -->
          <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
            <span>Solongo Capital ХХК · Зээлийн хэлтэс · ${printDate}</span>
            <span>Энэ баримт бичиг нь дотоод ашиглалтад зориулагдсан болно</span>
          </div>

        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const textInput = 'w-full p-3 border rounded-lg text-sm bg-white focus:outline-none focus:border-[#003B5C]';

  const RESEARCH_TABS = [
    { key: 'profile', label: 'Зээлдэгчийн профайл', icon: FileText },
    { key: 'guarantors', label: 'Батлан даагч / Хамтран', icon: Users },
    { key: 'loan_history', label: 'Зээлийн мэдээлэл', icon: Shield },
    { key: 'loan_calc', label: 'Зээлийн тооцоолол', icon: Calculator },
    { key: 'income', label: 'Орлогын мэдээлэл', icon: TrendingUp },
    { key: 'collateral', label: 'Барьцааны мэдээлэл', icon: Home },
    { key: 'summary', label: 'Дүгнэлт', icon: Calculator },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl font-bold text-sm transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#003B5C] text-white'
        }`}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}
      {/* ===== LIST VIEW ===== */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A651]">Дотоод судалгаа</p>
            <h2 className="text-2xl font-bold text-[#003B5C]">Зээлийн судалгаа</h2>
          </div>

          {/* Section 1: Study requests */}
          <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#003B5C]">Судлах зээлийн хүсэлтүүд</h3>
              <span className="text-xs text-slate-400">{sortedStudyRequests.length} хүсэлт</span>
            </div>
            {sortedStudyRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedStudyRequests.map((req) => {
                  const name = req.userType === 'organization'
                    ? req.orgName
                    : [req.lastname, req.firstname].filter(Boolean).join(' ');
                  const regNo = req.userType === 'organization' ? req.orgRegNo : req.regNo;
                  return (
                    <button
                      key={req._id}
                      onClick={() => { onSelectStudyRequest?.(req); setViewMode('detail'); }}
                      className="text-left border rounded-2xl p-4 hover:border-[#003B5C] hover:bg-blue-50 transition-all space-y-2 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[#003B5C] truncate">{name || '—'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">Судлах</span>
                      </div>
                      <p className="text-xs text-slate-500">{regNo || '—'}</p>
                      {req.selectedProduct && <p className="text-xs text-slate-600 font-semibold">{req.selectedProduct}</p>}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatMoney(req.amount)}</span>
                        <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('mn-MN') : '—'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">Судлах төлөвтэй хүсэлт байхгүй байна.</p>
            )}
          </section>

          {/* Section 2: Saved researches */}
          <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#003B5C]">Хадгалагдсан судалгаанууд</h3>
              <span className="text-xs text-slate-400">{loading ? 'Уншиж байна...' : `${researches.length} бичлэг`}</span>
            </div>
            {researches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {researches.map((item) => {
                  const b = item.borrower || {};
                  const grade = item.outputs?.creditScore?.grade;
                  const gradeColor = { A: 'bg-green-100 text-green-700', B: 'bg-teal-100 text-teal-700', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', E: 'bg-red-100 text-red-700' }[grade] || 'bg-slate-100 text-slate-500';
                  return (
                    <button
                      key={item._id}
                      onClick={() => { setSelectedId(item._id); setViewMode('detail'); }}
                      className="text-left border rounded-2xl p-4 hover:border-[#003B5C] hover:bg-blue-50 transition-all space-y-2 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[#003B5C] truncate">{getDisplayName(b) || 'Нэргүй'}</span>
                        {grade && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${gradeColor}`}>Grade {grade}</span>}
                      </div>
                      <p className="text-xs text-slate-500">{getDisplayRegNo(b) || '—'}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatMoney(b.requestedAmount)}</span>
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('mn-MN') : '—'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">Судалгаа байхгүй байна.</p>
            )}
          </section>
        </div>
      )}

      {/* ===== DETAIL VIEW ===== */}
      {viewMode === 'detail' && (
        <div className="space-y-4">
          {/* Detail header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#003B5C] border rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100"
              >
                ← Жагсаалт
              </button>
              <div>
                <p className="font-black text-[#003B5C]">{getDisplayName(displayedForm) || '—'}</p>
                <p className="text-xs text-slate-500">
                  {getDisplayRegNo(displayedForm) || '—'}
                  {displayedForm.requestedAmount ? ` · ${formatMoney(parseNumber(displayedForm.requestedAmount))}` : ''}
                  {displayedForm.termMonths ? ` · ${displayedForm.termMonths} сар` : ''}
                </p>
                {selectedId && <p className="text-[11px] text-green-600 mt-0.5">Хадгалагдсан судалгаа #{selectedId.slice(-6)}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={saveResearch} disabled={saving} className="inline-flex items-center gap-2 bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
                <Save size={16} /> {saving ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
              <button onClick={printOutput} className="inline-flex items-center gap-2 border border-[#003B5C] text-[#003B5C] px-4 py-2 rounded-lg font-bold text-sm bg-white">
                <Printer size={16} /> Хэвлэх
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto bg-white border rounded-2xl p-1.5 shadow-sm">
            {RESEARCH_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setResearchTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  researchTab === key
                    ? 'bg-[#003B5C] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="space-y-6">

          {/* ===== TAB: profile ===== */}
          {researchTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-6">
                {/* Profile image */}
                <div className="flex items-center gap-4 bg-slate-50 border rounded-2xl p-4">
                  {form.profileImageUrl ? (
                    <img src={form.profileImageUrl} alt="Зээлдэгч" className="w-16 h-16 rounded-xl object-cover border-2 border-[#003B5C] flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-400 text-2xl font-bold">{(form.firstName || form.lastName || form.orgName || form.borrowerName || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-[#003B5C]">{form.borrowerType === 'organization' ? (form.orgName || '—') : ([form.firstName, form.fatherName].filter(Boolean).join(' ') || form.lastName || form.borrowerName || '—')}</p>
                    <p className="text-xs text-slate-500">{form.borrowerType === 'organization' ? (form.orgRegNo || form.regNo || '—') : (form.regNo || '—')} · {form.phone || form.contactPhone || '—'}</p>
                    {form.profileImageUrl && <p className="text-[11px] text-green-600 mt-1">Цээж зураг байна</p>}
                  </div>
                </div>

                {embeddedMode && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <span className="text-amber-500">⚠</span>
                    <span>Засвар хийх бол Аппликэйшн хэсэг рүү очно уу.</span>
                  </div>
                )}

                {/* Borrower fields — read-only */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Field label="Зээлдэгчийн төрөл">
              <select value={form.borrowerType} onChange={(e) => updateField('borrowerType', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <option value="individual">Иргэн</option>
                <option value="organization">Байгууллага</option>
              </select>
            </Field>
            {form.borrowerType === 'individual' ? (
              <>
                <Field label="Нэр">
                  <input value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Эцэг эхийн нэр">
                  <input value={form.fatherName || ''} onChange={(e) => updateField('fatherName', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Овог">
                  <input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="РД">
                  <input value={form.regNo} onChange={(e) => updateField('regNo', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Утас">
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Гэрийн хаяг">
                  <input value={form.address} onChange={(e) => updateField('address', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Ажил эрхлэлт">
                  <input value={form.employment} onChange={(e) => updateField('employment', e.target.value)} className={textInput} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Байгууллагын нэр">
                  <input value={form.orgName} onChange={(e) => updateField('orgName', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Байгууллагын регистр">
                  <input value={form.orgRegNo} onChange={(e) => updateField('orgRegNo', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Холбоо барих хүний нэр">
                  <input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Албан тушаал">
                  <input value={form.contactPosition} onChange={(e) => updateField('contactPosition', e.target.value)} className={textInput} />
                </Field>
                <Field label="Холбоо барих утас">
                  <input value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
                </Field>
                <Field label="Үйл ажиллагааны чиглэл">
                  <input value={form.businessSector} onChange={(e) => updateField('businessSector', e.target.value)} className={textInput} />
                </Field>
                <Field label="Үйл ажиллагаа явуулсан жил">
                  <input value={form.operationYears} onChange={(e) => updateField('operationYears', e.target.value)} className={textInput} />
                </Field>
              </>
            )}
            <Field label="Имэйл хаяг">
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} disabled={embeddedMode} className={`${textInput} ${embeddedMode ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`} />
            </Field>
            <Field label="Орлогын эх үүсвэр">
              <input value={form.incomeSource} onChange={(e) => updateField('incomeSource', e.target.value)} className={textInput} />
            </Field>
            <Field label="Зээлийн скор оноо">
              <input type="number" value={form.creditScore} onChange={(e) => updateField('creditScore', e.target.value)} className={textInput} />
            </Field>
            <Field label="Ангилал">
              <select value={form.classification} onChange={(e) => updateField('classification', e.target.value)} className={textInput}>
                {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Хүсэж буй зээлийн дүн">
              <input value={form.requestedAmount} onChange={(e) => updateField('requestedAmount', e.target.value)} className={textInput} />
            </Field>
            <Field label="Хугацаа / сар">
              <input type="number" value={form.termMonths} onChange={(e) => updateField('termMonths', e.target.value)} className={textInput} />
            </Field>
            <Field label="Сарын хүү / %">
              <input type="number" step="0.1" value={form.monthlyRate} onChange={(e) => updateField('monthlyRate', e.target.value)} className={textInput} />
            </Field>
            <Field label="Сарын орлого">
              <input value={form.averageMonthlyIncome} onChange={(e) => updateField('averageMonthlyIncome', e.target.value)} className={textInput} />
            </Field>
            <Field label="Сарын зарлага">
              <input value={form.averageMonthlyCost} onChange={(e) => updateField('averageMonthlyCost', e.target.value)} className={textInput} />
            </Field>
                <Field label="Одоо төлж буй сарын зээл">
                  <input value={form.monthlyDebtPayment} disabled className={`${textInput} opacity-60 cursor-not-allowed bg-slate-50`} />
                </Field>
                </div>

                {/* Loan request info cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Бүтээгдэхүүн', value: PRODUCTS[form.sourceProduct] || form.sourceProduct || '—' },
                    { label: 'Хүсэж буй дүн', value: form.requestedAmount ? formatMoney(parseNumber(form.requestedAmount)) : '—' },
                    { label: 'Хугацаа', value: form.termMonths ? `${form.termMonths} сар` : '—' },
                    { label: 'Зориулалт', value: form.purpose || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="border rounded-xl p-3 bg-slate-50">
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">{label}</p>
                      <p className="font-bold text-sm text-[#003B5C] truncate">{value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400 text-center">Засвар хийх бол Аппликэйшн хэсэг рүү очно уу.</p>
              </div>
            </div>
          )}

          {/* ===== TAB: guarantors ===== */}
          {researchTab === 'guarantors' && (
            <div className="space-y-4">
              <div className="bg-white border rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-[#003B5C]" />
                  <h3 className="font-bold text-[#003B5C]">Батлан даагч / Хамтран зээлдэгч</h3>
                </div>
                {(displayedForm.guarantors || []).length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Батлан даагч бүртгээгүй байна.</p>
                ) : (
                  <div className="space-y-6">
                    {(displayedForm.guarantors || []).map((g, i) => {
                      const gScore = parseNumber(g.creditScore);
                      const gCollaterals = Array.isArray(g.collaterals) ? g.collaterals : [];
                      const gLoans = Array.isArray(g.otherLoans) ? g.otherLoans : [];
                      const gCollateralTotal = gCollaterals.reduce((s, c) => s + parseNumber(c.estimatedValue), 0);
                      return (
                        <div key={i} className="border rounded-2xl bg-slate-50 overflow-hidden">
                          {/* Header */}
                          <div className="bg-[#003B5C] text-white px-5 py-3 flex items-center justify-between">
                            <div>
                              <span className="font-black text-base">{g.name || '—'}</span>
                              <span className="ml-3 text-xs bg-white/20 rounded-full px-2 py-0.5">{g.guarantorType || g.relationship || '—'}</span>
                            </div>
                            {gScore > 0 && (
                              <div className="text-right">
                                <div className="text-xs opacity-70">Кредит скор</div>
                                <div className={`font-black text-lg ${gScore >= 700 ? 'text-green-300' : gScore >= 550 ? 'text-yellow-300' : 'text-red-300'}`}>{gScore}</div>
                              </div>
                            )}
                          </div>

                          <div className="p-5 space-y-4">
                            {/* Basic info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-slate-400 block">РД</span><b className="text-slate-700">{g.regNo || '—'}</b></div>
                              <div><span className="text-slate-400 block">Утас</span><b className="text-slate-700">{g.phone || '—'}</b></div>
                              <div><span className="text-slate-400 block">Сарын орлого</span><b className="text-slate-700">{g.monthlyIncome ? formatMoney(parseNumber(g.monthlyIncome)) : '—'}</b></div>
                              <div><span className="text-slate-400 block">Ажил эрхлэлт</span><b className="text-slate-700">{g.employment || '—'}</b></div>
                              {g.address && <div className="col-span-2 md:col-span-4"><span className="text-slate-400 block">Хаяг</span><b className="text-slate-700">{g.address}</b></div>}
                            </div>

                            {/* Collaterals */}
                            {gCollaterals.length > 0 && (
                              <div>
                                <p className="text-xs font-black text-[#003B5C] uppercase tracking-wide mb-2 flex items-center gap-1"><Home size={13} /> Барьцаа хөрөнгө</p>
                                <div className="space-y-2">
                                  {gCollaterals.map((c, ci) => (
                                    <div key={ci} className="bg-white border rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-bold text-slate-700">
                                          {c.collateralType === 'vehicle'
                                            ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
                                            : (c.description || c.collateralType)}
                                        </span>
                                        {c.ownerRelation && <span className="text-slate-400 ml-2">({c.ownerRelation})</span>}
                                        {!c.ownerRelation && c.ownerName && <span className="text-slate-400 ml-2">({c.ownerName})</span>}
                                      </div>
                                      <span className="font-black text-[#003B5C]">{c.estimatedValue ? formatMoney(parseNumber(c.estimatedValue)) : '—'}</span>
                                    </div>
                                  ))}
                                  <div className="text-xs text-right text-slate-500 font-semibold pr-1">
                                    Нийт барьцаа: <span className="text-[#003B5C] font-black">{formatMoney(gCollateralTotal)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Other loans */}
                            {gLoans.length > 0 && (
                              <div>
                                <p className="text-xs font-black text-[#003B5C] uppercase tracking-wide mb-2 flex items-center gap-1"><Shield size={13} /> Одоогийн зээл</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-400 border-b">
                                        <th className="text-left pb-1 font-semibold">Байгууллага</th>
                                        <th className="text-right pb-1 font-semibold">Үлдэгдэл</th>
                                        <th className="text-right pb-1 font-semibold">Сарын төлбөр</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {gLoans.map((l, li) => (
                                        <tr key={li} className="border-b border-slate-100">
                                          <td className="py-1 text-slate-700">{l.lender || '—'}</td>
                                          <td className="py-1 text-right text-slate-700">{l.balance ? formatMoney(parseNumber(l.balance)) : '—'}</td>
                                          <td className="py-1 text-right text-slate-700">{l.monthlyPayment ? formatMoney(parseNumber(l.monthlyPayment)) : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Combined summary */}
                    {(() => {
                      const allG = displayedForm.guarantors || [];
                      const totalIncome = allG.reduce((s, g) => s + parseNumber(g.monthlyIncome), 0);
                      const totalColl = allG.flatMap(g => g.collaterals || []).reduce((s, c) => s + parseNumber(c.estimatedValue), 0);
                      const bestScore = allG.reduce((b, g) => Math.max(b, parseNumber(g.creditScore)), 0);
                      if (allG.length < 2 && totalIncome === 0 && totalColl === 0) return null;
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                          <p className="text-xs font-black text-[#003B5C] uppercase tracking-wide mb-3">Нийт хувь нэмэр</p>
                          <div className="grid grid-cols-3 gap-3 text-xs text-center">
                            <div className="bg-white rounded-xl p-3">
                              <div className="text-slate-400 mb-1">Нийт орлого</div>
                              <div className="font-black text-[#003B5C]">{formatMoney(totalIncome)}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3">
                              <div className="text-slate-400 mb-1">Нийт барьцаа</div>
                              <div className="font-black text-[#003B5C]">{formatMoney(totalColl)}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3">
                              <div className="text-slate-400 mb-1">Хамгийн сайн скор</div>
                              <div className={`font-black ${bestScore >= 700 ? 'text-green-600' : bestScore >= 550 ? 'text-yellow-600' : bestScore > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                {bestScore > 0 ? bestScore : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== TAB: loan_history ===== */}
          {researchTab === 'loan_history' && (
            <div className="space-y-6">
              {/* Credit reference AI upload */}
              <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-[#003B5C] flex items-center gap-2"><Shield size={18} /> Зээлийн мэдээлэл</h3>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <span className="flex items-center gap-2 font-bold text-[#003B5C]"><Upload size={17} /> Зээлийн мэдээллийн лавлагаа (AI)</span>
                  <span className="block text-xs text-slate-500">PDF эсвэл зураг — AI уншиж бусад зээлийн хүснэгтийг автоматаар бөглөнө.</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border rounded-lg text-xs font-bold text-slate-700">
                      <Plus size={13} /> Файл сонгох
                      <input type="file" accept=".csv,.txt,.json,.pdf,.png,.jpg,.jpeg" onChange={handleCreditReferenceChange} className="hidden" />
                    </label>
                    <span className="text-xs text-slate-500 truncate flex-1">{creditReference?.name || 'Файл сонгоогүй'}</span>
                    {creditReference && (
                      <button type="button" onClick={() => analyzeCreditReference({ files: [creditReference] })} disabled={analyzingCreditRef}
                        className="inline-flex items-center gap-1.5 bg-[#003B5C] text-white px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50">
                        {analyzingCreditRef ? 'AI уншиж байна...' : 'AI унших'}
                      </button>
                    )}
                  </div>
                  {creditReferenceStatus && <span className="block text-xs text-[#00A651] font-semibold">{creditReferenceStatus}</span>}
                  {creditRefError && <span className="block text-xs text-red-600 font-semibold">{creditRefError}</span>}
                  {creditRefAnalysis && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-black text-[#003B5C] uppercase tracking-wide">AI уншилтын үр дүн</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white rounded-lg p-2">
                          <span className="text-slate-500 block">Нийт зээл</span>
                          <span className="font-black text-[#003B5C]">{(creditRefAnalysis.primaryLoans || []).length} мөр</span>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <span className="text-slate-500 block">Идэвхтэй зээл</span>
                          <span className="font-black text-[#003B5C]">{(creditRefAnalysis.primaryLoans || []).filter((l) => l.balance > 0).length} ш</span>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <span className="text-slate-500 block">Нийт үлдэгдэл</span>
                          <span className="font-black text-slate-700">{formatMoney(creditRefAnalysis.summary?.totalBalance)}</span>
                        </div>
                        <div className={`bg-white rounded-lg p-2 ${creditRefAnalysis.summary?.hasOverdue ? 'border border-red-300' : ''}`}>
                          <span className="text-slate-500 block">Хугацаа хэтэрсэн</span>
                          <span className={`font-black ${creditRefAnalysis.summary?.hasOverdue ? 'text-red-600' : 'text-green-600'}`}>
                            {creditRefAnalysis.summary?.hasOverdue ? `Тийм (${creditRefAnalysis.summary.maxOverdueDays} өдөр)` : 'Үгүй'}
                          </span>
                        </div>
                      </div>
                      {creditRefAnalysis.creditBureauScore && (
                        <p className="text-xs text-slate-600">Кредит бюрогийн скор: <b className="text-[#003B5C]">{creditRefAnalysis.creditBureauScore}</b></p>
                      )}
                      {creditRefAnalysis.summary?.institutionSummary && (
                        <p className="text-xs text-slate-500">{creditRefAnalysis.summary.institutionSummary}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* FICO analysis */}
                {ficoAnalysis && (
                  <div className="border rounded-xl p-4 bg-blue-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">FICO / Sainscore</span>
                      <span className={`text-lg font-black ${ficoAnalysis.ficoScore >= 700 ? 'text-green-600' : ficoAnalysis.ficoScore >= 550 ? 'text-amber-600' : 'text-red-600'}`}>{ficoAnalysis.ficoScore}</span>
                    </div>
                    {ficoAnalysis.scoreCategory && (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg ${ficoAnalysis.ficoScore >= 700 ? 'bg-green-100 text-green-700' : ficoAnalysis.ficoScore >= 550 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {ficoAnalysis.scoreCategory}
                      </span>
                    )}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-slate-500">Нээлттэй зээл: <b>{ficoAnalysis.openLoansCount ?? '-'}</b></span>
                      <span className="text-slate-500">Хаагдсан: <b>{ficoAnalysis.closedLoansCount ?? '-'}</b></span>
                      <span className="text-slate-500">90+ хоног: <b className={ficoAnalysis.overdueCount90Plus > 0 ? 'text-red-600' : ''}>{ficoAnalysis.overdueCount90Plus ?? '-'}</b></span>
                      <span className="text-slate-500">Идэвхтэй үлдэгдэл: <b>{ficoAnalysis.totalActiveBalance ? formatMoney(ficoAnalysis.totalActiveBalance) : '-'}</b></span>
                    </div>
                    {(ficoAnalysis.scoreReasons || []).map((r, i) => (
                      <p key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-amber-500">•</span>{r}</p>
                    ))}
                  </div>
                )}

                {/* Other loans editable */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#003B5C]">Бусад зээлийн мэдээлэл</h4>
                    <button type="button" onClick={() => addOtherLoan()} className="inline-flex items-center gap-2 bg-white border border-[#003B5C] text-[#003B5C] px-4 py-2 rounded-lg font-bold text-xs">
                      <Plus size={15} /> Зээл нэмэх
                    </button>
                  </div>
                  {(form.otherLoans || []).map((loan, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 border rounded-xl p-3">
                      <input value={loan.lender} onChange={(e) => updateOtherLoan(index, 'lender', e.target.value)} placeholder="Банк/ББСБ" className={textInput} />
                      <input value={loan.product} onChange={(e) => updateOtherLoan(index, 'product', e.target.value)} placeholder="Зээлийн төрөл" className={textInput} />
                      <input value={loan.amount} onChange={(e) => updateOtherLoan(index, 'amount', e.target.value)} placeholder="Анхны дүн" className={textInput} />
                      <input value={loan.balance} onChange={(e) => updateOtherLoan(index, 'balance', e.target.value)} placeholder="Үлдэгдэл" className={textInput} />
                      <input value={loan.monthlyPayment} onChange={(e) => updateOtherLoan(index, 'monthlyPayment', e.target.value)} placeholder="Сарын төлөлт" className={textInput} />
                      <div className="flex gap-2">
                        <select value={loan.classification} onChange={(e) => updateOtherLoan(index, 'classification', e.target.value)} className={textInput}>
                          {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button type="button" onClick={() => removeOtherLoan(index)} className="px-3 rounded-lg bg-red-50 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {!(form.otherLoans || []).length && <p className="text-xs text-slate-400 text-center py-3">Бусад зээл бүртгээгүй байна.</p>}
                </div>
              </section>

              {/* creditRefAnalysis full output */}
              {creditRefAnalysis && (
                <section className="border rounded-2xl p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-[#003B5C] flex items-center gap-2"><Shield size={17} /> Зээлийн мэдээллийн лавлагаа (AI)</h4>
                    <div className="flex items-center gap-2 text-xs">
                      {creditRefAnalysis.creditBureauScore && (
                        <span className="bg-blue-100 text-blue-800 font-black px-3 py-1 rounded-lg">Скор: {creditRefAnalysis.creditBureauScore}</span>
                      )}
                      {creditRefAnalysis.summary?.hasOverdue ? (
                        <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-lg flex items-center gap-1"><AlertCircle size={13} /> Хугацаа хэтэрсэн {creditRefAnalysis.summary.maxOverdueDays}+ өдөр</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">Хугацаа хэтрэлтгүй</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['Нийт идэвхтэй зээл', creditRefAnalysis.summary?.activeLoansCount ?? (creditRefAnalysis.primaryLoans || []).filter((l) => l.balance > 0).length, ''],
                      ['Нийт үлдэгдэл', formatMoney(creditRefAnalysis.summary?.totalBalance), 'text-[#003B5C]'],
                      ['Сарын нийт төлөлт', formatMoney(creditRefAnalysis.summary?.estimatedMonthlyPayment), 'text-amber-700'],
                      ['Байгууллага', creditRefAnalysis.summary?.institutionSummary || '-', 'text-slate-600 text-xs'],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="border rounded-xl p-3 bg-slate-50">
                        <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">{label}</p>
                        <p className={`font-black text-sm ${cls}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {(creditRefAnalysis.primaryLoans || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-xs font-bold uppercase text-slate-500 mb-2">Үндсэн зээлдэгчээр орсон зээлүүд</p>
                      <table className="w-full text-xs min-w-[640px]">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                          <tr>
                            <th className="p-2 text-left">Байгууллага</th>
                            <th className="p-2 text-left">Төрөл</th>
                            <th className="p-2 text-right">Анхны дүн</th>
                            <th className="p-2 text-right">Үлдэгдэл</th>
                            <th className="p-2 text-right">Сарын төлөлт</th>
                            <th className="p-2 text-center">Хугацаа хэтэрсэн</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(creditRefAnalysis.primaryLoans || []).map((loan, idx) => (
                            <tr key={idx} className={loan.isOverdue ? 'bg-red-50' : loan.balance <= 0 ? 'opacity-50' : ''}>
                              <td className="p-2 font-semibold">{loan.institution || '-'}</td>
                              <td className="p-2">{loan.loanType || '-'}</td>
                              <td className="p-2 text-right">{formatMoney(loan.originalAmount)}</td>
                              <td className={`p-2 text-right font-bold ${loan.balance > 0 ? 'text-[#003B5C]' : 'text-slate-400'}`}>{formatMoney(loan.balance)}</td>
                              <td className="p-2 text-right">{loan.estimatedMonthlyPayment > 0 ? formatMoney(loan.estimatedMonthlyPayment) : '-'}</td>
                              <td className="p-2 text-center">
                                {loan.isOverdue
                                  ? <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">{loan.overdueDays}өдөр</span>
                                  : <span className="text-slate-400">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {(creditRefAnalysis.coLoans || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500 mb-2">Хамтран зээлдэгчээр орсон ({creditRefAnalysis.coLoans.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {creditRefAnalysis.coLoans.map((loan, idx) => (
                          <div key={idx} className={`border rounded-lg p-2 text-xs ${loan.isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="font-bold">{loan.institution}</span> · {loan.loanType} · <span className="text-[#003B5C] font-bold">{formatMoney(loan.balance)}</span>
                            {loan.primaryBorrower && <span className="text-slate-500"> (Үндсэн: {loan.primaryBorrower})</span>}
                            {loan.isOverdue && <span className="ml-2 text-red-600 font-bold">{loan.overdueDays}өдөр</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* ===== TAB: loan_calc ===== */}
          {researchTab === 'loan_calc' && (
            <div className="space-y-6">

              {/* Зээлдэгчийн хүсэлт (read-only) */}
              <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[#003B5C]" />
                  <div>
                    <h4 className="font-bold text-[#003B5C]">Зээлдэгчийн хүссэн хүсэлт</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Зээлдэгчийн анхны хүсэлтийн мэдээлэл</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-xs text-slate-500">Зээлийн дүн</p>
                    <p className="font-black text-[#003B5C] text-lg">{formatMoney(displayedOutputs.frontSheet?.requestedAmount)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-xs text-slate-500">Хугацаа</p>
                    <p className="font-black text-[#003B5C] text-lg">{displayedOutputs.frontSheet?.termMonths || '-'} <span className="text-sm font-normal">сар</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-xs text-slate-500">Бүтээгдэхүүн</p>
                    <p className="font-bold text-slate-700 text-sm">{PRODUCTS[displayedForm?.sourceProduct] || displayedForm?.sourceProduct || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                    <p className="text-xs text-slate-500">Зориулалт</p>
                    <p className="font-bold text-slate-700 text-sm">{displayedOutputs.frontSheet?.purpose || '-'}</p>
                  </div>
                </div>
              </section>

              {/* Зээлийн тооцоолол */}
              <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-[#003B5C]" />
                  <div>
                    <h4 className="font-bold text-[#003B5C]">Зээлийн тооцоолол</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Зээлийн параметр тохируулаад эргэн төлөлтийн хуваарь харна уу</p>
                  </div>
                </div>

                {/* Параметрүүд */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Зээлийн дүн ₮</label>
                    <input type="text" value={form.requestedAmount ?? ''}
                      onChange={e => updateField('requestedAmount', e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                      placeholder="₮" inputMode="numeric" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Хугацаа (сар)</label>
                    <input type="number" value={form.termMonths ?? ''}
                      onChange={e => updateField('termMonths', e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                      placeholder="сар" min="1" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Сарын хүү (%)</label>
                    <input type="number" step="0.01" value={form.monthlyRate ?? ''}
                      onChange={e => updateField('monthlyRate', e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                      placeholder="%" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Эхэлж төлөх огноо</label>
                    <input type="date" value={form.repaymentStartDate ?? ''}
                      onChange={e => updateField('repaymentStartDate', e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]" />
                  </div>
                </div>

                {/* Төлбөрийн нөхцөл */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">Төлбөрийн нөхцөл</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'equal', label: 'Тэнцүү (аннуитет)' },
                      { key: 'grace_then_equal', label: 'Тодорхой сар сонгоод дараа нь тэнцүү' },
                      { key: 'interest_only_bullet', label: 'Хүү + хугацааны эцэст үндсэн' },
                    ].map(rt => (
                      <button key={rt.key} type="button"
                        onClick={() => updateField('repaymentType', rt.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          (form.repaymentType || 'equal') === rt.key
                            ? 'bg-[#003B5C] text-white border-[#003B5C] shadow'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#003B5C] hover:text-[#003B5C]'
                        }`}>
                        {rt.label}
                      </button>
                    ))}
                  </div>
                  {(form.repaymentType || 'equal') === 'grace_then_equal' && (
                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-600 shrink-0">Хүү төлөх хугацаа (сар):</label>
                      <input type="number" min="1" value={form.graceMonths ?? ''}
                        onChange={e => updateField('graceMonths', e.target.value)}
                        className="w-24 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                        placeholder="сар" />
                    </div>
                  )}
                </div>

                {/* KPI хураангуй */}
                {parseNumber(form.requestedAmount) > 0 && parseNumber(form.termMonths) > 0 && parseNumber(form.monthlyRate) > 0 && (() => {
                  const amt = parseNumber(form.requestedAmount);
                  const term = parseNumber(form.termMonths);
                  const rate = parseNumber(form.monthlyRate) / 100;
                  const rType = form.repaymentType || 'equal';
                  let monthlyPmt = 0;
                  let totalRepay = 0;
                  let totalInterest = 0;
                  if (rType === 'equal') {
                    monthlyPmt = rate > 0 ? amt * rate * Math.pow(1 + rate, term) / (Math.pow(1 + rate, term) - 1) : amt / term;
                    totalRepay = monthlyPmt * term;
                    totalInterest = totalRepay - amt;
                  } else if (rType === 'interest_only_bullet') {
                    monthlyPmt = amt * rate;
                    totalInterest = monthlyPmt * term;
                    totalRepay = totalInterest + amt;
                  } else {
                    const grace = parseNumber(form.graceMonths) || 0;
                    const equalTerm = term - grace;
                    const graceMonthlyPmt = amt * rate;
                    const equalMonthlyPmt = equalTerm > 0 && rate > 0
                      ? amt * rate * Math.pow(1 + rate, equalTerm) / (Math.pow(1 + rate, equalTerm) - 1)
                      : amt / (equalTerm || 1);
                    totalRepay = graceMonthlyPmt * grace + equalMonthlyPmt * equalTerm;
                    totalInterest = totalRepay - amt;
                    monthlyPmt = equalMonthlyPmt;
                  }
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {[
                        { label: 'Сарын төлбөр', value: formatMoney(Math.round(monthlyPmt)), color: 'text-[#003B5C]' },
                        { label: 'Нийт төлбөр', value: formatMoney(Math.round(totalRepay)), color: 'text-slate-700' },
                        { label: 'Нийт хүүгийн дүн', value: formatMoney(Math.round(totalInterest)), color: 'text-red-600' },
                        { label: 'Хүүгийн хувь', value: `${totalRepay > 0 ? ((totalInterest / totalRepay) * 100).toFixed(1) : 0}%`, color: 'text-amber-600' },
                      ].map((item, i) => (
                        <div key={i} className="bg-slate-50 border rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                          <p className={`font-black text-base ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>

              {/* Амортизацийн хуваарь */}
              {parseNumber(form.requestedAmount) > 0 && parseNumber(form.termMonths) > 0 && parseNumber(form.monthlyRate) > 0 && (
                <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calculator size={15} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">Эргэн төлөлтийн хуваарь</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[550px]">
                      <thead>
                        <tr className="bg-[#003B5C] text-white">
                          <th className="px-2 py-2 text-center">№</th>
                          <th className="px-2 py-2 text-left">Огноо</th>
                          <th className="px-2 py-2 text-center">Хүү тооцох хоног</th>
                          <th className="px-2 py-2 text-right">Үндсэн</th>
                          <th className="px-2 py-2 text-right">Хүү</th>
                          <th className="px-2 py-2 text-right">Нийт төлбөр</th>
                          <th className="px-2 py-2 text-right">Үлдэгдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const amt = parseNumber(form.requestedAmount);
                          const term = parseNumber(form.termMonths);
                          const rate = parseNumber(form.monthlyRate) / 100;
                          const rType = form.repaymentType || 'equal';
                          const grace = parseNumber(form.graceMonths) || 0;
                          const startDate = form.repaymentStartDate ? new Date(form.repaymentStartDate) : null;
                          const rows = [];
                          let balance = amt;
                          for (let i = 0; i < term; i++) {
                            const interest = balance * rate;
                            let principal = 0;
                            let payment = 0;
                            if (rType === 'equal') {
                              const annuity = rate > 0 ? amt * rate * Math.pow(1 + rate, term) / (Math.pow(1 + rate, term) - 1) : amt / term;
                              principal = annuity - interest;
                              payment = annuity;
                            } else if (rType === 'interest_only_bullet') {
                              principal = i === term - 1 ? balance : 0;
                              payment = interest + principal;
                            } else {
                              if (i < grace) {
                                principal = 0;
                                payment = interest;
                              } else {
                                const equalTerm = term - grace;
                                const annuity = equalTerm > 0 && rate > 0
                                  ? amt * rate * Math.pow(1 + rate, equalTerm) / (Math.pow(1 + rate, equalTerm) - 1)
                                  : amt / (equalTerm || 1);
                                principal = annuity - balance * rate;
                                payment = annuity;
                              }
                            }
                            balance = Math.max(0, balance - principal);
                            let dateLabel = '';
                            let calendarDays = null;
                            if (startDate) {
                              const cur = new Date(startDate);
                              cur.setMonth(cur.getMonth() + i);
                              dateLabel = `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}/${String(cur.getDate()).padStart(2, '0')}`;
                              // Days in this payment period: from previous payment date to current
                              const prev = new Date(startDate);
                              prev.setMonth(prev.getMonth() + i - 1);
                              const periodStart = i === 0 ? new Date(startDate) : prev;
                              if (i === 0) {
                                // First period: days in the current month
                                calendarDays = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
                              } else {
                                calendarDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
                              }
                            }
                            rows.push({ month: i + 1, dateLabel, calendarDays, principal, interest, payment, balance });
                          }
                          return rows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="border px-2 py-1.5 text-center font-semibold text-slate-600">{row.month}</td>
                              <td className="border px-2 py-1.5 text-slate-500">{row.dateLabel || '-'}</td>
                              <td className="border px-2 py-1.5 text-center text-slate-500">{row.calendarDays != null ? `${row.calendarDays} хоног` : '-'}</td>
                              <td className="border px-2 py-1.5 text-right">{formatMoney(Math.round(row.principal))}</td>
                              <td className="border px-2 py-1.5 text-right text-blue-700">{formatMoney(Math.round(row.interest))}</td>
                              <td className="border px-2 py-1.5 text-right font-bold">{formatMoney(Math.round(row.payment))}</td>
                              <td className="border px-2 py-1.5 text-right text-slate-500">{formatMoney(Math.round(row.balance))}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Combined borrower + guarantor capacity summary */}
              {(displayedForm.guarantors || []).length > 0 && (() => {
                const reqAmt = parseNumber(displayedForm.requestedAmount);
                const monthlyRt = parseNumber(displayedForm.monthlyRate);
                const termMo = parseNumber(displayedForm.termMonths);
                const monthlyPmt = calculatePayment(reqAmt, termMo, monthlyRt);
                const borrowerIncome = parseNumber(displayedForm.averageMonthlyIncome);
                const guarantors = displayedForm.guarantors || [];
                const guarantorTotalIncome = guarantors.reduce((s, g) => s + parseNumber(g.monthlyIncome), 0);
                const combinedIncome = borrowerIncome + guarantorTotalIncome;
                const borrowerCollTotal = (displayedOutputs.collateral?.totalValue) || 0;
                const guarantorCollTotal = guarantors.flatMap(g => g.collaterals || []).reduce((s, c) => s + parseNumber(c.estimatedValue), 0);
                const combinedColl = borrowerCollTotal + guarantorCollTotal;
                const combinedLtv = combinedColl > 0 && reqAmt > 0 ? (reqAmt / combinedColl * 100) : null;
                const combinedDti = combinedIncome > 0 && monthlyPmt > 0 ? (monthlyPmt / combinedIncome * 100) : null;
                return (
                  <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#003B5C]" />
                      <h4 className="font-bold text-[#003B5C] text-sm">Нийлсэн чадавхи (зээлдэгч + хамтрагч)</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">Нийлсэн орлого</p>
                        <p className="font-black text-[#003B5C] text-sm">{formatMoney(combinedIncome)}</p>
                        {guarantorTotalIncome > 0 && <p className="text-[10px] text-slate-400">+{formatMoney(guarantorTotalIncome)} хамтрагч</p>}
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">Нийлсэн барьцаа</p>
                        <p className="font-black text-[#003B5C] text-sm">{formatMoney(combinedColl)}</p>
                        {guarantorCollTotal > 0 && <p className="text-[10px] text-slate-400">+{formatMoney(guarantorCollTotal)} хамтрагч</p>}
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">Нийлсэн LTV</p>
                        <p className={`font-black text-sm ${combinedLtv === null ? 'text-slate-400' : combinedLtv <= 70 ? 'text-green-600' : combinedLtv <= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                          {combinedLtv !== null ? `${combinedLtv.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-400 mb-1">Нийлсэн DTI</p>
                        <p className={`font-black text-sm ${combinedDti === null ? 'text-slate-400' : combinedDti <= 40 ? 'text-green-600' : combinedDti <= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {combinedDti !== null ? `${combinedDti.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })()}

            </div>
          )}

          {/* ===== TAB: collateral ===== */}
          {researchTab === 'collateral' && (
            <div className="space-y-6">
              <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Home size={18} className="text-[#003B5C]" />
                    <div>
                      <h4 className="font-bold text-[#003B5C]">Барьцааны мэдээлэл</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Зээлийн барьцаанд өгөх хөрөнгийг бүртгэнэ.</p>
                    </div>
                  </div>
                  <button type="button" onClick={addCollateral}
                    className="inline-flex items-center gap-2 bg-white border border-[#003B5C] text-[#003B5C] px-4 py-2 rounded-lg font-bold text-xs">
                    <Plus size={15} /> Барьцаа нэмэх
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.collaterals || []).map((col, index) => (
                    <div key={index} className="bg-white border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">Барьцаа #{index + 1}</span>
                        <button type="button" onClick={() => removeCollateral(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Барьцааны төрөл">
                          <select value={col.collateralType} onChange={(e) => updateCollateral(index, 'collateralType', e.target.value)} className={textInput}>
                            {Object.entries(COLLATERAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </Field>
                        {col.collateralType === 'vehicle' ? (
                          <Field label="Улсын дугаар">
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                {['yes', 'no'].map(v => (
                                  <button key={v} type="button"
                                    onClick={() => updateCollateral(index, 'hasPlate', v)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${(col.hasPlate ?? 'yes') === v ? 'bg-[#003B5C] text-white border-[#003B5C]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#003B5C]'}`}>
                                    {v === 'yes' ? 'Дугаартай' : 'Дугааргүй'}
                                  </button>
                                ))}
                              </div>
                              {(col.hasPlate ?? 'yes') === 'yes' && (
                                <input value={col.plateNumber || ''} onChange={(e) => updateCollateral(index, 'plateNumber', e.target.value)} placeholder="УНА-001" className={textInput} />
                              )}
                            </div>
                          </Field>
                        ) : (
                          <Field label="Хөрөнгийн тайлбар">
                            <input value={col.description} onChange={(e) => updateCollateral(index, 'description', e.target.value)} placeholder="Хаяг, марк, тоо..." className={textInput} />
                          </Field>
                        )}
                        <Field label="Үнэлгээний дүн ₮">
                          <input value={col.estimatedValue} onChange={(e) => updateCollateral(index, 'estimatedValue', e.target.value)} placeholder="0" className={textInput} />
                        </Field>
                        <Field label="Эзэмшигчийн нэр">
                          <input value={col.ownerName} onChange={(e) => updateCollateral(index, 'ownerName', e.target.value)} className={textInput} />
                        </Field>
                        <Field label="Өмчлөлийн хамаарал">
                          <select value={col.ownerRelation || ''} onChange={(e) => updateCollateral(index, 'ownerRelation', e.target.value)} className={textInput}>
                            <option value="">— Сонгох —</option>
                            {col.collateralType === 'vehicle' ? (
                              <>
                                <option value="Өөрийн">Өөрийн</option>
                                <option value="Худалдаж авах">Худалдаж авах</option>
                              </>
                            ) : (
                              <>
                                <option value="Өөрийн">Өөрийн</option>
                                <option value="Түрээсийн">Түрээсийн</option>
                                <option value="Эцэг эхийн">Эцэг эхийн</option>
                                <option value="Гэр бүлийн">Гэр бүлийн</option>
                              </>
                            )}
                          </select>
                        </Field>
                        {parseNumber(col.estimatedValue) > 0 && (
                          <div className="flex items-end">
                            <div className="w-full">
                              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">LTV харьцаа</span>
                              <span className={`inline-block px-3 py-2 rounded-lg font-bold text-sm ${
                                (parseNumber(form.requestedAmount) / parseNumber(col.estimatedValue)) * 100 <= 70
                                  ? 'bg-green-100 text-green-700'
                                  : (parseNumber(form.requestedAmount) / parseNumber(col.estimatedValue)) * 100 <= 85
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {((parseNumber(form.requestedAmount) / parseNumber(col.estimatedValue)) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!(form.collaterals || []).length && (
                    <p className="text-xs text-slate-400 text-center py-3">Барьцаа бүртгээгүй байна.</p>
                  )}
                </div>
                {(form.collaterals || []).length > 0 && (
                  <div className="flex items-center justify-between bg-slate-50 border rounded-xl p-3 text-sm">
                    <span className="font-bold text-slate-600">Нийт барьцааны дүн:</span>
                    <span className="font-black text-[#003B5C]">{formatMoney(outputs.collateral?.totalValue)}</span>
                    {outputs.collateral?.ltvRatio !== null && (
                      <span className={`font-bold text-sm px-3 py-1 rounded-lg ${
                        outputs.collateral.ltvRatio <= 70 ? 'bg-green-100 text-green-700' :
                        outputs.collateral.ltvRatio <= 85 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        LTV: {outputs.collateral.ltvRatio.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* Guarantor collaterals — read-only */}
              {(displayedForm.guarantors || []).some(g => (g.collaterals || []).length > 0) && (
                <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#003B5C]" />
                    <div>
                      <h4 className="font-bold text-[#003B5C]">Батлан даагч / Хамтрагчийн барьцаа</h4>
                      <p className="text-xs text-slate-500">Хамтрагчаас оруулсан барьцаа хөрөнгө — автоматаар нэгтгэгдсэн</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {(displayedForm.guarantors || []).filter(g => (g.collaterals || []).length > 0).map((g, gi) => (
                      <div key={gi}>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">{g.name || `Батлан даагч ${gi + 1}`} ({g.guarantorType || g.relationship || ''})</p>
                        <div className="space-y-2">
                          {(g.collaterals || []).map((c, ci) => (
                            <div key={ci} className="bg-slate-50 border rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-semibold text-slate-700">{c.description || c.collateralType}</span>
                                <span className="ml-2 text-xs text-slate-400">{COLLATERAL_TYPES[c.collateralType] || c.collateralType}</span>
                                {c.ownerName && <span className="ml-2 text-xs text-slate-400">({c.ownerName})</span>}
                              </div>
                              <span className="font-black text-[#003B5C]">{c.estimatedValue ? formatMoney(parseNumber(c.estimatedValue)) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-sm">
                      <span className="font-bold text-[#003B5C]">Нийт барьцаа (зээлдэгч + хамтрагч)</span>
                      <span className="font-black text-[#003B5C] text-base">{formatMoney(
                        (displayedOutputs.collateral?.totalValue || 0) +
                        (displayedForm.guarantors || []).flatMap(g => g.collaterals || []).reduce((s, c) => s + parseNumber(c.estimatedValue), 0)
                      )}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}


          {/* ===== TAB: income ===== */}
          {researchTab === 'income' && (
            <div className="space-y-6">

              {/* Bank Statement Upload */}
              {!embeddedMode && (
                <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#003B5C]" />
                    <div>
                      <h4 className="font-bold text-[#003B5C]">Банкны хуулга / SI мэдээлэл</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Дансны хуулга болон нийгмийн даатгалын мэдээлэл оруулна уу</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Банкны хуулга (PDF)</label>
                      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-[#003B5C] hover:bg-blue-50 transition-colors">
                        <Upload size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-500">Файл сонгох...</span>
                        <input type="file" accept=".pdf" multiple onChange={handleBankStatementChange} className="hidden" />
                      </label>
                      {bankStatements.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bankStatements.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                              <FileText size={12} className="text-blue-500" />
                              <span className="truncate flex-1">{f.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">НД лавлагаа (PDF/зураг)</label>
                      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-[#003B5C] hover:bg-blue-50 transition-colors">
                        <Upload size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-500">Файл сонгох...</span>
                        <input type="file" accept=".pdf,image/*" onChange={handleSIUpload} className="hidden" />
                      </label>
                      {siFile && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                          <FileText size={12} className="text-green-500" />
                          <span className="truncate">{siFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {bankStatements.length > 0 && (
                      <button type="button" onClick={analyzeBankStatements} disabled={statementLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003B5C] text-white text-sm font-semibold hover:bg-[#005082] disabled:opacity-50 transition-colors">
                        {statementLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        Хуулга уншуулах
                      </button>
                    )}
                    {siFile && (
                      <button type="button" onClick={analyzeSI} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        НД уншуулах
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Request Files with AI Read Buttons */}
              {(form.requestFiles || []).length > 0 && (
                <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={16} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">Хавсаргасан файлууд</h4>
                  </div>
                  <div className="space-y-2">
                    {(form.requestFiles || []).map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate text-slate-700">{f.name || f.fileName || `Файл ${i + 1}`}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => analyzeStatementSource('requestFile', i)}
                            className="text-xs px-2 py-1 rounded-lg bg-[#003B5C] text-white hover:bg-[#005082] flex items-center gap-1">
                            <Sparkles size={11} /> Хуулга
                          </button>
                          <button type="button" onClick={() => analyzeStatementSource('siFile', i)}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1">
                            <Sparkles size={11} /> НД
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Bank Statement PDF Previews */}
              {bankStatementPreviews.length > 0 && (
                <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={16} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">Хуулгын preview</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bankStatementPreviews.map((url, i) => (
                      <div key={i} className="border rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {bankStatements[i]?.name || `Хуулга ${i + 1}`}
                        </div>
                        <iframe src={url} className="w-full h-64" title={`preview-${i}`} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Statement Analysis Output */}
              {displayedStatementAnalysis && (() => {
                const stFs = displayedStatementAnalysis.frontSheet || {};
                const stAccounts = displayedStatementAnalysis.accounts || [];
                return (
                <div className="space-y-4">
                  {/* Per-account summary when multiple accounts */}
                  {stAccounts.length > 1 && (
                    <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                      <h5 className="font-bold text-[#003B5C] text-sm">Дансны задаргаа ({stAccounts.length} данс)</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="border border-blue-200 px-2 py-1.5 text-left">Данс</th>
                              <th className="border border-blue-200 px-2 py-1.5 text-left">Банк</th>
                              <th className="border border-blue-200 px-2 py-1.5 text-left">Хамрах хугацаа</th>
                              <th className="border border-blue-200 px-2 py-1.5 text-right">Нийт орлого</th>
                              <th className="border border-blue-200 px-2 py-1.5 text-right">Нийт зарлага</th>
                              <th className="border border-blue-200 px-2 py-1.5 text-right">Цэвэр</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stAccounts.map((acc, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="border border-blue-100 px-2 py-1.5 font-semibold">{acc.accountNumber || acc.label || `Данс ${i+1}`}</td>
                                <td className="border border-blue-100 px-2 py-1.5 text-slate-600">{acc.bankName || '—'}</td>
                                <td className="border border-blue-100 px-2 py-1.5 text-slate-600 whitespace-nowrap">
                                  {acc.periodStart && acc.periodEnd ? `${acc.periodStart} – ${acc.periodEnd}` : acc.periodStart || acc.periodEnd || '—'}
                                  {acc.coveredMonths ? <span className="ml-1 text-slate-400">({acc.coveredMonths}с)</span> : null}
                                </td>
                                <td className="border border-blue-100 px-2 py-1.5 text-right text-green-700 font-semibold">{formatMoney(acc.totalIncome)}</td>
                                <td className="border border-blue-100 px-2 py-1.5 text-right text-red-700 font-semibold">{formatMoney(acc.totalExpense)}</td>
                                <td className={`border border-blue-100 px-2 py-1.5 text-right font-bold ${acc.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(acc.netCashFlow)}</td>
                              </tr>
                            ))}
                            <tr className="bg-blue-100 font-bold">
                              <td className="border border-blue-200 px-2 py-1.5" colSpan={2}>Нийт ({stAccounts.length} данс нийлсэн)</td>
                              <td className="border border-blue-200 px-2 py-1.5 text-slate-500 font-normal text-xs">
                                {stFs.periodStart && stFs.periodEnd ? `${stFs.periodStart} – ${stFs.periodEnd}` : ''}
                              </td>
                              <td className="border border-blue-200 px-2 py-1.5 text-right text-green-700">{formatMoney(stFs.totalIncome)}</td>
                              <td className="border border-blue-200 px-2 py-1.5 text-right text-red-700">{formatMoney(stFs.totalExpense)}</td>
                              <td className={`border border-blue-200 px-2 py-1.5 text-right ${stFs.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(stFs.netCashFlow)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                  {(displayedStatementAnalysis.analysisReport || Object.keys(stFs).length > 0) && (() => {
                    const report = displayedStatementAnalysis.analysisReport || {};
                    const aClass = (a) => a === 'Сайн' ? 'bg-green-50 text-green-700' : a === 'Хэвийн' ? 'bg-blue-50 text-blue-700' : a === 'Анхаарах' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                    const tblHead = 'border border-slate-200 px-2 py-1.5 bg-[#003B5C]/5 text-left font-semibold text-[#003B5C]';
                    const tblCell = 'border border-slate-200 px-2 py-1.5 text-slate-700';
                    return (
                    <div className="space-y-4">

                      {/* 1. Үзүүлэлт хүснэгт */}
                      {report.summaryRows?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">ҮЗҮҮЛЭЛТ</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              {report.summaryRows.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="border border-slate-200 px-3 py-1.5 text-slate-500 w-1/2">{row.label}</td>
                                  <td className="border border-slate-200 px-3 py-1.5 font-semibold text-slate-800">{row.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* 2. Орлогын шалгуур */}
                      {report.incomeScoring?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">ОРЛОГЫН ШАЛГУУР</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={`${tblHead} w-1/3`}>Шалгуур</th>
                                <th className={`${tblHead} w-24`}>Үнэлгээ</th>
                                <th className={tblHead}>Тайлбар</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.incomeScoring.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className={tblCell}>{row.criterion}</td>
                                  <td className="border border-slate-200 px-2 py-1.5">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${aClass(row.assessment)}`}>{row.assessment}</span>
                                  </td>
                                  <td className={tblCell}>{row.detail}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* 3. Орлогын хэнгилал */}
                      {report.incomeClassification?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">ОРЛОГЫН ХЭНГИЛАЛ</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={`${tblHead} w-1/3`}>Орлогын төрөл</th>
                                <th className={tblHead}>Давтамж</th>
                                <th className={`${tblHead} text-right`}>Нийт дүн (₮)</th>
                                <th className={`${tblHead} text-right`}>Нийт орлогод эзлэх хувь</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.incomeClassification.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className={tblCell}>{row.type}</td>
                                  <td className={tblCell}>{row.frequency}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold text-green-700">{formatMoney(row.totalAmount)}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-right">{row.sharePercent?.toFixed(1)}%</td>
                                </tr>
                              ))}
                              <tr className="bg-green-50 font-bold">
                                <td className="border border-slate-200 px-2 py-1.5" colSpan={2}>Нийт</td>
                                <td className="border border-slate-200 px-2 py-1.5 text-right text-green-700">{formatMoney(report.incomeClassification.reduce((s, r) => s + (r.totalAmount || 0), 0))}</td>
                                <td className="border border-slate-200 px-2 py-1.5 text-right">100%</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* 4. Зардлын ангилал */}
                      {report.expenseClassification?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">ЗАРДЛЫН АНГИЛАЛ</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={`${tblHead} w-1/3`}>Зардлын ангилал</th>
                                <th className={tblHead}>Давтамж</th>
                                <th className={`${tblHead} text-right`}>Нийт дүн (₮)</th>
                                <th className={`${tblHead} text-right`}>Нийт зарлагад эзлэх хувь</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.expenseClassification.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className={tblCell}>{row.category}</td>
                                  <td className={tblCell}>{row.frequency}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold text-red-700">{formatMoney(row.totalAmount)}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-right">{row.sharePercent?.toFixed(1)}%</td>
                                </tr>
                              ))}
                              <tr className="bg-red-50 font-bold">
                                <td className="border border-slate-200 px-2 py-1.5" colSpan={2}>Нийт</td>
                                <td className="border border-slate-200 px-2 py-1.5 text-right text-red-700">{formatMoney(report.expenseClassification.reduce((s, r) => s + (r.totalAmount || 0), 0))}</td>
                                <td className="border border-slate-200 px-2 py-1.5 text-right">100%</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* 5. Бусад хэв шинж */}
                      {report.behaviorPatterns && Object.values(report.behaviorPatterns).some(Boolean) && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">БУСАД ХЭВ ШИНЖ</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={`${tblHead} w-1/3`}>Хэв шинж</th>
                                <th className={tblHead}>Дүгнэлт</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { label: 'Орлогын хэв шинж', value: report.behaviorPatterns.incomePattern },
                                { label: 'Зарлагын хэв шинж', value: report.behaviorPatterns.expensePattern },
                                { label: 'Payroll cycle', value: report.behaviorPatterns.payrollCycle },
                                { label: 'Кассын хамаарал', value: report.behaviorPatterns.cashDependency },
                                { label: 'Owner-related урсгал', value: report.behaviorPatterns.ownerRelatedFlow },
                                { label: 'Cash buffer', value: report.behaviorPatterns.cashBuffer },
                              ].filter(r => r.value).map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className={tblCell}>{row.label}</td>
                                  <td className={tblCell}>{row.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* Notable Transactions */}
                      {displayedStatementAnalysis.notableTransactions?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-amber-600 px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">АНХААРАЛ ТАТАХ ГҮЙЛГЭЭ ({displayedStatementAnalysis.notableTransactions.length})</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={tblHead}>Огноо</th>
                                <th className={tblHead}>Тайлбар</th>
                                <th className={`${tblHead} text-right`}>Дүн</th>
                                <th className={tblHead}>Шалтгаан</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedStatementAnalysis.notableTransactions.map((nt, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                  <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap text-slate-600">{nt.date}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700">{nt.description}</td>
                                  <td className={`border border-slate-200 px-2 py-1.5 text-right font-semibold ${nt.direction === 'income' ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(nt.amount)}</td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-amber-700">{nt.flagReason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      )}

                      {/* 6. Скоринг */}
                      {report.creditScoring?.criteria?.length > 0 && (
                        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                          <div className="bg-[#003B5C] px-4 py-2">
                            <h5 className="text-white font-bold text-xs tracking-wide">СКОРИНГ</h5>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className={`${tblHead} w-1/2`}>Шалгуур</th>
                                <th className={tblHead}>Үнэлгээ</th>
                                <th className={`${tblHead} text-right`}>Оноо</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.creditScoring.criteria.map((c, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className={tblCell}>{c.criterion}</td>
                                  <td className="border border-slate-200 px-2 py-1.5">
                                    {c.assessment && <span className={`px-2 py-0.5 rounded text-xs font-bold ${aClass(c.assessment)}`}>{c.assessment}</span>}
                                  </td>
                                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold">{c.score}/{c.maxScore}</td>
                                </tr>
                              ))}
                              <tr className="bg-[#003B5C] text-white font-bold">
                                <td className="border border-[#003B5C]/30 px-2 py-2" colSpan={2}>Нийт скор</td>
                                <td className="border border-[#003B5C]/30 px-2 py-2 text-right text-lg">{report.creditScoring.totalScore}/{report.creditScoring.maxScore}</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                      )}
                    </div>
                    );
                  })()}

                  {(displayedStatementAnalysis.monthlySummary?.length > 0) && (
                    <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
                      <h5 className="font-bold text-[#003B5C] text-sm">Сарын задаргаа{stAccounts.length > 1 ? ` (${stAccounts.length} данс нийлсэн)` : ''}</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border px-2 py-1.5 text-left">Сар</th>
                              <th className="border px-2 py-1.5 text-right">Орлого</th>
                              <th className="border px-2 py-1.5 text-right">Зарлага</th>
                              <th className="border px-2 py-1.5 text-right">Цэвэр</th>
                              <th className="border px-2 py-1.5 text-right">Гүйлгээний тоо</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedStatementAnalysis.monthlySummary.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="border px-2 py-1.5 font-semibold">{row.month}</td>
                                <td className="border px-2 py-1.5 text-right text-green-700">{formatMoney(row.income)}</td>
                                <td className="border px-2 py-1.5 text-right text-red-700">{formatMoney(row.expense)}</td>
                                <td className={`border px-2 py-1.5 text-right font-semibold ${(row.income - row.expense) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {formatMoney(row.income - row.expense)}
                                </td>
                                <td className="border px-2 py-1.5 text-right text-slate-600">{row.transactionCount ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
                );
              })()}

              {/* Income / Expense + SI Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">Орлого / Зарлага</h4>
                  </div>
                  <div className="space-y-2">
                    <Field label="Сарын дундаж орлого">
                      <input type="text" value={form.averageMonthlyIncome ?? ''}
                        onChange={e => updateField('averageMonthlyIncome', e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                        placeholder="₮" />
                    </Field>
                    <Field label="Сарын дундаж зарлага">
                      <input type="text" value={form.averageMonthlyCost ?? ''}
                        onChange={e => updateField('averageMonthlyCost', e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                        placeholder="₮" />
                    </Field>
                    <Field label="Зээлийн сарын төлбөр">
                      <input type="text" value={form.monthlyDebtPayment ?? ''}
                        onChange={e => updateField('monthlyDebtPayment', e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C]"
                        placeholder="₮" />
                    </Field>
                  </div>
                  {displayedOutputs.incomeExpense && (
                    <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Чөлөөт мөнгөн урсгал (FCF)</span>
                        <span className={`font-bold ${(displayedOutputs.incomeExpense.freeCashFlow || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(displayedOutputs.incomeExpense.freeCashFlow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">DTI харьцаа</span>
                        <span className={`font-bold ${(displayedOutputs.incomeExpense.dti || 0) <= 40 ? 'text-green-700' : (displayedOutputs.incomeExpense.dti || 0) <= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                          {formatPercent(displayedOutputs.incomeExpense.dti)}
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">НД шинжилгээ</h4>
                  </div>
                  {siAnalysis ? (() => {
                    const siReport = siAnalysis.analysisReport || {};
                    const assessmentLabel = (a) => a === 'good' ? 'Сайн' : a === 'neutral' ? 'Хэвийн' : a === 'warning' ? 'Анхаарах' : 'Эрсдэл';
                    const assessmentClass = (a) => a === 'good' ? 'bg-green-50 text-green-700' : a === 'neutral' ? 'bg-blue-50 text-blue-700' : a === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                    return (
                    <div className="space-y-4">
                      {/* Quick stats */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Нийт даатгалын хугацаа', value: siAnalysis.totalInsuranceMonths ? `${siAnalysis.totalInsuranceMonths} сар` : '—' },
                          { label: 'Дундаж цалин', value: formatMoney(siAnalysis.averageSalary) },
                          { label: 'Сүүлийн цалин', value: formatMoney(siAnalysis.lastSalary) },
                          { label: 'Цалингийн хандлага', value: siAnalysis.salaryTrend || '—' },
                        ].map((r, i) => (
                          <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-500">{r.label}</p>
                            <p className="font-bold text-slate-800 text-sm">{r.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Narrative sections */}
                      {[
                        { num: 1, label: 'Хураангуй', text: siReport.summary || siAnalysis.summary },
                        { num: 2, label: 'Орлогын шинжилгээ', text: siReport.incomeAnalysis || siAnalysis.analysis },
                        { num: 3, label: 'Мөнгөн урсгалын шинж', text: siReport.cashFlowAnalysis },
                      ].filter(s => s.text).map(s => (
                        <div key={s.num} className="border-l-2 border-[#003B5C]/20 pl-4">
                          <p className="text-xs font-bold text-[#003B5C] mb-1">{s.num}. {s.label}</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{s.text}</p>
                        </div>
                      ))}

                      {/* Key Metrics */}
                      {siReport.keyMetrics?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[#003B5C] mb-2">4. Гүйцэтгэлийн үзүүлэлт</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="border px-2 py-1.5 text-left">Үзүүлэлт</th>
                                  <th className="border px-2 py-1.5 text-left">Утга</th>
                                  <th className="border px-2 py-1.5 text-left">Дүгнэлт</th>
                                </tr>
                              </thead>
                              <tbody>
                                {siReport.keyMetrics.map((m, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="border px-2 py-1.5 text-slate-600">{m.metric}</td>
                                    <td className="border px-2 py-1.5 font-semibold text-slate-800">{m.value}</td>
                                    <td className="border px-2 py-1.5">
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${assessmentClass(m.assessment)}`}>{assessmentLabel(m.assessment)}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Risk Flags */}
                      {siReport.riskFlags?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-bold text-red-700 mb-1">5. Эрсдэлийн дохио</p>
                          {siReport.riskFlags.map((flag, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                              <span className="shrink-0 mt-0.5">•</span><span>{flag}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendation */}
                      {siReport.creditRecommendation && (
                        <div className="bg-[#003B5C]/5 border border-[#003B5C]/10 rounded-xl p-3">
                          <p className="text-xs font-bold text-[#003B5C] mb-1">6. Зээлийн санал</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{siReport.creditRecommendation}</p>
                        </div>
                      )}

                      {/* Employer list */}
                      {siAnalysis.employers?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1.5">Ажил олгогчийн түүх</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100">
                                  <th className="border px-2 py-1.5 text-left">Байгууллага</th>
                                  <th className="border px-2 py-1.5 text-left">Хугацаа</th>
                                  <th className="border px-2 py-1.5 text-left">Сар</th>
                                </tr>
                              </thead>
                              <tbody>
                                {siAnalysis.employers.map((emp, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="border px-2 py-1.5 text-slate-700">{emp.name}</td>
                                    <td className="border px-2 py-1.5 text-slate-600 whitespace-nowrap">{emp.fromYear}/{emp.fromMonth} – {emp.toYear}/{emp.toMonth}</td>
                                    <td className="border px-2 py-1.5 font-semibold">{emp.monthCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Gap months */}
                      {!siAnalysis.isContinuous && siAnalysis.gapMonths?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-amber-700 mb-1">⚠ Тасралттай сарууд ({siAnalysis.gapMonths.length})</p>
                          <p className="text-xs text-amber-700">{siAnalysis.gapMonths.map(g => `${g.year}/${g.month}`).join(', ')}</p>
                        </div>
                      )}
                    </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Shield size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">НД мэдээлэл байхгүй</p>
                      <p className="text-xs mt-1">НД файл оруулж уншуулна уу</p>
                    </div>
                  )}
                </section>
              </div>


              {/* Guarantor income contribution */}
              {(displayedForm.guarantors || []).some(g => parseNumber(g.monthlyIncome) > 0) && (
                <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C] text-sm">Батлан даагч / Хамтрагчийн орлогын хувь нэмэр</h4>
                  </div>
                  <div className="space-y-2">
                    {(displayedForm.guarantors || []).filter(g => parseNumber(g.monthlyIncome) > 0).map((g, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                        <div>
                          <span className="font-semibold text-slate-700">{g.name || `Батлан даагч ${i + 1}`}</span>
                          <span className="ml-2 text-xs text-slate-400">{g.guarantorType || g.relationship || ''}</span>
                        </div>
                        <span className="font-bold text-green-700">{formatMoney(parseNumber(g.monthlyIncome))}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="font-bold text-slate-700">Нийт нэмэлт орлого</span>
                      <span className="font-black text-[#003B5C]">{formatMoney((displayedForm.guarantors || []).reduce((s, g) => s + parseNumber(g.monthlyIncome), 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Нийлсэн орлого (зээлдэгч + хамтрагч)</span>
                      <span className="font-black text-[#003B5C]">{formatMoney(
                        parseNumber(displayedForm.averageMonthlyIncome) +
                        (displayedForm.guarantors || []).reduce((s, g) => s + parseNumber(g.monthlyIncome), 0)
                      )}</span>
                    </div>
                  </div>
                </section>
              )}

            </div>
          )}

          {/* ===== TAB: summary ===== */}
          {researchTab === 'summary' && (
            <div className="space-y-6">

              {/* ============ COMPREHENSIVE PRINTABLE REPORT ============ */}
              <div className="space-y-4">
                {/* Print header - hidden on screen */}
                <div className="hidden print:block text-center py-3 border-b-2 border-[#003B5C]">
                  <h2 className="text-xl font-black text-[#003B5C]">ЗЭЭЛИЙН СУДАЛГААНЫ ДҮГНЭЛТ</h2>
                  <p className="text-sm text-slate-500 mt-1">Огноо: {new Date().toLocaleDateString('mn-MN')}</p>
                </div>

                {/* 1. Borrower profile */}
                <section className="bg-white border rounded-2xl shadow-sm p-5">
                  <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">1. Зээлдэгчийн мэдээлэл</h5>
                  <div className="flex gap-4 mb-4">
                    {displayedForm.profileImageUrl && (
                      <img src={displayedForm.profileImageUrl} className="w-20 h-24 object-cover rounded-lg border shrink-0" alt="Зураг" />
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1">
                      <div><span className="text-slate-500">Нэр:</span> <span className="font-semibold ml-1">{displayedOutputs.frontSheet?.borrowerName || '—'}</span></div>
                      <div><span className="text-slate-500">Регистр:</span> <span className="font-semibold ml-1">{displayedOutputs.frontSheet?.regNo || displayedForm.regNo || '—'}</span></div>
                      <div><span className="text-slate-500">Утас:</span> <span className="font-semibold ml-1">{displayedOutputs.frontSheet?.phone || displayedForm.phone || '—'}</span></div>
                      <div><span className="text-slate-500">Хаяг:</span> <span className="font-semibold ml-1">{displayedForm.address || '—'}</span></div>
                      <div><span className="text-slate-500">Ажил эрхлэлт:</span> <span className="font-semibold ml-1">{displayedForm.employment || '—'}</span></div>
                    </div>
                  </div>
                  {/* Existing loans */}
                  {(displayedForm.otherLoans || []).length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Өөр зээл / Өр төлбөр</p>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border px-2 py-1 text-left">Санхүүгийн байгууллага</th>
                            <th className="border px-2 py-1 text-left">Бүтээгдэхүүн</th>
                            <th className="border px-2 py-1 text-right">Зээлийн дүн</th>
                            <th className="border px-2 py-1 text-right">Үлдэгдэл</th>
                            <th className="border px-2 py-1 text-center">Ангилал</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(displayedForm.otherLoans || []).map((loan, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="border px-2 py-1">{loan.lender || '—'}</td>
                              <td className="border px-2 py-1">{loan.product || '—'}</td>
                              <td className="border px-2 py-1 text-right">{formatMoney(parseNumber(loan.amount))}</td>
                              <td className="border px-2 py-1 text-right font-semibold">{formatMoney(parseNumber(loan.balance))}</td>
                              <td className="border px-2 py-1 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  loan.classification === 'normal' ? 'bg-green-100 text-green-700' :
                                  loan.classification === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                                  loan.classification === 'substandard' ? 'bg-orange-100 text-orange-700' :
                                  loan.classification === 'doubtful' ? 'bg-red-100 text-red-700' :
                                  loan.classification === 'bad' ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-600'
                                }`}>{classificationLabels[loan.classification] || loan.classification || '—'}</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-bold text-xs">
                            <td className="border px-2 py-1" colSpan={3}>Нийт үлдэгдэл</td>
                            <td className="border px-2 py-1 text-right">{formatMoney((displayedForm.otherLoans || []).reduce((s, l) => s + parseNumber(l.balance), 0))}</td>
                            <td className="border px-2 py-1"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 2. Requested loan */}
                <section className="bg-white border rounded-2xl shadow-sm p-5">
                  <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">2. Одоо авах зээлийн мэдээлэл</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-slate-500">Зээлийн дүн:</span> <span className="font-bold text-[#003B5C] ml-1">{formatMoney(displayedOutputs.frontSheet?.requestedAmount || parseNumber(displayedForm.requestedAmount))}</span></div>
                    <div><span className="text-slate-500">Хугацаа:</span> <span className="font-semibold ml-1">{(displayedOutputs.frontSheet?.termMonths || displayedForm.termMonths) ? `${displayedOutputs.frontSheet?.termMonths || displayedForm.termMonths} сар` : '—'}</span></div>
                    <div><span className="text-slate-500">Сарын хүү:</span> <span className="font-semibold ml-1">{(displayedOutputs.frontSheet?.monthlyRate || displayedForm.monthlyRate) ? `${displayedOutputs.frontSheet?.monthlyRate || displayedForm.monthlyRate}%` : '—'}</span></div>
                    <div><span className="text-slate-500">Зориулалт:</span> <span className="font-semibold ml-1">{displayedOutputs.frontSheet?.purpose || displayedForm.purpose || '—'}</span></div>
                  </div>
                </section>

                {/* 3. Other loans from credit bureau */}
                <section className="bg-white border rounded-2xl shadow-sm p-5">
                  <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">3. Бусад зээлийн мэдээлэл</h5>
                  {(() => {
                    const cbRef = creditRefAnalysis;
                    const hasCBData = !!cbRef;
                    const activeLoansFromCB = hasCBData
                      ? (cbRef.primaryLoans || []).filter(l => (l.balance || 0) > 0)
                      : (displayedForm.otherLoans || []).filter(l => parseNumber(l.balance) > 0);
                    const hasLoans = activeLoansFromCB.length > 0;
                    const dataSource = hasCBData ? 'CB' : (displayedForm.otherLoans?.length > 0 ? 'form' : null);
                    return (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-xs font-semibold text-slate-500">Зээлийн мэдээллийн сан — өөр зээлтэй эсэх:</p>
                          {dataSource ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${hasLoans ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {hasLoans ? `Тийм (${activeLoansFromCB.length} зээл)` : 'Үгүй'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Зээлийн мэдээллийн сангийн лавлагаа байхгүй</span>
                          )}
                        </div>
                        {hasLoans && (
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border px-2 py-1 text-left">Байгууллага</th>
                                <th className="border px-2 py-1 text-left">Зээлийн төрөл</th>
                                <th className="border px-2 py-1 text-right">Дүн</th>
                                <th className="border px-2 py-1 text-right">Үлдэгдэл</th>
                                <th className="border px-2 py-1 text-center">Ангилал</th>
                                {hasCBData && <th className="border px-2 py-1 text-center">Эхлэх</th>}
                                {hasCBData && <th className="border px-2 py-1 text-center">Дуусах</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {activeLoansFromCB.map((loan, i) => {
                                const cls = hasCBData
                                  ? (loan.isOverdue ? (loan.overdueDays > 90 ? 'doubtful' : 'substandard') : 'normal')
                                  : (loan.classification || 'normal');
                                return (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="border px-2 py-1">{(hasCBData ? loan.institution : loan.lender) || '—'}</td>
                                    <td className="border px-2 py-1">{(hasCBData ? loan.loanType : loan.product) || '—'}</td>
                                    <td className="border px-2 py-1 text-right">{formatMoney(hasCBData ? loan.originalAmount : parseNumber(loan.amount))}</td>
                                    <td className="border px-2 py-1 text-right font-semibold">{formatMoney(hasCBData ? loan.balance : parseNumber(loan.balance))}</td>
                                    <td className="border px-2 py-1 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        cls === 'normal' ? 'bg-green-100 text-green-700' :
                                        cls === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                                        cls === 'substandard' ? 'bg-orange-100 text-orange-700' :
                                        cls === 'doubtful' ? 'bg-red-100 text-red-700' :
                                        'bg-red-200 text-red-800'
                                      }`}>{classificationLabels[cls] || cls}</span>
                                    </td>
                                    {hasCBData && <td className="border px-2 py-1 text-center text-slate-500">{loan.startDate || '—'}</td>}
                                    {hasCBData && <td className="border px-2 py-1 text-center text-slate-500">{loan.endDate || '—'}</td>}
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-100 font-bold">
                                <td className="border px-2 py-1" colSpan={3}>Нийт үлдэгдэл</td>
                                <td className="border px-2 py-1 text-right">
                                  {formatMoney(activeLoansFromCB.reduce((s, l) => s + (hasCBData ? (l.balance || 0) : parseNumber(l.balance)), 0))}
                                </td>
                                <td className="border px-2 py-1" colSpan={hasCBData ? 3 : 1}></td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })()}
                </section>

                {/* 4. Guarantors */}
                {(displayedOutputs.guarantorSummary?.items || []).length > 0 && (
                  <section className="bg-white border rounded-2xl shadow-sm p-5">
                    <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">4. Батлан даагч / Хамтран зээлдэгч</h5>
                    <div className="space-y-2">
                      {(displayedOutputs.guarantorSummary.items || []).map((g, i) => (
                        <div key={i} className="py-2 border-b border-slate-100 last:border-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                            <div><span className="text-slate-500">Нэр:</span> <span className="font-semibold ml-1">{g.name || '—'}</span></div>
                            <div><span className="text-slate-500">Төрөл:</span> <span className="font-semibold ml-1">{g.guarantorType || g.relationship || '—'}</span></div>
                            <div><span className="text-slate-500">Орлого:</span> <span className="font-bold text-green-700 ml-1">{formatMoney(parseNumber(g.monthlyIncome))}</span></div>
                            <div><span className="text-slate-500">Кредит скор:</span> <span className={`font-bold ml-1 ${parseNumber(g.creditScore) >= 700 ? 'text-green-700' : parseNumber(g.creditScore) >= 550 ? 'text-amber-600' : parseNumber(g.creditScore) > 0 ? 'text-red-600' : 'text-slate-400'}`}>{g.creditScore || '—'}</span></div>
                          </div>
                          {(g.collaterals || []).length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">Барьцаа: {(g.collaterals || []).map(c => {
                              const label = c.collateralType === 'vehicle'
                                ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
                                : (c.description || c.collateralType);
                              return `${label}${c.ownerRelation ? ` (${c.ownerRelation})` : ''} — ${formatMoney(parseNumber(c.estimatedValue))}`;
                            }).join(' | ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 5. Loan calculation */}
                {(displayedOutputs.incomeExpense?.monthlyPayment || 0) > 0 && (
                  <section className="bg-white border rounded-2xl shadow-sm p-5">
                    <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">5. Зээлийн тооцоолол</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500">Сарын төлбөр</p>
                        <p className="font-black text-[#003B5C] text-base">{formatMoney(displayedOutputs.incomeExpense.monthlyPayment)}</p>
                      </div>
                      {(displayedOutputs.amortizationRows?.length > 0) && (() => {
                        const totalInterest = displayedOutputs.amortizationRows.reduce((s, r) => s + (r.interest || 0), 0);
                        const totalPaid = displayedOutputs.amortizationRows.reduce((s, r) => s + (r.payment || 0), 0);
                        return (<>
                          <div className="bg-amber-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500">Нийт хүүгийн зардал</p>
                            <p className="font-black text-amber-700 text-base">{formatMoney(totalInterest)}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500">Нийт эргэн төлөлт</p>
                            <p className="font-black text-green-700 text-base">{formatMoney(totalPaid)}</p>
                          </div>
                        </>);
                      })()}
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-slate-500">Хугацаа</p>
                        <p className="font-black text-slate-700 text-base">{displayedOutputs.frontSheet?.termMonths || '—'} сар</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* 6. Income analysis */}
                <section className="bg-white border rounded-2xl shadow-sm p-5">
                  <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">6. Орлогын дүгнэлт</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-3">
                    <div><span className="text-slate-500">Сарын орлого:</span> <span className="font-bold text-green-700 ml-1">{formatMoney(displayedOutputs.incomeExpense?.income)}</span></div>
                    <div><span className="text-slate-500">Сарын зарлага:</span> <span className="font-bold text-red-700 ml-1">{formatMoney(displayedOutputs.incomeExpense?.cost)}</span></div>
                    <div><span className="text-slate-500">FCF:</span> <span className={`font-bold ml-1 ${(displayedOutputs.incomeExpense?.freeCashFlow || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(displayedOutputs.incomeExpense?.freeCashFlow)}</span></div>
                    <div><span className="text-slate-500">DTI:</span> <span className={`font-bold ml-1 ${(displayedOutputs.incomeExpense?.dti || 0) <= 40 ? 'text-green-700' : (displayedOutputs.incomeExpense?.dti || 0) <= 60 ? 'text-amber-600' : 'text-red-700'}`}>{formatPercent(displayedOutputs.incomeExpense?.dti)}</span></div>
                  </div>
                  {/* Bank statement data */}
                  {(() => {
                    const stFs = displayedStatementAnalysis?.frontSheet || {};
                    const stAccounts = displayedStatementAnalysis?.accounts || [];
                    if (!stFs.totalIncome) return null;
                    return (
                      <div className="space-y-2 border-t pt-2">
                        <p className="text-xs font-semibold text-slate-600">
                          Дансны хуулга — {stFs.bankName || ''} {stFs.periodStart && stFs.periodEnd ? `(${stFs.periodStart} – ${stFs.periodEnd}, ${stFs.coveredMonths} сар)` : ''}
                        </p>
                        {stAccounts.length > 1 ? (
                          <table className="w-full text-xs border-collapse">
                            <thead><tr className="bg-slate-100"><th className="border px-2 py-1 text-left">Данс</th><th className="border px-2 py-1 text-right">Орлого</th><th className="border px-2 py-1 text-right">Зарлага</th><th className="border px-2 py-1 text-right">Цэвэр</th></tr></thead>
                            <tbody>
                              {stAccounts.map((acc, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="border px-2 py-1">{acc.accountNumber || acc.label}</td>
                                  <td className="border px-2 py-1 text-right text-green-700">{formatMoney(acc.totalIncome)}</td>
                                  <td className="border px-2 py-1 text-right text-red-700">{formatMoney(acc.totalExpense)}</td>
                                  <td className={`border px-2 py-1 text-right font-semibold ${acc.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(acc.netCashFlow)}</td>
                                </tr>
                              ))}
                              <tr className="bg-slate-100 font-bold"><td className="border px-2 py-1">Нийт</td><td className="border px-2 py-1 text-right text-green-700">{formatMoney(stFs.totalIncome)}</td><td className="border px-2 py-1 text-right text-red-700">{formatMoney(stFs.totalExpense)}</td><td className={`border px-2 py-1 text-right ${(stFs.netCashFlow||0)>=0?'text-green-700':'text-red-700'}`}>{formatMoney(stFs.netCashFlow)}</td></tr>
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span>Нийт орлого: <b className="text-green-700">{formatMoney(stFs.totalIncome)}</b></span>
                            <span>Нийт зарлага: <b className="text-red-700">{formatMoney(stFs.totalExpense)}</b></span>
                            <span>Дундаж/сар: <b className="text-[#003B5C]">{formatMoney(stFs.averageMonthlyIncome)}</b></span>
                          </div>
                        )}
                        {stFs.keyRisks && <p className="text-xs text-amber-700 mt-1">⚠ {stFs.keyRisks}</p>}
                      </div>
                    );
                  })()}
                  {siAnalysis?.averageSalary > 0 && (
                    <div className="flex flex-wrap gap-4 text-sm mt-2 border-t pt-2">
                      <span>НД дундаж цалин: <b className="text-green-700">{formatMoney(siAnalysis.averageSalary)}</b></span>
                      {(siAnalysis.totalInsuranceMonths || siAnalysis.employmentMonths) > 0 && (
                        <span>НД хугацаа: <b>{siAnalysis.totalInsuranceMonths || siAnalysis.employmentMonths} сар</b></span>
                      )}
                    </div>
                  )}
                  {(displayedOutputs.guarantorSummary?.totalIncome || 0) > 0 && (
                    <div className="flex flex-wrap gap-4 text-sm mt-2 border-t pt-2">
                      <span>Хамтрагчийн нэмэлт орлого: <b className="text-blue-700">{formatMoney(displayedOutputs.guarantorSummary.totalIncome)}</b></span>
                      <span>Нийлсэн орлого: <b className="text-[#003B5C]">{formatMoney((displayedOutputs.incomeExpense?.income || 0) + displayedOutputs.guarantorSummary.totalIncome)}</b></span>
                    </div>
                  )}
                </section>

                {/* 7. Collateral */}
                {((displayedOutputs.collateral?.items || []).length > 0 || (displayedOutputs.guarantorSummary?.items || []).some(g => (g.collaterals || []).length > 0)) && (
                  <section className="bg-white border rounded-2xl shadow-sm p-5">
                    <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">7. Барьцаа хөрөнгө</h5>
                    {(displayedOutputs.collateral?.items || []).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Зээлдэгчийн барьцаа</p>
                        {displayedOutputs.collateral.items.map((c, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                            <span>
                              {c.collateralType === 'vehicle'
                                ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
                                : (c.description || c.collateralType)}
                              {c.ownerRelation && <span className="text-slate-400 text-xs ml-1">({c.ownerRelation})</span>}
                            </span>
                            <span className="font-semibold text-[#003B5C]">{formatMoney(parseNumber(c.estimatedValue))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(displayedOutputs.guarantorSummary?.items || []).filter(g => (g.collaterals || []).length > 0).map((g, gi) => (
                      <div key={gi} className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">{g.name || `Батлан даагч ${gi+1}`}-ийн барьцаа</p>
                        {(g.collaterals || []).map((c, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                            <span>
                              {c.collateralType === 'vehicle'
                                ? ((c.hasPlate ?? 'yes') === 'yes' && c.plateNumber ? c.plateNumber : 'Дугааргүй')
                                : (c.description || c.collateralType)}
                              {c.ownerRelation && <span className="text-slate-400 text-xs ml-1">({c.ownerRelation})</span>}
                            </span>
                            <span className="font-semibold text-blue-700">{formatMoney(parseNumber(c.estimatedValue))}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Нийт барьцаа</p>
                        <p className="font-black text-[#003B5C]">{formatMoney(displayedOutputs.collateral?.combinedValue ?? displayedOutputs.collateral?.totalValue)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Зээлийн дүн</p>
                        <p className="font-black text-slate-700">{formatMoney(displayedOutputs.frontSheet?.requestedAmount)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">LTV</p>
                        <p className={`font-black ${(displayedOutputs.collateral?.combinedCoverage || 0) >= 1.5 ? 'text-green-700' : (displayedOutputs.collateral?.combinedCoverage || 0) >= 1.0 ? 'text-amber-600' : 'text-red-700'}`}>
                          {(displayedOutputs.collateral?.combinedValue || 0) > 0 && (displayedOutputs.frontSheet?.requestedAmount || 0) > 0
                            ? `${(displayedOutputs.frontSheet.requestedAmount / displayedOutputs.collateral.combinedValue * 100).toFixed(1)}%`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* 8. Score summary */}
                <section className="bg-white border rounded-2xl shadow-sm p-5">
                  <h5 className="font-bold text-[#003B5C] text-sm mb-3 pb-2 border-b">8. Кредит оноо ба үнэлгээ</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className={`rounded-xl p-3 text-center ${(displayedOutputs.creditScore?.calculatedScore || 0) >= 70 ? 'bg-green-50' : (displayedOutputs.creditScore?.calculatedScore || 0) >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-slate-500">Front Sheet оноо</p>
                      <p className={`font-black text-2xl ${(displayedOutputs.creditScore?.calculatedScore || 0) >= 70 ? 'text-green-700' : (displayedOutputs.creditScore?.calculatedScore || 0) >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{displayedOutputs.creditScore?.calculatedScore ?? '—'}</p>
                      <p className="text-xs text-slate-400">/ 100</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${(parseNumber(displayedForm.creditScore) || 0) >= 700 ? 'bg-green-50' : (parseNumber(displayedForm.creditScore) || 0) >= 580 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <p className="text-xs text-slate-500">Кредит скор</p>
                      <p className={`font-black text-2xl ${(parseNumber(displayedForm.creditScore) || 0) >= 700 ? 'text-green-700' : (parseNumber(displayedForm.creditScore) || 0) >= 580 ? 'text-amber-700' : 'text-slate-600'}`}>{displayedForm.creditScore || '—'}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${(displayedOutputs.incomeExpense?.freeCashFlow || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-slate-500">FCF</p>
                      <p className={`font-black text-lg ${(displayedOutputs.incomeExpense?.freeCashFlow || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(displayedOutputs.incomeExpense?.freeCashFlow)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${(displayedOutputs.incomeExpense?.dti || 0) <= 40 ? 'bg-green-50' : (displayedOutputs.incomeExpense?.dti || 0) <= 60 ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-slate-500">DTI</p>
                      <p className={`font-black text-2xl ${(displayedOutputs.incomeExpense?.dti || 0) <= 40 ? 'text-green-700' : (displayedOutputs.incomeExpense?.dti || 0) <= 60 ? 'text-amber-700' : 'text-red-700'}`}>{formatPercent(displayedOutputs.incomeExpense?.dti)}</p>
                    </div>
                  </div>
                  {(() => {
                    const d = displayedOutputs.creditScore?.decision;
                    const rationale = outputs.creditScore?.decisionRationale;
                    if (!d) return null;
                    const isGood = d === 'Судалгааг үргэлжлүүлэх боломжтой';
                    const isRisk = d === 'Эрсдэл өндөр, дахин үнэлгээ хийх шаардлагатай';
                    return (
                      <div className={`rounded-xl p-4 mb-4 border ${isGood ? 'bg-green-50 border-green-200' : isRisk ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <p className={`font-bold text-sm mb-2 ${isGood ? 'text-green-800' : isRisk ? 'text-red-800' : 'text-amber-800'}`}>{d}</p>
                        {(rationale?.reasons?.length > 0) && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Шалтгаан / үндэслэл:</p>
                            <ul className="space-y-1">
                              {rationale.reasons.map((r, i) => (
                                <li key={i} className="flex gap-2 text-xs text-slate-700">
                                  <span className={`shrink-0 mt-0.5 ${isGood ? 'text-green-500' : isRisk ? 'text-red-500' : 'text-amber-500'}`}>•</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(rationale?.docs?.length > 0) && (
                          <div>
                            <p className="text-xs font-semibold text-slate-600 mb-1">Шаардлагатай нэмэлт баримт / мэдээлэл:</p>
                            <ul className="space-y-1">
                              {rationale.docs.map((doc, i) => (
                                <li key={i} className="flex gap-2 text-xs text-slate-700">
                                  <span className="shrink-0 mt-0.5 text-[#003B5C]">→</span>
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Score breakdown with reasons */}
                  {(displayedOutputs.creditScore?.scoreBreakdown?.length > 0) && (
                    <div className="mt-3 space-y-2">
                      {displayedOutputs.creditScore.scoreBreakdown.map((item, i) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-700 w-40 shrink-0">{item.label}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div className={`${item.color || 'bg-[#003B5C]'} h-1.5 rounded-full`} style={{ width: `${Math.min(100, item.max > 0 ? (item.value / item.max) * 100 : 0)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 w-12 text-right">{item.value} / {item.max}</span>
                          </div>
                          {item.reason && (
                            <p className="text-[11px] text-slate-500 pl-[10.5rem]">{item.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Analyst decision display (print-visible) */}
                {(form.analystDecision || selectedResearch?.analystDecision) && (
                  <section className={`border-2 rounded-2xl p-5 space-y-3 ${
                    (form.analystDecision || selectedResearch?.analystDecision) === 'approve' ? 'border-green-300 bg-green-50' :
                    (form.analystDecision || selectedResearch?.analystDecision) === 'reject' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} className={(form.analystDecision || selectedResearch?.analystDecision) === 'approve' ? 'text-green-600' : (form.analystDecision || selectedResearch?.analystDecision) === 'reject' ? 'text-red-600' : 'text-amber-600'} />
                      <div>
                        <p className="font-black text-lg">{ANALYST_DECISIONS[form.analystDecision || selectedResearch?.analystDecision]?.label || 'Шийдвэр'}</p>
                        {(selectedResearch?.conditions || form.conditions) && (
                          <p className="text-sm text-slate-600 mt-0.5">{selectedResearch?.conditions || form.conditions}</p>
                        )}
                      </div>
                    </div>
                    {((selectedResearch?.riskFlags || form.riskFlags) || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {((selectedResearch?.riskFlags || form.riskFlags) || []).map(flag => (
                          <span key={flag} className="px-2 py-1 rounded-lg text-xs bg-red-100 text-red-700 font-semibold">{flag}</span>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* Analyst Opinion (always editable) */}
              <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-[#003B5C]" />
                  <div>
                    <h4 className="font-bold text-[#003B5C]">Зээлийн ажилтны санал, дүгнэлт</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Зээлийн ажилтны нэгдсэн дүгнэлт, тайлбар</p>
                  </div>
                </div>
                <textarea
                  value={form.analystOpinion ?? ''}
                  onChange={e => updateField('analystOpinion', e.target.value)}
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C] resize-none"
                  placeholder="Зээлдэгчийн орлого, өрийн ачаалал, барьцаа хөрөнгийн байдал болон нийт эрсдлийн үнэлгээний талаарх ажилтны нэгдсэн дүгнэлтийг бичнэ үү..." />
              </section>

              {/* Analyst Decision Form (editing only — hidden when printing) */}
              {!embeddedMode && !selectedResearch && (
                <section className="bg-white border rounded-2xl shadow-sm p-6 space-y-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-[#003B5C]" />
                    <h4 className="font-bold text-[#003B5C]">Шинжээчийн шийдвэр</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ANALYST_DECISIONS).map(([key, d]) => (
                        <button key={key} type="button"
                          onClick={() => updateField('analystDecision', key)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                            form.analystDecision === key
                              ? 'border-[#003B5C] bg-[#003B5C] text-white shadow'
                              : 'border-slate-200 text-slate-600 hover:border-[#003B5C] hover:text-[#003B5C]'
                          }`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <Field label="Нөхцөл / Шаардлага">
                      <textarea value={form.conditions ?? ''}
                        onChange={e => updateField('conditions', e.target.value)}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003B5C]/30 focus:border-[#003B5C] resize-none"
                        placeholder="Зээл олгох нөхцөл, шаардлагыг оруулна уу..." />
                    </Field>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Эрсдлийн тэмдэглэгээ</label>
                      <div className="flex flex-wrap gap-2">
                        {RISK_FLAGS.map(flag => (
                          <button key={flag} type="button"
                            onClick={() => {
                              const current = form.riskFlags || [];
                              const updated = current.includes(flag)
                                ? current.filter(f => f !== flag)
                                : [...current, flag];
                              updateField('riskFlags', updated);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              (form.riskFlags || []).includes(flag)
                                ? 'border-red-400 bg-red-50 text-red-700'
                                : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600'
                            }`}>
                            {flag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Similar Loans (hidden when printing) */}
              {similarLoans?.length > 0 && (
                <section className="bg-white border rounded-2xl shadow-sm p-5 space-y-3 print:hidden">
                  <div className="flex items-center gap-2">
                    <Search size={15} className="text-[#003B5C]" />
                    <h5 className="font-bold text-[#003B5C] text-sm">Ижил төстэй зээлүүд</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border px-2 py-1.5 text-left">Зээлдэгч</th>
                          <th className="border px-2 py-1.5 text-right">Дүн</th>
                          <th className="border px-2 py-1.5 text-right">Хугацаа</th>
                          <th className="border px-2 py-1.5 text-right">Хүү</th>
                          <th className="border px-2 py-1.5 text-center">Шийдвэр</th>
                        </tr>
                      </thead>
                      <tbody>
                        {similarLoans.map((loan, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="border px-2 py-1.5 font-semibold">{loan.borrowerName || '-'}</td>
                            <td className="border px-2 py-1.5 text-right">{formatMoney(loan.loanAmount)}</td>
                            <td className="border px-2 py-1.5 text-right">{loan.termMonths ? `${loan.termMonths} сар` : '-'}</td>
                            <td className="border px-2 py-1.5 text-right">{loan.monthlyRate ? `${loan.monthlyRate}%` : '-'}</td>
                            <td className="border px-2 py-1.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                loan.analystDecision === 'approve' ? 'bg-green-100 text-green-700' :
                                loan.analystDecision === 'reject' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>{ANALYST_DECISIONS[loan.analystDecision]?.label || '-'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}


            </div>
          )}

        </div>
      </div>
    )}
  </div>
);
};

export default LoanResearch;
