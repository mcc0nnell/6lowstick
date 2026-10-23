// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {create6lowFlare, flareCodes} from '../src/flare/core.mjs';

const KEY = '42'.repeat(32);
const OTHER = 'ab'.repeat(32);
const NOW = 600000;
const audience = {id: 'friends', key: KEY, codes: ['here', 'rendezvous', 'attention']};
const participant = (options = {}) => create6lowFlare({audiences: [audience], enabled: true, ...options});

test('closed by default; signaling and relaying each need explicit enable', () => {
  const node = create6lowFlare({audiences: [audience]});
  assert.equal(node.isEnabled(), false);
  assert.equal(node.isRelayEnabled(), false);
  assert.throws(() => node.flare('friends', 'here', {now: NOW}), /disabled/);
  assert.throws(() => node.enableRelay(), /disabled/);
  node.enable();
  assert.equal(node.isRelayEnabled(), false);
  node.enableRelay();
  assert.equal(node.isRelayEnabled(), true);
  node.disable();
  assert.equal(node.isEnabled(), false);
  assert.equal(node.isRelayEnabled(), false);
  assert.equal(node.receive(participant().flare('friends', 'here', {now: NOW}), {now: NOW + 1}), null);
});

test('bounded authenticated audience flare omits IDs, location and arbitrary messages', () => {
  const source = participant(), dest = participant({modalities: ['text', 'haptic']});
  const frame = source.flare('friends', 'here', {now: NOW, ttlMs: 30000, hops: 0});
  assert.deepEqual(Object.keys(frame).sort(),
    ['v', 'kind', 'token', 'nonce', 'code', 'issuedAt', 'expiresAt', 'hopsRemaining', 'tag'].sort());
  assert.equal(JSON.stringify(frame).includes('friends'), false);
  assert.equal(JSON.stringify(frame).includes(KEY), false);
  assert.equal(frame.expiresAt, NOW + 30000);
  assert.deepEqual(dest.receive(frame, {now: NOW + 1}), {
    audience: 'friends', code: 'here', nonce: frame.nonce,
    applicationReceived: true, physicalOutput: 'unknown',
    humanDetected: 'unknown', humanUnderstood: 'unknown',
    requestedModalities: ['text', 'haptic'], forward: null
  });
  assert.equal(dest.receive(frame, {now: NOW + 2}), null, 'duplicates rejected');
});

test('only pre-provisioned groups and allowlisted purposes are accepted', () => {
  const sender = participant();
  const receiver = create6lowFlare({
    audiences: [{id: 'another', key: OTHER, codes: ['here']}], enabled: true
  });
  const restricted = create6lowFlare({
    audiences: [{id: 'friends', key: KEY, codes: ['rendezvous']}], enabled: true
  });
  const frame = sender.flare('friends', 'here', {now: NOW});
  assert.equal(receiver.receive(frame, {now: NOW}), null);
  assert.equal(restricted.receive(frame, {now: NOW}), null);
  assert.throws(() => sender.flare('unknown', 'here', {now: NOW}), /authorized/);
  assert.throws(() => sender.flare('friends', 'assistance', {now: NOW}), /authorized/);
  assert.deepEqual(flareCodes, ['here', 'rendezvous', 'attention', 'assistance']);
});

test('tampering, extra properties, future frames and expired frames fail closed', () => {
  const sender = participant(), receiver = participant();
  const frame = sender.flare('friends', 'rendezvous', {now: NOW, ttlMs: 1000, hops: 3});
  for (const mutant of [
    {...frame, code: 'attention'}, {...frame, hopsRemaining: 4},
    {...frame, nonce: '0'.repeat(24)}, {...frame, expiresAt: NOW + 2000},
    {...frame, tag: '0'.repeat(64)}, {...frame, location: '123'},
    {...frame, kind: 'broadcast'}, {...frame, hopsRemaining: -1},
    {...frame, issuedAt: -1}
  ]) assert.equal(receiver.receive(mutant, {now: NOW + 1}), null);
  assert.equal(receiver.receive(frame, {now: NOW - 6000}), null);
  assert.equal(receiver.receive(frame, {now: NOW + 1000}), null);
  assert.equal(receiver.receive(frame, {now: NOW + 1})?.code, 'rendezvous');
});

test('relay is explicitly opt-in, authenticated and decrements a bounded hop count', () => {
  const alice = participant(), sam = participant(), bob = participant();
  const frame = alice.flare('friends', 'here', {now: NOW, hops: 2});
  assert.equal(sam.receive(frame, {now: NOW + 1})?.forward, null);
  const second = alice.flare('friends', 'attention', {now: NOW + 2, hops: 2});
  sam.enableRelay();
  const samRx = sam.receive(second, {now: NOW + 3});
  assert.equal(samRx.forward.hopsRemaining, 1);
  assert.notEqual(samRx.forward.tag, second.tag, 'hop count is signed');
  assert.equal(alice.receive(samRx.forward, {now: NOW + 4}), null, 'origin echo suppressed');
  bob.enableRelay();
  const bobRx = bob.receive(samRx.forward, {now: NOW + 5});
  assert.equal(bobRx.forward.hopsRemaining, 0);
  assert.equal(participant().receive(bobRx.forward, {now: NOW + 6})?.forward, null);
  assert.equal(bob.receive(second, {now: NOW + 7}), null, 'different hop versions share replay identity');
  sam.disableRelay();
  assert.equal(sam.isRelayEnabled(), false);
});

test('rejects bad config, keys, repeated groups, and unsafe TTL/hop bounds', () => {
  assert.throws(() => create6lowFlare({relayEnabled: true}), /configuration/);
  assert.throws(() => create6lowFlare({audiences: [{...audience, key: 'bad'}]}), /key/);
  assert.throws(() => create6lowFlare({audiences: [audience, audience]}), /duplicate/);
  assert.throws(() => create6lowFlare({audiences: [audience,
    {id: 'second', key: KEY, codes: ['here']}]}), /distinct/);
  assert.throws(() => create6lowFlare({audiences: [{...audience, codes: ['any']}]}), /invalid/);
  assert.throws(() => create6lowFlare({modalities: ['audio']}), /configuration/);
  const node = participant();
  for (const ttlMs of [0, -1, 120001, 1.5]) {
    assert.throws(() => node.flare('friends', 'here', {now: NOW, ttlMs}), /TTL/);
  }
  for (const hops of [-1, 5, 1.5]) {
    assert.throws(() => node.flare('friends', 'here', {now: NOW, hops}), /hop/);
  }
});

test('nonce reuse blocked; expired replay entries pruned; no persistence', () => {
  const node = participant({nonceSource: () => Buffer.alloc(12, 1)});
  node.flare('friends', 'here', {now: NOW, ttlMs: 1000});
  assert.throws(() => node.flare('friends', 'here', {now: NOW + 1}), /nonce reused/);
  assert.equal(node.flare('friends', 'here', {now: NOW + 1001}).kind, 'flare');
});

test('an audience with no keys does not accept traffic; malformed values cannot crash receive', () => {
  const source = participant(), stranger = create6lowFlare({enabled: true});
  const f = source.flare('friends', 'here', {now: NOW});
  assert.equal(stranger.receive(f, {now: NOW}), null);
  for (const malformed of [null, [], {}, 'x', 9, {...f, tag: null}, {...f, token: 7}]) {
    assert.equal(participant().receive(malformed, {now: NOW + 1}), null);
  }
});
