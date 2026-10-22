// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {create6lowLoop} from '../src/loop/core.mjs';

const KEY = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);
const now = 200000;
const alice = () => create6lowLoop({friends: [{id: '@bob:example.org', key: KEY}], enabled: true});
const bob = () => create6lowLoop({friends: [{id: '@alice:example.org', key: KEY}], enabled: true});

test('off by default, explicit enable and disable erases local presence', () => {
  const loop = create6lowLoop({friends: [{id: '@bob:example.org', key: KEY}]});
  assert.equal(loop.isEnabled(), false);
  assert.deepEqual(loop.friendsNearby({now}), []);
  assert.throws(() => loop.announce('@bob:example.org', {now}), /disabled/);
  loop.enable();
  assert.equal(loop.announce('@bob:example.org', {now}).kind, 'presence');
  loop.disable();
  assert.deepEqual(loop.friendsNearby({now}), []);
  assert.throws(() => loop.ping('@bob:example.org', {now}), /disabled/);
});

test('mutually paired friends exchange ephemeral presence without names or coordinates in frame', () => {
  const a = alice(), b = bob();
  const f = a.announce('@bob:example.org', {now});
  assert.deepEqual(Object.keys(f).sort(),
    ['v', 'kind', 'token', 'nonce', 'issuedAt', 'expiresAt', 'replyTo', 'tag'].sort());
  assert.equal(JSON.stringify(f).includes('@alice:example.org'), false);
  assert.equal(JSON.stringify(f).includes('@bob:example.org'), false);
  assert.deepEqual(b.receive(f, {now: now + 1}), {
    friend: '@alice:example.org', kind: 'presence', nonce: f.nonce, replyTo: null, applicationReceived: true
  });
  assert.deepEqual(b.friendsNearby({now: now + 1}), [{
    friend: '@alice:example.org', status: 'reachable-in-local-model',
    lastSeen: now + 1, expiresAt: now + 60000
  }]);
  assert.equal(b.receive(f, {now: now + 2}), null);
  assert.deepEqual(b.friendsNearby({now: now + 60000}), []);
});

test('ping and matching ACK prove local model application receipt only', () => {
  const a = alice(), b = bob();
  const f = a.ping('@bob:example.org', {now});
  assert.equal(b.receive(f, {now: now + 1})?.kind, 'ping');
  const ack = b.acknowledge('@alice:example.org', f.nonce, {now: now + 2});
  assert.deepEqual(a.receive(ack, {now: now + 3}), {
    friend: '@bob:example.org', kind: 'ack', nonce: ack.nonce,
    replyTo: f.nonce, applicationReceived: true
  });
  assert.equal(a.receive(ack, {now: now + 4}), null);
  assert.equal(a.receive(b.acknowledge('@alice:example.org', f.nonce, {now: now + 5}), {now: now + 6}), null,
    'one outstanding ping cannot be acknowledged twice');
});

test('forged, unpaired, altered, expired and future-dated frames fail closed', () => {
  const a = alice(), b = bob();
  const f = a.announce('@bob:example.org', {now});
  const unrelated = create6lowLoop({friends: [{id: '@alice:example.org', key: OTHER}], enabled: true});
  assert.equal(unrelated.receive(f, {now}), null);
  assert.equal(b.receive({...f, kind: 'ping'}, {now}), null);
  assert.equal(b.receive({...f, tag: 'f'.repeat(64)}, {now}), null);
  assert.equal(b.receive({...f, nonce: 'invalid'}, {now}), null);
  assert.equal(b.receive({...f, debug: true}, {now}), null);
  assert.equal(b.receive(f, {now: now + 60000}), null);
  assert.equal(b.receive(f, {now: now - 6000}), null);
  assert.equal(b.receive({...f, expiresAt: now + 120001}, {now}), null);
  assert.equal(b.receive(f, {now})?.kind, 'presence', 'invalid probes did not consume valid envelope');
});

test('unpaired contacts, duplicate friends and malformed key material fail early', () => {
  assert.throws(() => create6lowLoop({friends: [{id: '@bob:example.org', key: 'bad'}]}), /key/);
  assert.throws(() => create6lowLoop({friends: [{id: '@bob:example.org', key: KEY}, {id: '@bob:example.org', key: OTHER}]}), /repeated/);
  assert.throws(() => create6lowLoop({friends: [{id: '@bob:example.org', key: KEY}, {id: '@eve:example.org', key: KEY}]}), /distinct/);
  assert.throws(() => create6lowLoop({friends: [{id: 'bob', key: KEY}]}), /invalid/);
  assert.throws(() => alice().ping('@eve:example.org', {now}), /not paired/);
  assert.throws(() => alice().announce('@bob:example.org', {now, ttlMs: 120001}), /TTL/);
});
