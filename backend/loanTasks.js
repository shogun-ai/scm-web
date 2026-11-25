// Loan request task management (design: docs/design/loan-task-management.md, ADR 0004).
// Legacy LoanRequest documents are never rewritten: new endpoints only write task* fields (+ `assignee`, D5).
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { LOAN_PRODUCTS, PRODUCTS_MAP } from '../shared/loanFormConfig.js';
import {
  LOAN_WIDGETS_VERSION, PRESET_WIDGETS, WIDGET_GROUPS, LIMITS, FILE_FORMATS, STORAGE_FIELD_LABELS,
  resolveSteps, validateConfig, validateAnswers, fileRulesFor, presetFileRule, mirrorAnswers, buildDefaultConfig, YESNO_OPTIONS,
  isSubProductLive, subProductStatus, ubDate, storageFieldToPresetKey,
} from '../shared/loanWidgets.js';
import {
  TASK_STATUSES, TERMINAL_TASK_STATUSES, deriveTaskState, taskStatusFilter, allowedTaskActions, validateTaskAction, TaskActionError, DOC_REQUEST_ONLY_MESSAGE,
} from '../shared/loanTaskStatus.js';
import { IntakeError, createIntakeLimiter, isRequestManager, isRequestStaff, rejectOversizedBody, taskLockBlocks } from './loanIntake.js';
import * as emails from './loanTaskEmails.js';
import { isValidEmailAddress } from './mailer.js';
import { resolvePermissions } from '../shared/permissions.js';
import { fileRefOf, fileProxyPath, isProxyableFile } from './loanFiles.js';

const { Schema } = mongoose;
const Mixed = Schema.Types.Mixed;

// ---------- Schema additions (no defaults: legacy docs must not materialize new values) ----------
const TaskHistorySchema = new Schema({
  at: Date,
  type: { type: String }, // created|assigned|unassigned|status|reopened|docs_requested|note|file_added|email|message
  from: String, to: String, outcome: String, note: String,
  items: { type: [String], default: undefined },
  assignee: { userId: String, name: String },
  actor: { userId: String, name: String, system: Boolean },
  email: { template: String, result: String },
}, { _id: true });

const TaskFileSchema = new Schema({
  fieldName: String, fieldKey: String, fileName: String, fileUrl: String, mimeType: String, size: Number,
  publicId: String, deliveryType: String, resourceType: String, format: String, label: String, source: String, linkId: String,
  uploadedBy: { userId: String, name: String }, uploadedAt: Date,
}, { _id: true });

const UploadLinkSchema = new Schema({
  tokenHash: String,
  items: { type: [new Schema({ key: String, label: String }, { _id: false })], default: undefined },
  note: String, expiresAt: Date, createdAt: Date, revokedAt: Date,
  createdBy: { userId: String, name: String },
}, { _id: true });

export const LOAN_TASK_SCHEMA_FIELDS = {
  formVersion: { type: String, immutable: true },
  taskStatus: { type: String, enum: TASK_STATUSES },
  taskOutcome: { type: Mixed },
  taskRevision: { type: Number },
  taskUpdatedAt: { type: Date },
  taskAssignedAt: { type: Date },
  taskForm: { type: Mixed },
  taskAnswers: { type: Mixed },
  taskHistory: { type: [TaskHistorySchema], default: undefined },
  taskFiles: { type: [TaskFileSchema], default: undefined },
  taskUploadLinks: { type: [UploadLinkSchema], default: undefined },
  // D18/D23: submission channel ('web' | 'messenger' | 'webchat'); `messenger` ({ psid, postId }) is never exposed in list/detail DTOs.
  channel: { type: String, enum: ['web', 'messenger', 'webchat'] },
  messenger: { type: Mixed },
};

export const LOAN_TASK_INDEXES = [
  [{ taskStatus: 1, createdAt: -1 }],
  [{ 'assignee.userId': 1, createdAt: -1 }],
  [{ 'taskForm.productKey': 1, createdAt: -1 }],
  [{ 'taskUploadLinks.tokenHash': 1 }, { sparse: true }],
];

export function applyLoanTaskSchema(schema) {
  schema.add(LOAN_TASK_SCHEMA_FIELDS);
  for (const [fields, options] of LOAN_TASK_INDEXES) schema.index(fields, options);
  return schema;
}

// ---------- Helpers ----------
export class HttpError extends Error {
  constructor(message, status = 400, { code, errors } = {}) { super(message); this.status = status; if (code) this.code = code; this.errors = errors || {}; }
}

export const LEGACY_LOAN_POST_GONE_MESSAGE = 'Энэ хаяг хаагдсан. /api/loans/quick ашиглана уу.';
// D9: the unprotected legacy public POST /api/loans is closed.
export function legacyLoanPostGone(_req, res) {
  res.status(410).json({ error: LEGACY_LOAN_POST_GONE_MESSAGE, message: LEGACY_LOAN_POST_GONE_MESSAGE });
}

// Legacy /api/loans/:id guard (defined in loanIntake.js so PATCH /api/loan-requests/:id shares it).
export { taskLockBlocks };

// Legacy write routes (PUT /api/loans/:id, POST /api/loans/staff) must never write task-flow fields:
// those are owned by the task endpoints (state machine, revision, audit, hashed upload links).
const LEGACY_BLOCKED_ROOTS = new Set([...Object.keys(LOAN_TASK_SCHEMA_FIELDS), 'fileDetails', 'fileNames', 'intakeVersion', '__proto__', 'constructor', 'prototype']);
export function sanitizeLegacyLoanWrite(body, { allowAssignee = false } = {}) {
  const out = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out;
  for (const key of Object.keys(body)) {
    const root = key.split('.')[0];
    if (key.startsWith('$') || LEGACY_BLOCKED_ROOTS.has(root) || /^task/i.test(root) || (!allowAssignee && root === 'assignee')) continue;
    out[key] = body[key];
  }
  return out;
}

// Private loan documents are uploaded to this Cloudinary folder (type: authenticated).
export const PRIVATE_FILE_FOLDER = 'scm_loan_private';
export const FILE_URL_TTL_SECONDS = 600;
export const isPrivateLoanPublicId = id => typeof id === 'string' && id.length <= 300 && id.startsWith(`${PRIVATE_FILE_FOLDER}/`) && !id.includes('..');
export function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
// Staff-facing file URL, generated at read time: private files get a short-lived signed download URL;
// authenticated files outside the private folder are never signed; other legacy files keep an http(s) URL only.
export function fileDownloadUrl(file, { cloudinary, now = new Date(), ttlSeconds = FILE_URL_TTL_SECONDS } = {}) {
  if (!file || typeof file !== 'object') return '';
  if (file.deliveryType === 'authenticated') {
    if (!isPrivateLoanPublicId(file.publicId) || typeof cloudinary?.utils?.private_download_url !== 'function') return '';
    return cloudinary.utils.private_download_url(file.publicId, typeof file.format === 'string' ? file.format : '', {
      resource_type: file.resourceType === 'image' ? 'image' : 'raw', type: 'authenticated', attachment: false,
      expires_at: Math.floor(now.getTime() / 1000) + ttlSeconds,
    });
  }
  return safeHttpUrl(file.fileUrl);
}

