import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const cap=JSON.parse(readFileSync(new URL('../capacitor.config.json',import.meta.url),'utf8'));
test('app is Persian and RTL',()=>{assert.match(html,/<html lang="fa" dir="rtl">/);});
test('offline storage and exports are present',()=>{assert.match(html,/localStorage/);assert.match(html,/kimi-backup/);assert.match(html,/exportCsv/);});
test('native app configuration points to built web assets',()=>{assert.equal(cap.webDir,'dist');assert.equal(cap.appId,'com.padnakasht.kimi');});
test('core data modules are present',()=>{for(const label of ['مشتری','محصول','فاکتور','تراکنش','یادداشت'])assert.ok(html.includes(label));});