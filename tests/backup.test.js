import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupPayload, validBackupRecord } from '../src/backup.js';

const empty = () => ({customers:[],products:[],invoices:[],notes:[],audit:[],legacyRecords:[]});
const customer = {id:'c1',name:'مشتری'};
const product = {id:'p1',name:'گردو',unit:'کیلو',priceRial:100000,stock:8};
const invoice = {id:'i1',number:'PK-00001',customerId:'c1',lines:[{productId:'p1',quantity:2,unitPriceRial:100000,lineTotalRial:200000}],subtotalRial:200000,discountRial:0,totalRial:200000,paidRial:50000,status:'active'};

test('backup accepts a well-formed offline business snapshot', () => {
  const payload={customers:[customer],products:[product],invoices:[invoice],notes:[],audit:[]};
  assert.equal(validateBackupPayload(payload,empty()).invoices.length,1);
  assert.equal(validBackupRecord('products',product),true);
});

test('backup rejects impossible balances and malformed invoice lines', () => {
  assert.equal(validBackupRecord('invoices',{...invoice,paidRial:200001}),false);
  assert.equal(validBackupRecord('invoices',{...invoice,lines:[{productId:'p1',quantity:-2,unitPriceRial:5}]}),false);
  assert.equal(validBackupRecord('invoices',{...invoice,lines:[{productId:'p1',quantity:2,unitPriceRial:5,lineTotalRial:9}]}),false);
  assert.equal(validBackupRecord('payments',{id:'pay1',amountRial:1}),false);
});

test('backup rejects duplicate IDs and duplicate invoice numbers before merge', () => {
  const duplicateIds={customers:[customer,{...customer,name:'دیگری'}],products:[],invoices:[],notes:[]};
  assert.throws(()=>validateBackupPayload(duplicateIds,empty()),/شناسهٔ تکراری/);
  const existing={...empty(),invoices:[{...invoice,id:'old',number:'PK-00001'}]};
  assert.throws(()=>validateBackupPayload({customers:[customer],products:[product],invoices:[invoice],notes:[]},existing),/شمارهٔ فاکتور تکراری/);
});

test('backup rejects missing customer or product references without mutating current state', () => {
  const current=empty();
  const before=JSON.stringify(current);
  assert.throws(()=>validateBackupPayload({customers:[],products:[product],invoices:[invoice],notes:[]},current),/مشتری فاکتور/);
  assert.equal(JSON.stringify(current),before);
  assert.throws(()=>validateBackupPayload({customers:[customer],products:[],invoices:[invoice],notes:[]},current),/کالای یکی از فاکتورها/);
  assert.equal(JSON.stringify(current),before);
});

test('backup tolerates omitted optional audit and legacy arrays', () => {
  const result=validateBackupPayload({customers:[customer],products:[product],invoices:[invoice],notes:[]},empty());
  assert.equal(result.audit,undefined);
  assert.equal(result.legacyRecords,undefined);
});

test('backup rejects payment totals that do not reconcile with invoice paid balance', () => {
  const inconsistent = {...invoice, payments:[{id:'pay1',amountRial:40000}]};
  assert.equal(validBackupRecord('invoices', inconsistent), false);
  const consistent = {...invoice, payments:[{id:'pay1',amountRial:50000}]};
  assert.equal(validBackupRecord('invoices', consistent), true);
});

test('backup rejects line subtotals and cancellation refunds that do not reconcile', () => {
  assert.equal(validBackupRecord('invoices', {...invoice, subtotalRial:210000}), false);
  const cancelled = {...invoice, status:'cancelled', paidRial:0, payments:[{id:'pay2',amountRial:50000}], refunds:[{id:'refund2',amountRial:40000}]};
  assert.equal(validBackupRecord('invoices', cancelled), false);
});

test('backup rejects child transaction IDs reused across invoices', () => {
  const second = {...invoice, id:'i2', number:'PK-00002', payments:[{id:'shared-payment',amountRial:50000}]};
  const first = {...invoice, payments:[{id:'shared-payment',amountRial:50000}]};
  assert.throws(()=>validateBackupPayload({customers:[customer],products:[product],invoices:[first,second],notes:[]},empty()), /شناسهٔ تراکنش بین دو فاکتور/);
});

test('backup rejects an edited existing invoice that takes another invoice number', () => {
  const existing={...empty(),invoices:[
    {...invoice,id:'existing-1',number:'PK-00001'},
    {...invoice,id:'existing-2',number:'PK-00002'}
  ]};
  const edited={...invoice,id:'existing-1',number:'PK-00002'};
  assert.throws(()=>validateBackupPayload({
    customers:[customer],products:[product],invoices:[edited],notes:[]
  },existing),/شمارهٔ فاکتور تکراری/);
});
