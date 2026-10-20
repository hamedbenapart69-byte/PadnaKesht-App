import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer, calculateInvoice, applyPayment, validateStockChange, normalizeDigits, daysPastDue, calculateStockAdjustments, formatPersianDate } from '../src/domain.js';

test('Persian and Arabic numerals normalize to ASCII digits', () => { assert.equal(normalizeDigits('۰۹۱۲٣٤'), '091234'); });

test('customer requires a name and rejects duplicate normalized name or phone', () => {
  assert.throws(() => validateCustomer({ name: ' ' }), /نام مشتری/);
  const existing = [{ name: 'آقای مقصودی', phone: '09121234567' }];
  assert.throws(() => validateCustomer({ name: 'مشتری دیگر', phone: '۰۹۱۲۱۲۳۴۵۶۷' }, existing), /تکراری/);
  assert.throws(() => validateCustomer({ name: 'نام متفاوت', phone: '09121234567' }, existing), /تکراری/);
  assert.equal(validateCustomer({ name: '  سارا   احمدی ', phone: '' }).name, 'سارا احمدی');
});

test('invoice totals use integer rials and validate discounts', () => {
  const invoice = calculateInvoice([
    { productId: 'p1', quantity: 2, unitPriceRial: 125000 },
    { productId: 'p2', quantity: 1, unitPriceRial: 50000 },
  ], 25000);
  assert.equal(invoice.subtotalRial, 300000);
  assert.equal(invoice.totalRial, 275000);
  assert.throws(() => calculateInvoice([{ productId: 'p1', quantity: 0, unitPriceRial: 10 }]), /تعداد/);
  assert.throws(() => calculateInvoice([{ productId: 'p1', quantity: 1, unitPriceRial: 10 }], 11), /تخفیف/);
  assert.throws(() => calculateInvoice([{ productId: 'p1', quantity: Number.MAX_SAFE_INTEGER, unitPriceRial: 2 }]), /محدوده/);
});

test('partial payments calculate balance and reject overpayment', () => {
  const invoice = calculateInvoice([{ productId: 'p1', quantity: 1, unitPriceRial: 1000 }]);
  assert.deepEqual(applyPayment(invoice, [{ amountRial: 200 }], 300), { paidRial: 500, remainingRial: 500 });
  assert.throws(() => applyPayment(invoice, [{ amountRial: 900 }], 101), /بیشتر/);
  assert.throws(() => applyPayment(invoice, [], 0), /مثبت/);
  assert.throws(() => applyPayment({ totalRial: -1 }, [], 1), /کل فاکتور/);
  assert.throws(() => applyPayment({ totalRial: 100 }, [{ amountRial: Number.MAX_SAFE_INTEGER }, { amountRial: 1 }], 1), /سوابق پرداخت/);
  assert.throws(() => applyPayment({ totalRial: 100 }, [{ amountRial: 101 }], 1), /نامعتبر/);
});

test('stock changes cannot create negative inventory', () => {
  assert.equal(validateStockChange(5, -3), 2);
  assert.throws(() => validateStockChange(1, -2), /کافی نیست/);
  assert.throws(() => validateStockChange(-1, 1), /نامعتبر/);
});

test('overdue days use calendar boundaries and ignore invalid due dates', () => {
  const today = new Date(2026, 9, 20, 12, 0, 0);
  assert.equal(daysPastDue('2026-10-20', today), 0);
  assert.equal(daysPastDue('2026-10-19', today), 1);
  assert.equal(daysPastDue('2026-09-20', today), 30);
  assert.equal(daysPastDue('2026-09-19', today), 31);
  assert.equal(daysPastDue('2026-02-30', today), 0);
  assert.equal(daysPastDue('', today), 0);
});

test('invoice numbering remains unique after imported or non-sequential invoices', async () => {
  const { nextInvoiceNumber } = await import('../src/domain.js');
  assert.equal(nextInvoiceNumber([]), 'PK-00001');
  assert.equal(nextInvoiceNumber([{ number: 'PK-00001' }, { number: 'PK-00007' }, { number: 'CUSTOM' }]), 'PK-00008');
});

test('editing invoice stock restores old quantities before consuming new quantities', () => {
  const products=[{id:'p1',stock:2},{id:'p2',stock:10}];
  const changes=calculateStockAdjustments(products,[{productId:'p1',quantity:3}],[{productId:'p1',quantity:4},{productId:'p2',quantity:2}]);
  assert.deepEqual(changes,[{productId:'p1',delta:-1,nextStock:1},{productId:'p2',delta:-2,nextStock:8}]);
  assert.throws(()=>calculateStockAdjustments(products,[{productId:'p1',quantity:3}],[{productId:'p1',quantity:6}]),/موجودی برای این عملیات کافی نیست/);
  assert.throws(()=>calculateStockAdjustments(products,[],[{productId:'missing',quantity:1}]),/وجود ندارد/);
  assert.throws(()=>calculateStockAdjustments(products,[],[{productId:'p1',quantity:0}]),/نامعتبر/);
});

test('Persian calendar formatting handles Nowruz, leap day, and invalid dates', () => {
  assert.match(formatPersianDate('2026-03-21'), /۱۴۰۵/);
  assert.notEqual(formatPersianDate('2024-02-29'), '—');
  assert.equal(formatPersianDate('2025-02-29'), '—');
  assert.equal(formatPersianDate(''), '—');
  assert.equal(formatPersianDate('not-a-date'), '—');
});
