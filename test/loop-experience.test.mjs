// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {run6lowLoopJourney, render6lowLoopJourney} from '../src/loop/experience.mjs';

test('two consenting friends: synthetic presence, ping ACK and here signal', () => {
  const result = run6lowLoopJourney();
  assert.equal(result.schema, '6lowstick.loop-first-journey.v0');
  assert.equal(result.presence.mutuallyObserved, true);
  assert.equal(result.ping.samApplicationReceived, true);
  assert.equal(result.ping.aliceApplicationAck, true);
  assert.equal(result.signal.samApplicationReceived, true);
  assert.deepEqual(result.signal.requestedModalities, ['text', 'haptic']);
  assert.equal(result.transport, 'scripted-in-memory-application-frames');
  assert.equal(result.physicalRadioVerified, false);
  assert.equal(result.simulationOnly, true);
  for (const stage of ['physicalOutput', 'humanDetection', 'humanComprehension'])
    assert.equal(result.signal[stage], 'unknown');
  const rendered = render6lowLoopJourney(result);
  assert.match(rendered, /Ping processed by Sam application: yes/);
  assert.match(rendered, /Authenticated ping ACK received by Alice application: yes/);
  assert.match(rendered, /request only; not actuated/);
  assert.match(rendered, /Human detection: unknown/);
  assert.doesNotMatch(JSON.stringify(result), /@alice:|@sam:|token|nonce|tag|key|GPS/i);
});

test('lost ping ACK is not confused with peer processing or human receipt', () => {
  const lost = run6lowLoopJourney({scenario: 'drop-ack'});
  assert.equal(lost.presence.mutuallyObserved, true);
  assert.equal(lost.ping.samApplicationReceived, true);
  assert.equal(lost.ping.aliceApplicationAck, false);
  assert.equal(lost.signal.samApplicationReceived, true);
  assert.equal(lost.signal.physicalOutput, 'unknown');
  assert.match(render6lowLoopJourney(lost), /ACK received by Alice application: no/);
});

test('offline model and expired frames cannot establish peer application contact', () => {
  for (const scenario of ['offline', 'expired']) {
    const result = run6lowLoopJourney({scenario});
    assert.equal(result.presence.mutuallyObserved, false);
    assert.equal(result.ping.samApplicationReceived, false);
    assert.equal(result.ping.aliceApplicationAck, false);
    assert.equal(result.signal.samApplicationReceived, false);
    assert.deepEqual(result.signal.requestedModalities, []);
    assert.match(render6lowLoopJourney(result), /No mutual contact established/);
  }
});

test('both friends must opt in; disabling either prevents exchange', () => {
  for (const options of [{aliceEnabled: false}, {samEnabled: false},
    {aliceEnabled: false, samEnabled: false}]) {
    const result = run6lowLoopJourney(options);
    assert.equal(result.presence.mutuallyObserved, false);
    assert.equal(result.ping.samApplicationReceived, false);
    assert.equal(result.ping.aliceApplicationAck, false);
    assert.equal(result.signal.samApplicationReceived, false);
  }
});

test('invalid scenario, consent and clock inputs reject before any experiment', () => {
  for (const invalid of [
    {scenario:'radio'}, {scenario:'here'}, {now:-1}, {now:3.5},
    {now:Number.MAX_SAFE_INTEGER}, {aliceEnabled: 1}, {samEnabled: null}
  ]) assert.throws(() => run6lowLoopJourney(invalid), /invalid synthetic journey/);
  assert.throws(() => render6lowLoopJourney({}), /unsupported journey/);
});

test('accessible CLI emits JSON or plain text and rejects unsupported flags', () => {
  const cli = fileURLToPath(new URL('../scripts/loop-experience-demo.mjs', import.meta.url));
  const call = (...args) => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
  const textResult = call('--scenario','drop-ack');
  assert.equal(textResult.status, 0, textResult.stderr);
  assert.match(textResult.stdout, /ACK received by Alice application: no/);
  assert.match(textResult.stdout, /No radio link/);
  const jsonResult = call('--json','--sam-disabled');
  assert.equal(jsonResult.status,0,jsonResult.stderr);
  const body = JSON.parse(jsonResult.stdout);
  assert.equal(body.consent.sam,false);
  assert.equal(body.presence.mutuallyObserved,false);
  for (const args of [['--unknown'],['--scenario'],['--scenario','bad'],
    ['--sam-disabled','--sam-disabled']]) {
    const denied = call(...args);
    assert.equal(denied.status, 2);
    assert.match(denied.stderr, /Usage:/);
  }
});
