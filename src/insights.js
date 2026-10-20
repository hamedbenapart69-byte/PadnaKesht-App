const DAY_MS = 86400000;

function validDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, suffix] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day) return null;
  if (suffix && !/^T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(suffix)) return null;
  const date = new Date(suffix ? value : value + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
}
function dayStart(value) { const d = new Date(value); d.setHours(0,0,0,0); return d; }
function safeSum(values) {
  return values.reduce((sum, value) => {
    const next = sum + value;
    return Number.isSafeInteger(next) ? next : sum;
  }, 0);
}

/**
 * Deterministic, device-local business analysis. This is transparent statistical
 * forecasting, not a claim that a trained machine-learning model is running.
 * Money values are integer rials and only saved business records are used.
 */
export function buildOfflineInsights({ customers = [], products = [], invoices = [] } = {}, today = new Date()) {
  const current = dayStart(today);
  const next30 = new Date(current.getTime() + 30 * DAY_MS);
  const next90 = new Date(current.getTime() - 90 * DAY_MS);
  const prev30 = new Date(current.getTime() - 30 * DAY_MS);
  const activeInvoices = invoices.filter(invoice => invoice && invoice.status !== 'cancelled' && Number.isSafeInteger(invoice.totalRial) && invoice.totalRial >= 0 && Number.isSafeInteger(invoice.paidRial) && invoice.paidRial >= 0 && invoice.paidRial <= invoice.totalRial);
  const dated = activeInvoices.map(invoice => ({ invoice, created: validDate(invoice.createdAt), due: validDate(invoice.dueDate) }));
  const salesIn = (from, to) => safeSum(dated.filter(x => x.created && x.created >= from && x.created < to).map(x => Math.max(0, Number.isSafeInteger(x.invoice.totalRial) ? x.invoice.totalRial : 0)));
  const salesLast30Rial = salesIn(prev30, current);
  const salesPrevious30Rial = salesIn(new Date(current.getTime() - 60 * DAY_MS), prev30);
  const salesLast90Rial = salesIn(next90, current);
  const estimatedNext30SalesRial = Math.round(salesLast90Rial / 3);
  const open = activeInvoices.filter(i => Number.isSafeInteger(i.totalRial) && Number.isSafeInteger(i.paidRial) && i.totalRial > i.paidRial);
  const balance = invoice => Math.max(0, invoice.totalRial - invoice.paidRial);
  const overdueReceivablesRial = safeSum(open.filter(i => { const due = validDate(i.dueDate); return due && dayStart(due) < current; }).map(balance));
  const receivablesDue30Rial = safeSum(open.filter(i => { const due = validDate(i.dueDate); return due && dayStart(due) >= current && dayStart(due) <= next30; }).map(balance));
  const quantityByProduct = new Map();
  for (const invoice of activeInvoices) {
    for (const line of Array.isArray(invoice.lines) ? invoice.lines : []) {
      if (!line || typeof line.productId !== 'string' || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) continue;
      quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) || 0) + line.quantity);
    }
  }
  const topProductEntry = [...quantityByProduct.entries()].sort((a,b)=>b[1]-a[1])[0];
  const topProduct = topProductEntry ? {
    name: products.find(p => p.id === topProductEntry[0])?.name || 'کالای حذف‌شده',
    quantity: topProductEntry[1]
  } : null;
  const lowStockProducts = products.filter(p => Number.isSafeInteger(p.stock) && p.stock >= 0 && p.stock <= 2)
    .map(p => ({ name: String(p.name || 'بدون نام'), stock: p.stock }));
  const hasBusinessData = customers.length > 0 || products.length > 0 || activeInvoices.length > 0;
  let salesChangePercent = null;
  if (salesPrevious30Rial > 0) salesChangePercent = Math.round((salesLast30Rial - salesPrevious30Rial) / salesPrevious30Rial * 100);
  const recommendations = [];
  if (!hasBusinessData) recommendations.push('برای فعال‌شدن تحلیل، ابتدا مشتری، محصول و فاکتورهای واقعی را ثبت یا از پشتیبان بازیابی کنید.');
  if (overdueReceivablesRial > 0) recommendations.push('مطالبات سررسیدگذشته را پیگیری کنید؛ این مبلغ از فاکتورهای پرداخت‌نشده و سررسیدهای ثبت‌شده محاسبه شده است.');
  if (lowStockProducts.length) recommendations.push('موجودی اقلام کم‌موجودی را بازبینی کنید: ' + lowStockProducts.map(p => p.name).slice(0,3).join('، ') + '.');
  if (salesChangePercent !== null && salesChangePercent < -10) recommendations.push('فروش ثبت‌شدهٔ ۳۰ روز اخیر نسبت به ۳۰ روز قبل کاهش داشته؛ فاکتورها و روند سفارش‌ها را بررسی کنید.');
  if (salesChangePercent !== null && salesChangePercent > 10) recommendations.push('فروش ثبت‌شدهٔ ۳۰ روز اخیر نسبت به دورهٔ قبل رشد داشته است؛ موجودی اقلام پرفروش را کنترل کنید.');
  if (hasBusinessData && !recommendations.length) recommendations.push('فعلاً هشدار بحرانی از قواعد سادهٔ این گزارش شناسایی نشد؛ ثبت منظم فاکتور و سررسیدها دقت برآورد را بیشتر می‌کند.');
  return {
    hasBusinessData, salesLast30Rial, salesPrevious30Rial, salesLast90Rial,
    estimatedNext30SalesRial, receivablesDue30Rial, overdueReceivablesRial,
    salesChangePercent, topProduct, lowStockProducts, recommendations
  };
}
