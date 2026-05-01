// ─── Shared form field definitions ────────────────────────────────────────────
// Энэ файлд нэмэлт/устгал хийхэд АЛЬ АЛЬ form автоматаар дагана:
//   • loan-frontend/src/LoanApplicationDetail.jsx  (loan.scm.mn)
//   • frontend/src/components/LoanRequest.jsx      (www.scm.mn)
//
// Field shape: { key, label, type?, required?, placeholder?, options?, col?, upper? }
//   type:    'text'(default) | 'date' | 'tel' | 'email' | 'number' | 'select' | 'choice'
//   col:     2 → full-width (col-span-2) field, default 1
//   upper:   true → uppercase input
//   options: array of strings for select/choice types
// ─────────────────────────────────────────────────────────────────────────────

import { EMPLOYMENT_TYPES, EMPLOYEE_RANGES, REVENUE_RANGES } from './loanFormConfig.js';

// ── Иргэний үндсэн мэдээлэл ──────────────────────────────────────────────────
export const INDIVIDUAL_FIELDS = [
  { key: 'lastName',     label: 'Овог',              type: 'text',   required: true, placeholder: 'БАТБАЯР' },
  { key: 'firstName',    label: 'Нэр',               type: 'text',   required: true, placeholder: 'БОЛД' },
  { key: 'fatherName',   label: 'Эцэг/эхийн нэр',   type: 'text' },
  { key: 'regNo',        label: 'Регистрийн дугаар', type: 'text',   required: true, placeholder: 'УУ80010101', upper: true },
  { key: 'dob',          label: 'Төрсөн огноо',      type: 'date' },
  { key: 'gender',       label: 'Хүйс',              type: 'select', options: ['Эрэгтэй', 'Эмэгтэй'] },
  { key: 'idIssueDate',  label: 'ИҮ олгосон огноо',  type: 'date' },
  { key: 'idExpiryDate', label: 'ИҮ дуусах огноо',   type: 'date' },
  { key: 'phone',        label: 'Утас',              type: 'tel',    required: true, placeholder: '9900 0000' },
  { key: 'email',        label: 'И-мэйл',            type: 'email',  placeholder: 'email@mail.com' },
  { key: 'address',      label: 'Бүртгэлийн хаяг',  type: 'text',   required: true, placeholder: 'УБ, БЗД...', col: 2 },
];

// ── Ажил эрхлэлт & орлого ────────────────────────────────────────────────────
export const EMPLOYMENT_FIELDS = [
  { key: 'employmentType', label: 'Ажлын байрны төрөл',       type: 'select', options: EMPLOYMENT_TYPES },
  { key: 'employer',       label: 'Ажлын байр / Байгууллага', type: 'text' },
  { key: 'employedSince',  label: 'Ажилд орсон огноо',        type: 'date' },
  { key: 'monthlyIncome',  label: 'Сарын орлого ₮',           type: 'number', placeholder: '1,000,000' },
  { key: 'incomeSource',   label: 'Орлогын эх сурвалж',       type: 'choice', options: ['Цалингийн орлого', 'Бизнесийн орлого'] },
];

// ── Байгууллагын мэдээлэл ─────────────────────────────────────────────────────
export const ORG_FIELDS = [
  { key: 'orgName',      label: 'Байгууллагын нэр (бүрэн)',    type: 'text',   required: true, col: 2 },
  { key: 'orgRegNo',     label: 'Регистр (7 орон)',             type: 'text',   required: true },
  { key: 'legalForm',    label: 'Хуулийн хэлбэр (ХХК г.м.)',   type: 'text' },
  { key: 'foundedDate',  label: 'Байгуулагдсан огноо',          type: 'date' },
  { key: 'industry',     label: 'Үйл ажиллагааны чиглэл',      type: 'text' },
  { key: 'employeeCount',label: 'Ажилчдын тоо',                type: 'select', options: EMPLOYEE_RANGES },
  { key: 'revenueRange', label: 'Жилийн орлого',               type: 'select', options: REVENUE_RANGES },
  { key: 'orgAddress',   label: 'Байгууллагын хаяг',           type: 'text' },
];

// ── Холбоо барих ажилтан ──────────────────────────────────────────────────────
export const CONTACT_PERSON_FIELDS = [
  { key: 'contactName',     label: 'Нэр',          type: 'text', required: true },
  { key: 'contactPosition', label: 'Албан тушаал', type: 'text' },
  { key: 'contactPhone',    label: 'Утас',         type: 'tel',  required: true },
];

// ── Барьцаа: тээврийн хэрэгсэл ───────────────────────────────────────────────
export const COLLATERAL_VEHICLE_FIELDS = [
  { key: 'plateNumber',             label: 'Улсын дугаар' },
  { key: 'vehicleType',             label: 'Хэрэгслийн төрөл' },
  { key: 'make',                    label: 'Марк' },
  { key: 'model',                   label: 'Загвар' },
  { key: 'year',                    label: 'Он' },
  { key: 'color',                   label: 'Өнгө' },
  { key: 'engineNumber',            label: 'Хөдөлгүүрийн дугаар' },
  { key: 'chassisNumber',           label: 'Арлын дугаар' },
  { key: 'technicalPassportNumber', label: 'Техникийн паспорт №' },
  { key: 'ownerName',               label: 'Эзэмшигчийн нэр' },
  { key: 'ownerRegNo',              label: 'Эзэмшигчийн РД' },
  { key: 'ownerRelation',           label: 'Зээлдэгчтэй харилцаа', type: 'select', options: ['Өөрөө', 'Гэр бүл', 'Гуравдагч этгээд'] },
];

// ── Барьцаа: үл хөдлөх хөрөнгө ───────────────────────────────────────────────
export const COLLATERAL_REALESTATE_FIELDS = [
  { key: 'certificateNumber', label: 'Гэрчилгээний дугаар' },
  { key: 'propertyType',      label: 'Хөрөнгийн төрөл' },
  { key: 'district',          label: 'Дүүрэг' },
  { key: 'khoroo',            label: 'Хороо' },
  { key: 'blockNumber',       label: 'Байрны дугаар' },
  { key: 'apartmentNumber',   label: 'Тасалгааны дугаар' },
  { key: 'address',           label: 'Хаяг', col: 2 },
  { key: 'area',              label: 'Талбай (м²)' },
  { key: 'landArea',          label: 'Газрын талбай' },
  { key: 'buildingYear',      label: 'Барилга баригдсан он' },
  { key: 'ownerName',         label: 'Эзэмшигчийн нэр' },
  { key: 'ownerRegNo',        label: 'Эзэмшигчийн РД' },
  { key: 'ownerRelation',     label: 'Зээлдэгчтэй харилцаа', type: 'select', options: ['Өөрөө', 'Гэр бүл', 'Гуравдагч этгээд'] },
];

// ── Батлан даагч / хамтран зээлдэгч ──────────────────────────────────────────
export const GUARANTOR_FIELDS = [
  { key: 'lastName',   label: 'Овог' },
  { key: 'firstName',  label: 'Нэр' },
  { key: 'fatherName', label: 'Эцэг/эхийн нэр' },
  { key: 'regNo',      label: 'Регистр' },
  { key: 'phone',      label: 'Утас', type: 'tel' },
  { key: 'address',    label: 'Хаяг' },
];
