// Pure business rules for PadnaKesht. Amounts are integer rials; no floating-point money.
export function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeDigits(value) { return String(value ?? '').replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) >= 0 ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))); }

export function validateCustomer(customer, existing = []) {
  const name = normalizeText(customer?.name);
  const phone = normalizeText(customer?.phone);
  if (!name) throw new Error('نام مشتری الزامی است.');
  if (phone && !/^[+\d۰-۹٠-٩()\-\s]{7,20}$/.test(phone)) {
    throw new Error('شماره تماس معتبر نیست.');
  }
  const key = normalizeDigits(phone).replace(/\D/g, '');
  if (existing.some(item =>
    normalizeText(item.name).toLocaleLowerCase() === name.toLocaleLowerCase() ||
    (key && normalizeDigits(normalizeText(item.phone)).replace(/\D/g, '') === key)
  )) throw new Error('مشتری تکراری است.');
  return { name, phone, address: normalizeText(customer?.address), notes: normalizeText(customer?.notes) };
}

export function calculateInvoice(lines, discountRial = 0) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('فاکتور باید دست‌کم یک ردیف داشته باشد.');
  const clean = lines.map((line) => {
    const productId = normalizeText(line.productId);
    const quantity = Number(line.quantity);
    const unitPriceRial = Number(line.unitPriceRial);
    if (!productId) throw new Error('کالا مشخص نشده است.');
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('تعداد باید عدد صحیح مثبت باشد.');
    if (!Number.isSafeInteger(unitPriceRial) || unitPriceRial < 0) throw new Error('قیمت باید مبلغ صحیح و نامنفی به ریال باشد.');
    const lineTotalRial = quantity * unitPriceRial;
    if (!Number.isSafeInteger(lineTotalRial)) throw new Error('مبلغ ردیف بیش از محدودهٔ مجاز است.');
    return { productId, quantity, unitPriceRial, lineTotalRial };
  });
  const subtotalRial = clean.reduce((sum, line) => sum + line.lineTotalRial, 0);
  if (!Number.isSafeInteger(subtotalRial)) throw new Error('جمع فاکتور بیش از محدودهٔ مجاز است.');
  if (!Number.isSafeInteger(discountRial) || discountRial < 0 || discountRial > subtotalRial) {
    throw new Error('تخفیف باید بین صفر و جمع فاکتور باشد.');
  }
  return { lines: clean, subtotalRial, discountRial, totalRial: subtotalRial - discountRial };
}

export function applyPayment(invoice, previousPayments, paymentRial) {
  if (!Number.isSafeInteger(invoice?.totalRial) || invoice.totalRial < 0) throw new Error('مبلغ کل فاکتور نامعتبر است.');
  if (!Number.isSafeInteger(paymentRial) || paymentRial <= 0) throw new Error('مبلغ پرداخت باید عدد صحیح مثبت به ریال باشد.');
  const paidRial = (previousPayments ?? []).reduce((sum, p) => {
    if (!Number.isSafeInteger(p?.amountRial) || p.amountRial <= 0) throw new Error('سابقهٔ پرداخت نامعتبر است.');
    const next = sum + p.amountRial;
    if (!Number.isSafeInteger(next)) throw new Error('جمع سوابق پرداخت بیش از محدودهٔ مجاز است.');
    return next;
  }, 0);
  const remainingRial = invoice.totalRial - paidRial;
  if (!Number.isSafeInteger(remainingRial) || remainingRial < 0) throw new Error('ماندهٔ فاکتور یا سوابق پرداخت نامعتبر است.');
  if (paymentRial > remainingRial) throw new Error('پرداخت از ماندهٔ فاکتور بیشتر است.');
  const nextPaidRial = paidRial + paymentRial;
  if (!Number.isSafeInteger(nextPaidRial)) throw new Error('جمع پرداخت بیش از محدودهٔ مجاز است.');
  return { paidRial: nextPaidRial, remainingRial: remainingRial - paymentRial };
}

export function validateStockChange(currentStock, delta) {
  if (!Number.isSafeInteger(currentStock) || currentStock < 0 ||
      !Number.isSafeInteger(delta) || !Number.isSafeInteger(currentStock + delta)) {
    throw new Error('مقدار موجودی نامعتبر است.');
  }
  const nextStock = currentStock + delta;
  if (nextStock < 0) throw new Error('موجودی برای این عملیات کافی نیست.');
  return nextStock;
}

/**
 * Return whole calendar days past an ISO YYYY-MM-DD due date.
 * A due date is overdue only after the date has ended; today returns 0.
 */
export function daysPastDue(dueDate, today = new Date()) {
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 0;
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(Date.UTC(year, month - 1, day));
  if (due.getUTCFullYear() !== year || due.getUTCMonth() !== month - 1 || due.getUTCDate() !== day) return 0;
  const now = new Date(today);
  if (Number.isNaN(now.getTime())) return 0;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((todayUtc - due.getTime()) / 86400000));
}

export function nextInvoiceNumber(invoices = []) {
  const max = invoices.reduce((highest, invoice) => {
    const match = /^PK-(\d+)$/.exec(String(invoice?.number ?? ''));
    if (!match) return highest;
    const number = Number(match[1]);
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
  }, 0);
  return 'PK-' + String(max + 1).padStart(5, '0');
}

/**
 * Calculate stock changes for creating or editing an invoice.
 * previousLines are restored to stock before nextLines are consumed.
 */
export function calculateStockAdjustments(products, previousLines = [], nextLines = []) {
  const productById = new Map((products || []).map(product => [product.id, product]));
  const aggregate = lines => {
    const quantities = new Map();
    for (const line of lines || []) {
      if (!line || typeof line.productId !== 'string' || !line.productId ||
          !Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
        throw new Error('اقلام فاکتور برای محاسبهٔ موجودی نامعتبر هستند.');
      }
      const quantity = (quantities.get(line.productId) || 0) + line.quantity;
      if (!Number.isSafeInteger(quantity)) throw new Error('مجموع تعداد کالا بیش از محدودهٔ مجاز است.');
      quantities.set(line.productId, quantity);
    }
    return quantities;
  };
  const oldQuantities = aggregate(previousLines);
  const newQuantities = aggregate(nextLines);
  const ids = new Set([...oldQuantities.keys(), ...newQuantities.keys()]);
  return [...ids].map(productId => {
    const product = productById.get(productId);
    if (!product) throw new Error('یکی از کالاهای فاکتور دیگر در فهرست محصولات وجود ندارد.');
    const delta = (oldQuantities.get(productId) || 0) - (newQuantities.get(productId) || 0);
    return { productId, delta, nextStock: validateStockChange(product.stock, delta) };
  });
}

/** Format a valid ISO calendar date using the device's Intl Persian calendar implementation. */
export function formatPersianDate(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return '—';
    return parsed.toLocaleDateString('fa-IR-u-ca-persian');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('fa-IR-u-ca-persian');
}
