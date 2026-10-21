// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTelemetryRecorder, validateTelemetry} from '../src/telemetry/monotonic.mjs';
import {buildTimeline, parseEvidence, replayState} from '../src/tui/evidence.mjs';
import {isMeasuredTimeline, playbackDelayMs} from '../src/tui/timed.mjs';
import {renderReport, renderScreen} from '../src/tui/render.mjs';
import {makeObservations} from '../src/camel/export.mjs';

const base = JSON.parse(readFileSync(new URL('../fixtures/tui/illustrative-drill.json', import.meta.url), 'utf8'));
function observed() {
  let clock = 100;
  const rec = createTelemetryRecorder({now: () => clock});
  rec.record('baseline','phase_start');
  clock += 4; rec.record('baseline','send_attempt','strobe');
  clock += 2; rec.record('baseline','receiver_accept','strobe');
  clock += 8; rec.record('baseline','gateway_ack','strobe');
  clock += 5; rec.record('degraded','receiver_offline','haptic');
  clock += 1; rec.record('degraded','phase_start');
  clock += 1; rec.record('degraded','send_attempt','haptic');
  clock += 2500; rec.record('degraded','missing','haptic');
  return rec.snapshot();
}
test('recorder preserves monotonic observations and no wire or human identity', () => {
  const timing = observed();
  assert.equal(timing.events.length,8);
  assert.deepEqual(Object.keys(timing.events[0]),['seq','t_ms','phase','kind','receiver']);
  assert.equal(timing.events[0].t_ms,0);
  assert.equal(timing.events.at(-1).t_ms,2521);
  assert.doesNotMatch(JSON.stringify(timing), /drill001|ZCZC|EA2\||HMAC/);
  assert.equal(validateTelemetry(timing), timing);
});
test('rejects malformed event clocks, ordering and unknown receiver', () => {
  const timing = observed();
  assert.throws(() => validateTelemetry({...timing,events:timing.events.map((x,i) =>
    i===2 ? {...x,t_ms:-1}:x)}), /Invalid/);
  assert.throws(() => validateTelemetry({...timing,events:timing.events.map((x,i) =>
    i===2 ? {...x,receiver:'intruder'}:x)}), /Invalid/);
  assert.throws(() => validateTelemetry({...timing,events:timing.events.map((x,i) =>
    i===2 ? {...x,seq:99}:x)}), /Invalid/);
  assert.throws(() => validateTelemetry({...timing,events:timing.events.map((x,i) =>
    i===2 ? {...x,packet:'forbidden'}:x)}), /Invalid/);
});
test('timestamped playback is real harness elapsed time, not phase fiction', () => {
  const input = {...base, timing:observed()};
  const steps = buildTimeline(parseEvidence(input));
  assert.equal(isMeasuredTimeline(steps),true);
  assert.equal(steps[3].kind,'ack');
  assert.equal(steps[3].latency,14);
  assert.equal(playbackDelayMs(steps,2),8);
  assert.equal(playbackDelayMs(steps,2,2),4);
  assert.equal(playbackDelayMs(steps,-1),0);
  assert.equal(steps.at(-1).time_ms,2521);
  const state = replayState(steps, steps.length-1);
  assert.equal(state.status.haptic.state,'missing');
  const frame = renderScreen({data:input,steps,cursor:steps.length-1,view:'timeline',plain:true,height:40});
  assert.match(frame,/MEASURED HARNESS EVENT ORDER/);
  assert.match(frame,/2521.0/);
  assert.match(renderReport({data:input,steps}),/Harness monotonic elapsed/);
  assert.doesNotMatch(renderReport({data:input,steps}),/Event order is reconstructed/);
});
test('legacy evidence still uses reconstructed steps and explicit absent timing', () => {
  const steps = buildTimeline(base);
  assert.equal(isMeasuredTimeline(steps),false);
  assert.equal(playbackDelayMs(steps,0),850);
  assert.match(renderReport({data:base,steps}),/Event order is reconstructed/);
});
test('Camel forwards monotonic harness timing but never an RF packet timestamp', () => {
  const input = {...base, timing:observed()};
  const timed = makeObservations(input,'a'.repeat(64));
  assert.equal(timed[3].harness_elapsed_ms,14);
  assert.equal(timed[3].ack_latency_ms,14);
  assert.equal(timed[3].event_clock,'harness_monotonic');
  assert.ok(timed.every(x => x.measured_packet_timestamp === null));
  const reconstructed = makeObservations(base,'a'.repeat(64));
  assert.ok(reconstructed.every(x => x.harness_elapsed_ms === null));
  assert.ok(reconstructed.every(x => x.event_clock === 'reconstructed_phase_sequence'));
});
