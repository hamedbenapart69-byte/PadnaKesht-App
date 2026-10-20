function validDate(value){
  if(typeof value!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return null;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(year,month-1,day,9,0,0,0);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)return null;
  return date;
}
export function notificationIdForInvoice(invoiceId){
  let hash=2166136261;
  for(const character of String(invoiceId)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return 10000+((hash>>>0)%2000000000);
}
export function buildOverdueNotificationPlan(invoices,customers,now=new Date()){
  const current=new Date(now);
  if(Number.isNaN(current.getTime()))throw new Error('زمان فعلی برای زمان‌بندی اعلان معتبر نیست.');
  return (invoices||[]).filter(invoice=>invoice&&invoice.status!=='cancelled'&&
    typeof invoice.id==='string'&&invoice.id&&typeof invoice.number==='string'&&
    invoice.dueDate&&Number.isSafeInteger(invoice.totalRial)&&Number.isSafeInteger(invoice.paidRial)&&
    invoice.totalRial>invoice.paidRial)
    .map(invoice=>{
      const due=validDate(invoice.dueDate);
      if(!due)return null;
      const at=new Date(due);
      at.setDate(at.getDate()+31);
      if(at.getTime()<=current.getTime()){
        at.setTime(current.getTime());
        at.setDate(at.getDate()+1);
        at.setHours(9,0,0,0);
      }
      const customer=(customers||[]).find(item=>item.id===invoice.customerId);
      const remaining=invoice.totalRial-invoice.paidRial;
      return {
        id:notificationIdForInvoice(invoice.id),
        title:'مطالبات معوق پادناکِشت',
        body:'فاکتور '+invoice.number+' · '+(customer?.name||'مشتری')+' · مانده '+remaining.toLocaleString('fa-IR')+' ریال',
        schedule:{at,repeats:true,every:'day'},
        extra:{padnakashtOverdue:true,invoiceId:invoice.id}
      };
    }).filter(Boolean);
}
