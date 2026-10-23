// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {create6lowBangSource, create6lowBangReceiver} from '../src/bang/core.mjs';

const {privateKey, publicKey} = generateKeyPairSync('ed25519');
const impostor = generateKeyPairSync('ed25519');
const NOW = 600000;
const src = (options = {}) => create6lowBangSource({channel: 'stage-a', privateKey,
  session: 'ab'.repeat(16), ...options});
const rx = (options = {}) => create6lowBangReceiver({
  channels: [{id: 'stage-a', publicKey}], ...options
});

test('off by default: subscribe must be explicitly enabled', () => {
  const source = src(), receiver = rx();
  assert.equal(receiver.isEnabled(), false);
  assert.throws(() => receiver.subscribe('stage-a'), /disabled/);
  const frame = source.emit('caption', 'Welcome', {now: NOW});
  assert.equal(receiver.receive(frame, {now: NOW}), null);
  receiver.enable();
  assert.equal(receiver.receive(frame, {now: NOW}), null);
  receiver.subscribe('stage-a');
  assert.deepEqual(receiver.receive(frame, {now: NOW}).ready.map(x => x.text), ['Welcome']);
  receiver.disable();
  assert.equal(receiver.receive(frame, {now: NOW}), null);
});

test('delivers final caption and publisher-supplied sound markers in sequence', () => {
  const source = src(), receiver = rx({enabled: true});
  receiver.subscribe('stage-a');
  const a = source.emit('caption', 'The gates are open', {now: NOW});
  const b = source.emit('sound', '[CROWD CHEERING]', {now: NOW + 1});
  assert.equal(receiver.receive(b, {now: NOW + 3}).waitingFor, 1);
  const result = receiver.receive(a, {now: NOW + 4});
  assert.deepEqual(result.ready.map(x => [x.kind, x.text, x.seq]), [
    ['caption', 'The gates are open', 1], ['sound', '[CROWD CHEERING]', 2]
  ]);
  assert.equal(result.waitingFor, null);
  assert.equal(result.physicalOutput, 'unknown');
  assert.equal(receiver.receive(a, {now: NOW + 5}), null, 'replay rejected');
  assert.equal(receiver.receive(b, {now: NOW + 5}), null, 'replay rejected');
});

test('rejects forged and tampered content, metadata, added fields and other channels', () => {
  const source = src(); const frame = source.emit('caption', 'Hello', {now: NOW});
  const receiver = rx({enabled: true}); receiver.subscribe('stage-a');
  const forged = src({privateKey: impostor.privateKey}).emit('caption', 'Fake', {now: NOW});
  const mutants = [forged, {...frame, text: 'Evacuate'},
    {...frame, channel: 'stage-b'}, {...frame, seq: 2},
    {...frame, kind: 'sound'}, {...frame, language: 'fr'},
    {...frame, expiresAt: frame.expiresAt + 1}, {...frame, tracking: true},
    {...frame, signature: 'A'.repeat(86)}, {...frame, seq: 1.5}];
  for (const mutant of mutants) assert.equal(receiver.receive(mutant, {now: NOW + 1}), null);
  assert.equal(receiver.receive(frame, {now: NOW + 1})?.ready[0]?.text, 'Hello');
  const differentKey = create6lowBangReceiver({enabled: true,
    channels: [{id: 'stage-a', publicKey: impostor.publicKey}]});
  differentKey.subscribe('stage-a');
  assert.equal(differentKey.receive(frame, {now: NOW + 1}), null);
});

test('rejects stale/future frames and bounds size, TTL and reorder windows', () => {
  const source = src(); const receiver = rx({enabled: true});
  receiver.subscribe('stage-a');
  const a = source.emit('caption', 'Hi', {now: NOW, ttlMs: 1000});
  assert.equal(receiver.receive(a, {now: NOW - 5001}), null);
  assert.equal(receiver.receive(a, {now: NOW + 1000}), null);
  assert.equal(receiver.receive(a, {now: NOW + 1})?.ready.length, 1);
  assert.throws(() => source.emit('caption', '🙂'.repeat(25), {now: NOW}), /byte budget/);
  assert.throws(() => source.emit('caption', '\u0000bad', {now: NOW}), /text/);
  assert.throws(() => source.emit('caption', 'test', {now: NOW, ttlMs: 30001}), /TTL/);
  assert.throws(() => source.emit('caption', 'test', {now: -1}), /time/);
  assert.throws(() => source.emit('partial', 'hello', {now: NOW}), /kind/);
  const high = src({session: 'cd'.repeat(16)});
  for (let i = 0; i < 32; i++) high.emit('caption', 'filler', {now: NOW});
  assert.equal(receiver.receive(high.emit('caption', 'way ahead', {now: NOW}), {now: NOW + 1}), null);
});

test('unsubscribing clears buffered text; subscribed channels are pinned', () => {
  const source = src(); const receiver = rx({enabled: true});
  assert.throws(() => receiver.subscribe('unknown'), /unknown/);
  receiver.subscribe('stage-a');
  source.emit('caption', 'one', {now: NOW});
  const two = source.emit('caption', 'two', {now: NOW});
  assert.equal(receiver.receive(two, {now: NOW + 1}).ready.length, 0);
  receiver.unsubscribe('stage-a');
  assert.equal(receiver.receive(two, {now: NOW + 1}), null);
  receiver.subscribe('stage-a');
  // Rejoining a stream needs an explicit sequence bootstrap in a future adapter.
  assert.equal(receiver.receive(two, {now: NOW + 1}).waitingFor, 1);
});

test('timeout reports a gap rather than inventing missing captions', () => {
  const source = src(); const receiver = rx({enabled: true});
  receiver.subscribe('stage-a');
  source.emit('caption', 'one', {now: NOW});
  const two = source.emit('caption', 'two', {now: NOW + 10});
  assert.equal(receiver.receive(two, {now: NOW + 20}).waitingFor, 1);
  assert.equal(receiver.flush('stage-a', two.session, {now: NOW + 269}), null);
  const flushed = receiver.flush('stage-a', two.session, {now: NOW + 270});
  assert.deepEqual(flushed.skipped, {from: 1, through: 1});
  assert.deepEqual(flushed.ready.map(x => x.text), ['two']);
  assert.equal(receiver.receive(two, {now: NOW + 271}), null);
});

test('rejects unsuitable key types and duplicate channels', () => {
  assert.throws(() => create6lowBangSource({channel: 'stage-a', privateKey: publicKey}), /private/);
  assert.throws(() => create6lowBangReceiver({channels: [{id: 'stage-a', publicKey: privateKey}]}), /public/);
  assert.throws(() => create6lowBangReceiver({channels: [
    {id: 'stage-a', publicKey}, {id: 'stage-a', publicKey}
  ]}), /duplicate/);
  assert.throws(() => src({channel: 'STAGE A'}), /invalid channel/);
});
