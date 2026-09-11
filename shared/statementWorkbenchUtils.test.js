import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyTransaction, deriveUnderwritingMetrics, mergeAnalyses } from './statementWorkbenchUtils.js';

test('classifies payroll income and debt repayment with presentation weights', () => {
  const salary = classifyTransaction({ date: '2026-01-05', description: 'ЦАЛИНГИЙН ОРЛОГО', amount: 1_000_000, direction: 'income' }, 0);
  const repayment = classifyTransaction({ date: '2026-01-10', description: 'ЗЭЭЛИЙН ЭРГЭН ТӨЛӨЛТ', amount: 200_000, direction: 'expense' }, 1);
  assert.equal(salary.incomeType, 'salary');
  assert.equal(salary.eligiblePercent, 100);
  assert.equal(repayment.expenseGroup, 'A');
});

test('derives DTI from eligible income and the larger bank or bureau debt payment', () => {
  const metrics = deriveUnderwritingMetrics({
    accounts: [{ currency: 'MNT' }],
    frontSheet: { coveredMonths: 1, currency: 'MNT' },
    monthlySummary: [{ month: '2026-01', income: 1_000_000, expense: 300_000, netCashFlow: 700_000 }],
    transactions: [
      { date: '2026-01-05', description: 'цалин', amount: 1_000_000, direction: 'income', month: '2026-01' },
      { date: '2026-01-10', description: 'зээлийн төлөлт', amount: 200_000, direction: 'expense', month: '2026-01' },
      { date: '2026-01-11', description: 'хүнс', amount: 100_000, direction: 'expense', month: '2026-01' },
    ],
  }, { credit: { summary: { estimatedMonthlyPayment: 250_000 } }, dtiLimit: 55 });
  assert.equal(metrics.monthlyEligibleIncome, 1_000_000);
  assert.equal(metrics.debtPayment, 250_000);
  assert.equal(metrics.dti, 25);
  assert.equal(metrics.netCashFlow, 700_000);
});

test('keeps each uploaded statement as an independently traceable account', () => {
  const analysis = mergeAnalyses([
    { file: { name: 'khaan.pdf' }, result: { frontSheet: { accountNumber: '111', currency: 'MNT' }, transactions: [{ date: '2026-01-01', direction: 'income', amount: 100, description: 'цалин' }] } },
    { file: { name: 'golomt.pdf' }, result: { frontSheet: { accountNumber: '222', currency: 'MNT' }, transactions: [{ date: '2026-01-02', direction: 'expense', amount: 50, description: 'хүнс' }] } },
  ]);
  assert.equal(analysis.accounts.length, 2);
  assert.equal(analysis.transactions.length, 2);
  assert.notEqual(analysis.transactions[0].sourceId, analysis.transactions[1].sourceId);
});

test('does not calculate a combined DTI across different account currencies', () => {
  const metrics = deriveUnderwritingMetrics({
    accounts: [{ currency: 'MNT' }, { currency: 'USD' }],
    frontSheet: { coveredMonths: 1, currency: 'MIXED' },
    transactions: [
      { date: '2026-01-05', description: 'цалин', amount: 1_000_000, direction: 'income' },
      { date: '2026-01-06', description: 'зээлийн төлөлт', amount: 100_000, direction: 'expense' },
    ],
  });
  assert.equal(metrics.mixedCurrency, true);
  assert.equal(metrics.dti, null);
});

test('applies a tenant rule before the general transaction heuristic', () => {
  const classified = classifyTransaction({ date: '2026-01-03', description: 'ACME PAYROLL', amount: 500_000, direction: 'income' }, 0, {
    rules: [{ keyword: 'acme', direction: 'income', category: 'Гэрээт үйлчилгээ', incomeType: 'contract' }],
  });
  assert.equal(classified.category, 'Гэрээт үйлчилгээ');
  assert.equal(classified.incomeType, 'contract');
  assert.equal(classified.eligiblePercent, 70);
});
