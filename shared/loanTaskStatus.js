// Loan task status contract (frontend + backend single source of truth).
// See docs/design/loan-task-management.md §4. Pure functions only; browser safe.

export const TASK_STATUSES = ['new', 'assigned', 'additional_docs', 'in_review', 'rejected', 'resolved'];
export const TERMINAL_TASK_STATUSES = ['rejected', 'resolved'];
export const TASK_STATUS_LABELS = {
  new: 'Шинэ',
  assigned: 'Хуваарилсан',
  additional_docs: 'Нэмэлт баримт хүлээж буй',
  in_review: 'Хянаж буй',
  rejected: 'Татгалзсан',
  resolved: 'Шийдвэрлэсэн',
};
export const TASK_OUTCOMES = ['approved', 'approved_conditional', 'disbursed', 'customer_declined', 'other'];
export const TASK_OUTCOME_LABELS = {
  approved: 'Зөвшөөрсөн',
  approved_conditional: 'Нөхцөлтэй зөвшөөрсөн',
  disbursed: 'Олгосон',
  customer_declined: 'Харилцагч татгалзсан',
  other: 'Бусад',
};
export const LEGACY_STATUSES = ['pending', 'created', 'assigned', 'data_collection', 'studying', 'assessment', 'committee', 'returned', 'approved', 'rejected', 'resolved', 'closed', 'disbursed'];
export const LEGACY_STATUS_LABELS = {
  pending: 'Шинэ / шийдээгүй', created: 'Ажилтан үүсгэсэн', assigned: 'Хуваарилсан',
  studying: 'Судалж байна', data_collection: 'Баримт бүрдүүлж байна', assessment: 'Үнэлгээ',
  committee: 'Хорооны хяналт', returned: 'Буцаасан', approved: 'Зөвшөөрсөн',
  rejected: 'Татгалзсан', resolved: 'Нөхцөлтэй зөвшөөрсөн', closed: 'Хаасан', disbursed: 'Олгосон',
};
export const TASK_TRANSITIONS = {
  new: ['in_review', 'rejected'],
  assigned: ['in_review', 'additional_docs', 'rejected', 'resolved'],
  additional_docs: ['in_review', 'rejected', 'resolved'],
  in_review: ['additional_docs', 'rejected', 'resolved'],
  rejected: [],
  resolved: [],
};
// Status changes to this value must use the doc-request endpoint, never a plain status action.
export const DOC_REQUEST_ONLY_STATUS = 'additional_docs';
export const DOC_REQUEST_ONLY_MESSAGE = 'Нэмэлт баримтыг "Нэмэлт баримт хүсэх" үйлдлээр хүснэ үү.';
export const TASK_ACTION_TYPES =['assign', 'status', 'request_docs', 'note', 'reopen'];
export const TASK_NOTE_MAX = 2000;
export const TASK_DOC_ITEMS_MAX = 10;
export const TASK_DOC_ITEM_MAX_LENGTH = 120;

// Legacy status -> derived task status (status-independent of assignee).
const LEGACY_FIXED = {
  assigned: 'assigned',
  returned: 'additional_docs',
  data_collection: 'in_review', studying: 'in_review', assessment: 'in_review', committee: 'in_review',
  rejected: 'rejected',
  approved: 'resolved', resolved: 'resolved', disbursed: 'resolved', closed: 'resolved',
};
const LEGACY_OUTCOMES = { approved: 'approved', resolved: 'approved_conditional', disbursed: 'disbursed', closed: 'other' };
const LEGACY_FIXED_KEYS = Object.keys(LEGACY_FIXED);

const hasAssignee = loan => {
  const id = loan?.assignee?.userId;
  return id !== undefined && id !== null && id !== '';
};

export function legacyOutcomeNote(legacyStatus) {
  if (legacyStatus === 'closed') return 'Хуучин системд хаагдсан';
  return `Хуучин системийн төлөв: ${LEGACY_STATUS_LABELS[legacyStatus] || legacyStatus}`;
}

export function deriveTaskState(loan = {}) {
  const legacyStatus = typeof loan?.status === 'string' ? loan.status : '';
  if (TASK_STATUSES.includes(loan?.taskStatus)) {
    const code = loan.taskOutcome && TASK_OUTCOMES.includes(loan.taskOutcome.code) ? loan.taskOutcome.code : null;
    return { taskStatus: loan.taskStatus, source: 'task', outcome: code ? { code } : null, legacyStatus };
  }
  const fixed = LEGACY_FIXED[legacyStatus];
  const taskStatus = fixed || (hasAssignee(loan) ? 'assigned' : 'new');
  const code = LEGACY_OUTCOMES[legacyStatus];
  return { taskStatus, source: 'legacy', outcome: code ? { code, legacy: true, note: legacyOutcomeNote(legacyStatus) } : null, legacyStatus };
}

