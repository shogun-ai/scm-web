import test from 'node:test';
import assert from 'node:assert/strict';
import { TASK_STATUSES, LEGACY_STATUSES, deriveTaskState, taskStatusFilter, allowedTaskActions, validateTaskAction, TASK_TRANSITIONS } from './loanTaskStatus.js';

// Minimal in-memory Mongo matcher ($and/$or/$in/$nin/$exists/equality, dotted paths, null matches missing).
const get = (doc, path) => path.split('.').reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), doc);
const eq = (value, expected) => (expected === null ? value === undefined || value === null : value === expected);
function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$and') return cond.every(item => matches(doc, item));
    if (key === '$or') return cond.some(item => matches(doc, item));
    const value = get(doc, key);
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$in') return arg.some(item => eq(value, item));
        if (op === '$nin') return !arg.some(item => eq(value, item));
        if (op === '$exists') return arg ? value !== undefined : value === undefined;
        throw new Error(`unsupported ${op}`);
      });
    }
    return eq(value, cond);
  });
}

const ID = '0123456789abcdef01234567';
const legacyDocs = [];
for (const status of [...LEGACY_STATUSES, undefined, '', 'mystery']) {
  for (const assignee of [undefined, { userId: '', name: '' }, { userId: ID, name: 'A' }]) legacyDocs.push({ status, ...(assignee ? { assignee } : {}) });
}
const taskDocs = TASK_STATUSES.map(taskStatus => ({ status: 'pending', taskStatus }));

test('legacy mapping follows design table', () => {
  const d = (status, assignee) => deriveTaskState({ status, ...(assignee ? { assignee: { userId: assignee } } : {}) });
  assert.equal(d('pending').taskStatus, 'new');
  assert.equal(d('pending', ID).taskStatus, 'assigned');
  assert.equal(d('created').taskStatus, 'new');
  assert.equal(d(undefined).taskStatus, 'new');
  assert.equal(d('mystery', ID).taskStatus, 'assigned');
  assert.equal(d('assigned').taskStatus, 'assigned');
  assert.equal(d('returned').taskStatus, 'additional_docs');
  for (const s of ['data_collection', 'studying', 'assessment', 'committee']) assert.equal(d(s).taskStatus, 'in_review');
  assert.equal(d('rejected').taskStatus, 'rejected');
  assert.deepEqual([d('approved').outcome.code, d('resolved').outcome.code, d('disbursed').outcome.code, d('closed').outcome.code], ['approved', 'approved_conditional', 'disbursed', 'other']);
  for (const s of ['approved', 'resolved', 'disbursed', 'closed']) assert.equal(d(s).taskStatus, 'resolved');
  assert.equal(d('closed').outcome.note, 'Хуучин системд хаагдсан');
  assert.equal(d('pending').source, 'legacy');
  assert.equal(d('resolved').legacyStatus, 'resolved');
});

test('task status wins over legacy status; outcome read from taskOutcome', () => {
  const state = deriveTaskState({ status: 'approved', taskStatus: 'in_review' });
  assert.deepEqual(state, { taskStatus: 'in_review', source: 'task', outcome: null, legacyStatus: 'approved' });
  assert.deepEqual(deriveTaskState({ status: 'pending', taskStatus: 'resolved', taskOutcome: { code: 'disbursed' } }).outcome, { code: 'disbursed' });
  assert.equal(deriveTaskState({ status: 'rejected', taskStatus: 'bogus' }).taskStatus, 'rejected');
});

test('taskStatusFilter agrees with deriveTaskState for every legacy/task combination', () => {
  const docs = [...legacyDocs, ...taskDocs, { status: 'approved', taskStatus: 'bogus' }];
  for (const status of TASK_STATUSES) {
    const filter = taskStatusFilter(status);
    for (const doc of docs) assert.equal(matches(doc, filter), deriveTaskState(doc).taskStatus === status, `${status} vs ${JSON.stringify(doc)}`);
  }
  // Statuses partition the collection.
  for (const doc of docs) assert.equal(TASK_STATUSES.filter(status => matches(doc, taskStatusFilter(status))).length, 1);
  assert.deepEqual(taskStatusFilter('all'), {});
  assert.throws(() => taskStatusFilter('nope'), error => error.status === 400);
});

