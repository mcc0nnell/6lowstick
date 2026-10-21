// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildTimeline, parseEvidence, replayState} from '../src/tui/evidence.mjs';
import {renderScreen, unstyle} from '../src/tui/render.mjs';
const data = JSON.parse(readFileSync(new URL('../fixtures/tui/illustrative-drill.json', import.meta.url)));

test('rejects invalid schema and contradictory receipts', () => {
  assert.throws(() => parseEvidence({schema:'invalid'}), /Expected/);
  assert.throws(() => parseEvidence({...data, baseline:{...data.baseline,missing:['strobe']}}), /Inconsistent/);
  assert.throws(() => parseEvidence({...data, degraded:{...data.degraded, requested:['alien']}}), /Inconsistent/);
});

test('evidence playback preserves rejection, replay, and missing haptic ACK', () => {
  const steps = buildTimeline(data);
  assert.ok(steps.some(s => s.kind === 'reject' && s.receiver === 'strobe'));
  assert.ok(steps.some(s => s.kind === 'duplicate'));
  assert.ok(steps.some(s => s.phase === 'same' && s.kind === 'gate'));
  const state = replayState(steps, steps.length - 1);
  assert.equal(state.status.strobe.state, 'ack');
  assert.equal(state.status.display.state, 'ack');
  assert.equal(state.status.haptic.state, 'missing');
  assert.deepEqual(state.counts, {acked:2,missing:1,pending:0});
});

test('terminal views remain read-only and explicit about evidence boundaries', () => {
  const steps = buildTimeline(data);
  const frame = unstyle(renderScreen({data, steps, cursor:steps.length-1, plain:true, width:100, height:50}));
  assert.match(frame, /HAPTIC/);
  assert.match(frame, /MISSING/);
  assert.match(frame, /Application ACK ≠ physical actuation ≠ human acknowledgment/);
  assert.match(frame, /NOT measured RF paths/);
  for (const view of ['topology','timeline','evidence','text']) {
    const out = unstyle(renderScreen({data, steps, cursor:0, view, width:60, height:22, plain:true}));
    assert.match(out, /READ ONLY/);
    assert.ok(out.split('\n').length <= 23);
  }
});

test('noninteractive CLI is usable without terminals or external services', () => {
  const filename = new URL('../src/tui/cli.mjs', import.meta.url).pathname;
  const stdout = execFileSync(process.execPath, [filename,'--demo','--snapshot','--plain'], {encoding:'utf8'});
  assert.match(stdout, /MESH CONTROL/);
  assert.match(stdout, /DEGRADED DELIVERY/);
  assert.match(stdout, /MISSING/);
});

test('evidence strings cannot inject terminal escape/control sequences', () => {
  const attacker = {
    ...data,
    warning: '\x1b[2JFAKE\nWARNING',
    transport: '\x1b]52;c;Y2xpcGJvYXJk\x07',
    degraded: {...data.degraded, id: 'drill002\x1b[2J'}
  };
  const steps = buildTimeline(attacker);
  for (const view of ['timeline','evidence','text']) {
    const frame = renderScreen({data:attacker, steps, cursor:steps.length - 1,
      view, width:110, height:48, plain:true});
    assert.doesNotMatch(frame, /[\x00-\x09\x0b-\x1f\x7f-\x9f]/u);
    assert.match(frame, /READ ONLY/);
  }
});
