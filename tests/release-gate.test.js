import { readFileSync } from 'node:fs';

const matrix = readFileSync(new URL('../docs/ACCEPTANCE-MATRIX.md', import.meta.url), 'utf8');
const gates = readFileSync(new URL('../docs/QUALITY-GATES.md', import.meta.url), 'utf8');
const incomplete = [...matrix.matchAll(/^\| (A\d+) \| ([^|]+) \| ([^|]+) \|$/gm)]
  .filter(([, , , status]) => !/قبول نهایی|تأییدشده با مدرک/.test(status.trim()));
const approvals = /\[x\].*(?:QA|آزمون|بازبین|ناظر)/i.test(gates);
if (incomplete.length || !approvals) {
  console.error('RELEASE BLOCKED: پذیرش کامل و تأییدهای مستند پیش از ساخت APK ثبت نشده‌اند.');
  console.error('موارد نیازمند تکمیل:');
  for (const [, id, criterion, status] of incomplete) console.error(`- ${id}: ${criterion.trim()} — ${status.trim()}`);
  process.exit(1);
}
console.log('Release gate passed.');
