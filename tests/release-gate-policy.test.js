import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('release gate fails closed while acceptance evidence is incomplete', () => {
  const result = spawnSync(process.execPath, ['tests/release-gate.test.js'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0, 'release gate must not approve an incomplete acceptance matrix');
  assert.match(result.stderr, /RELEASE BLOCKED/);
  assert.match(result.stderr, /A01/);
  assert.match(result.stderr, /A15/);
});

test('release workflow propagates a blocked gate as a failed job', () => {
  const workflow = readFileSync(new URL('../.github/workflows/android-apk.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if npm run release:gate; then/);
  assert.match(workflow, /::error title=Release blocked::/);
  assert.match(workflow, /exit 1/);
  assert.match(workflow, /if: steps\.release_gate\.outputs\.approved == 'true'/);
});
