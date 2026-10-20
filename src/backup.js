const KEYS = ['customers','products','invoices','notes','audit','legacyRecords'];
const safeAmount = value => Number.isSafeInteger(value) && value >= 0;
const validEntry = entry => entry && typeof entry === 'object' &&
  typeof entry.id === 'string' && entry.id.trim() &&
  Number.isSafeInteger(entry.amountRial) && entry.amountRial > 0;

export function validBackupRecord(key, item) {
  if (!item || typeof item.id !== 'string' || !item.id.trim()) return false;
  switch (key) {
    case 'customers':
      return typeof item.name === 'string' && !!item.name.trim() &&
        ['phone','address','notes'].every(k => item[k] === undefined || typeof item[k] === 'string');
    case 'products':
      return typeof item.name === 'string' && !!item.name.trim() &&
        safeAmount(item.priceRial) && safeAmount(item.stock) &&
        (item.unit === undefined || typeof item.unit === 'string');
    case 'invoices': {
      if (typeof item.number !== 'string' || !item.number.trim() ||
          typeof item.customerId !== 'string' || !item.customerId ||
          !safeAmount(item.totalRial) || !safeAmount(item.paidRial)) return false;
      if (item.status !== 'cancelled' && item.paidRial > item.totalRial) return false;
      if (item.status === 'cancelled' && item.paidRial !== 0) return false;
      if (item.subtotalRial !== undefined && !safeAmount(item.subtotalRial)) return false;
      if (item.discountRial !== undefined && !safeAmount(item.discountRial)) return false;
      if (item.subtotalRial !== undefined && item.discountRial !== undefined &&
          (item.discountRial > item.subtotalRial || item.totalRial !== item.subtotalRial - item.discountRial)) return false;
      if (item.lines !== undefined && (!Array.isArray(item.lines) || !item.lines.every(line =>
        line && typeof line.productId === 'string' && line.productId &&
        Number.isSafeInteger(line.quantity) && line.quantity > 0 &&
        safeAmount(line.unitPriceRial) &&
        (line.lineTotalRial === undefined ||
          safeAmount(line.lineTotalRial) && line.lineTotalRial === line.quantity * line.unitPriceRial)))) return false;
      if (item.payments !== undefined && (!Array.isArray(item.payments) || !item.payments.every(validEntry))) return false;
      if (item.refunds !== undefined && (!Array.isArray(item.refunds) || !item.refunds.every(validEntry))) return false;
      return true;
    }
    case 'notes': return typeof item.text === 'string';
    case 'audit': return typeof item.action === 'string' && typeof item.entity === 'string';
    case 'legacyRecords': return true;
    default: return false;
  }
}

export function validateBackupPayload(payload, currentState) {
  if (!payload || !Array.isArray(payload.customers) || !Array.isArray(payload.products) ||
      !Array.isArray(payload.invoices) || !Array.isArray(payload.notes)) {
    throw new Error('ساختار فایل پشتیبان معتبر نیست.');
  }
  for (const key of KEYS) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) {
      throw new Error('فهرست ' + key + ' در فایل پشتیبان معتبر نیست.');
    }
    if (!Array.isArray(payload[key])) continue;
    const ids = new Set();
    for (const item of payload[key]) {
      if (!validBackupRecord(key, item)) throw new Error('دادهٔ نامعتبر در بخش ' + key + '؛ هیچ داده‌ای وارد نشد.');
      if (ids.has(item.id)) throw new Error('شناسهٔ تکراری در بخش ' + key + '؛ هیچ داده‌ای وارد نشد.');
      ids.add(item.id);
    }
  }
  const knownCustomers = new Set([...(currentState.customers || []), ...payload.customers].map(item => item.id));
  const knownProducts = new Set([...(currentState.products || []), ...payload.products].map(item => item.id));
  const currentInvoiceIds = new Set((currentState.invoices || []).map(item => item.id));
  const invoiceNumbers = new Map((currentState.invoices || []).map(item => [item.number, item.id]));
  for (const invoice of payload.invoices) {
    if (invoiceNumbers.has(invoice.number) && invoiceNumbers.get(invoice.number) !== invoice.id &&
        !currentInvoiceIds.has(invoice.id)) {
      throw new Error('شمارهٔ فاکتور تکراری است: ' + invoice.number + '؛ هیچ داده‌ای وارد نشد.');
    }
    if (invoice.status !== 'cancelled' && !knownCustomers.has(invoice.customerId)) {
      throw new Error('مشتری فاکتور در فایل پشتیبان یا دستگاه پیدا نشد؛ هیچ داده‌ای وارد نشد.');
    }
    const lines = invoice.lines || (invoice.productId ? [{productId: invoice.productId}] : []);
    if (invoice.status !== 'cancelled' && lines.some(line => !knownProducts.has(line.productId))) {
      throw new Error('کالای یکی از فاکتورها در فایل پشتیبان یا دستگاه پیدا نشد؛ هیچ داده‌ای وارد نشد.');
    }
    if (!currentInvoiceIds.has(invoice.id)) invoiceNumbers.set(invoice.number, invoice.id);
  }
  return Object.fromEntries(KEYS.map(key => [key, Array.isArray(payload[key]) ? payload[key] : undefined]));
}
