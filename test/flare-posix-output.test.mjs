// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {performance} from 'node:perf_hooks';
import {create6lowFlare} from '../src/flare/core.mjs';
import {createFlareOutputRecorder} from '../src/flare/output-evidence.mjs';
import {encodeFlareUdp, decodeFlareUdp, isFlareUdpPayload,
  signFlareAppReceipt, verifyFlareAppReceipt, createFlarePosixAdapter} from
  '../experiments/flare/posix-transport.mjs';

const key = Buffer.alloc(32, 0x42);
const audiences = [{id: 'camp', key, codes: ['here', 'attention', 'rendezvous']}];
const flare = (opts = {}) => create6lowFlare({audiences, enabled: true, ...opts});
const now = 600000;
const f = () => flare().flare('camp', 'here', {now, ttlMs: 30000, hops: 1});

test('FL1 OT CLI payloads round-trip exact signed frames; reject untrusted bytes', () => {
  const frame = f();
  const wire = encodeFlareUdp(frame);
  assert.ok(wire.length < 256);
  assert.deepEqual(decodeFlareUdp(wire), frame);
  assert.equal(isFlareUdpPayload(wire), true);
  const receive = flare().receive(decodeFlareUdp(wire), {now: now + 1});
  assert.equal(receive?.applicationReceived, true);
  for (const invalid of [
    wire + '|extra', wire.replace('FL1|', 'bad|'),
    wire.replace('|here|', '|free text|'), wire.replace('|1|'+frame.tag, '|5|'+frame.tag),
    wire.replace('|' + frame.tag, '|000'), 'FL1|' + 'a'.repeat(500)
  ]) {
    assert.equal(decodeFlareUdp(invalid), null);
    assert.equal(isFlareUdpPayload(invalid), false);
  }
  assert.throws(() => encodeFlareUdp({...frame, extra: 1}), /invalid/);
});

test('re-signed cooperative forwarded hop count authenticates and replay is suppressed', () => {
  const src = flare(), intermediate = flare({relayEnabled: true}), final = flare();
  const outgoing = src.flare('camp', 'here', {now, hops: 1});
  const ingress = intermediate.receive(decodeFlareUdp(encodeFlareUdp(outgoing)), {now: now + 1});
  assert.equal(ingress.forward.hopsRemaining, 0);
  assert.equal(final.receive(decodeFlareUdp(encodeFlareUdp(ingress.forward)), {now: now + 2})?.code, 'here');
  assert.equal(final.receive(decodeFlareUdp(encodeFlareUdp(outgoing)), {now: now + 3}), null);
});

test('signed FA2 app receipt checks node + challenge and rejects forgery', () => {
  const nonce = f().nonce;
  const wire = signFlareAppReceipt({key, node: 'bob', nonce});
  assert.equal(isFlareUdpPayload(wire), true);
  assert.equal(verifyFlareAppReceipt({key, wire, node: 'bob', nonce}), true);
  assert.equal(verifyFlareAppReceipt({key, wire, node: 'alice', nonce}), false);
  assert.equal(verifyFlareAppReceipt({key, wire, node: 'bob', nonce: '1'.repeat(24)}), false);
  assert.equal(verifyFlareAppReceipt({key: Buffer.alloc(32, 3), wire, node: 'bob', nonce}), false);
  const tampered = wire.slice(0, -1) + (wire.endsWith('0') ? '1' : '0');
  assert.equal(verifyFlareAppReceipt({key, wire: tampered, node: 'bob', nonce}), false);
});

test('CLI Done is not a receipt, unrelated or stale acknowledgements ignored', async () => {
  const frame = f();
  const sender = {received: [], async command() { return ['Done']; }};
  const link = createFlarePosixAdapter({sender, targetAddress: 'fd12::1', port: 61618,
    key, receiptFrom: 'bob', waitMs: 50});
  const negative = await link.transmit(frame);
  assert.equal(negative.applicationReceipt, false);
  const stale = signFlareAppReceipt({key, node: 'bob', nonce: frame.nonce});
  sender.received.push({body: stale, time: performance.now() - 10000});
  assert.equal((await link.transmit(frame)).applicationReceipt, false);
  sender.command = async msg => {
    assert.ok(msg.startsWith('udp send fd12::1 61618 FL1|'));
    sender.received.push({body: signFlareAppReceipt({key, node: 'bob',
      nonce: '1'.repeat(24)}), time: performance.now()});
    sender.received.push({body: stale, time: performance.now()});
    return ['Done'];
  };
  assert.equal((await link.transmit(frame)).applicationReceipt, true);
});

test('output evidence separately records requests and scripted witness events, never physical proof', () => {
  const node = flare({modalities: ['light', 'haptic']});
  const admitted = node.receive(f(), {now: now + 1});
  const sensor = createFlareOutputRecorder();
  assert.equal(sensor.request(admitted, {at: now + 1}), true);
  assert.deepEqual(sensor.evidence()[0].fixtureObservedModalities, []);
  assert.deepEqual(sensor.evidence()[0].absentFixtureObservations, ['light', 'haptic']);
  assert.equal(sensor.observeFixture({nonce: admitted.nonce, modality: 'light', at: now + 2}), true);
  assert.equal(sensor.observeFixture({nonce: admitted.nonce, modality: 'light', at: now + 3}), false);
  assert.equal(sensor.observeFixture({nonce: admitted.nonce, modality: 'haptic', at: now}), false);
  assert.equal(sensor.observeFixture({nonce: '0'.repeat(24), modality: 'haptic', at: now + 3}), false);
  assert.equal(sensor.observeFixture({nonce: admitted.nonce, modality: 'haptic', at: now + 4, fixture: 'on-device'}), false);
  assert.deepEqual(sensor.evidence()[0].fixtureObservedModalities, ['light']);
  assert.deepEqual(sensor.evidence()[0].absentFixtureObservations, ['haptic']);
  assert.equal(sensor.evidence()[0].physicalOutput, 'unknown');
  assert.equal(sensor.evidence()[0].humanDetected, 'unknown');
  assert.equal(sensor.evidence()[0].humanUnderstood, 'unknown');
  sensor.reset();
  assert.deepEqual(sensor.evidence(), []);
});

test('bad admissions cannot fabricate output request evidence', () => {
  const log = createFlareOutputRecorder();
  assert.equal(log.request(null, {at: now}), false);
  assert.equal(log.request({applicationReceived: false, nonce: '1'.repeat(24),
    requestedModalities: ['light']}, {at: now}), false);
  assert.equal(log.request({applicationReceived: true, nonce: 'bad',
    requestedModalities: ['light']}, {at: now}), false);
  assert.equal(log.request({applicationReceived: true, nonce: '1'.repeat(24),
    requestedModalities: ['unknown']}, {at: now}), false);
  assert.deepEqual(log.evidence(), []);
});
