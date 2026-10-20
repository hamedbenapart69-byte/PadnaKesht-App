import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverdueNotificationPlan, notificationIdForInvoice } from '../src/notifications.js';

const invoices=[
 {id:'i1',number:'PK-00001',customerId:'c1',dueDate:'2026-10-20',totalRial:10000,paidRial:2500,status:'active'},
 {id:'i2',number:'PK-00002',customerId:'c1',dueDate:'2026-10-20',totalRial:10000,paidRial:10000,status:'active'},
 {id:'i3',number:'PK-00003',customerId:'c1',dueDate:'2026-10-20',totalRial:10000,paidRial:0,status:'cancelled'},
 {id:'i4',number:'PK-00004',customerId:'c1',dueDate:'invalid',totalRial:10000,paidRial:0,status:'active'}
];

test('overdue notification plans skip paid, cancelled, and invalid-dated invoices',()=>{
 const plan=buildOverdueNotificationPlan(invoices,[{id:'c1',name:'مشتری نمونه'}],new Date(2026,9,20,10,0,0));
 assert.equal(plan.length,1);
 assert.equal(plan[0].extra.invoiceId,'i1');
 assert.match(plan[0].body,/۷٬۵۰۰ ریال/);
 assert.equal(plan[0].schedule.repeats,true);
 assert.equal(plan[0].schedule.every,'day');
 assert.equal(plan[0].schedule.at.getFullYear(),2026);
 assert.equal(plan[0].schedule.at.getMonth(),10);
 assert.equal(plan[0].schedule.at.getDate(),20);
});

test('already-overdue unpaid invoices are scheduled for the next local morning',()=>{
 const plan=buildOverdueNotificationPlan([{...invoices[0],dueDate:'2026-09-19'}],[],new Date(2026,9,20,10,0,0));
 assert.equal(plan[0].schedule.at.getDate(),21);
 assert.equal(plan[0].schedule.at.getHours(),9);
});

test('notification IDs are stable and within positive Android integer range',()=>{
 assert.equal(notificationIdForInvoice('invoice-1'),notificationIdForInvoice('invoice-1'));
 assert.ok(notificationIdForInvoice('invoice-1')>0);
 assert.ok(notificationIdForInvoice('invoice-1')<2147483647);
});
