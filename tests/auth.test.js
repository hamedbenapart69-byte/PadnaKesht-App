import test from 'node:test';
import assert from 'node:assert/strict';
import {createPinCredential,verifyPinCredential,isValidPin} from '../src/auth.js';

test('local PIN validation accepts only 6 to 12 ASCII digits',()=>{
  assert.equal(isValidPin('123456'),true);
  assert.equal(isValidPin('123456789012'),true);
  assert.equal(isValidPin('12345'),false);
  assert.equal(isValidPin('1234567890123'),false);
  assert.equal(isValidPin('12ab56'),false);
});
test('PIN credential stores a salted PBKDF2 hash and verifies only the matching PIN',async()=>{
  const credential=await createPinCredential('482916');
  assert.equal(credential.algorithm,'PBKDF2-SHA256');
  assert.equal(credential.iterations,210000);
  assert.notEqual(credential.hash,'482916');
  assert.equal(await verifyPinCredential('482916',credential),true);
  assert.equal(await verifyPinCredential('482917',credential),false);
  assert.equal(await verifyPinCredential('12345',credential),false);
});
test('PIN verifier rejects malformed or downgraded credentials',async()=>{
  assert.equal(await verifyPinCredential('482916',null),false);
  const credential=await createPinCredential('482916');
  assert.equal(await verifyPinCredential('482916',{...credential,iterations:1}),false);
  assert.equal(await verifyPinCredential('482916',{...credential,hash:'xyz'}),false);
});
