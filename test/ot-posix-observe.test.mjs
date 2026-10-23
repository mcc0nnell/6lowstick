// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../bin/6low.mjs',import.meta.url));
test('POSIX adapter queries only read-only commands and rejects bad responses',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ot-posix-fixture-'));
 try{
  const bin=join(dir,'mock-ot-cli-ftd');
  writeFileSync(bin,`#!/usr/bin/env node\nprocess.stdin.on('data',x=>{const q=x.toString().trim();process.stdout.write(q==='state'?'router\\nDone\\n':q==='rloc16'?'0x1234\\nDone\\n':'Error 7: InvalidArgs\\n');});\n`);
  chmodSync(bin,0o700);
  for(const [cmd,want] of [['state','router'],['rloc16','1234']]){
   const r=spawnSync(process.execPath,[cli,'mesh','query',cmd,'--binary',bin,'--node-id','7'],{encoding:'utf8',timeout:5000});
   assert.equal(r.status,0,r.stderr);const o=JSON.parse(r.stdout);assert.equal(o.value,want);assert.equal(o.source,'ot_posix_simulator');assert.equal(o.physicalRadioVerified,false);
  }
  assert.equal(spawnSync(process.execPath,[cli,'mesh','query','thread start','--binary',bin,'--node-id','7']).status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
