import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../node_modules/@capacitor/cli/dist/util/template.js', import.meta.url);
let source = readFileSync(path, 'utf8');

if (source.includes('tar_1.default')) {
  source = source.replaceAll('tar_1.default', 'tar_1');
  writeFileSync(path, source);
  console.log('Applied Capacitor 6 CommonJS compatibility shim for tar 7 named exports.');
} else if (source.includes('tar_1.extract') || source.includes('tar.extract')) {
  console.log('Capacitor CLI tar import is already compatible; no patch needed.');
} else {
  throw new Error('Unknown Capacitor CLI tar import shape; refusing an unverified patch.');
}