const ASSIGNED_FILTER = { 'assignee.userId': { $nin: [null, ''] } };
const UNASSIGNED_FILTER = { 'assignee.userId': { $in: [null, ''] } };

function legacyCondition(status) {
  const fixedFor = LEGACY_FIXED_KEYS.filter(key => LEGACY_FIXED[key] === status);
  const byStatus = fixedFor.length ? { status: { $in: fixedFor } } : null;
  if (status === 'new') return { $and: [{ status: { $nin: LEGACY_FIXED_KEYS } }, UNASSIGNED_FILTER] };
  if (status === 'assigned') return { $or: [byStatus, { $and: [{ status: { $nin: LEGACY_FIXED_KEYS } }, ASSIGNED_FILTER] }] };
  return byStatus;
}

// Mongo filter equivalent to deriveTaskState(loan).taskStatus === status. 'all' -> {}.
export function taskStatusFilter(status) {
  if (!status || status === 'all') return {};
  if (!TASK_STATUSES.includes(status)) throw Object.assign(new Error('Төлөв буруу байна.'), { status: 400 });
  return { $or: [{ taskStatus: status }, { $and: [{ taskStatus: { $nin: TASK_STATUSES } }, legacyCondition(status)] }] };
}

export function allowedTaskActions(loan, { manager = false, isAssignee = false } = {}) {
  const { taskStatus } = deriveTaskState(loan);
  const terminal = TERMINAL_TASK_STATUSES.includes(taskStatus);
  const canWork = Boolean(manager || isAssignee);
  return {
    assign: Boolean(manager),
    // additional_docs is reached only through the doc-request flow (upload link + applicant email).
    transitions: canWork ? TASK_TRANSITIONS[taskStatus].filter(to => to !== DOC_REQUEST_ONLY_STATUS) : [],
    reopen: Boolean(manager) && terminal,
    note: canWork,
    requestDocs: canWork && !terminal && taskStatus !== 'new',
    uploadFiles: canWork && (!terminal || Boolean(manager)),
  };
}

export class TaskActionError extends Error {
  constructor(message, status = 400, errors = {}, code) {
    super(message);
    this.status = status;
    this.errors = errors;
    if (code) this.code = code;
  }
}

const ACTION_KEYS = {
  assign: ['type', 'assigneeId', 'note', 'expectedRevision'],
  status: ['type', 'to', 'outcome', 'note', 'expectedRevision'],
  request_docs: ['type', 'items', 'note', 'expectedRevision'],
  note: ['type', 'note'],
  reopen: ['type', 'note', 'expectedRevision'],
};

function readNote(body, required, errors) {
  if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') { errors.note = 'Тайлбар буруу байна.'; return ''; }
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > TASK_NOTE_MAX) errors.note = `Тайлбар ${TASK_NOTE_MAX} тэмдэгтээс хэтрэхгүй.`;
  else if (required && !note) errors.note = 'Тайлбар заавал бичнэ.';
  return note;
}

