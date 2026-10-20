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
  const key = phone.replace(/\D/g, '');
  if (existing.some(item =>
    normalizeText(item.name).toLocaleLowerCase() === name.toLocaleLowerCase() ||
    (key && normalizeText(item.phone).replace(/\D/g, '') === key)
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
  if (!Number.isSafeInteger(paymentRial) || paymentRial <= 0) throw new Error('مبلغ پرداخت باید عدد صحیح مثبت به ریال باشد.');
  const paidRial = (previousPayments ?? []).reduce((sum, p) => {
    if (!Number.isSafeInteger(p.amountRial) || p.amountRial <= 0) throw new Error('سابقهٔ پرداخت نامعتبر است.');
    return sum + p.amountRial;
  }, 0);
  const remainingRial = invoice.totalRial - paidRial;
  if (!Number.isSafeInteger(remainingRial) || remainingRial < 0) throw new Error('ماندهٔ فاکتور یا سوابق پرداخت نامعتبر است.');
  if (paymentRial > remainingRial) throw new Error('پرداخت از ماندهٔ فاکتور بیشتر است.');
  return { paidRial: paidRial + paymentRial, remainingRial: remainingRial - paymentRial };
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
