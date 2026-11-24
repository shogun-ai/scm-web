import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, PERMISSION_KEYS, roleHasPermission, userHasNewPermission, resolvePermissions, effectiveMatrix, sanitizeMatrix, catalog } from './permissions.js';

const EXPECTED = ['loan_requests.view_all', 'loan_requests.view_assigned', 'loan_requests.assign', 'loan_requests.change_status', 'loan_requests.request_docs', 'loan_requests.message', 'loan_requests.notes_files', 'loan_requests.reopen', 'loan_requests.delete', 'loan_forms.configure', 'trusts.view', 'trusts.message', 'trusts.assign', 'document_ai.use', 'content.edit', 'admin.users_permissions_logs'];

test('catalog contains every required key with Mongolian labels and valid groups', () => {
  assert.deepEqual([...PERMISSION_KEYS].sort(), [...EXPECTED].sort());
  for (const item of catalog()) { assert.match(item.label, /[Ѐ-ӿ]/); assert.ok(item.group); }
  assert.equal(new Set(PERMISSION_KEYS).size, PERMISSIONS.length);
});

test('defaults mirror existing role behaviour (no matrix saved)', () => {
  assert.equal(roleHasPermission('director', 'loan_requests.view_all'), true);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.view_all'), false);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.view_assigned'), true);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.assign'), false);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.change_status'), true);
  assert.equal(roleHasPermission('director', 'loan_requests.reopen'), true);
  assert.equal(roleHasPermission('director', 'loan_requests.delete'), false);
  assert.equal(roleHasPermission('admin', 'loan_requests.delete'), true);
  assert.equal(roleHasPermission('employee', 'loan_requests.view_assigned'), false);
  assert.equal(roleHasPermission('admin', 'nope'), false);
});

test('legacy cells only grant, never deny', () => {
  const matrix = { employee: { 'los_app:Хариуцагч томилох': 'partial', 'los_app:Статус шинэчлэх': 'full' }, loan_officer: { 'los_app:Статус шинэчлэх': 'none' } };
  assert.equal(roleHasPermission('employee', 'loan_requests.assign', matrix), false); // partial < full
  assert.equal(roleHasPermission('employee', 'loan_requests.change_status', matrix), true);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.change_status', matrix), true); // legacy none does not revoke default
});

test('explicit perm cell wins over defaults; adminOnly cannot be granted; admin cannot be denied', () => {
  const matrix = { loan_officer: { 'perm:loan_requests.change_status': 'none', 'perm:loan_requests.delete': 'full' }, admin: { 'perm:loan_requests.assign': 'none' }, finance_manager: { 'perm:loan_requests.assign': 'full' } };
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.change_status', matrix), false);
  assert.equal(roleHasPermission('loan_officer', 'loan_requests.delete', matrix), false);
  assert.equal(roleHasPermission('admin', 'loan_requests.assign', matrix), true);
  assert.equal(roleHasPermission('finance_manager', 'loan_requests.assign', matrix), true);
});

test('user with several roles gets the union; resolvePermissions and effectiveMatrix agree', () => {
  const user = { role: 'employee', roles: ['loan_officer', 'director'] };
  assert.equal(userHasNewPermission(user, 'loan_requests.assign'), true);
  const set = resolvePermissions(user);
  assert.ok(set.has('loan_requests.view_all') && !set.has('loan_requests.delete'));
  const eff = effectiveMatrix(null);
  assert.equal(eff.admin['loan_forms.configure'], true);
  assert.equal(eff.director['loan_forms.configure'], false);
  assert.equal(eff.loan_officer['trusts.view'], true);
});

test('sanitizeMatrix keeps legacy cells, drops admin/unknown/locked/malformed', () => {
  assert.equal(sanitizeMatrix([]), null);
  assert.equal(sanitizeMatrix('x'), null);
  const out = sanitizeMatrix({ admin: { 'perm:loan_requests.assign': 'none' }, director: { 'los_app:Хүсэлт устгах': 'full', 'perm:loan_requests.assign': 'full', 'perm:loan_requests.delete': 'full', 'perm:bogus': 'full', 'x:y': 'weird', 'a:b': 5 }, bad: 5 });
  assert.deepEqual(out, { director: { 'los_app:Хүсэлт устгах': 'full', 'perm:loan_requests.assign': 'full' } });
});
