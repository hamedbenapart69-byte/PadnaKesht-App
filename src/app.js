import { validateCustomer, calculateInvoice, applyPayment, validateStockChange, calculateStockAdjustments, normalizeText, normalizeDigits, daysPastDue, nextInvoiceNumber } from './domain.js';
import { validateBackupPayload } from './backup.js';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const KEY = 'padnakasht-local-v2';
const customerEditId = document.getElementById('customerEditId');
const productEditId = document.getElementById('productEditId');
const customerName = document.getElementById('customerName');
const customerPhone = document.getElementById('customerPhone');
const customerAddress = document.getElementById('customerAddress');
const customerNotes = document.getElementById('customerNotes');
const customerSearch = document.getElementById('customerSearch');
const productName = document.getElementById('productName');
const productUnit = document.getElementById('productUnit');
const productPrice = document.getElementById('productPrice');
const productStock = document.getElementById('productStock');
const invoiceCustomer = document.getElementById('invoiceCustomer');
const invoiceDiscount = document.getElementById('invoiceDiscount');
const invoicePaid = document.getElementById('invoicePaid');
const invoiceDue = document.getElementById('invoiceDue');
const paymentInvoice = document.getElementById('paymentInvoice');
const paymentAmount = document.getElementById('paymentAmount');
const noteText = document.getElementById('noteText');
const importFile = document.getElementById('importFile');

