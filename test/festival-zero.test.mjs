// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {simulateFestival} from '../experiments/festival-zero/model.mjs';

test('Festival simulations are reproducible and clearly marked as model-only', () => {
  const opts = {attendees:120,minutes:12,seed:44,reactorOutageAtMinute:5};
  const a = simulateFestival(opts);
  assert.deepEqual(a, simulateFestival(opts));
  assert.equal(a.physicalRf, false);
  assert.equal(a.realReceipts, false);
  assert.equal(a.real6lowLoop, false);
  assert.notDeepEqual(a.totals, simulateFestival({...opts,seed:45}).totals);
});
test('Every attempt yields exactly one model outcome; slots remain bounded', () => {
  for (const attendees of [2,7,50,250,750]) {
    const s = simulateFestival({attendees,minutes:10,seed:6});
    const t = s.totals;
    assert.equal(t.attempted, t.modeledDelivered + t.notDeliveredInModel);
    assert.equal(t.modeledDelivered, t.threadLocal + t.threadGateway + t.loraRelay);
    assert.equal(t.notDeliveredInModel, Object.values(t.failures).reduce((a,b)=>a+b,0));
    assert.equal(t.attempted, s.timeline.reduce((a,b)=>a+b.attempted,0));
    assert.equal(t.attempted, s.categories.crew.attempted + s.categories.friends.attempted);
    assert.ok(s.invariants.maxThreadStationSlots <= s.parameters.budgetsPerStep.threadPerStation);
    assert.ok(s.invariants.maxLoRaRelaySlots <= s.parameters.budgetsPerStep.loraPerRelay);
  }
});
test('Reactor loss retains modeled same-station Thread traffic', () => {
  const s = simulateFestival({attendees:400,minutes:20,seed:2,reactorOutageAtMinute:8});
  assert.ok(s.segments.afterOutage.attempted > 0);
  assert.ok(s.invariants.localThreadDuringOutage > 0);
  assert.ok(s.invariants.reactorDependentDuringOutage > 0);
  assert.equal(s.segments.beforeOutage.attempted + s.segments.afterOutage.attempted,
    s.totals.attempted);
});
test('Crowd saturation causes modeled capacity failures', () => {
  const s = simulateFestival({attendees:2400,minutes:5,seed:6});
  assert.ok(s.totals.failures.capacity > 0);
  assert.ok(s.totals.notDeliveredInModel > 0);
});
test('Invalid parameters and unknown flags are rejected', () => {
  for (const options of [
    {attendees:1},{minutes:0},{seed:0},{reactorOutageAtMinute:45},
    {attendees:3.5},{minutes:361},{seed:4294967296}
  ]) assert.throws(() => simulateFestival(options), RangeError);
  const cli = new URL('../experiments/festival-zero/cli.mjs', import.meta.url).pathname;
  const good = spawnSync(process.execPath,[cli,'--attendees','18','--minutes','2','--json'], {encoding:'utf8'});
  assert.equal(good.status,0,good.stderr);
  assert.equal(JSON.parse(good.stdout).schema,'6lowstick.festival-capacity-model.v0');
  const bad = spawnSync(process.execPath,[cli,'--unknown'], {encoding:'utf8'});
  assert.equal(bad.status,1);
});