export function detectFileFormat(buffer) {
  if (!buffer || typeof buffer.subarray !== 'function' || buffer.length < 4) return null;
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

const SAFE_KEY = /^[a-z0-9_]{1,60}$/;
const errorKey = key => (typeof key === 'string' && SAFE_KEY.test(key) && key !== '__proto__' ? key : '_files');

// rules: { [fieldname]: { formats, maxBytes, maxFiles, required, label } }
export function validateTaskFiles(files, rules, { requireRequired = true, maxTotal = LIMITS.filesTotal, maxBytesTotal = LIMITS.bytesTotal } = {}) {
  const list = Array.isArray(files) ? files : [];
  const errors = {};
  const byKey = {};
  if (list.length > maxTotal) errors._files = `Нийт ${maxTotal} хүртэл файл оруулна уу.`;
  let total = 0;
  for (const file of list) {
    const key = file?.fieldname;
    if (typeof key !== 'string' || !Object.hasOwn(rules, key)) { errors[errorKey(key)] = 'Зөвшөөрөгдөөгүй файлын талбар.'; continue; }
    const rule = rules[key];
    (byKey[key] ||= []).push(file);
    const size = Buffer.isBuffer(file.buffer) ? file.buffer.length : 0;
    total += size;
    if (!size) errors[key] = 'Хоосон файл оруулах боломжгүй.';
    else if (size > rule.maxBytes) errors[key] = `Файл тус бүр ${Math.round(rule.maxBytes / 1048576)} МБ-аас бага байна.`;
    else {
      const format = detectFileFormat(file.buffer);
      if (!format || !rule.formats.includes(format) || FILE_FORMATS[format] !== file.mimetype) errors[key] = `Зөвхөн ${rule.formats.map(item => item.toUpperCase()).join(', ')} файл оруулна уу.`;
    }
  }
  for (const [key, items] of Object.entries(byKey)) if (items.length > rules[key].maxFiles && !errors[key]) errors[key] = `${rules[key].maxFiles} хүртэл файл оруулна уу.`;
  if (total > maxBytesTotal) errors._files = `Нийт файлын хэмжээ ${Math.round(maxBytesTotal / 1048576)} МБ-аас хэтрэхгүй.`;
  if (requireRequired) for (const [key, rule] of Object.entries(rules)) if (rule.required && !byKey[key]?.length && !errors[key]) errors[key] = `"${rule.label}" файл заавал оруулна.`;
  return { errors, byKey };
}

export const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const SUB_ID_RE = /^[a-z0-9-]{2,40}$/;
const CUSTOM_KEY_RE = /^cf_[a-z0-9_]{1,40}$/;
const PRODUCT_KEYS = new Set(LOAN_PRODUCTS.map(product => product.id));
// D23: ProductContent keys that map onto LOAN_PRODUCTS variants (the web form offers a choice) and the trust product are never CMS-only form products.
const CMS_EXCLUDED_KEYS = new Set(['car_loan', 'trust']);
const CMS_KEY_RE = /^[A-Za-z0-9_-]{1,50}$/;
// Cloudinary authenticated raw files referenced by a loan (applicant fileDetails + staff/link taskFiles), de-duplicated.
export function deletablePublicIds(loan) {
  const all = [...(Array.isArray(loan?.fileDetails) ? loan.fileDetails : []), ...(Array.isArray(loan?.taskFiles) ? loan.taskFiles : [])];
  return [...new Set(all.filter(file => typeof file?.publicId === 'string' && file.publicId && (isPrivateLoanPublicId(file.publicId) || file.deliveryType === 'authenticated')).map(file => file.publicId))];
}
const str = (value, max = 300) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MB = 1024 * 1024;
const LIST_FIELDS = '_id applicationReference userType firstname lastname orgName contactName phone contactPhone selectedProduct amount term status taskStatus taskOutcome assignee formVersion taskForm.productKey taskForm.productName taskForm.subProductId taskForm.subProductName channel createdAt taskUpdatedAt taskRevision';
const STAFF_FILE_RULE = { formats: Object.keys(FILE_FORMATS), maxBytes: LIMITS.fileMaxMb * MB, maxFiles: 5, required: false };
const LINK_UPLOAD_CAP = 30;

const actorOf = user => ({ userId: String(user?._id || ''), name: String(user?.name || user?.email || 'Ажилтан'), system: false });
const SYSTEM_ACTOR = { name: 'Систем', system: true };
const isAssigneeOf = (user, loan) => Boolean(loan?.assignee?.userId) && String(loan.assignee.userId) === String(user?._id || '');
const revisionCondition = rev => (rev === 0 ? { taskRevision: { $in: [0, null] } } : { taskRevision: rev });
const snapshotSteps = loan => (loan?.formVersion === 'task-v1' && Array.isArray(loan?.taskForm?.steps) ? loan.taskForm.steps : null);

// File rule for a request field key: snapshot field (task-v1) -> preset registry -> 'additional'.
export function fileRuleForLoan(loan, key) {
  if (typeof key !== 'string') return null;
  const steps = snapshotSteps(loan);
  if (steps) {
    const rules = fileRulesFor(steps);
    if (Object.hasOwn(rules, key)) return rules[key];
  }
  // Free-text items from "request additional documents" (frontend sends extra_1..extra_10).
  const extra = /^extra_(10|[1-9])$/.exec(key);
  if (extra) {
    const base = presetFileRule('additional');
    return base ? { ...base, label: `Нэмэлт баримт ${extra[1]}` } : null;
  }
  return presetFileRule(key);
}

// Human labels for choice answers (select / multiselect / yesno) of a task-v1 snapshot: { [fieldKey]: string }.
export function answerLabelsFor(steps, answers) {
  const out = {};
  if (!Array.isArray(steps) || !answers || typeof answers !== 'object') return out;
  for (const step of steps) {
    for (const field of Array.isArray(step?.fields) ? step.fields : []) {
      if (!field?.key || !Object.hasOwn(answers, field.key)) continue;
      const answer = answers[field.key];
      const options = field.type === 'yesno' ? YESNO_OPTIONS : (Array.isArray(field.options) ? field.options : null);
      if (!options || !['select', 'multiselect', 'yesno'].includes(field.type)) continue;
      const labelOf = item => options.find(option => option.value === String(item))?.label || String(item);
      if (field.type === 'multiselect') { if (Array.isArray(answer)) out[field.key] = answer.map(labelOf).join(', '); }
      else if (answer !== undefined && answer !== null && answer !== '') out[field.key] = labelOf(answer);
    }
  }
  return out;
}

function fieldLabel(loan, fieldKey, fieldName) {
  const steps = snapshotSteps(loan);
  if (steps && fieldKey) {
    for (const step of steps) for (const field of step.fields || []) if (field.key === fieldKey) return field.label;
  }
  if (fieldKey) {
    const preset = PRESET_WIDGETS.find(item => item.key === fieldKey);
    if (preset) return preset.label;
  }
  return (fieldName && STORAGE_FIELD_LABELS[fieldName]) || fieldName || '';
}

export function toTaskListItem(loan, { canDelete = false } = {}) {
  const state = deriveTaskState(loan);
  const isTaskForm = loan.formVersion === 'task-v1';
  const productKey = (isTaskForm && loan.taskForm?.productKey) || loan.selectedProduct || null;
  const displayName = loan.userType === 'organization'
    ? (loan.orgName || loan.contactName || '')
    : [loan.lastname, loan.firstname].filter(Boolean).join(' ') || loan.orgName || '';
  return {
    _id: String(loan._id),
    applicationReference: loan.applicationReference || '',
    displayName,
    phone: loan.phone || loan.contactPhone || '',
    productKey,
    productName: (isTaskForm && loan.taskForm?.productName) || PRODUCTS_MAP[productKey] || productKey || '',
    subProductId: isTaskForm ? (loan.taskForm?.subProductId || null) : null,
    subProductName: isTaskForm ? (loan.taskForm?.subProductName || null) : null,
    amount: loan.amount ?? null,
    term: loan.term ?? null,
    taskStatus: state.taskStatus,
    taskStatusSource: state.source,
    legacyStatus: state.legacyStatus,
    outcome: state.outcome,
    assignee: loan.assignee?.userId ? { userId: String(loan.assignee.userId), name: loan.assignee.name || '' } : null,
    isTaskForm,
    channel: CHANNELS.includes(loan.channel) ? loan.channel : 'web',
    createdAt: loan.createdAt || null,
    taskUpdatedAt: loan.taskUpdatedAt || null,
    taskRevision: loan.taskRevision || 0,
    canDelete: Boolean(canDelete),
  };
}

// D17: overlay fine-grained permissions on the role-derived action set. perms = Set of granted keys.
export function allowedActionsWithPermissions(loan, user, perms) {
  const isAssignee = isAssigneeOf(user, loan);
  const worker = allowedTaskActions(loan, { manager: perms.has('loan_requests.view_all'), isAssignee });
  const full = allowedTaskActions(loan, { manager: true, isAssignee });
  return {
    assign: perms.has('loan_requests.assign'),
    transitions: perms.has('loan_requests.change_status') ? worker.transitions : [],
    reopen: perms.has('loan_requests.reopen') && full.reopen,
    note: worker.note && perms.has('loan_requests.notes_files'),
    requestDocs: worker.requestDocs && perms.has('loan_requests.request_docs'),
    uploadFiles: worker.uploadFiles && perms.has('loan_requests.notes_files'),
    message: worker.note && perms.has('loan_requests.message'),
  };
}

export function toTaskDetail(loan, user, { now = new Date(), assigneeNotifyEmail = '', perms = null, canDelete = false } = {}) {
  const base = toTaskListItem(loan, { canDelete });
  const state = deriveTaskState(loan);
  const terminal = TERMINAL_TASK_STATUSES.includes(state.taskStatus);
  const links = Array.isArray(loan.taskUploadLinks) ? loan.taskUploadLinks : [];
  // Free-text extra_N items: the requested label lives on the file (new) or on its upload link item (older files).
  const requestedLabel = file => {
    if (typeof file.label === 'string' && file.label) return file.label;
    if (!file.linkId || !file.fieldKey) return '';
    const link = links.find(item => String(item._id) === String(file.linkId));
    return link?.items?.find(item => item.key === file.fieldKey)?.label || '';
  };
  // D22: Cloudinary URLs are never returned; `url` is the authenticated proxy path (GET .../files/:fileRef).
  const fileOut = (file, source, kind, index) => {
    const fieldKey = file.fieldKey || storageFieldToPresetKey(file.fieldName) || (CUSTOM_KEY_RE.test(file.fieldName || '') ? file.fieldName : null);
    const ref = fileRefOf(kind, file, index);
    return {
      id: String(file._id || ''), ref, source, fieldName: file.fieldName || '', fieldKey, label: requestedLabel(file) || fieldLabel(loan, fieldKey, file.fieldName),
      fileName: file.fileName || '', mimeType: file.mimeType || '', size: file.size ?? null, url: isProxyableFile(file) ? fileProxyPath(loan._id, ref) : '', uploadedAt: file.uploadedAt || null,
    };
  };
  const steps = snapshotSteps(loan);
  const outcome = state.source === 'task'
    ? (loan.taskOutcome?.code ? { code: loan.taskOutcome.code, note: loan.taskOutcome.note || '', at: loan.taskOutcome.at || null, by: { name: loan.taskOutcome.by?.name || '' } } : null)
    : state.outcome;
  return {
    ...base,
    ...(base.assignee && assigneeNotifyEmail ? { assignee: { ...base.assignee, notifyEmail: assigneeNotifyEmail } } : {}),
    outcome,
    applicant: {
      name: loan.userType === 'organization' || (!loan.firstname && !loan.lastname && loan.orgName) ? String(loan.orgName || loan.contactName || '') : [loan.lastname, loan.firstname].filter(Boolean).join(' '),
      userType: loan.userType || 'individual', lastname: loan.lastname || '', firstname: loan.firstname || '', regNo: loan.regNo || '',
      phone: loan.phone || '', email: loan.email || '', address: loan.address || '', orgName: loan.orgName || '', contactName: loan.contactName || '',
    },
    request: { amount: loan.amount ?? null, term: loan.term ?? null, purpose: loan.purpose || '', repaymentSource: loan.repaymentSource || '' },
    taskForm: steps ? {
      productKey: loan.taskForm.productKey, productName: loan.taskForm.productName || '', subProductId: loan.taskForm.subProductId || null,
      subProductName: loan.taskForm.subProductName || null, configVersion: loan.taskForm.configVersion ?? null, steps,
    } : null,
    answers: steps ? (loan.taskAnswers || {}) : null,
    answerLabels: steps ? answerLabelsFor(steps, loan.taskAnswers || {}) : null,
    files: [
      ...(Array.isArray(loan.fileDetails) ? loan.fileDetails : []).map((file, index) => fileOut(file, 'applicant', 'fd', index)),
      ...(Array.isArray(loan.taskFiles) ? loan.taskFiles : []).map((file, index) => fileOut(file, file.source === 'applicant_link' ? 'applicant_link' : 'staff', 'tf', index)),
    ],
    history: (Array.isArray(loan.taskHistory) ? loan.taskHistory : []).map(item => ({
      id: String(item._id || ''), at: item.at || null, type: item.type || '', from: item.from || null, to: item.to || null,
      note: item.note || '', outcome: item.outcome || null, items: Array.isArray(item.items) ? item.items : [],
      assignee: item.assignee && item.assignee.userId !== undefined ? { userId: item.assignee.userId || '', name: item.assignee.name || '' } : null,
      actor: item.actor ? { name: item.actor.name || '', system: Boolean(item.actor.system) } : null,
      email: item.email?.template ? { template: item.email.template, result: item.email.result || '' } : null,
    })),
    uploadLinks: links.map(link => ({
      id: String(link._id || ''), items: (link.items || []).map(item => ({ key: item.key, label: item.label })), note: link.note || '',
      expiresAt: link.expiresAt || null, createdAt: link.createdAt || null, createdBy: { name: link.createdBy?.name || '' },
      active: !link.revokedAt && new Date(link.expiresAt).getTime() > now.getTime() && !terminal,
    })),
    taskRevision: loan.taskRevision || 0,
    allowedActions: perms ? allowedActionsWithPermissions(loan, user, perms) : allowedTaskActions(loan, { manager: isRequestManager(user), isAssignee: isAssigneeOf(user, loan) }),
  };
}

function taskApplicationData(mirror, value, fileDetails, { productKey, subProductId, at }) {
  const collaterals = [];
  for (const [type, fieldNames] of [['vehicle', ['file_car_photos', 'file_car_cert']], ['real_estate', ['file_prop_map', 'file_prop_cert', 'file_cadastre']]]) {
    const files = fileDetails.filter(file => fieldNames.includes(file.fieldName));
    if (files.length) collaterals.push({ type, files, fields: {}, valuation: {}, notes: '', auditLog: [] });
  }
  // D11: collateral_types (multiselect) feeds the legacy single collateralType when collateral_type is absent.
  const collateralTypes = Array.isArray(value.collateral_types) ? value.collateral_types : [];
  const collateralType = value.collateral_type || ['real_estate', 'vehicle'].find(type => collateralTypes.includes(type)) || 'none';
  return {
    borrowerType: mirror.userType,
    borrower: {
      firstName: mirror.firstname || '', lastName: mirror.lastname || '', phone: mirror.phone || '', email: mirror.email || '',
      ...(value.register_number ? { regNo: value.register_number } : {}),
      ...(value.birth_date ? { birthDate: value.birth_date } : {}),
      ...(value.address ? { address: value.address } : {}),
    },
    org: { orgName: mirror.orgName || '', contactName: mirror.contactName || '', contactPhone: mirror.contactPhone || '', email: mirror.email || '' },
    loanRequest: {
      product: productKey, amount: mirror.amount !== undefined ? String(mirror.amount) : '', term: mirror.term !== undefined ? String(mirror.term) : '',
      purpose: mirror.purpose || '', repaymentSource: mirror.repaymentSource || '', collateralType,
    },
    collaterals,
    guarantors: [],
    otherLoans: value.other_loans?.hasActiveLoans ? value.other_loans.loans.map(loan => ({ source: 'self_declared', ...loan })) : [],
    creditBureau: {},
    incomeResearch: { bankStatementAnalyses: [], socialInsuranceAnalysis: null },
    consents: { dataProcessing: true, acceptedAt: at },
    intake: { version: 'task-v1', productKey, subProductId: subProductId || null, documentsOptional: true },
  };
}

// D12: products without a saved LoanFormConfig use the default form as an active, unsaved config (version 0)
// unless LOAN_TASKS_DEFAULT_CONFIG='false' (rollback: unsaved products fall back to the legacy form).
export const defaultConfigsEnabled = env => env?.LOAN_TASKS_DEFAULT_CONFIG !== 'false';
export function defaultActiveConfig(productKey, env = {}) {
  const assignee = typeof env.LOAN_TASKS_DEFAULT_ASSIGNEE_ID === 'string' && OBJECT_ID_RE.test(env.LOAN_TASKS_DEFAULT_ASSIGNEE_ID) ? env.LOAN_TASKS_DEFAULT_ASSIGNEE_ID : '';
  return { ...buildDefaultConfig(productKey), isActive: true, defaultAssigneeId: assignee, version: 0, isDefault: true };
}
// Saved config wins (even isActive:false); otherwise the D12 default when enabled; otherwise undefined.
export function effectiveConfig(configs, productKey, env = {}) {
  const saved = (Array.isArray(configs) ? configs : []).find(item => item.productKey === productKey);
  if (saved) return saved;
  return defaultConfigsEnabled(env) ? defaultActiveConfig(productKey, env) : undefined;
}

function toAdminConfig(doc, productKey, now, env = {}, name = PRODUCTS_MAP[productKey] || productKey) {
  const source = doc || (defaultConfigsEnabled(env) ? defaultActiveConfig(productKey, env) : { ...buildDefaultConfig(productKey), version: 0 });
  return {
    productKey,
    isDefault: !doc,
    name,
    isActive: Boolean(source.isActive),
    baseProductEnabled: source.baseProductEnabled !== false,
    defaultAssigneeId: source.defaultAssigneeId || '',
    version: source.version ?? 0,
    steps: Array.isArray(source.steps) ? source.steps : [],
    subProducts: (Array.isArray(source.subProducts) ? source.subProducts : []).map(sub => ({ ...sub, status: subProductStatus(sub, now) })),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy?.name ? { name: doc.updatedBy.name } : null,
  };
}

const liveSubProducts = (config, now) => (Array.isArray(config?.subProducts) ? config.subProducts : [])
  .filter(sub => isSubProductLive(sub, now))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Active config with nothing live (base product off, no live sub product): the product is closed, not legacy.
export function isPublicProductClosed(config, now) {
  return Boolean(config?.isActive) && config.baseProductEnabled === false && liveSubProducts(config, now).length === 0;
}
export const PRODUCT_CLOSED_MESSAGE = 'Одоогоор хүсэлт хүлээн авахгүй байна.';

function toPublicProduct(config, now, name = PRODUCTS_MAP[config?.productKey] || config?.productKey) {
  if (!config?.isActive) return null;
  const subProducts = liveSubProducts(config, now).map(sub => ({
    id: sub.id, name: sub.name, description: sub.description || '', endDate: sub.endDate || null,
    steps: resolveSteps(sub.inheritSteps === false ? sub.steps : config.steps),
  }));
  const baseProductEnabled = config.baseProductEnabled !== false;
  if (!baseProductEnabled && !subProducts.length) return null;
  return {
    productKey: config.productKey, name, configVersion: config.version ?? 0,
    source: config.isDefault ? 'default' : 'saved',
    baseProductEnabled, steps: baseProductEnabled ? resolveSteps(config.steps) : [], subProducts,
  };
}

// ---------- D18: in-chat (Messenger) application ----------
export const CHANNELS = ['web', 'messenger', 'webchat'];
const MESSENGER_PSID_RE = /^\d{5,30}$/;
const MESSENGER_POST_RE = /^[A-Za-z0-9_-]{1,100}$/;
const MESSENGER_STEPS = resolveSteps([{
  id: 'messenger', title: 'Messenger хүсэлт', description: '',
  fields: [{ kind: 'preset', key: 'full_name', required: true }, { kind: 'preset', key: 'phone', required: true }, { kind: 'preset', key: 'loan_amount', required: true }, { kind: 'preset', key: 'loan_term', required: true }],
}]);

export function validateMessengerInput(input) {
  const value = input && typeof input === 'object' ? input : {};
  const errors = {};
  const lastname = str(value.lastname, 100);
  const firstname = str(value.firstname, 100);
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const psid = typeof value.psid === 'string' ? value.psid : '';
  const postId = typeof value.postId === 'string' && value.postId ? value.postId : '';
  // D21: a CMS-only ProductContent key (not in LOAN_PRODUCTS) is accepted together with its name (the caller is scmMessenger, never a public route).
  const productName = typeof value.productName === 'string' ? value.productName.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const cmsProduct = !PRODUCT_KEYS.has(value.productKey) && typeof value.productKey === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(value.productKey) && Boolean(productName);
  if (!PRODUCT_KEYS.has(value.productKey) && !cmsProduct) errors.productKey = 'Бүтээгдэхүүн буруу байна.';
  if (!firstname) errors.firstname = 'Нэрээ оруулна уу.';
  if (!/^\d{8}$/.test(phone)) errors.phone = 'Утасны дугаар 8 оронтой байна.';
  if (!Number.isSafeInteger(value.amount) || value.amount < 1 || value.amount > 1e12) errors.amount = 'Дүн буруу байна.';
  if (!Number.isInteger(value.term) || value.term < 1 || value.term > 120) errors.term = 'Хугацаа 1–120 сар байна.';
  if (!MESSENGER_PSID_RE.test(psid)) errors.psid = 'Messenger хэрэглэгч буруу байна.';
  if (postId && !MESSENGER_POST_RE.test(postId)) errors.postId = 'Пост буруу байна.';
  if (Object.keys(errors).length) throw new HttpError('Мэдээллээ шалгана уу.', 400, { code: 'INVALID_INPUT', errors });
  return { productKey: value.productKey, ...(cmsProduct ? { productName } : {}), lastname, firstname, phone, amount: value.amount, term: value.term, psid, postId };
}

// Pure: the LoanRequest constructor payload for an in-chat application (task-v1, channel 'messenger').
// `source` stays 'web' (legacy enum); the channel lives in `channel` + `messenger`.
export function buildMessengerTaskDoc({ input, config, assignee = null, history = [], at, productName }) {
  const answers = { full_name: { lastName: input.lastname, firstName: input.firstname }, phone: input.phone, loan_amount: input.amount, loan_term: input.term };
  const mirror = mirrorAnswers(answers, { productKey: input.productKey });
  const taskStatus = assignee ? 'assigned' : 'new';
  const events = [{ at, type: 'created', to: taskStatus, actor: { name: 'Messenger', system: true } }];
  if (assignee) events.push({ at, type: 'assigned', to: 'assigned', assignee, actor: SYSTEM_ACTOR });
  events.push(...history);
  const application = taskApplicationData(mirror, answers, [], { productKey: input.productKey, subProductId: null, at });
  return {
    ...mirror,
    status: assignee ? 'assigned' : 'pending',
    intakeVersion: 'quick-v1',
    formVersion: 'task-v1',
    source: 'web',
    channel: 'messenger',
    messenger: { psid: input.psid, ...(input.postId ? { postId: input.postId } : {}) },
    createdByStaff: false,
    ...(assignee ? { assignee, taskAssignedAt: at } : {}),
    fileDetails: [],
    fileNames: [],
    applicationData: { ...application, intake: { ...application.intake, channel: 'messenger' } },
    taskForm: { productKey: input.productKey, productName, subProductId: null, subProductName: null, configVersion: config.version ?? 0, widgetsVersion: LOAN_WIDGETS_VERSION, steps: MESSENGER_STEPS },
    taskAnswers: answers,
    taskStatus,
    taskHistory: events,
    taskRevision: 0,
    taskUpdatedAt: at,
  };
}

// ---------- Routes ----------
export function registerLoanTaskRoutes({
  app, multer, cloudinary, LoanRequest, LoanFormConfig, User, ProductContent, authenticateUser, requireAdmin, createLog = async () => {},
  mailer, automate, env = process.env, now = () => new Date(), getCompanyPhone = async () => '',
  schedule = setImmediate, randomBytes = crypto.randomBytes, logger = console,
  getPermissions = async user => resolvePermissions(user), getDeleteEnabled = async () => false,
  getAssignmentSettings = async () => null,
}) {
  const enabled = () => env.LOAN_TASKS_ENABLED === 'true';
  const ensureEnabled = (_req, res, next) => (enabled() ? next() : res.status(503).json({ message: 'Энэ үйлчилгээ түр идэвхгүй байна.', code: 'DISABLED' }));
  // D17: permissions are resolved once per request into req.perms (role defaults + saved matrix); failures fall back to role defaults.
  const loadPerms = async req => {
    if (req.perms) return req.perms;
    try { req.perms = await getPermissions(req.user); } catch { req.perms = resolvePermissions(req.user); }
    return req.perms;
  };
  const requireStaff = async (req, res, next) => {
    const perms = await loadPerms(req);
    return perms.has('loan_requests.view_all') || perms.has('loan_requests.view_assigned') ? next() : res.status(403).json({ message: 'Хүсэлт харах эрхгүй байна.' });
  };
  const requirePerm = (req, key, message = 'Энэ үйлдлийг хийх эрхгүй байна.') => {
    if (!req.perms?.has(key)) throw new HttpError(message, 403, { code: 'FORBIDDEN' });
  };
  const viewsAll = req => Boolean(req.perms?.has('loan_requests.view_all'));
  const scopeOf = req => (viewsAll(req) ? {} : { 'assignee.userId': String(req.user?._id || '') });
  const deleteEnabled = async () => { try { return (await getDeleteEnabled()) === true; } catch { return false; } };
  const canDeleteFor = async req => Boolean(req.perms?.has('loan_requests.delete')) && (await deleteEnabled());
  const submitLimiter = createIntakeLimiter({ max: Number.parseInt(env.LOAN_TASK_SUBMIT_MAX, 10) || 5 });
  const linkUploadLimiter = createIntakeLimiter({ max: Number.parseInt(env.LOAN_TASK_UPLOAD_MAX, 10) || 20 });
  const linkReadLimiter = createIntakeLimiter({ max: 300 });
  const adminUrl = () => env.ADMIN_APP_URL || 'https://www.scm.mn/admin';
  const uploadBaseUrl = () => (env.LOAN_UPLOAD_BASE_URL || 'https://www.scm.mn/loan-request').replace(/[?#].*$/, '');

  // Declared-size cap before multer buffers anything: file bytes + answers JSON + multipart overhead margin.
  const MULTIPART_MARGIN = LIMITS.answersJsonBytes + MB;
  const guardMultipartSize = rejectOversizedBody(LIMITS.bytesTotal + MULTIPART_MARGIN, `Нийт файлын хэмжээ ${Math.round(LIMITS.bytesTotal / MB)} МБ-аас хэтрэхгүй.`);
  const parseSubmit = multer({ storage: multer.memoryStorage(), limits: { files: LIMITS.filesTotal, fileSize: LIMITS.fileMaxMb * MB, fields: 8, fieldSize: LIMITS.answersJsonBytes, parts: 24 } }).any();
  const parseStaffFiles = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: LIMITS.fileMaxMb * MB, fields: 2, fieldSize: 200, parts: 8 } }).any();
  const parseLinkFiles = multer({ storage: multer.memoryStorage(), limits: { files: LIMITS.filesTotal, fileSize: LIMITS.fileMaxMb * MB, fields: 2, fieldSize: 200, parts: 14 } }).any();

  const fail = (res, error) => {
    const known = error instanceof HttpError || error instanceof TaskActionError || error instanceof IntakeError;
    const status = known && Number.isInteger(error.status) ? error.status : 500;
    if (status === 500) logger.error?.(`[loan-tasks] unexpected error name=${error?.name || 'Error'}`);
    const errors = known && error.errors && Object.keys(error.errors).length ? { errors: error.errors } : {};
    res.status(status).json({ message: status === 500 ? 'Хүсэлтийг боловсруулахад алдаа гарлаа.' : error.message, ...(known && error.code ? { code: error.code } : {}), ...errors });
  };
  const notFound = () => new HttpError('Хүсэлт олдсонгүй.', 404);
  const validId = id => {
    if (!OBJECT_ID_RE.test(id || '')) throw new HttpError('Хүсэлтийн ID буруу байна.', 400);
    return id;
  };

  // persistUrl: only public-submit fileDetails keep a stored signed URL, because legacy consumers
  // (old LOS view, AI intake automation) read fileDetails[].fileUrl. Task files store publicId only and
  // get a short-lived URL at read time (fileDownloadUrl).
  const uploadPrivate = (file, fieldName, { persistUrl = false } = {}) => new Promise((resolve, reject) => {
    const format = detectFileFormat(file.buffer);
    const stream = cloudinary.uploader.upload_stream({ folder: PRIVATE_FILE_FOLDER, resource_type: 'raw', type: 'authenticated' }, (error, result) => (error ? reject(error) : resolve({
      fieldName, fileName: String(file.originalname || 'file').slice(0, 200),
      ...(persistUrl ? { fileUrl: cloudinary.url(result.public_id, { resource_type: 'raw', type: 'authenticated', sign_url: true, secure: true }) } : {}),
      publicId: result.public_id, deliveryType: 'authenticated', resourceType: 'raw', format: typeof result.format === 'string' ? result.format : '',
      mimeType: FILE_FORMATS[format] || file.mimetype, size: file.buffer.length,
    })));
    stream.end(file.buffer);
  });
  const destroyAll = persisted => Promise.allSettled(persisted.map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw', type: 'authenticated' })));

  const recordEmail = async (loanId, template, result) => {
    try {
      await LoanRequest.updateOne({ _id: loanId }, { $push: { taskHistory: { at: now(), type: 'email', email: { template, result }, actor: SYSTEM_ACTOR } } });
    } catch { logger.error?.('[loan-tasks] email history write failed'); }
  };
  // build() -> { to, subject, text, html, template, reference } | null. Never affects the HTTP response.
  const deliver = (loanId, build) => {
    schedule(async () => {
      try {
        const message = await build();
        if (!message) return;
        const outcome = message.to && mailer?.send ? await mailer.send(message) : { result: 'skipped' };
        await recordEmail(loanId, message.template, outcome?.result || 'failed');
      } catch { logger.error?.('[loan-tasks] email pipeline failed'); }
    });
  };
  const companyPhone = async () => { try { return String((await getCompanyPhone()) || ''); } catch { return ''; } };
  const staffEmail = async userId => {
    if (!OBJECT_ID_RE.test(userId || '')) return '';
    const staff = await User.findById(userId).select('email notificationEmail isActive').lean();
    if (!staff?.isActive) return '';
    const preferred = typeof staff.notificationEmail === 'string' ? staff.notificationEmail.trim() : '';
    return preferred || (typeof staff.email === 'string' ? staff.email : '');
  };
  const findActiveStaff = async id => {
    if (!OBJECT_ID_RE.test(id || '')) return null;
    const staff = await User.findById(id).select('_id name email notificationEmail role roles isActive').lean();
    return staff?.isActive && isRequestStaff(staff) ? staff : null;
  };

  // Default assignee (product config) -> { assignee, history }; an inactive default leaves the task unassigned with a system note.
  const resolveDefaultAssignee = async (defaultAssigneeId, productKey, at) => {
    let assignee = null;
    const history = [];
    if (defaultAssigneeId) {
      const staff = await findActiveStaff(defaultAssigneeId);
      if (staff) assignee = { userId: String(staff._id), name: staff.name || '' };
      else {
        logger.warn?.(`[loan-tasks] default assignee unavailable product=${productKey}`);
        history.push({ at, type: 'note', note: 'Анхдагч хариуцагч идэвхгүй тул автоматаар хуваарилаагүй.', actor: SYSTEM_ACTOR });
      }
    } else {
      // D25: no product-level receiver configured -> the global "auto" assignment setting (loan) applies.
      let setting = null;
      try { setting = (await getAssignmentSettings())?.loan || null; } catch { setting = null; }
      if (setting?.mode === 'auto' && setting.staffId) {
        const staff = await findActiveStaff(setting.staffId);
        if (staff) assignee = { userId: String(staff._id), name: staff.name || '' };
        else {
          logger.warn?.('[loan-tasks] auto assignee unavailable');
          history.push({ at, type: 'note', note: 'Автомат хуваарилалтын ажилтан идэвхгүй тул хуваарилаагүй.', actor: SYSTEM_ACTOR });
        }
      }
    }
    return { assignee, history };
  };

  // Public config cache (single instance; TTL bounds staleness across instances).
  let cache = { at: 0, list: null };
  const loadConfigs = async () => {
    const time = now().getTime();
    if (cache.list && time - cache.at < 30000) return cache.list;
    const list = await LoanFormConfig.find({}).lean();
    cache = { at: time, list: Array.isArray(list) ? list : [] };
    return cache.list;
  };
  const invalidateConfigs = () => { cache = { at: 0, list: null }; cmsCache = { at: 0, list: null }; };

  // D23: active CMS-only loan products (ProductContent) -> [{ productKey, name }]; cached 30 s, failures degrade to an empty list.
  let cmsCache = { at: 0, list: null };
  const loadCmsProducts = async () => {
    if (!ProductContent?.find) return [];
    const time = now().getTime();
    if (cmsCache.list && time - cmsCache.at < 30000) return cmsCache.list;
    let list = [];
    try {
      const docs = await ProductContent.find({ isActive: true }).select('productKey title order').sort({ order: 1 }).limit(50).lean();
      list = (Array.isArray(docs) ? docs : []).map(doc => ({ productKey: typeof doc?.productKey === 'string' ? doc.productKey : '', name: typeof doc?.title === 'string' ? doc.title.replace(/\s+/g, ' ').trim().slice(0, 80) : '' }))
        .filter(item => CMS_KEY_RE.test(item.productKey) && item.name && !PRODUCT_KEYS.has(item.productKey) && !CMS_EXCLUDED_KEYS.has(item.productKey));
    } catch { logger.warn?.('[loan-tasks] cms products unavailable'); list = []; }
    cmsCache = { at: time, list };
    return list;
  };
  // -> { productKey, name, cms } | null (LOAN_PRODUCTS id or an active CMS-only ProductContent key).
  const resolveProduct = async key => {
    if (typeof key !== 'string') return null;
    if (PRODUCT_KEYS.has(key)) return { productKey: key, name: PRODUCTS_MAP[key], cms: false };
    const hit = (await loadCmsProducts()).find(item => item.productKey === key);
    return hit ? { productKey: hit.productKey, name: hit.name, cms: true } : null;
  };
  // D23: a new request nobody owns notifies MAIL_REPLY_TO (info@scm.mn) with the staff template (existing deliver mechanism).
  const notifyUnassigned = (loanId, context) => {
    const to = String(env.MAIL_REPLY_TO || '').trim();
    if (!to || !isValidEmailAddress(to)) return;
    deliver(loanId, async () => ({ to, reference: context.reference, ...emails.staffAssignment({ ...context, adminUrl: adminUrl(), unassigned: true }) }));
  };

  // ----- Public -----
  app.get('/api/loan-tasks/public/products', async (_req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=60');
      if (!enabled()) return res.json({ enabled: false, products: [] });
      const at = now();
      const configs = await loadConfigs();
      const all = [...LOAN_PRODUCTS.map(product => ({ productKey: product.id, name: product.name })), ...(await loadCmsProducts())];
      const products = all.map(product => {
        const publicProduct = toPublicProduct(effectiveConfig(configs, product.productKey, env), at, product.name);
        return publicProduct ? { productKey: product.productKey, name: product.name, hasLiveSubProducts: publicProduct.subProducts.length > 0 } : null;
      }).filter(Boolean);
      res.json({ enabled: true, products });
    } catch (error) { fail(res, error); }
  });

  app.get('/api/loan-tasks/public/products/:productKey', async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=60');
      if (!CMS_KEY_RE.test(req.params.productKey || '')) throw new HttpError('Бүтээгдэхүүн олдсонгүй.', 404);
      if (!enabled()) return res.json({ enabled: false, product: null });
      const resolved = await resolveProduct(req.params.productKey);
      if (!resolved) throw new HttpError('Бүтээгдэхүүн олдсонгүй.', 404);
      const { productKey, name } = resolved;
      const config = effectiveConfig(await loadConfigs(), productKey, env);
      const at = now();
      if (isPublicProductClosed(config, at)) return res.json({ enabled: true, closed: true, product: null, productKey, name, message: PRODUCT_CLOSED_MESSAGE });
      res.json({ enabled: true, product: toPublicProduct(config, at, name) });
    } catch (error) { fail(res, error); }
  });

  app.post('/api/loan-tasks/public/submit', ensureEnabled, guardMultipartSize, submitLimiter, (req, res) => {
    parseSubmit(req, res, async parseError => {
      if (parseError) return res.status(400).json({ message: 'Файл тус бүр 10 МБ-аас бага, нийт 12 хүртэл PDF, JPG, PNG эсвэл WEBP файл оруулна уу.' });
      const persisted = [];
      let saved = false;
      try {
        const body = req.body || {};
        if (body.website !== undefined && String(body.website).trim()) throw new HttpError('Хүсэлтийг хүлээн авах боломжгүй байна.', 400);
        const unavailable = () => new HttpError('Энэ бүтээгдэхүүнд одоогоор хүсэлт авахгүй байна.', 404, { code: 'PRODUCT_UNAVAILABLE' });
        const productKey = str(body.productKey, 60);
        const resolved = await resolveProduct(productKey);
        if (!resolved) throw unavailable();
        const at = now();
        const config = effectiveConfig(await loadConfigs(), productKey, env);
        if (!config?.isActive) throw unavailable();
        const channel = body.channel === undefined || body.channel === '' ? 'web' : body.channel;
        if (!CHANNELS.includes(channel)) throw new HttpError('Мэдээллээ шалгана уу.', 400, { errors: { channel: 'Суваг буруу байна.' } });
        const subProductId = str(body.subProductId, 60);
        let sub = null;
        if (subProductId) {
          sub = SUB_ID_RE.test(subProductId) ? (config.subProducts || []).find(item => item.id === subProductId) : null;
          if (!sub || !isSubProductLive(sub, at)) throw unavailable();
        } else if (config.baseProductEnabled === false) throw unavailable();
        if (!/^\d{1,9}$/.test(String(body.configVersion ?? '')) || Number(body.configVersion) !== (config.version ?? 0)) throw new HttpError('Маягт шинэчлэгдсэн байна. Дахин ачаална уу.', 409, { code: 'CONFIG_CHANGED' });

        const errors = {};
        if (body.consent !== 'true' && body.consent !== true) errors.consent = 'Мэдээлэл боловсруулах зөвшөөрөл шаардлагатай.';
        let rawAnswers = null;
        if (typeof body.answers !== 'string' || Buffer.byteLength(body.answers, 'utf8') > LIMITS.answersJsonBytes) errors._form = 'Хариулт буруу байна.';
        else { try { rawAnswers = JSON.parse(body.answers); } catch { errors._form = 'Хариулт буруу байна.'; } }
        const steps = resolveSteps(sub && sub.inheritSteps === false ? sub.steps : config.steps);
        const answers = rawAnswers ? validateAnswers(steps, rawAnswers, { now: at }) : { ok: false, errors: {}, value: {} };
        Object.assign(errors, answers.errors);
        // §15: files sent for fields hidden by the answers are discarded before upload (never stored).
        const rules = fileRulesFor(steps, { answers: answers.value });
        for (const [key, rule] of Object.entries(rules)) if (rule.hidden) delete rules[key];
        const hiddenFileKeys = new Set(Object.keys(fileRulesFor(steps)).filter(key => !Object.hasOwn(rules, key)));
        const submittedFiles = (Array.isArray(req.files) ? req.files : []).filter(file => !hiddenFileKeys.has(file?.fieldname));
        const fileCheck = validateTaskFiles(submittedFiles, rules);
        Object.assign(errors, fileCheck.errors);
        if (Object.keys(errors).length) throw new HttpError('Мэдээллээ шалгана уу.', 400, { errors });

        const fileAnswerIndex = [];
        for (const [key, files] of Object.entries(fileCheck.byKey)) {
          for (const file of files) {
            persisted.push(await uploadPrivate(file, rules[key].storageField, { persistUrl: true }));
            fileAnswerIndex.push(key);
          }
        }

        const { assignee, history } = await resolveDefaultAssignee((sub && sub.defaultAssigneeId) || config.defaultAssigneeId || '', productKey, at);
        const taskStatus = assignee ? 'assigned' : 'new';
        history.unshift({ at, type: 'created', to: taskStatus, actor: { name: 'Вэб маягт', system: true } });
        if (assignee) history.splice(1, 0, { at, type: 'assigned', to: 'assigned', assignee, actor: SYSTEM_ACTOR });
        const mirror = mirrorAnswers(answers.value, { productKey });
        const productName = resolved.name;
        const loan = new LoanRequest({
          ...mirror,
          status: assignee ? 'assigned' : 'pending',
          intakeVersion: 'quick-v1',
          formVersion: 'task-v1',
          source: 'web',
          channel,
          createdByStaff: false,
          ...(assignee ? { assignee, taskAssignedAt: at } : {}),
          fileDetails: persisted,
          fileNames: persisted.map(file => file.fileUrl),
          applicationData: taskApplicationData(mirror, answers.value, persisted, { productKey, subProductId: sub?.id, at }),
          taskForm: { productKey, productName, subProductId: sub?.id || null, subProductName: sub?.name || null, configVersion: config.version, widgetsVersion: LOAN_WIDGETS_VERSION, steps },
          taskStatus,
          taskHistory: history,
          taskRevision: 0,
          taskUpdatedAt: at,
        });
        const fileAnswers = {};
        fileAnswerIndex.forEach((key, index) => {
          (fileAnswers[key] ||= []).push({ fileDetailId: String(loan.fileDetails?.[index]?._id || ''), fileName: persisted[index].fileName });
        });
        loan.taskAnswers = { ...answers.value, ...fileAnswers };
        loan.applicationReference = `SCM-${ubDate(at).slice(0, 4)}-${String(loan._id).slice(-6).toUpperCase()}`;
        await loan.save();
        saved = true;
        res.status(201).json({ applicationReference: loan.applicationReference });

        const reference = loan.applicationReference;
        const context = { reference, productName, subProductName: sub?.name || '' };
        if (answers.value.email) deliver(loan._id, async () => ({ to: answers.value.email, reference, replyTo: assignee ? await staffEmail(assignee.userId) : '', ...emails.applicantAcknowledgement({ ...context, companyPhone: await companyPhone() }) }));
        if (assignee) deliver(loan._id, async () => ({ to: await staffEmail(assignee.userId), reference, ...emails.staffAssignment({ ...context, adminUrl: adminUrl() }) }));
        else notifyUnassigned(loan._id, context);
        if (env.LOAN_TASKS_AI_AUTOMATION === 'true' && typeof automate === 'function') automate(loan._id);
      } catch (error) {
        if (!saved) await destroyAll(persisted);
        if (!res.headersSent) fail(res, error);
      }
    });
  });

  // ----- Public applicant upload link (D7) -----
  const linkInvalid = () => new HttpError('Холбоос хүчингүй эсвэл хугацаа нь дууссан байна.', 404, { code: 'LINK_INVALID' });
  const findLink = async token => {
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
    const tokenHash = hashToken(token);
    const loan = await LoanRequest.findOne({ 'taskUploadLinks.tokenHash': tokenHash })
      .select('_id applicationReference selectedProduct status taskStatus formVersion taskForm assignee taskFiles taskUploadLinks').lean();
    const link = loan?.taskUploadLinks?.find(item => item.tokenHash === tokenHash);
    if (!link || link.revokedAt || !(new Date(link.expiresAt).getTime() > now().getTime())) return null;
    if (TERMINAL_TASK_STATUSES.includes(deriveTaskState(loan).taskStatus)) return null;
    return { loan, link, tokenHash };
  };
  const linkItems = (loan, link) => (link.items || []).map(item => {
    const rule = fileRuleForLoan(loan, item.key);
    if (!rule) return null;
    const uploaded = (loan.taskFiles || []).some(file => file.linkId === String(link._id) && file.fieldKey === item.key);
    return { key: item.key, label: item.label || rule.label, accept: [...rule.formats], maxSizeMb: Math.round(rule.maxBytes / MB), maxFiles: rule.maxFiles, uploaded };
  }).filter(Boolean);
  const productNameOf = loan => loan.taskForm?.productName || PRODUCTS_MAP[loan.selectedProduct] || loan.selectedProduct || '';

  app.get('/api/loan-tasks/upload/:token', ensureEnabled, linkReadLimiter, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const found = await findLink(req.params.token);
      if (!found) throw linkInvalid();
      const { loan, link } = found;
      res.json({ requestNo: loan.applicationReference || '', productName: productNameOf(loan), items: linkItems(loan, link), note: link.note || '', expiresAt: link.expiresAt });
    } catch (error) { fail(res, error); }
  });

  app.post('/api/loan-tasks/upload/:token', ensureEnabled, guardMultipartSize, linkUploadLimiter, async (req, res) => {
    let found;
    try {
      found = await findLink(req.params.token);
      if (!found) throw linkInvalid();
    } catch (error) { return fail(res, error); }
    parseLinkFiles(req, res, async parseError => {
      const persisted = [];
      let saved = false;
      try {
        if (parseError) throw new HttpError('Файл тус бүр 10 МБ-аас бага, нийт 12 хүртэл файл оруулна уу.', 400);
        const { loan, link, tokenHash } = found;
        const rules = {};
        for (const item of link.items || []) {
          const rule = fileRuleForLoan(loan, item.key);
          if (rule) rules[item.key] = { ...rule, label: item.label || rule.label, required: false };
        }
        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) throw new HttpError('Файл оруулна уу.', 400);
        const { errors, byKey } = validateTaskFiles(files, rules, { requireRequired: false });
        const already = (loan.taskFiles || []).filter(file => file.linkId === String(link._id)).length;
        if (already + files.length > LINK_UPLOAD_CAP) errors._files = 'Энэ холбоосоор оруулах файлын дээд хязгаарт хүрсэн байна.';
        if (Object.keys(errors).length) throw new HttpError('Файлаа шалгана уу.', 400, { errors });
        const at = now();
        const entries = [];
        for (const [key, list] of Object.entries(byKey)) {
          for (const file of list) {
            const stored = await uploadPrivate(file, rules[key].storageField);
            persisted.push(stored);
            entries.push({ ...stored, fieldKey: key, label: rules[key].label, source: 'applicant_link', linkId: String(link._id), uploadedBy: { name: 'Харилцагч' }, uploadedAt: at });
          }
        }
        const labels = Object.keys(byKey).map(key => rules[key].label);
        const updated = await LoanRequest.findOneAndUpdate(
          { _id: loan._id, taskStatus: { $nin: TERMINAL_TASK_STATUSES }, taskUploadLinks: { $elemMatch: { tokenHash, revokedAt: null, expiresAt: { $gt: at } } } },
          { $push: { taskFiles: { $each: entries }, taskHistory: { at, type: 'file_added', note: `Харилцагч холбоосоор ${entries.length} файл орууллаа.`, items: labels, actor: { name: 'Харилцагч', system: false } } }, $set: { taskUpdatedAt: at } },
          { new: true, lean: true },
        );
        if (!updated) throw linkInvalid();
        saved = true;
        res.json({ uploaded: entries.length, items: linkItems(updated, (updated.taskUploadLinks || []).find(item => String(item._id) === String(link._id)) || link) });
        const reference = loan.applicationReference || '';
        if (loan.assignee?.userId) {
          deliver(loan._id, async () => ({ to: await staffEmail(loan.assignee.userId), reference, ...emails.staffApplicantUpload({ reference, productName: productNameOf(loan), subProductName: loan.taskForm?.subProductName || '', count: entries.length, adminUrl: adminUrl() }) }));
        }
      } catch (error) {
        if (!saved) await destroyAll(persisted);
        if (!res.headersSent) fail(res, error);
      }
    });
  });

  // ----- Admin config -----
  app.get('/api/loan-tasks/admin/configs', ensureEnabled, authenticateUser, requireAdmin, async (_req, res) => {
    try {
      const at = now();
      const docs = await LoanFormConfig.find({}).lean();
      const byKey = new Map((Array.isArray(docs) ? docs : []).map(doc => [doc.productKey, doc]));
      res.json({
        widgetsVersion: LOAN_WIDGETS_VERSION,
        presets: PRESET_WIDGETS,
        widgetGroups: WIDGET_GROUPS,
        limits: LIMITS,
        fileFormats: Object.keys(FILE_FORMATS),
        products: [...LOAN_PRODUCTS.map(product => ({ productKey: product.id, name: product.name })), ...(await loadCmsProducts())]
          .map(product => ({ productKey: product.productKey, name: product.name, cms: !PRODUCT_KEYS.has(product.productKey), saved: byKey.has(product.productKey), config: toAdminConfig(byKey.get(product.productKey), product.productKey, at, env, product.name) })),
      });
    } catch (error) { fail(res, error); }
  });

  app.put('/api/loan-tasks/admin/configs/:productKey', ensureEnabled, authenticateUser, requireAdmin, async (req, res) => {
    try {
      const productKey = req.params.productKey;
      const resolved = await resolveProduct(productKey);
      if (!resolved) throw new HttpError('Бүтээгдэхүүн олдсонгүй.', 404);
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError('Тохиргоо буруу байна.', 400);
      const expectedVersion = body.expectedVersion;
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new HttpError('expectedVersion заавал.', 400, { errors: { expectedVersion: 'expectedVersion заавал (0 = шинэ).' } });
      const { ok, errors, value } = validateConfig({ ...body, productKey }, { extraKeys: resolved.cms ? [productKey] : [] });
      if (!ok) throw new HttpError('Тохиргоог шалгана уу.', 400, { errors });
      const assigneeIds = [['defaultAssigneeId', value.defaultAssigneeId], ...value.subProducts.map((sub, index) => [`subProducts.${index}.defaultAssigneeId`, sub.defaultAssigneeId])].filter(([, id]) => id);
      if (assigneeIds.length) {
        const staff = await User.find({ _id: { $in: [...new Set(assigneeIds.map(([, id]) => id))] } }).select('_id role roles isActive').lean();
        const valid = new Set((staff || []).filter(user => user.isActive && isRequestStaff(user)).map(user => String(user._id)));
        const staffErrors = Object.fromEntries(assigneeIds.filter(([, id]) => !valid.has(id)).map(([path]) => [path, 'Идэвхтэй зээлийн ажилтан сонгоно уу.']));
        if (Object.keys(staffErrors).length) throw new HttpError('Тохиргоог шалгана уу.', 400, { errors: staffErrors });
      }
      const at = now();
      const updatedBy = { userId: String(req.user._id), name: String(req.user.name || req.user.email || '') };
      const { productKey: _ignored, ...fields } = value;
      let saved;
      if (expectedVersion === 0) {
        try {
          const created = await LoanFormConfig.create({ productKey, ...fields, version: 1, updatedBy, updatedAt: at });
          saved = typeof created?.toObject === 'function' ? created.toObject() : created;
        } catch (error) {
          if (error?.code === 11000) throw new HttpError('Өөр админ өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'VERSION_CONFLICT' });
          throw error;
        }
      } else {
        saved = await LoanFormConfig.findOneAndUpdate({ productKey, version: expectedVersion }, { $set: { ...fields, updatedBy, updatedAt: at }, $inc: { version: 1 } }, { new: true, lean: true });
        if (!saved) throw new HttpError('Өөр админ өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'VERSION_CONFLICT' });
      }
      invalidateConfigs();
      await createLog(req.user, 'loan_task_config_saved', `${productKey} v${saved.version} active=${saved.isActive ? 1 : 0}`);
      res.json(toAdminConfig(saved, productKey, at, env, resolved.name));
    } catch (error) { fail(res, error); }
  });

  // ----- Staff -----
  const staffBaseFilters = (req, { allowStatus = true } = {}) => {
    const manager = viewsAll(req);
    const query = req.query || {};
    const filters = [scopeOf(req)];
    const assignee = typeof query.assignee === 'string' && query.assignee ? query.assignee : (manager ? 'all' : 'me');
    if (assignee !== 'me' && !manager) throw new HttpError('Зөвхөн өөрт хуваарилсан хүсэлтийг харна.', 403);
    if (assignee === 'me') filters.push({ 'assignee.userId': String(req.user._id) });
    else if (assignee === 'unassigned') filters.push({ 'assignee.userId': { $in: [null, ''] } });
    else if (assignee !== 'all') {
      if (!OBJECT_ID_RE.test(assignee)) throw new HttpError('Хариуцагч буруу байна.', 400);
      filters.push({ 'assignee.userId': assignee });
    }
    if (query.productKey && query.productKey !== 'all') {
      if (typeof query.productKey !== 'string' || !CMS_KEY_RE.test(query.productKey)) throw new HttpError('Бүтээгдэхүүн буруу байна.', 400);
      filters.push({ selectedProduct: query.productKey });
    }
    if (query.subProductId && query.subProductId !== 'all') {
      if (!SUB_ID_RE.test(query.subProductId)) throw new HttpError('Дэд бүтээгдэхүүн буруу байна.', 400);
      filters.push({ 'taskForm.subProductId': query.subProductId });
    }
    if (query.source && query.source !== 'all') {
      if (query.source === 'task') filters.push({ formVersion: 'task-v1' });
      else if (query.source === 'legacy') filters.push({ formVersion: { $ne: 'task-v1' } });
      else if (query.source === 'messenger') filters.push({ channel: 'messenger' });
      else if (query.source === 'webchat') filters.push({ channel: 'webchat' });
      else if (query.source === 'web') filters.push({ channel: { $nin: ['messenger', 'webchat'] } });
      else throw new HttpError('Эх үүсвэр буруу байна.', 400);
    }
    const search = str(query.search, 80);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filters.push({ $or: ['applicationReference', 'firstname', 'lastname', 'orgName', 'phone', 'contactPhone'].map(key => ({ [key]: regex })) });
    }
    if (allowStatus && query.status && query.status !== 'all') {
      if (!TASK_STATUSES.includes(query.status)) throw new HttpError('Төлөв буруу байна.', 400);
      filters.push(taskStatusFilter(query.status));
    }
    return filters.filter(filter => Object.keys(filter).length);
  };
  const combine = filters => (filters.length ? { $and: filters } : {});

  app.get('/api/loan-tasks', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const page = Math.min(100000, Math.max(1, Number.parseInt(req.query?.page, 10) || 1));
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query?.limit, 10) || 20));
      const query = combine(staffBaseFilters(req));
      const sort = req.query?.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
      const [items, total] = await Promise.all([
        LoanRequest.find(query).select(LIST_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        LoanRequest.countDocuments(query),
      ]);
      const canDelete = await canDeleteFor(req);
      res.json({ items: (items || []).map(loan => toTaskListItem(loan, { canDelete })), total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) { fail(res, error); }
  });

  app.get('/api/loan-tasks/summary', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const filters = staffBaseFilters({ ...req, query: { assignee: req.query?.assignee, productKey: req.query?.productKey } }, { allowStatus: false });
      const values = await Promise.all(TASK_STATUSES.map(status => LoanRequest.countDocuments(combine([...filters, taskStatusFilter(status)]))));
      const counts = Object.fromEntries(TASK_STATUSES.map((status, index) => [status, values[index] || 0]));
      res.json({ counts, total: values.reduce((sum, value) => sum + (value || 0), 0) });
    } catch (error) { fail(res, error); }
  });

  const loadScoped = async (req, id) => {
    const loan = await LoanRequest.findOne({ _id: id, ...scopeOf(req) }).lean();
    if (!loan) throw notFound();
    return loan;
  };
  const detail = (loan, req, assigneeNotifyEmail = '', canDelete = false) => toTaskDetail(loan, req.user, { cloudinary, now: now(), assigneeNotifyEmail, perms: req.perms, canDelete });
  const detailWithEmail = async (loan, req) => detail(loan, req, loan?.assignee?.userId ? await staffEmail(String(loan.assignee.userId)).catch(() => '') : '', await canDeleteFor(req));

  app.get('/api/loan-tasks/:id', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const loan = await loadScoped(req, validId(req.params.id));
      res.json(await detailWithEmail(loan, req));
    } catch (error) { fail(res, error); }
  });

  const revokeLinks = (links, at) => (Array.isArray(links) ? links.map(link => (link.revokedAt ? link : { ...link, revokedAt: at })) : links);

  app.post('/api/loan-tasks/:id/actions', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const id = validId(req.params.id);
      const loan = await loadScoped(req, id);
      const user = req.user;
      const needed = { assign: 'loan_requests.assign', status: 'loan_requests.change_status', note: 'loan_requests.notes_files', reopen: 'loan_requests.reopen' }[req.body?.type];
      if (needed) requirePerm(req, needed);
      const manager = viewsAll(req) || (['assign', 'reopen'].includes(req.body?.type) && Boolean(needed));
      // Additional documents always go through /doc-request (upload link + applicant email), never a bare status change.
      if (req.body?.type === 'request_docs') throw new HttpError(DOC_REQUEST_ONLY_MESSAGE, 400, { code: 'USE_DOC_REQUEST', errors: { type: DOC_REQUEST_ONLY_MESSAGE } });
      const action = validateTaskAction(req.body, loan, { manager, isAssignee: isAssigneeOf(user, loan) });
      const at = now();
      const actor = actorOf(user);
      const entry = { at, type: action.type, from: action.from, to: action.to, actor, ...(action.note ? { note: action.note } : {}) };
      const scope = { _id: id, ...scopeOf(req) };
      let updated;
      if (action.type === 'note') {
        updated = await LoanRequest.findOneAndUpdate(scope, { $push: { taskHistory: entry }, $set: { taskUpdatedAt: at } }, { new: true, lean: true });
        if (!updated) throw notFound();
        await createLog(user, 'loan_task_note', `${id}: note`);
        return res.json(detail(updated, req));
      }
      if ((loan.taskRevision || 0) !== action.expectedRevision) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      const set = { taskUpdatedAt: at };
      const unset = {};
      if (action.to !== action.from) set.taskStatus = action.to;
      let newAssignee = null;
      if (action.type === 'assign') {
        if (action.assigneeId) {
          const staff = await findActiveStaff(action.assigneeId);
          if (!staff) throw new HttpError('Идэвхтэй зээлийн ажилтан сонгоно уу.', 400, { errors: { assigneeId: 'Идэвхтэй зээлийн ажилтан сонгоно уу.' } });
          newAssignee = { userId: String(staff._id), name: staff.name || '' };
          set.assignee = newAssignee; // D5: only `assignee` among legacy fields
          set.taskAssignedAt = at;
          entry.type = 'assigned';
          entry.assignee = newAssignee;
        } else {
          set.assignee = { userId: '', name: '' };
          entry.type = 'unassigned';
          entry.assignee = { userId: '', name: '' };
        }
      } else if (action.type === 'status') {
        if (action.to === 'resolved') {
          set.taskOutcome = { code: action.outcome.code, note: action.note, at, by: { userId: actor.userId, name: actor.name } };
          entry.outcome = action.outcome.code;
        }
      } else if (action.type === 'request_docs') {
        entry.type = 'docs_requested';
        entry.items = action.items;
      } else if (action.type === 'reopen') {
        entry.type = 'reopened';
        const previous = loan.taskOutcome?.code || deriveTaskState(loan).outcome?.code;
        if (previous) entry.outcome = previous;
        if (loan.taskOutcome !== undefined) unset.taskOutcome = 1;
      }
      if (TERMINAL_TASK_STATUSES.includes(action.to) && !TERMINAL_TASK_STATUSES.includes(action.from) && loan.taskUploadLinks?.length) set.taskUploadLinks = revokeLinks(loan.taskUploadLinks, at);
      const update = { $set: set, $inc: { taskRevision: 1 }, $push: { taskHistory: { $each: [entry] } }, ...(Object.keys(unset).length ? { $unset: unset } : {}) };
      updated = await LoanRequest.findOneAndUpdate({ ...scope, ...revisionCondition(action.expectedRevision) }, update, { new: true, lean: true, runValidators: true });
      if (!updated) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      await createLog(user, `loan_task_${action.type}`, `${id}: ${action.from} -> ${action.to}`);
      res.json(await detailWithEmail(updated, req));
      if (newAssignee) {
        const context = { reference: loan.applicationReference || '', productName: productNameOf(loan), subProductName: loan.taskForm?.subProductName || '' };
        deliver(id, async () => ({ to: await staffEmail(newAssignee.userId), reference: context.reference, ...emails.staffAssignment({ ...context, adminUrl: adminUrl() }) }));
      }
      // Rejection always notifies the applicant with the required reason; resolved sends nothing.
      if (action.type === 'status' && action.to === 'rejected' && action.from !== 'rejected' && loan.email) {
        const reference = loan.applicationReference || '';
        deliver(id, async () => ({ to: loan.email, reference, replyTo: await staffEmail(updated.assignee?.userId), ...emails.applicantRejection({ reference, productName: productNameOf(loan), subProductName: loan.taskForm?.subProductName || '', reason: action.note, companyPhone: await companyPhone() }) }));
      }
    } catch (error) { fail(res, error); }
  });

  app.post('/api/loan-tasks/:id/files', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    let loan;
    try {
      loan = await loadScoped(req, validId(req.params.id));
      requirePerm(req, 'loan_requests.notes_files');
      if (!allowedTaskActions(loan, { manager: viewsAll(req), isAssignee: isAssigneeOf(req.user, loan) }).uploadFiles) throw new HttpError('Шийдвэрлэсэн хүсэлтэд файл нэмэх эрхгүй байна.', 403);
    } catch (error) { return fail(res, error); }
    parseStaffFiles(req, res, async parseError => {
      const persisted = [];
      let saved = false;
      try {
        if (parseError) throw new HttpError('Файл тус бүр 10 МБ-аас бага, 5 хүртэл файл оруулна уу.', 400);
        const fieldKey = str(req.body?.fieldKey, 60);
        const base = fileRuleForLoan(loan, fieldKey);
        if (!base) throw new HttpError('Баримтын төрөл буруу байна.', 400, { errors: { fieldKey: 'Баримтын төрөл буруу байна.' } });
        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) throw new HttpError('Файл оруулна уу.', 400);
        const { errors, byKey } = validateTaskFiles(files, { files: { ...STAFF_FILE_RULE, label: base.label } }, { requireRequired: false, maxTotal: 5 });
        if (Object.keys(errors).length) throw new HttpError('Файлаа шалгана уу.', 400, { errors });
        const at = now();
        const actor = actorOf(req.user);
        const entries = [];
        for (const file of byKey.files) {
          const stored = await uploadPrivate(file, base.storageField);
          persisted.push(stored);
          entries.push({ ...stored, fieldKey, label: base.label, source: 'staff', uploadedBy: { userId: actor.userId, name: actor.name }, uploadedAt: at });
        }
        const query = { _id: loan._id, ...scopeOf(req), ...(viewsAll(req) ? {} : { taskStatus: { $nin: TERMINAL_TASK_STATUSES } }) };
        const updated = await LoanRequest.findOneAndUpdate(query, {
          $push: { taskFiles: { $each: entries }, taskHistory: { at, type: 'file_added', note: `${entries.length} файл нэмэв.`, items: [base.label], actor } },
          $set: { taskUpdatedAt: at },
        }, { new: true, lean: true });
        if (!updated) throw notFound();
        saved = true;
        await createLog(req.user, 'loan_task_file_added', `${loan._id}: ${fieldKey} x${entries.length}`);
        res.json(detail(updated, req));
      } catch (error) {
        if (!saved) await destroyAll(persisted);
        if (!res.headersSent) fail(res, error);
      }
    });
  });

  app.post('/api/loan-tasks/:id/doc-request', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const id = validId(req.params.id);
      const loan = await loadScoped(req, id);
      const user = req.user;
      const state = deriveTaskState(loan);
      requirePerm(req, 'loan_requests.request_docs');
      const allowed = allowedTaskActions(loan, { manager: viewsAll(req), isAssignee: isAssigneeOf(user, loan) });
      if (TERMINAL_TASK_STATUSES.includes(state.taskStatus)) throw new HttpError('Шийдвэрлэсэн хүсэлтэд баримт хүсэх боломжгүй.', 403, { code: 'TERMINAL' });
      if (!allowed.requestDocs) throw new HttpError('Эхлээд хүсэлтийг хуваарилах эсвэл хянаж эхэлнэ үү.', 400);
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError('Хүсэлт буруу байна.', 400);
      const extra = Object.keys(body).filter(key => !['items', 'note', 'expiresInDays', 'expectedRevision'].includes(key));
      if (extra.length) throw new HttpError('Зөвшөөрөгдөөгүй талбар байна.', 400);
      const errors = {};
      const items = [];
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 10) errors.items = 'Баримт 1–10 сонгоно уу.';
      else {
        const seen = new Set();
        body.items.forEach((item, index) => {
          const key = item && typeof item === 'object' && typeof item.key === 'string' ? item.key : '';
          const rule = fileRuleForLoan(loan, key);
          if (!rule) { errors[`items.${index}.key`] = 'Баримтын төрөл буруу байна.'; return; }
          if (seen.has(key)) { errors[`items.${index}.key`] = 'Давхардсан баримт.'; return; }
          seen.add(key);
          if (item.label !== undefined && (typeof item.label !== 'string' || item.label.trim().length > 120)) { errors[`items.${index}.label`] = '120 тэмдэгтээс хэтрэхгүй.'; return; }
          items.push({ key, label: str(item.label, 120) || rule.label });
        });
      }
      if (body.note !== undefined && (typeof body.note !== 'string' || body.note.trim().length > 2000)) errors.note = 'Тайлбар 2000 тэмдэгтээс хэтрэхгүй.';
      const days = body.expiresInDays === undefined ? 7 : body.expiresInDays;
      if (!Number.isInteger(days) || days < 1 || days > 30) errors.expiresInDays = '1–30 хоног.';
      if (body.expectedRevision !== undefined && (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)) errors.expectedRevision = 'Буруу утга.';
      if (Object.keys(errors).length) throw new HttpError('Мэдээллээ шалгана уу.', 400, { errors });
      const revision = loan.taskRevision || 0;
      if (body.expectedRevision !== undefined && body.expectedRevision !== revision) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      const at = now();
      const actor = actorOf(user);
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(at.getTime() + days * 24 * 3600 * 1000);
      const note = str(body.note, 2000);
      const link = { _id: new mongoose.Types.ObjectId(), tokenHash: hashToken(token), items, note, expiresAt, createdAt: at, createdBy: { userId: actor.userId, name: actor.name } };
      const set = { taskUploadLinks: [...(revokeLinks(loan.taskUploadLinks, at) || []), link], taskUpdatedAt: at };
      if (state.taskStatus !== 'additional_docs') set.taskStatus = 'additional_docs';
      const entry = { at, type: 'docs_requested', from: state.taskStatus, to: 'additional_docs', items: items.map(item => item.label), actor, ...(note ? { note } : {}) };
      const updated = await LoanRequest.findOneAndUpdate({ _id: id, ...scopeOf(req), ...revisionCondition(revision) }, { $set: set, $inc: { taskRevision: 1 }, $push: { taskHistory: { $each: [entry] } } }, { new: true, lean: true, runValidators: true });
      if (!updated) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      await createLog(user, 'loan_task_doc_request', `${id}: ${state.taskStatus} -> additional_docs items=${items.length}`);
      const uploadUrl = `${uploadBaseUrl()}?upload=${token}`;
      // Email goes out in the background; tell the UI whether it was queued so it can hide the raw link.
      res.json({ uploadUrl, expiresAt, email: { result: loan.email && mailer?.enabled !== false && mailer?.send ? 'queued' : 'skipped' }, task: detail(updated, req) });
      if (loan.email) {
        const reference = loan.applicationReference || '';
        deliver(id, async () => ({ to: loan.email, reference, replyTo: await staffEmail(loan.assignee?.userId), ...emails.applicantDocumentRequest({ reference, productName: productNameOf(loan), subProductName: loan.taskForm?.subProductName || '', items: items.map(item => item.label), note, uploadUrl, expiresAt, companyPhone: await companyPhone() }) }));
      }
    } catch (error) { fail(res, error); }
  });

  // D15: staff -> applicant email. Sent inline so the history entry and the response carry the real result.
  app.post('/api/loan-tasks/:id/message', ensureEnabled, authenticateUser, requireStaff, async (req, res) => {
    try {
      const id = validId(req.params.id);
      const loan = await loadScoped(req, id);
      requirePerm(req, 'loan_requests.message');
      const user = req.user;
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError('Хүсэлт буруу байна.', 400);
      if (Object.keys(body).some(key => !['message', 'expectedRevision'].includes(key))) throw new HttpError('Зөвшөөрөгдөөгүй талбар байна.', 400);
      const errors = {};
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > 2000) errors.message = 'Мессеж 1–2000 тэмдэгт байна.';
      if (body.expectedRevision !== undefined && (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)) errors.expectedRevision = 'Буруу утга.';
      if (Object.keys(errors).length) throw new HttpError('Мэдээллээ шалгана уу.', 400, { errors });
      const to = typeof loan.email === 'string' ? loan.email.trim() : '';
      if (!to) throw new HttpError('Харилцагчийн имэйл бүртгэлгүй байна.', 400, { code: 'NO_APPLICANT_EMAIL' });
      const revision = loan.taskRevision || 0;
      if (body.expectedRevision !== undefined && body.expectedRevision !== revision) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      const reference = loan.applicationReference || '';
      let result = 'failed';
      try {
        const mail = { to, reference, replyTo: (await staffEmail(loan.assignee?.userId)) || (await staffEmail(String(user._id))), ...emails.applicantMessage({ reference, message, companyPhone: await companyPhone() }) };
        const outcome = mailer?.send ? await mailer.send(mail) : { result: 'skipped' };
        result = outcome?.result || 'failed';
      } catch { logger.error?.('[loan-tasks] applicant message failed'); }
      const at = now();
      const entry = { at, type: 'message', note: message, actor: actorOf(user), email: { template: 'applicant_message', result } };
      const updated = await LoanRequest.findOneAndUpdate({ _id: id, ...scopeOf(req), ...revisionCondition(revision) }, { $set: { taskUpdatedAt: at }, $inc: { taskRevision: 1 }, $push: { taskHistory: { $each: [entry] } } }, { new: true, lean: true });
      if (!updated) throw new HttpError('Өөр хэрэглэгч өөрчилсөн байна. Дахин ачаална уу.', 409, { code: 'REVISION_CONFLICT' });
      await createLog(user, 'loan_task_message', `${id}: ${result}`);
      res.json({ ok: true, email: { result }, task: await detailWithEmail(updated, req) });
    } catch (error) { fail(res, error); }
  });

  // D16: hard delete, gated by loan_requests.delete (admin only) AND the SiteConfig flag. Files first (authenticated raw), then the document.
  app.delete('/api/loan-requests/:id', authenticateUser, async (req, res) => {
    try {
      await loadPerms(req);
      if (!req.perms.has('loan_requests.delete')) return res.status(403).json({ message: 'Хүсэлт устгах эрхгүй байна.', code: 'FORBIDDEN' });
      if (!(await deleteEnabled())) return res.status(403).json({ message: 'Хүсэлт устгах тохиргоо унтраалттай байна.', code: 'DELETE_DISABLED' });
      const id = validId(req.params.id);
      const loan = await LoanRequest.findOne({ _id: id }).lean();
      if (!loan) throw notFound();
      const ids = deletablePublicIds(loan);
      const results = await Promise.allSettled(ids.map(publicId => cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated' })));
      const failed = results.filter(item => item.status === 'rejected' || (item.value && item.value.result && !['ok', 'not found'].includes(item.value.result))).length;
      if (failed) throw new HttpError('Файлыг устгаж чадсангүй. Хүсэлт устгагдаагүй, дахин оролдоно уу.', 502, { code: 'FILE_DELETE_FAILED' });
      await LoanRequest.deleteOne({ _id: id });
      await createLog(req.user, 'loan_request_deleted', `${id} ref=${loan.applicationReference || '-'} files=${ids.length}`);
      res.json({ ok: true });
    } catch (error) { fail(res, error); }
  });

  // D18: creates the request for an in-chat application (called by scmMessenger.js). Same default-assignee
  // and staff-email logic as the web submit. Returns only { applicationReference, productKey, productName, assigned }.
  const createMessengerTask = async rawInput => {
    if (!enabled()) throw new HttpError('Энэ үйлчилгээ түр идэвхгүй байна.', 503, { code: 'DISABLED' });
    const input = validateMessengerInput(rawInput);
    const at = now();
    const config = effectiveConfig(await loadConfigs(), input.productKey, env);
    if (!config?.isActive || config.baseProductEnabled === false) throw new HttpError('Энэ бүтээгдэхүүнд одоогоор хүсэлт авахгүй байна.', 404, { code: 'PRODUCT_UNAVAILABLE' });
    const { assignee, history } = await resolveDefaultAssignee(config.defaultAssigneeId || '', input.productKey, at);
    const productName = PRODUCTS_MAP[input.productKey] || input.productName || input.productKey;
    const loan = new LoanRequest(buildMessengerTaskDoc({ input, config, assignee, history, at, productName }));
    loan.applicationReference = `SCM-${ubDate(at).slice(0, 4)}-${String(loan._id).slice(-6).toUpperCase()}`;
    await loan.save();
    const reference = loan.applicationReference;
    if (assignee) deliver(loan._id, async () => ({ to: await staffEmail(assignee.userId), reference, ...emails.staffAssignment({ reference, productName, subProductName: '', adminUrl: adminUrl() }) }));
    else notifyUnassigned(loan._id, { reference, productName, subProductName: '' });
    return { applicationReference: reference, productKey: input.productKey, productName, assigned: Boolean(assignee) };
  };

  return { invalidateConfigs, createMessengerTask };
}
