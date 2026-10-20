import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const backup = readFileSync(new URL('../src/backup.js', import.meta.url), 'utf8');
test('app shell is Persian and right-to-left', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /charset="UTF-8"/i);
});
test('business modules and backup controls exist', () => {
  for (const id of ['customerForm','productForm','invoiceForm','paymentForm','exportJson','exportCsv','exportExcel','importFile','clearAll']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing element: ' + id);
  }
  for (const feature of ['customers','products','invoices','payments','localStorage','kimi-backup']) {
    if (feature === 'kimi-backup') continue;
    assert.ok(app.includes(feature), 'missing implementation reference: ' + feature);
  }
  assert.match(app, /padnakasht-backup/);
  assert.match(app, /SQLiteConnection/);
  assert.match(app, /CREATE TABLE IF NOT EXISTS app_state/);
  for (const table of ['customers','products','invoices','invoice_lines','payments','notes','audit_log']) assert.ok(app.includes('CREATE TABLE IF NOT EXISTS ' + table), 'missing SQLite table ' + table);
  assert.match(app, /function csvCell/);
  assert.match(app, /function xmlEsc/);
  assert.match(backup, /export function validBackupRecord/);
  assert.match(backup, /دادهٔ نامعتبر در بخش/);
  assert.match(app, /validateBackupPayload\(payload,state\)/);
  assert.match(app, /Excel.Sheet/);
  assert.match(app, /typeof value==='number'\&\&Number.isFinite\(value\)\?'Number':'String'/);
  assert.match(app, /text=\"'\"\+text/);
  assert.match(app, /application\/json/);
});
test('dynamic user content is escaped before rendering', () => {
  assert.match(app, /function esc\(/);
  assert.match(app, /esc\(cell\)/);
  assert.match(app, /function esc\(/);
});
test('app does not require a remote API to initialize', () => {
  assert.doesNotMatch(app, /fetch\s*\(/);
  assert.match(app, /render\(\);/);
});

test('cancelled invoices cannot appear as payment targets or create outstanding balances in exports', () => {
  assert.match(app, /filter\(i=>i\.status!=='cancelled'&&i\.paidRial<i\.totalRial\)/);
  assert.match(app, /i\.status==='cancelled'\?0:i\.totalRial-i\.paidRial/);
});
test('partial payment safely handles older invoices without a payments array', () => {
  assert.match(app, /if\(!Array\.isArray\(invoice\.payments\)\)\{invoice\.payments=\[\]/);
  assert.match(app, /opening-balance-migration/);
});


test('overdue receivables alert is wired into the offline dashboard', () => {
  assert.match(app, /daysPastDue/);
  assert.match(app, /هشدار مطالبات معوق بیش از ۳۰ روز/);
  assert.match(app, /daysPastDue\(i\.dueDate\)>30/);
});


test('SQLite restore compares snapshots and writes a monotonic timestamp', () => {
  assert.match(app, /const localTime=Date\.parse\(state\.updatedAt\|\|''\)/);
  assert.match(app, /state\.updatedAt=new Date\(\)\.toISOString\(\)/);
  assert.match(app, /sqliteTime>=localTime/);
});


test('invoice line editor helpers exist and enforce at least one line', () => {
  assert.match(app, /function refreshInvoiceLineOptions\(/);
  assert.match(app, /function addInvoiceLine\(/);
  assert.match(app, /invoice-line-product/);
  assert.match(app, /فاکتور باید دست‌کم یک قلم داشته باشد/);
  assert.match(app, /if\(!document\.querySelector\('\.invoice-line'\)\)addInvoiceLine\(\)/);
});
