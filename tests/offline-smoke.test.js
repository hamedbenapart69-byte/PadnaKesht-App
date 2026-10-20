import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const backup = readFileSync(new URL('../src/backup.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8');
const xlsx = readFileSync(new URL('../src/xlsx.js', import.meta.url), 'utf8');
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
  assert.match(app, /Encrypted SQLite initialization failed/);
  assert.match(app, /setEncryptionSecret\(makeSecret\(\)\)/);
  assert.match(app, /localStorage\.removeItem\(KEY\)/);
  assert.match(config, /\"androidIsEncryption\"\s*:\s*true/);
  for (const table of ['customers','products','invoices','invoice_lines','payments','notes','audit_log']) assert.ok(app.includes('CREATE TABLE IF NOT EXISTS ' + table), 'missing SQLite table ' + table);
  assert.match(app, /function csvCell/);
  assert.match(backup, /export function validBackupRecord/);
  assert.match(backup, /دادهٔ نامعتبر در بخش/);
  assert.match(app, /validateBackupPayload\(payload,state\)/);
  assert.match(app, /text=\"'\"\+text/);
  assert.match(app, /application\/json/);
  assert.match(app, /padnakasht-report\.xlsx/);
  assert.match(xlsx, /application\/vnd\.openxmlformats-officedocument/);
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

test('invoice editing preserves existing payments and exposes explicit cancel action', () => {
  assert.match(app, /data-invoice-edit/);
  assert.match(app, /جمع جدید فاکتور نمی‌تواند از مبلغ دریافت‌شده کمتر باشد/);
  assert.match(app, /invoicePaid\.disabled=true/);
  assert.match(app, /calculateStockAdjustments\(state\.products,oldLines,calc\.lines\)/);
});

test('local overdue notifications are offline and permission-gated', () => {
  assert.match(app, /@capacitor\/local-notifications/);
  assert.match(app, /LocalNotifications\.requestPermissions\(\)/);
  assert.match(app, /data-enable-overdue-notifications/);
  assert.match(app, /buildOverdueNotificationPlan\(state\.invoices,state\.customers/);
});

test('native persistence waits for SQLite commit before confirming a mutation', () => {
  assert.match(app, /return write\.then\(\(\)=>/);
  assert.match(app, /await persist\(\);alert\('فاکتور '/);
  assert.match(app, /guardedSubmit\('invoiceForm',async e=>/);
});

test('local PIN gate is present, keeps authentication offline, and excludes credentials from backup exports', () => {
  assert.match(html, /id="authGate"/);
  assert.match(html, /id="authPinConfirm"/);
  assert.match(app, /createPinCredential/);
  assert.match(app, /verifyPinCredential/);
  assert.match(app, /const \{security,\.\.\.backupState\}=state/);
  assert.match(app, /document\.addEventListener\('visibilitychange'/);
  assert.match(app, /auth-locked/);
});

test('business forms guard against duplicate submissions while async persistence is pending', () => {
  assert.match(app, /function guardedSubmit\(formId,handler\)/);
  assert.match(app, /if\(running\)\{event\.preventDefault\(\);return;\}/);
  for (const formId of ['customerForm','productForm','invoiceForm','paymentForm','noteForm']) {
    assert.ok(app.includes("guardedSubmit('" + formId + "',async e=>{"), 'missing duplicate-submit guard for ' + formId);
  }
});

test('native app fails closed instead of exposing local data when encrypted SQLite initialization fails', () => {
  assert.match(app, /if\(Capacitor\.isNativePlatform\(\)&&!nativeDB\)\{/);
  assert.match(app, /authPin\.disabled=true/);
  assert.match(app, /authSubmit\.disabled=true/);
  assert.match(app, /هیچ اطلاعاتی نمایش داده یا ثبت نمی‌شود/);
});

test('dashboard uses modern visual hierarchy and data-driven insights without fabricated business records', () => {
  assert.match(html, /class="hero"/);
  assert.match(html, /class="hero-mark"/);
  assert.match(html, /id="dashboardInsights"/);
  assert.match(html, /id="restoreFromDashboard"/);
  assert.match(app, /روند فروش · ۶ ماه اخیر/);
  assert.match(app, /دادهٔ نمونه نمایش داده نمی‌شود/);
  assert.match(app, /اطلاعات قبلی در این نصب پیدا نشد/);
  assert.match(app, /restoreFromDashboard/);
});

test('modern dashboard shows real-data insights and a recovery path without seeding fake customer accounts', () => {
  assert.match(html, /class="hero"/);
  assert.match(html, /id="dashboardInsights"/);
  assert.match(html, /class="dashboard-grid"/);
  assert.match(app, /مشتری یا فاکتور نمونه اضافه نشده است/);
  assert.match(app, /data-restore-open/);
  assert.match(app, /restoreFromDashboard/);
  assert.match(app, /data-start-customer/);
});

test('Capacitor CLI tar compatibility shim fails closed on unknown upstream source shape', () => {
  const shim = readFileSync(new URL('../scripts/patch-capacitor-cli-tar.mjs', import.meta.url), 'utf8');
  assert.match(shim, /tar_1\.default/);
  assert.match(shim, /Unknown Capacitor CLI tar import shape/);
  assert.match(readFileSync(new URL('../package.json', import.meta.url), 'utf8'), /"tar": "\^7\.5\.22"/);
});

test('accessible dark mode toggle persists a local appearance preference', () => {
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /data-theme="dark"/);
  assert.match(app, /localStorage\.getItem\('padnakasht-theme'\)/);
  assert.match(app, /localStorage\.setItem\('padnakasht-theme',next\)/);
  assert.match(app, /aria-pressed/);
});

test('invoice cancellation validates every stock restoration before mutating any product', () => {
  assert.match(app, /const stockChanges=calculateStockAdjustments\(state\.products,affected,\[\]\);for\(const change of stockChanges\)/);
  assert.doesNotMatch(app, /for\(const line of affected\)\{const product=state\.products\.find\(p=>p\.id===line\.productId\);if\(product\)product\.stock=validateStockChange\(product\.stock,line\.quantity\);\}/);
});
