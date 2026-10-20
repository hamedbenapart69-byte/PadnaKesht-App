import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { buildXlsx } from '../src/xlsx.js';

test('XLSX export is a real ZIP-based Office Open XML workbook with multiple sheets',()=>{
 const bytes=buildXlsx([
  {name:'مشتریان',rows:[['نام','یادداشت'],['آزمایش <محصول>','الف & ب']]},
  {name:'محصولات',rows:[['قیمت','موجودی'],[125000,7]]}
 ]);
 assert.equal(bytes[0],0x50);
 assert.equal(bytes[1],0x4b);
 const files=unzipSync(bytes);
 assert.ok(files['[Content_Types].xml']);
 assert.ok(files['_rels/.rels']);
 assert.ok(files['xl/workbook.xml']);
 assert.ok(files['xl/worksheets/sheet1.xml']);
 assert.ok(files['xl/worksheets/sheet2.xml']);
 const workbook=strFromU8(files['xl/workbook.xml']);
 const firstSheet=strFromU8(files['xl/worksheets/sheet1.xml']);
 const secondSheet=strFromU8(files['xl/worksheets/sheet2.xml']);
 assert.match(workbook,/مشتریان/);
 assert.match(workbook,/محصولات/);
 assert.match(firstSheet,/آزمایش &lt;محصول&gt;/);
 assert.match(firstSheet,/الف &amp; ب/);
 assert.match(secondSheet,/<c r="A2" t="n"><v>125000<\/v><\/c>/);
});

test('XLSX rejects malformed or unsafe sheet names',()=>{
 assert.throws(()=>buildXlsx([]),/دست‌کم یک برگه/);
 assert.throws(()=>buildXlsx([{name:'bad/name',rows:[]}]),/نام یا ساختار/);
 assert.throws(()=>buildXlsx([{name:'تکراری',rows:[]},{name:'تکراری',rows:[] }]),/نام یا ساختار/);
});
