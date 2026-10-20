import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer, calculateInvoice, applyPayment, validateStockChange, normalizeDigits, daysPastDue } from '../src/domain.js';

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
});

test('partial payments calculate balance and reject overpayment', () => {
  const invoice = calculateInvoice([{ productId: 'p1', quantity: 1, unitPriceRial: 1000 }]);
  assert.deepEqual(applyPayment(invoice, [{ amountRial: 200 }], 300), { paidRial: 500, remainingRial: 500 });
  assert.throws(() => applyPayment(invoice, [{ amountRial: 900 }], 101), /بیشتر/);
  assert.throws(() => applyPayment(invoice, [], 0), /مثبت/);
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
