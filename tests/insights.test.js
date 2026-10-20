import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfflineInsights } from '../src/insights.js';

const today = new Date('2026-10-20T12:00:00');
const customers = [{id:'c1',name:'مشتری'}];
const products = [
  {id:'p1',name:'گردو',stock:2},
  {id:'p2',name:'شیره سیب',stock:8}
];
const invoices = [
  {id:'i1',status:'active',createdAt:'2026-10-01T12:00:00.000Z',dueDate:'2026-10-25',totalRial:100000,paidRial:50000,lines:[{productId:'p1',quantity:3}]},
  {id:'i2',status:'active',createdAt:'2026-09-10T12:00:00.000Z',dueDate:'2026-10-01',totalRial:50000,paidRial:30000,lines:[{productId:'p1',quantity:2}]},
  {id:'i3',status:'cancelled',createdAt:'2026-10-05T12:00:00.000Z',dueDate:'2026-10-25',totalRial:900000,paidRial:0,lines:[{productId:'p2',quantity:99}]}
];

test('offline forecast uses real active invoices, excludes cancelled invoices and computes due balances', () => {
  const result = buildOfflineInsights({customers,products,invoices},today);
  assert.equal(result.hasBusinessData,true);
  assert.equal(result.salesLast30Rial,100000);
  assert.equal(result.salesPrevious30Rial,50000);
  assert.equal(result.salesLast90Rial,150000);
  assert.equal(result.estimatedNext30SalesRial,50000);
  assert.equal(result.receivablesDue30Rial,50000);
  assert.equal(result.overdueReceivablesRial,20000);
  assert.deepEqual(result.topProduct,{name:'گردو',quantity:5});
  assert.deepEqual(result.lowStockProducts,[{name:'گردو',stock:2}]);
  assert.equal(result.salesChangePercent,100);
});

test('offline insights never invent forecasts for an empty business', () => {
  const result = buildOfflineInsights({},today);
  assert.equal(result.hasBusinessData,false);
  assert.equal(result.salesLast90Rial,0);
  assert.equal(result.estimatedNext30SalesRial,0);
  assert.equal(result.topProduct,null);
  assert.ok(result.recommendations.some(text=>text.includes('پشتیبان')));
});

test('malformed dates and malformed monetary values are ignored safely', () => {
  const result = buildOfflineInsights({
    customers:[],products:[],
    invoices:[
      {status:'active',createdAt:'invalid',dueDate:'invalid',totalRial:NaN,paidRial:0,lines:[{productId:'p1',quantity:0}]},
      {status:'active',createdAt:'2026-10-10',dueDate:'2026-10-30',totalRial:100,paidRial:150}
    ]
  },today);
  assert.equal(result.salesLast90Rial,0);
  assert.equal(result.receivablesDue30Rial,0);
  assert.equal(result.overdueReceivablesRial,0);
});

test('invalid calendar dates are excluded instead of rolling into another month', () => {
  const result = buildOfflineInsights({
    customers: [],
    products: [],
    invoices: [
      {status:'active',createdAt:'2026-02-30',dueDate:'2026-02-30',totalRial:50000,paidRial:0,lines:[]},
      {status:'active',createdAt:'2026-10-10T12:00:00.000Z',dueDate:'2026-10-30garbage',totalRial:70000,paidRial:0,lines:[]}
    ]
  }, today);
  assert.equal(result.salesLast90Rial, 0);
  assert.equal(result.receivablesDue30Rial, 0);
  assert.equal(result.overdueReceivablesRial, 0);
});
