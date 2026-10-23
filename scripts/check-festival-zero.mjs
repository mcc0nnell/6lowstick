// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=x=>readFileSync(resolve(root,x),'utf8');
const html=read('site/zero/index.html'),script=read('site/zero/zero.js'),css=read('site/zero/zero.css');
assert.equal(read('site/zero/model.mjs'),read('experiments/festival-zero/model.mjs'),
  'Published browser adapter must match tested C/WASM adapter exactly');
assert.deepEqual(readFileSync(resolve(root,'site/zero/model.wasm')),
  readFileSync(resolve(root,'experiments/festival-zero/model.wasm')),
  'Published C/WASM binary must match the generated engine binary');
assert.ok(read('experiments/festival-zero/engine.c').includes('int festival_run('));
for (const id of ['main','crowd','north','south','restore','minute','venue','trend','play','back',
  'forward','reduced','download','status','evidenceRows','delivered','attempted','capacity',
  'fallback','advisory','advisoryTitle','northState','southState']) {
  assert.match(html,new RegExp('\\bid="'+id+'"'), 'Missing UI id '+id);
}
assert.match(html,/<html lang="en">/);
assert.match(html,/href="#main"/);
assert.match(html,/SIMULATION ONLY/);
assert.match(html,/No 802\.15\.4 MAC simulation/);
assert.match(html,/POSITION SAMPLES \/ NOT GPS/);
assert.match(script,/from '\.\/model\.mjs'/);
assert.match(script,/capturePositions:true/);
assert.match(script,/aria-pressed/);
assert.doesNotMatch(script,/WebSocket|sendBeacon|localStorage|\bfetch\s*\(/);
assert.match(css,/:focus-visible/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log(JSON.stringify({status:'PASS',site:'site/zero/',engine:'C11 -> WebAssembly',sourceModel:'exact adapter and WASM copies',
  simulationOnly:true,physicalRadio:false,humanReceipt:false}));
