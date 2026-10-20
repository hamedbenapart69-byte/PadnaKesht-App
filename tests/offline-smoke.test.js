import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
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
  assert.match(app, /function validBackupRecord/);
  assert.match(app, /دادهٔ نامعتبر در بخش/);
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
