// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {simulateFestival as cWasm} from '../experiments/festival-zero/model.mjs';
import {simulateFestival as legacyReference} from '../experiments/festival-zero/reference.mjs';

const native=fileURLToPath(new URL('../dist/native/6lowzero',import.meta.url));

test('C/WebAssembly matches historical seeded model across crowd sizes and outages',()=>{
  const scenarios=[
    {attendees:2,minutes:3,seed:1,capturePositions:true},
    {attendees:7,minutes:4,seed:44,capturePositions:true},
    {attendees:250,minutes:45,seed:6},
    {attendees:500,minutes:45,seed:6,reactorOutageAtMinute:22},
    {attendees:2000,minutes:45,seed:6},
    {attendees:250,minutes:45,seed:6,reactorOutageAtMinute:0,reactor:'south',capturePositions:true},
    {attendees:115,minutes:8,seed:123,reactorOutageAtMinute:3,capturePositions:true},
    {attendees:250,minutes:6,seed:4294967295,capturePositions:true}
  ];
  for(const options of scenarios) {
    assert.deepEqual(cWasm(options),legacyReference(options),
      'C reference parity: '+JSON.stringify(options));
  }
});
test('Native C executable agrees with WebAssembly for seeded traffic and outages',()=>{
  for(const scenario of [
    {attendees:250,minutes:45,seed:6,reactorOutageAtMinute:null,reactor:'north'},
    {attendees:500,minutes:45,seed:6,reactorOutageAtMinute:22,reactor:'north'},
    {attendees:400,minutes:12,seed:123,reactorOutageAtMinute:5,reactor:'south'}
  ]) {
    const args=['--json','--attendees',String(scenario.attendees),'--minutes',String(scenario.minutes),
      '--seed',String(scenario.seed),'--reactor',scenario.reactor];
    if(scenario.reactorOutageAtMinute!==null)
      args.push('--outage-minute',String(scenario.reactorOutageAtMinute));
    const result=JSON.parse(execFileSync(native,args,{encoding:'utf8',maxBuffer:1024*1024}));
    const wasm=cWasm(scenario);
    assert.deepEqual(result.totals,(({modeledDeliveryPercent,...rest})=>rest)(wasm.totals));
    assert.deepEqual(result.invariants,wasm.invariants);
    assert.deepEqual(result.categories,wasm.categories);
    assert.deepEqual(result.segments,wasm.segments);
    assert.equal(result.timeline.length,wasm.timeline.length);
    for(let m=0;m<wasm.timeline.length;m++) {
      const {minute,...counts}=wasm.timeline[m];
      assert.equal(result.timeline[m].minute,minute);
      assert.deepEqual(result.timeline[m].counts,counts);
    }
    assert.equal(result.physicalRf,false);
    assert.equal(result.realReceipts,false);
  }
});