const emptyState = () => ({version:2,customers:[],products:[],invoices:[],notes:[],audit:[],legacyRecords:[]});
let nativeDB = null;
let nativeWriteQueue = Promise.resolve();
let state = loadState();
let invoiceEditId = '';
async function syncNormalizedTables(db, snapshot){
  await db.beginTransaction();
  try{
    await db.run('INSERT OR REPLACE INTO app_state (id, payload) VALUES (1, ?)',[snapshot],false);
    for(const table of ['payments','invoice_lines','invoices','products','customers','notes','audit_log'])await db.run('DELETE FROM '+table,[],false);
    const data=JSON.parse(snapshot);
    for(const c of data.customers||[])await db.run('INSERT INTO customers(id,name,phone,address,notes,created_at) VALUES(?,?,?,?,?,?)',[c.id,c.name,c.phone||'',c.address||'',c.notes||'',c.createdAt||''],false);
    for(const p of data.products||[])await db.run('INSERT INTO products(id,name,unit,price_rial,stock,created_at) VALUES(?,?,?,?,?,?)',[p.id,p.name,p.unit||'عدد',p.priceRial,p.stock,p.createdAt||''],false);
    for(const i of data.invoices||[]){
      await db.run('INSERT INTO invoices(id,number,customer_id,subtotal_rial,discount_rial,total_rial,paid_rial,due_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[i.id,i.number,i.customerId,i.subtotalRial||0,i.discountRial||0,i.totalRial||0,i.paidRial||0,i.dueDate||'',i.status||'active',i.createdAt||''],false);
      const lines=i.lines||[{productId:i.productId,productName:i.productName,unit:i.unit,quantity:i.quantity,unitPriceRial:i.unitPriceRial,lineTotalRial:(i.quantity||0)*(i.unitPriceRial||0)}];
      for(const [index,line] of lines.entries())await db.run('INSERT INTO invoice_lines(id,invoice_id,product_id,product_name,unit,quantity,unit_price_rial,line_total_rial) VALUES(?,?,?,?,?,?,?,?)',[i.id+'-'+index,i.id,line.productId,line.productName||'',line.unit||'',line.quantity,line.unitPriceRial,line.lineTotalRial||line.quantity*line.unitPriceRial],false);
      for(const payment of i.payments||[])await db.run('INSERT INTO payments(id,invoice_id,amount_rial,kind,created_at) VALUES(?,?,?,?,?)',[payment.id,i.id,payment.amountRial,payment.kind||'payment',payment.at||''],false);
      for(const refund of i.refunds||[])await db.run('INSERT INTO payments(id,invoice_id,amount_rial,kind,created_at) VALUES(?,?,?,?,?)',[refund.id,i.id,refund.amountRial,'refund',refund.at||''],false);
    }
    for(const n of data.notes||[])await db.run('INSERT INTO notes(id,text,created_at) VALUES(?,?,?)',[n.id,n.text,n.createdAt||''],false);
    for(const a of data.audit||[])await db.run('INSERT INTO audit_log(id,action,entity,entity_id,detail,created_at) VALUES(?,?,?,?,?,?)',[a.id,a.action,a.entity,a.entityId||'',a.detail||'',a.at||''],false);
    await db.commitTransaction();
  }catch(error){try{await db.rollbackTransaction();}catch{}throw error;}
}
async function initializeNativeDatabase(){if(!Capacitor.isNativePlatform()){const status=document.getElementById('storageStatus');if(status)status.textContent='حالت مرورگر: ذخیره‌سازی محلی';return null;}try{const sqlite=new SQLiteConnection(CapacitorSQLite);let db;const existing=await sqlite.isConnection('padnakasht',false);if(existing?.result){db=await sqlite.retrieveConnection('padnakasht',false);}else{db=await sqlite.createConnection('padnakasht',false,'no-encryption',1,false);}await db.open();await db.execute('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL)');await db.execute('CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, notes TEXT, created_at TEXT)');await db.execute('CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, price_rial INTEGER NOT NULL, stock INTEGER NOT NULL, created_at TEXT)');await db.execute('CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, number TEXT NOT NULL, customer_id TEXT NOT NULL, subtotal_rial INTEGER NOT NULL, discount_rial INTEGER NOT NULL, total_rial INTEGER NOT NULL, paid_rial INTEGER NOT NULL, due_date TEXT, status TEXT NOT NULL, created_at TEXT)');await db.execute('CREATE TABLE IF NOT EXISTS invoice_lines (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, product_id TEXT NOT NULL, product_name TEXT, unit TEXT, quantity INTEGER NOT NULL, unit_price_rial INTEGER NOT NULL, line_total_rial INTEGER NOT NULL)');await db.execute('CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, amount_rial INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT)');await db.execute('CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, text TEXT NOT NULL, created_at TEXT)');await db.execute('CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT, created_at TEXT)');const result=await db.query('SELECT payload FROM app_state WHERE id = 1');const payload=result.values?.[0]?.payload;if(payload){const restored=JSON.parse(payload);if(restored&&restored.version===2){const localTime=Date.parse(state.updatedAt||'');const sqliteTime=Date.parse(restored.updatedAt||'');if(!Number.isFinite(localTime)||Number.isFinite(sqliteTime)&&sqliteTime>=localTime)state={...emptyState(),...restored};}}await syncNormalizedTables(db,JSON.stringify(state));const status=document.getElementById('storageStatus');if(status)status.textContent='ذخیره‌سازی اصلی: پایگاه داده SQLite محلی';return db;}catch(error){const status=document.getElementById('storageStatus');if(status)status.textContent='هشدار: SQLite در دسترس نیست؛ ذخیره‌سازی جایگزین مرورگر فعال است.';console.error('SQLite initialization failed',error);return null;}}
nativeDB = await initializeNativeDatabase();
if(nativeDB){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function loadState(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&x.version===2)return {...emptyState(),...x};}catch{}const fresh=emptyState();try{const old=JSON.parse(localStorage.getItem('kimi-offline-v1')||'null');if(old&&Array.isArray(old.records)){fresh.legacyRecords=old.records.filter(r=>r&&typeof r==='object');fresh.notes=(Array.isArray(old.notes)?old.notes:[]).filter(n=>n&&typeof n==='object').map(n=>({id:String(n.id||uid()),text:String(n.text||''),createdAt:n.created||new Date().toISOString()}));fresh.audit.push({id:uid(),action:'legacy-migration',entity:'backup',entityId:'kimi-offline-v1',at:new Date().toISOString()});} }catch{}return fresh;}
function persist(){state.updatedAt=new Date().toISOString();const snapshot=JSON.stringify(state);try{localStorage.setItem(KEY,snapshot);}catch(e){alert('ذخیره‌سازی جایگزین ناموفق است؛ فوراً از اطلاعات پشتیبان بگیرید.');throw e;}if(nativeDB){nativeWriteQueue=nativeWriteQueue.then(()=>syncNormalizedTables(nativeDB,snapshot)).then(()=>{const status=document.getElementById('storageStatus');if(status)status.textContent='ذخیره‌سازی اصلی: پایگاه داده SQLite محلی';}).catch(error=>{const status=document.getElementById('storageStatus');if(status)status.textContent='خطا: ذخیره‌سازی SQLite ناموفق شد؛ از ادامهٔ ثبت اطلاعات خودداری و پشتیبان تهیه کنید.';console.error('SQLite write failed',error);alert('خطا در نوشتن پایگاه داده SQLite. پیش از ادامه، پشتیبان بگیرید و برنامه را دوباره باز کنید.');});}if(!document.querySelector('.invoice-line'))addInvoiceLine();
render();}
function uid(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(v){const n=Number(normalizeDigits(v));if(!Number.isSafeInteger(n)||n<0)throw new Error('مبلغ و تعداد باید عدد صحیح نامنفی باشند.');return n}
function money(v){return Number(v||0).toLocaleString('fa-IR')+' ریال'}
function date(v){try{if(!v)return '—';const value=/^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v)+'T12:00:00':v;return new Date(value).toLocaleDateString('fa-IR-u-ca-persian')}catch{return '—'}}
function audit(action,entity,id,detail=''){state.audit.push({id:uid(),action,entity,entityId:id,detail,at:new Date().toISOString()})}
function csvCell(value){let text=String(value??'');if(/^\s*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function download(name,content,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function options(items,placeholder){return '<option value="">'+esc(placeholder)+'</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')}
function refreshInvoiceLineOptions(){
  document.querySelectorAll('.invoice-line-product').forEach(select=>{
    const selected=select.value;
    select.innerHTML=options(state.products,'انتخاب کالا');
    if(state.products.some(p=>p.id===selected))select.value=selected;
  });
}
function addInvoiceLine(productId='',quantity=1){
  const row=document.createElement('div');
  row.className='invoice-line formgrid';
  row.style.marginBottom='8px';
  row.innerHTML='<div class="field"><label>کالا</label><select class="invoice-line-product" required>'+options(state.products,'انتخاب کالا')+'</select></div><div class="field"><label>تعداد</label><input class="invoice-line-quantity" type="number" min="1" step="1" value="'+esc(quantity)+'" required></div><div class="field" style="align-self:end"><button type="button" class="btn danger invoice-line-remove">حذف قلم</button></div>';
  document.getElementById('invoiceLines').append(row);
  const select=row.querySelector('.invoice-line-product');
  if(state.products.some(p=>p.id===productId))select.value=productId;
  return row;
}
function render(){const activeInvoices=state.invoices.filter(i=>i.status!=='cancelled');const unpaid=activeInvoices.reduce((s,i)=>s+Math.max(0,i.totalRial-i.paidRial),0);const sales=activeInvoices.reduce((s,i)=>s+i.totalRial,0);const overdueInvoices=activeInvoices.filter(i=>i.dueDate&&daysPastDue(i.dueDate)>30&&i.paidRial<i.totalRial);const overdueAmount=overdueInvoices.reduce((sum,i)=>sum+Math.max(0,i.totalRial-i.paidRial),0);
document.getElementById('summary').innerHTML=[['مشتریان',state.customers.length],['محصولات',state.products.length],['فاکتورها',state.invoices.length],['فروش ثبت‌شده',money(sales)],['مانده مطالبات',money(unpaid)],['مطالبات بیش از ۳۰ روز',money(overdueAmount)]].map(x=>'<div class="stat"><small>'+esc(x[0])+'</small><strong>'+esc(typeof x[1]==='number'?x[1].toLocaleString('fa-IR'):x[1])+'</strong></div>').join('');
document.getElementById('overview').innerHTML='آمار از داده‌های ثبت‌شده در همین دستگاه محاسبه می‌شود.'+(overdueInvoices.length?'<div role="alert" style="margin-top:12px;padding:12px;border-radius:10px;background:#fff0e8;color:#7b3217"><strong>هشدار مطالبات معوق بیش از ۳۰ روز</strong><p>تعداد '+overdueInvoices.length.toLocaleString('fa-IR')+' فاکتور · مانده '+esc(money(overdueAmount))+'</p>'+table(['فاکتور','مشتری','روز تأخیر','مانده'],overdueInvoices.map(i=>[i.number,state.customers.find(c=>c.id===i.customerId)?.name||'—',daysPastDue(i.dueDate).toLocaleString('fa-IR'),money(i.totalRial-i.paidRial)]))+'</div>':'<p class="hint">در حال حاضر فاکتور پرداخت‌نشده‌ای با بیش از ۳۰ روز تأخیر وجود ندارد.</p>');
document.getElementById('customerList').innerHTML=table(['نام','تماس','نشانی','عملیات'],state.customers.filter(c=>(c.name+' '+c.phone+' '+c.address).includes(document.getElementById('customerSearch').value.trim())).map(c=>[c.name,c.phone||'—',c.address||'—',{html:'<button class="btn" data-customer-edit="'+esc(c.id)+'">ویرایش</button> <button class="btn danger" data-customer-delete="'+esc(c.id)+'">حذف</button>'}]));
document.getElementById('productList').innerHTML=table(['محصول','واحد','قیمت (ریال)','موجودی','عملیات'],state.products.map(p=>[p.name,p.unit,money(p.priceRial),String(p.stock),{html:'<button class="btn" data-product-edit="'+esc(p.id)+'">ویرایش</button> <button class="btn" data-product-price="'+esc(p.id)+'">تغییر قیمت</button> <button class="btn" data-product-stock="'+esc(p.id)+'">افزودن موجودی</button> <button class="btn" data-product-history="'+esc(p.id)+'">سوابق</button> <button class="btn danger" data-product-delete="'+esc(p.id)+'">حذف</button>'}]));
document.getElementById('invoiceCustomer').innerHTML=options(state.customers,'انتخاب مشتری');refreshInvoiceLineOptions();
document.getElementById('paymentInvoice').innerHTML=options(state.invoices.filter(i=>i.status!=='cancelled'&&i.paidRial<i.totalRial).map(i=>({id:i.id,name:i.number+' · '+(state.customers.find(c=>c.id===i.customerId)?.name||'مشتری حذف‌شده')+' · مانده '+money(i.totalRial-i.paidRial)})),'انتخاب فاکتور');
document.getElementById('invoiceList').innerHTML=table(['شماره','مشتری','تاریخ','جمع','دریافتی','مانده','سررسید','عملیات'],state.invoices.slice().reverse().map(i=>[i.number,state.customers.find(c=>c.id===i.customerId)?.name||'—',date(i.createdAt),money(i.totalRial),i.status==='cancelled'?'لغو شده':money(i.paidRial),i.status==='cancelled'?money(0):money(i.totalRial-i.paidRial),i.dueDate?date(i.dueDate):'—',i.status==='cancelled'?'لغوشده':{html:'<button class="btn" data-invoice-edit="'+esc(i.id)+'">ویرایش</button> <button class="btn danger" data-invoice-cancel="'+esc(i.id)+'">لغو</button>'}]));
document.getElementById('reportContent').innerHTML='<div class="grid">'+[['کل فروش',money(sales)],['دریافتی',money(state.invoices.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+i.paidRial,0))],['مانده',money(unpaid)],['موجودی اقلام',state.products.reduce((s,p)=>s+p.stock,0).toLocaleString('fa-IR')]].map(x=>'<div class="stat"><small>'+x[0]+'</small><strong>'+esc(x[1])+'</strong></div>').join('')+'</div><h2>مطالبات سررسیدشده</h2>'+table(['فاکتور','مشتری','سررسید','مانده'],state.invoices.filter(i=>i.status!=='cancelled'&&i.dueDate&&i.dueDate<new Date().toISOString().slice(0,10)&&i.paidRial<i.totalRial).map(i=>[i.number,state.customers.find(c=>c.id===i.customerId)?.name||'—',date(i.dueDate),money(i.totalRial-i.paidRial)]))+'<h2 style="margin-top:20px">گردش حساب مشتریان</h2>'+table(['مشتری','فروش','دریافتی','مانده'],state.customers.map(c=>{const inv=activeInvoices.filter(i=>i.customerId===c.id);const total=inv.reduce((s,i)=>s+i.totalRial,0);const paid=inv.reduce((s,i)=>s+i.paidRial,0);return [c.name,money(total),money(paid),money(total-paid)];}))+'<h2 style="margin-top:20px">وضعیت موجودی</h2>'+table(['محصول','واحد','موجودی','قیمت'],state.products.map(p=>[p.name,p.unit,String(p.stock),money(p.priceRial)]));
const legacyNotice=document.getElementById('legacyNotice');if(legacyNotice)legacyNotice.textContent=state.legacyRecords.length?'از نسخهٔ قبلی '+state.legacyRecords.length.toLocaleString('fa-IR')+' رکورد قدیمی نگهداری شده است؛ آن‌ها را از پشتیبان JSON می‌توانید حفظ کنید.':'';
document.getElementById('recent').innerHTML=state.invoices.length?'<h3>آخرین فاکتورها</h3>'+table(['شماره','تاریخ','جمع','مانده'],state.invoices.slice(-5).reverse().map(i=>[i.number,date(i.createdAt),money(i.totalRial),money(i.status==='cancelled'?0:i.totalRial-i.paidRial)])):'<div class="empty">هنوز فاکتوری ثبت نشده است. ابتدا مشتری و محصول تعریف کنید.</div>';
document.getElementById('noteList').innerHTML=state.notes.slice().reverse().map(n=>'<div class="record">'+esc(n.text)+' <small>'+esc(date(n.createdAt))+'</small> <button class="btn danger" data-note-delete="'+esc(n.id)+'">حذف</button></div>').join('')||'<div class="empty">یادداشتی وجود ندارد.</div>';
}
function table(headers,rows){if(!rows.length)return '<div class="empty">موردی برای نمایش وجود ندارد.</div>';return '<table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+(cell&&typeof cell==='object'&&typeof cell.html==='string'?cell.html:esc(cell))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));['dashboard','customers','products','invoices','reports','backup','notes'].forEach(t=>document.getElementById(t).classList.toggle('hidden',t!==b.dataset.tab));}));
document.getElementById('customerForm').addEventListener('reset',()=>{customerEditId.value='';});
document.getElementById('productForm').addEventListener('reset',()=>{productEditId.value='';});
document.getElementById('customerForm').addEventListener('submit',e=>{e.preventDefault();try{const editingId=customerEditId.value;const customer=validateCustomer({name:customerName.value,phone:customerPhone.value,address:customerAddress.value,notes:customerNotes.value},state.customers.filter(c=>c.id!==editingId));if(editingId){const current=state.customers.find(c=>c.id===editingId);if(!current)throw Error('مشتری برای ویرایش پیدا نشد.');Object.assign(current,customer);audit('update','customer',current.id);persist();e.target.reset();customerEditId.value='';alert('اطلاعات مشتری اصلاح شد.');}else{const item={id:uid(),...customer,createdAt:new Date().toISOString()};state.customers.push(item);audit('create','customer',item.id);persist();e.target.reset();alert('مشتری ذخیره شد.')}}catch(err){alert(err.message||'ذخیره مشتری ناموفق بود.')}});
document.getElementById('productForm').addEventListener('submit',e=>{e.preventDefault();try{const editingId=productEditId.value;const name=normalizeText(productName.value);if(!name)throw Error('نام محصول الزامی است.');if(state.products.some(p=>p.id!==editingId&&p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('نام محصول تکراری است.');const price=num(productPrice.value),stock=num(productStock.value);if(editingId){const current=state.products.find(p=>p.id===editingId);if(!current)throw Error('محصول برای ویرایش پیدا نشد.');if(price!==current.priceRial){current.priceHistory=current.priceHistory||[];current.priceHistory.push({priceRial:price,at:new Date().toISOString()});}const stockDelta=stock-current.stock;current.name=name;current.unit=productUnit.value;current.priceRial=price;current.stock=stock;audit('update','product',current.id,'price '+price);if(stockDelta!==0)audit('stock-adjustment','product',current.id,'delta '+stockDelta);persist();e.target.reset();productEditId.value='';alert('اطلاعات محصول اصلاح شد.');}else{const item={id:uid(),name,unit:productUnit.value,priceRial:price,stock,createdAt:new Date().toISOString(),priceHistory:[{priceRial:price,at:new Date().toISOString()}]};state.products.push(item);audit('create','product',item.id);persist();e.target.reset();alert('محصول ذخیره شد.')}}catch(err){alert(err.message||'ذخیره محصول ناموفق بود.')}});
document.getElementById('addInvoiceLine').addEventListener('click',()=>addInvoiceLine());
document.getElementById('invoiceLines').addEventListener('click',e=>{if(e.target.closest('.invoice-line-remove')){const rows=[...document.querySelectorAll('.invoice-line')];if(rows.length<=1)return alert('فاکتور باید دست‌کم یک قلم داشته باشد.');e.target.closest('.invoice-line').remove();}});
document.getElementById('invoiceForm').addEventListener('submit',e=>{e.preventDefault();try{
const editingId=invoiceEditId;
const existingInvoice=editingId?state.invoices.find(i=>i.id===editingId):null;
if(editingId&&(!existingInvoice||existingInvoice.status==='cancelled'))throw Error('فاکتور برای ویرایش معتبر نیست.');
const customer=state.customers.find(c=>c.id===invoiceCustomer.value);if(!customer)throw Error('مشتری معتبر انتخاب کنید.');
const oldLines=existingInvoice?.lines|| (existingInvoice?[{productId:existingInvoice.productId,quantity:existingInvoice.quantity,unitPriceRial:existingInvoice.unitPriceRial,productName:existingInvoice.productName,unit:existingInvoice.unit}]:[]);
const lines=[...document.querySelectorAll('.invoice-line')].map(row=>{const product=state.products.find(p=>p.id===row.querySelector('.invoice-line-product').value);if(!product)throw Error('برای هر قلم محصول معتبر انتخاب کنید.');const previous=oldLines.find(line=>line.productId===product.id);return {product,productId:product.id,quantity:num(row.querySelector('.invoice-line-quantity').value),unitPriceRial:previous?.unitPriceRial??product.priceRial};});
if(!lines.length)throw Error('فاکتور باید دست‌کم یک قلم داشته باشد.');
const discount=num(invoiceDiscount.value);
const calc=calculateInvoice(lines.map(l=>({productId:l.productId,quantity:l.quantity,unitPriceRial:l.unitPriceRial})),discount);
const stockChanges=calculateStockAdjustments(state.products,oldLines,calc.lines);
let payment;
if(existingInvoice){
  if(calc.totalRial<existingInvoice.paidRial)throw Error('جمع جدید فاکتور نمی‌تواند از مبلغ دریافت‌شده کمتر باشد.');
  payment={paidRial:existingInvoice.paidRial,remainingRial:calc.totalRial-existingInvoice.paidRial};
}else{
  const paid=num(invoicePaid.value);
  payment=paid?applyPayment(calc,[],paid):{paidRial:0,remainingRial:calc.totalRial};
}
for(const change of stockChanges){const product=state.products.find(p=>p.id===change.productId);product.stock=change.nextStock;}
const invoiceLines=calc.lines.map(l=>({...l,productName:state.products.find(p=>p.id===l.productId)?.name||'',unit:state.products.find(p=>p.id===l.productId)?.unit||''}));
if(existingInvoice){
  Object.assign(existingInvoice,{customerId:customer.id,lines:invoiceLines,productId:invoiceLines[0].productId,productName:invoiceLines[0].productName,unit:invoiceLines[0].unit,quantity:invoiceLines.reduce((sum,line)=>sum+line.quantity,0),unitPriceRial:invoiceLines[0].unitPriceRial,subtotalRial:calc.subtotalRial,discountRial:discount,totalRial:calc.totalRial,dueDate:invoiceDue.value||''});
  audit('update','invoice',existingInvoice.id,existingInvoice.number);
  for(const change of stockChanges)if(change.delta!==0)audit('stock-adjustment','product',change.productId,'invoice edit '+existingInvoice.number+' delta '+change.delta);
  persist();alert('تغییرات فاکتور '+existingInvoice.number+' ذخیره شد. مانده: '+money(payment.remainingRial));
}else{
  const id=uid();const invoice={id,number:nextInvoiceNumber(state.invoices),customerId:customer.id,lines:invoiceLines,productId:invoiceLines[0].productId,productName:invoiceLines[0].productName,unit:invoiceLines[0].unit,quantity:invoiceLines.reduce((sum,line)=>sum+line.quantity,0),unitPriceRial:invoiceLines[0].unitPriceRial,subtotalRial:calc.subtotalRial,discountRial:discount,totalRial:calc.totalRial,paidRial:payment.paidRial,dueDate:invoiceDue.value||'',createdAt:new Date().toISOString(),status:'active',payments:payment.paidRial?[{id:uid(),amountRial:payment.paidRial,at:new Date().toISOString(),kind:'initial'}]:[]};
  state.invoices.push(invoice);audit('create','invoice',id,invoice.number);
  for(const change of stockChanges)if(change.delta!==0)audit('stock-decrease','product',change.productId,'invoice '+invoice.number+' delta '+change.delta);
  persist();alert('فاکتور '+invoice.number+' ثبت شد. مانده: '+money(payment.remainingRial));
}
invoiceEditId='';e.target.reset();invoicePaid.disabled=false;document.getElementById('invoiceSubmit').textContent='ثبت فاکتور و به‌روزرسانی موجودی';document.getElementById('cancelInvoiceEdit').classList.add('hidden');document.getElementById('invoiceLines').innerHTML='';addInvoiceLine();invoiceDiscount.value='0';invoicePaid.value='0';
}catch(err){alert(err.message||'ثبت یا ویرایش فاکتور ناموفق بود.')}});
document.getElementById('cancelInvoiceEdit').addEventListener('click',()=>{invoiceEditId='';document.getElementById('invoiceForm').reset();invoicePaid.disabled=false;document.getElementById('invoiceSubmit').textContent='ثبت فاکتور و به‌روزرسانی موجودی';document.getElementById('cancelInvoiceEdit').classList.add('hidden');document.getElementById('invoiceLines').innerHTML='';addInvoiceLine();invoiceDiscount.value='0';invoicePaid.value='0';});
document.getElementById('paymentForm').addEventListener('submit',e=>{e.preventDefault();try{const invoice=state.invoices.find(i=>i.id===paymentInvoice.value);if(!invoice||invoice.status==='cancelled')throw Error('فاکتور معتبر انتخاب کنید.');const amount=num(paymentAmount.value);if(!Array.isArray(invoice.payments)){invoice.payments=[];if(invoice.paidRial>0)invoice.payments.push({id:uid(),amountRial:invoice.paidRial,at:invoice.createdAt||new Date().toISOString(),kind:'opening-balance-migration'});}const result=applyPayment({totalRial:invoice.totalRial},invoice.payments,amount);invoice.payments.push({id:uid(),amountRial:amount,at:new Date().toISOString(),kind:'partial'});invoice.paidRial=result.paidRial;audit('payment','invoice',invoice.id,money(amount));persist();e.target.reset();alert('دریافت ثبت شد. مانده: '+money(result.remainingRial));}catch(err){alert(err.message||'ثبت دریافت ناموفق بود.')}});
document.addEventListener('click',e=>{
const invoiceEditButton=e.target.closest('[data-invoice-edit]');
if(invoiceEditButton){
  const item=state.invoices.find(invoice=>invoice.id===invoiceEditButton.dataset.invoiceEdit);
  if(item&&item.status!=='cancelled'){
    invoiceEditId=item.id;invoiceCustomer.value=item.customerId;invoiceDue.value=item.dueDate||'';invoiceDiscount.value=String(item.discountRial||0);invoicePaid.value='0';invoicePaid.disabled=true;
    document.getElementById('invoiceSubmit').textContent='ذخیره تغییرات فاکتور';document.getElementById('cancelInvoiceEdit').classList.remove('hidden');
    document.getElementById('invoiceLines').innerHTML='';
    const lines=item.lines||[{productId:item.productId,quantity:item.quantity}];
    for(const line of lines)addInvoiceLine(line.productId,line.quantity);
    document.querySelector('[data-tab="invoices"]').click();
  }
}
const ce=e.target.closest('[data-customer-edit]');if(ce){const item=state.customers.find(x=>x.id===ce.dataset.customerEdit);if(item){customerEditId.value=item.id;customerName.value=item.name;customerPhone.value=item.phone||'';customerAddress.value=item.address||'';customerNotes.value=item.notes||'';document.querySelector('[data-tab="customers"]').click();customerName.focus();}}
const pe=e.target.closest('[data-product-edit]');if(pe){const item=state.products.find(x=>x.id===pe.dataset.productEdit);if(item){productEditId.value=item.id;productName.value=item.name;productUnit.value=item.unit;productPrice.value=String(item.priceRial);productStock.value=String(item.stock);document.querySelector('[data-tab="products"]').click();productName.focus();}}
const c=e.target.closest('[data-customer-delete]');if(c){const id=c.dataset.customerDelete;if(state.invoices.some(i=>i.customerId===id&&i.status!=='cancelled'))return alert('مشتری دارای فاکتور است؛ برای حفظ سابقه حذف نمی‌شود.');if(confirm('مشتری حذف شود؟')){state.customers=state.customers.filter(x=>x.id!==id);audit('delete','customer',id);persist();}}
const historyButton=e.target.closest('[data-product-history]');if(historyButton){const item=state.products.find(x=>x.id===historyButton.dataset.productHistory);if(item){const events=state.audit.filter(a=>a.entityId===item.id).slice().reverse();alert(events.length?events.map(a=>date(a.at)+' · '+a.action+' · '+(a.detail||'')).join('\n'):'سابقه‌ای ثبت نشده است.');}}
const priceButton=e.target.closest('[data-product-price]');if(priceButton){const product=state.products.find(x=>x.id===priceButton.dataset.productPrice);if(product){const answer=prompt('قیمت جدید به ریال را وارد کنید:',String(product.priceRial));if(answer!==null){try{const next=num(answer);if(next===product.priceRial)return;product.priceHistory=product.priceHistory||[];product.priceHistory.push({priceRial:next,at:new Date().toISOString()});product.priceRial=next;audit('price-change','product',product.id,money(next));persist();}catch(err){alert(err.message||'قیمت نامعتبر است.')}}}}
const stockButton=e.target.closest('[data-product-stock]');if(stockButton){const product=state.products.find(x=>x.id===stockButton.dataset.productStock);if(product){const answer=prompt('مقدار موجودی اضافه‌شونده را وارد کنید:', '1');if(answer!==null){try{const amount=num(answer);if(amount<=0)throw Error('مقدار باید بزرگ‌تر از صفر باشد.');product.stock=validateStockChange(product.stock,amount);audit('stock-increase','product',product.id,'qty '+amount);persist();}catch(err){alert(err.message||'مقدار نامعتبر است.')}}}}
const p=e.target.closest('[data-product-delete]');if(p){const id=p.dataset.productDelete;if(state.invoices.some(i=>i.productId===id||(i.lines||[]).some(line=>line.productId===id)))return alert('محصول دارای سابقه فاکتور است؛ حذف نمی‌شود.');if(confirm('محصول حذف شود؟')){state.products=state.products.filter(x=>x.id!==id);audit('delete','product',id);persist();}}
const inv=e.target.closest('[data-invoice-cancel]');if(inv){const item=state.invoices.find(i=>i.id===inv.dataset.invoiceCancel);if(!item||item.status==='cancelled')return;if(confirm('فاکتور '+item.number+' لغو شود؟ موجودی بازمی‌گردد و اگر وجهی دریافت شده باشد، یک ثبت برگشت مالی به مبلغ '+money(item.paidRial)+' ایجاد می‌شود. فقط اگر برگشت وجه واقعاً انجام شده یا جداگانه ثبت خواهد شد تأیید کنید.')){const affected=item.lines||[{productId:item.productId,quantity:item.quantity}];for(const line of affected){const product=state.products.find(p=>p.id===line.productId);if(product)product.stock=validateStockChange(product.stock,line.quantity);}if(item.paidRial>0){item.refunds=item.refunds||[];item.refunds.push({id:uid(),amountRial:item.paidRial,at:new Date().toISOString(),kind:'cancellation-refund'});audit('refund','invoice',item.id,money(item.paidRial));item.refundedRial=(item.refundedRial||0)+item.paidRial;item.paidRial=0;}item.status='cancelled';audit('cancel','invoice',item.id);persist();}}
const n=e.target.closest('[data-note-delete]');if(n&&confirm('یادداشت حذف شود؟')){state.notes=state.notes.filter(x=>x.id!==n.dataset.noteDelete);persist();}});
document.getElementById('noteForm').addEventListener('submit',e=>{e.preventDefault();const text=normalizeText(noteText.value);if(!text)return;state.notes.push({id:uid(),text,createdAt:new Date().toISOString()});persist();e.target.reset();});
document.getElementById('exportJson').onclick=()=>download('padnakasht-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');
document.getElementById('importButton').onclick=()=>importFile.click();
document.getElementById('importFile').onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
    const payload=JSON.parse(await f.text());
    const validated=validateBackupPayload(payload,state);
    // Validation completes before the first state mutation.
    for(const key of ['customers','products','invoices','notes','audit','legacyRecords']){
      if(!Array.isArray(validated[key]))continue;
      const ids=new Set(state[key].map(item=>item.id));
      for(const item of validated[key])if(!ids.has(item.id)){state[key].push(item);ids.add(item.id);}
    }
    state.audit.push({id:uid(),action:'restore-merge',entity:'backup',entityId:'',at:new Date().toISOString()});
    persist();alert('بازیابی و ادغام داده‌ها انجام شد.');
  }catch(err){alert(err.message||'فایل پشتیبان معتبر نیست.')}
  e.target.value='';
};
document.getElementById('exportCsv').onclick=()=>{const rows=[['نوع','شناسه','نام/شماره','مبلغ کل ریال','دریافتی ریال','مانده ریال','تاریخ']];state.customers.forEach(c=>rows.push(['مشتری',c.id,c.name,'','','',c.createdAt]));state.products.forEach(p=>rows.push(['محصول',p.id,p.name,p.priceRial,'',p.stock,p.createdAt]));state.invoices.forEach(i=>rows.push(['فاکتور',i.id,i.number,i.totalRial,i.status==='cancelled'?0:i.paidRial,i.status==='cancelled'?0:i.totalRial-i.paidRial,i.createdAt]));download('padnakasht-report.csv','\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8')};
function xmlEsc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
document.getElementById('exportExcel').onclick=()=>{const sheets=[
{name:'مشتریان',rows:[['نام','شماره تماس','نشانی','توضیحات'],...state.customers.map(c=>[c.name,c.phone,c.address,c.notes])]},
{name:'محصولات',rows:[['نام محصول','واحد','قیمت ریال','موجودی'],...state.products.map(p=>[p.name,p.unit,p.priceRial,p.stock])]},
{name:'فاکتورها',rows:[['شماره','مشتری','تاریخ','اقلام','جمع ریال','تخفیف ریال','کل ریال','دریافتی ریال','مانده ریال','سررسید','وضعیت'],...state.invoices.map(i=>[i.number,state.customers.find(c=>c.id===i.customerId)?.name||'',date(i.createdAt),(i.lines||[]).map(l=>(l.productName||'')+' × '+l.quantity).join('؛ '),i.subtotalRial,i.discountRial,i.totalRial,i.paidRial,i.status==='cancelled'?0:i.totalRial-i.paidRial,i.dueDate?date(i.dueDate):'',i.status==='cancelled'?'لغو شده':'فعال'])]}
];const xmlCell=value=>'<Cell><Data ss:Type="'+(typeof value==='number'&&Number.isFinite(value)?'Number':'String')+'">'+xmlEsc(value)+'</Data></Cell>';const xml='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+sheets.map(sheet=>'<Worksheet ss:Name="'+xmlEsc(sheet.name)+'"><Table>'+sheet.rows.map(row=>'<Row>'+row.map(xmlCell).join('')+'</Row>').join('')+'</Table></Worksheet>').join('')+'</Workbook>';download('padnakasht-report.xml',xml,'application/vnd.ms-excel;charset=utf-8');};
document.getElementById('print').onclick=()=>window.print();
document.getElementById('clearAll').onclick=()=>{if(confirm('همه اطلاعات این دستگاه برای همیشه حذف شود؟ ابتدا پشتیبان بگیرید.')){state=emptyState();persist();}};
render();
