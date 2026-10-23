// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Build C11 once for native experimentation and freestanding WebAssembly.
// Browser receives only a thin JS data adapter, not a JS traffic model.
import {copyFileSync,readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=resolve(root,'experiments/festival-zero');
const source=resolve(base,'engine.c');
const generated=resolve(root,'site/zero');
const native=resolve(root,'dist/native/6lowzero');
mkdirSync(generated,{recursive:true});
mkdirSync(dirname(native),{recursive:true});
function run(command,args) {
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8'});
  if(result.status!==0)throw new Error(command+' failed: '+(result.stderr||result.stdout));
}
run(process.env.CC||'cc',['-std=c11','-O2','-Wall','-Wextra','-Werror',
  source,resolve(base,'native.c'),'-lm','-o',native]);
const wasm=resolve(base,'model.wasm');
run(process.env.CLANG||'clang',['--target=wasm32','-std=c11','-O2','-nostdlib',
  '-Wl,--no-entry','-Wl,--export-all','-Wl,--export-memory',
  '-Wl,--initial-memory=16777216','-Wl,--max-memory=16777216',
  source,'-o',wasm]);
copyFileSync(resolve(base,'model.mjs'),resolve(generated,'model.mjs'));
copyFileSync(wasm,resolve(generated,'model.wasm'));
const sha256=createHash('sha256').update(readFileSync(wasm)).digest('hex');
console.log(JSON.stringify({engine:'C11',native:'dist/native/6lowzero',
  wasm:'site/zero/model.wasm',adapter:'site/zero/model.mjs',sha256}));
