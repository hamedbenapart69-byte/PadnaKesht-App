import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('app shell is Persian and right-to-left', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /charset=UTF-8/i);
});

test('core records and backup UI are bundled locally', () => {
  for (const id of ['recordForm', 'recordList', 'noteForm', 'exportJson', 'exportCsv', 'importFile']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing element: ' + id);
  }
  assert.match(html, /localStorage/);
  assert.match(html, /application\/json/);
});

test('record rendering escapes user-supplied content', () => {
  assert.match(html, /function esc\(/);
  assert.match(html, /esc\(r\.name\)/);
  assert.match(html, /esc\(r\.detail\)/);
});

test('web shell does not require a remote API to initialize', () => {
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(html, /render\(\);/);
});