// Validates a staff action against the current loan state. Returns normalized action or throws TaskActionError.
export function validateTaskAction(body, loan, { manager = false, isAssignee = true } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TaskActionError('Үйлдэл буруу байна.');
  const type = body.type;
  if (!TASK_ACTION_TYPES.includes(type)) throw new TaskActionError('Үйлдлийн төрөл буруу байна.', 400, { type: 'Үйлдлийн төрөл буруу байна.' });
  const extra = Object.keys(body).filter(key => !ACTION_KEYS[type].includes(key));
  if (extra.length) throw new TaskActionError('Зөвшөөрөгдөөгүй талбар байна.', 400, Object.fromEntries(extra.map(key => [key, 'Зөвшөөрөгдөөгүй талбар.'])));
  const { taskStatus: from } = deriveTaskState(loan);
  const terminal = TERMINAL_TASK_STATUSES.includes(from);
  const canWork = Boolean(manager || isAssignee);
  const errors = {};
  const action = { type, from };
  if (type !== 'note') {
    const rev = body.expectedRevision;
    if (!Number.isSafeInteger(rev) || rev < 0) errors.expectedRevision = 'expectedRevision заавал (0-ээс их бүхэл тоо).';
    else action.expectedRevision = rev;
  }
  if (type === 'note') {
    if (!canWork) throw new TaskActionError('Энэ хүсэлтэд үйлдэл хийх эрхгүй байна.', 403);
    action.note = readNote(body, true, errors);
    action.to = from;
  } else if (type === 'assign') {
    if (!manager) throw new TaskActionError('Хуваарилах эрхгүй байна.', 403);
    if (typeof body.assigneeId !== 'string' || (body.assigneeId && !/^[a-f\d]{24}$/i.test(body.assigneeId))) errors.assigneeId = 'Ажилтны ID буруу байна.';
    else action.assigneeId = body.assigneeId;
    action.note = readNote(body, false, errors);
    // Status follows assignment only between new/assigned; terminal and in-progress statuses stay.
    action.to = body.assigneeId && from === 'new' ? 'assigned' : !body.assigneeId && from === 'assigned' ? 'new' : from;
  } else if (type === 'status') {
    if (!canWork) throw new TaskActionError('Энэ хүсэлтэд үйлдэл хийх эрхгүй байна.', 403);
    const to = body.to;
    if (!TASK_STATUSES.includes(to)) errors.to = 'Төлөв буруу байна.';
    else if (to === DOC_REQUEST_ONLY_STATUS && !terminal) errors.to = DOC_REQUEST_ONLY_MESSAGE;
    else if (!TASK_TRANSITIONS[from].includes(to)) {
      if (terminal) throw new TaskActionError('Шийдвэрлэсэн хүсэлтийг зөвхөн менежер дахин нээнэ.', 403, {}, 'TERMINAL');
      errors.to = `"${TASK_STATUS_LABELS[from]}" төлвөөс "${TASK_STATUS_LABELS[to]}" руу шилжих боломжгүй.`;
    } else action.to = to;
    action.note = readNote(body, to === 'rejected' || to === 'resolved', errors);
    if (to === 'resolved') {
      const code = body.outcome && typeof body.outcome === 'object' && !Array.isArray(body.outcome) ? body.outcome.code : undefined;
      if (body.outcome && typeof body.outcome === 'object' && Object.keys(body.outcome).some(key => key !== 'code')) errors.outcome = 'Үр дүн буруу байна.';
      else if (!TASK_OUTCOMES.includes(code)) errors.outcome = 'Шийдвэрлэсэн хүсэлтийн үр дүнг сонгоно уу.';
      else action.outcome = { code };
    } else if (body.outcome !== undefined && body.outcome !== null) errors.outcome = 'Үр дүнг зөвхөн шийдвэрлэх үед сонгоно.';
  } else if (type === 'request_docs') {
    if (!canWork) throw new TaskActionError('Энэ хүсэлтэд үйлдэл хийх эрхгүй байна.', 403);
    if (terminal) throw new TaskActionError('Шийдвэрлэсэн хүсэлтэд баримт хүсэх боломжгүй.', 403, {}, 'TERMINAL');
    if (from === 'new') errors.type = 'Эхлээд хүсэлтийг хуваарилах эсвэл хянаж эхэлнэ үү.';
    let items = [];
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length > TASK_DOC_ITEMS_MAX || body.items.some(item => typeof item !== 'string' || !item.trim() || item.trim().length > TASK_DOC_ITEM_MAX_LENGTH)) errors.items = `Баримт 1–${TASK_DOC_ITEMS_MAX}, тус бүр ${TASK_DOC_ITEM_MAX_LENGTH} тэмдэгт хүртэл.`;
      else items = body.items.map(item => item.trim());
    }
    action.items = items;
    action.note = readNote(body, false, errors);
    if (!errors.items && !errors.note && !items.length && !action.note) errors.items = 'Хүсэх баримт эсвэл тайлбар оруулна уу.';
    action.to = 'additional_docs';
  } else if (type === 'reopen') {
    if (!manager) throw new TaskActionError('Дахин нээх эрхгүй байна.', 403);
    if (!terminal) errors.type = 'Зөвхөн шийдвэрлэсэн эсвэл татгалзсан хүсэлтийг дахин нээнэ.';
    action.note = readNote(body, true, errors);
    action.to = 'in_review';
  }
  if (Object.keys(errors).length) throw new TaskActionError('Мэдээллээ шалгана уу.', 400, errors);
  return action;
}