test('allowed actions respect role, assignment and terminal state', () => {
  const open = { status: 'pending', taskStatus: 'in_review' };
  assert.deepEqual(allowedTaskActions(open, { manager: false, isAssignee: true }), { assign: false, transitions: TASK_TRANSITIONS.in_review, reopen: false, note: true, requestDocs: true, uploadFiles: true });
  assert.equal(allowedTaskActions(open, { manager: false, isAssignee: false }).note, false);
  const closed = { status: 'resolved' };
  assert.deepEqual(allowedTaskActions(closed, { isAssignee: true }), { assign: false, transitions: [], reopen: false, note: true, requestDocs: false, uploadFiles: false });
  assert.equal(allowedTaskActions(closed, { manager: true }).reopen, true);
  assert.equal(allowedTaskActions(closed, { manager: true }).uploadFiles, true);
  assert.equal(allowedTaskActions({ status: 'pending' }, { manager: true }).requestDocs, false);
});

test('validateTaskAction enforces transitions, notes, outcomes and allow-listed keys', () => {
  const loan = { taskStatus: 'in_review' };
  const bad = (body, l = loan, opts = {}) => { try { validateTaskAction(body, l, opts); } catch (error) { return error; } assert.fail('expected error'); };
  assert.equal(bad({ type: 'status', to: 'resolved', note: 'ok', expectedRevision: 1 }).errors.outcome !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'resolved', outcome: { code: 'approved' }, expectedRevision: 1 }).errors.note !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'rejected', expectedRevision: 1 }).errors.note !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'new', expectedRevision: 1 }).errors.to !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'resolved', outcome: { code: 'approved' }, note: 'x', expectedRevision: 1 }, { status: 'pending' }).errors.to !== undefined, true, 'new -> resolved forbidden');
  assert.equal(bad({ type: 'status', to: 'in_review' }).errors.expectedRevision !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'in_review', expectedRevision: 1, status: 'approved' }).status, 400);
  assert.equal(bad({ type: 'hack' }).status, 400);
  assert.equal(bad({ type: 'assign', assigneeId: ID, expectedRevision: 0 }).status, 403);
  assert.equal(bad({ type: 'reopen', note: 'x', expectedRevision: 0 }, { status: 'resolved' }).status, 403);
  assert.equal(bad({ type: 'reopen', expectedRevision: 0 }, { status: 'resolved' }, { manager: true }).errors.note !== undefined, true);
  assert.equal(bad({ type: 'status', to: 'in_review', expectedRevision: 0 }, { status: 'resolved' }).status, 403);
  assert.equal(bad({ type: 'request_docs', items: [], expectedRevision: 0 }).errors.items !== undefined, true);
  assert.equal(bad({ type: 'request_docs', items: ['a'], expectedRevision: 0 }, { status: 'pending' }).errors.type !== undefined, true);
  assert.equal(bad({ type: 'note', note: '' }).errors.note !== undefined, true);
  assert.equal(bad({ type: 'note', note: 'x'.repeat(2001) }).errors.note !== undefined, true);
  assert.equal(bad({ type: 'note', note: 'x' }, loan, { isAssignee: false }).status, 403);

  assert.deepEqual(validateTaskAction({ type: 'status', to: 'resolved', outcome: { code: 'approved' }, note: ' Олгоно ', expectedRevision: 4 }, loan), { type: 'status', from: 'in_review', expectedRevision: 4, to: 'resolved', note: 'Олгоно', outcome: { code: 'approved' } });
  assert.equal(validateTaskAction({ type: 'assign', assigneeId: ID, expectedRevision: 0 }, { status: 'pending' }, { manager: true }).to, 'assigned');
  assert.equal(validateTaskAction({ type: 'assign', assigneeId: '', expectedRevision: 0 }, { status: 'pending', taskStatus: 'assigned', assignee: { userId: ID } }, { manager: true }).to, 'new');
  assert.equal(validateTaskAction({ type: 'assign', assigneeId: ID, expectedRevision: 0 }, { status: 'resolved' }, { manager: true }).to, 'resolved');
  assert.equal(validateTaskAction({ type: 'reopen', note: 'буцаан нээв', expectedRevision: 0 }, { status: 'resolved' }, { manager: true }).to, 'in_review');
  assert.deepEqual(validateTaskAction({ type: 'request_docs', items: [' НДШ '], expectedRevision: 2 }, loan).items, ['НДШ']);
  assert.equal(validateTaskAction({ type: 'note', note: 'Утсаар холбогдсон' }, { status: 'resolved' }).note, 'Утсаар холбогдсон');
});
