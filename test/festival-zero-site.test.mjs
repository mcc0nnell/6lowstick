// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateFestival} from '../experiments/festival-zero/model.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('Optional browser position sampling does not alter route outcomes', () => {
  const opts={attendees:500,minutes:12,seed:6,reactor:'north',reactorOutageAtMinute:5};
  const plain=simulateFestival(opts);
  const sampled=simulateFestival({...opts,capturePositions:true});
  assert.deepEqual(sampled.totals,plain.totals);
  assert.deepEqual(sampled.timeline,plain.timeline);
  assert.equal(plain.frames,undefined);
  assert.equal(sampled.frames.length,12);
  assert.ok(sampled.frames.every(f=>f.nodes.length<=120 && f.nodes.length>0));
  assert.ok(sampled.frames.every(f=>f.flows.length<=24));
  assert.ok(sampled.frames.some(f=>f.flows.length>0));
  assert.ok(sampled.frames.every(f=>f.flows.every(e=>
    ['threadLocal','threadGateway','loraRelay','unconfirmed'].includes(e.route))));
  assert.ok(sampled.frames[4].outage===false && sampled.frames[5].outage===true);
  for(const frame of sampled.frames) {
    assert.ok(frame.nodes.every(n=>n.x>=0&&n.x<=1400&&n.y>=0&&n.y<=1000));
  }
});
test('Each Reactor can be independently isolated without disabling local stations',()=>{
  for(const reactor of ['north','south']) {
    const run=simulateFestival({attendees:400,minutes:12,seed:8,
      reactor,reactorOutageAtMinute:5,capturePositions:true});
    assert.ok(run.invariants.localThreadDuringOutage>0);
    assert.ok(run.invariants.reactorDependentDuringOutage>0);
    assert.equal(run.segments.beforeOutage.attempted+run.segments.afterOutage.attempted,run.totals.attempted);
  }
  assert.throws(()=>simulateFestival({reactor:'east'}),RangeError);
  assert.throws(()=>simulateFestival({capturePositions:'yes'}),TypeError);
});
test('Public Observatory source has an accessible control and readout fallback',()=>{
  const html=readFileSync(fileURLToPath(new URL('../site/zero/index.html',import.meta.url)),'utf8');
  for(const text of ['Skip to network simulation','aria-pressed','role="status"',
    'Selected minute evidence','SIMULATION ONLY','not measured coverage','aria-label="Replay minute"']) {
    assert.ok(html.includes(text),'Missing: '+text);
  }
  assert.match(html, /<canvas[^>]*aria-hidden="true"/);
  assert.match(html, /<table aria-label="Model results for selected minute"/);
});
