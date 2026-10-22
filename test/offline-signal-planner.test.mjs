import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineSignalPlanner, SIGNAL_KINDS} from '../src/signals/offline-planner.mjs';

const NOW = 2_000_000;
const input = (kind = 'check_in', signal_id = 'sig_001') => ({
  schema: '6lowstick.offline-fixture-intent.v0', signal_id, sender: 'test_sender',
  recipient: 'test_friend', kind, created_ms: NOW - 100, expires_ms: NOW + 1000,
});
const grant = (presence_opt_in = false) => ({
  sender: 'test_sender', recipient: 'test_friend', kinds: [...SIGNAL_KINDS],
  expires_ms: NOW + 5000, presence_opt_in,
});
const planner = (consent = false) => createOfflineSignalPlanner({grants: [grant(consent)], now: () => NOW});

test('offline check-in is a plan, never radio send or human receipt', () => {
  const result = planner().plan(input());
  assert.equal(result.status, 'admitted_to_offline_plan');
  assert.equal(result.simulation_only, true);
  assert.equal(result.transport_attempted, false);
  assert.equal(result.physical_output_verified, false);
  assert.equal(result.human_detection_verified, false);
  assert.equal(result.human_comprehension_verified, false);
});

test('presence is disabled by default and needs explicit local opt-in', () => {
  assert.throws(() => planner().plan(input('presence')), /opt-in/);
  assert.equal(planner(true).plan(input('presence')).kind, 'presence');
});

test('absence of fixture grant rejects every request', () => {
  const p = createOfflineSignalPlanner({grants: [], now: () => NOW});
  assert.throws(() => p.plan(input()), /missing matching fixture grant/);
});

test('sender, recipient, kind and grant expiry are bound to the fixture', () => {
  for (const patch of [{sender: 'unknown'}, {recipient: 'stranger'}, {kind: 'emergency_dispatch'}])
    assert.throws(() => planner().plan({...input(), ...patch}), /denied/);
  const expired = {...grant(true), expires_ms: NOW};
  assert.throws(() => createOfflineSignalPlanner({grants: [expired], now: () => NOW}).plan(input()), /denied/);
});

test('strict envelope denies location, payloads, user text and spurious consent claims', () => {
  for (const extra of [{latitude: 39.29}, {payload: 'send emergency'}, {consent: true}, {message: 'hello'}])
    assert.throws(() => planner(true).plan({...input(), ...extra}), /malformed/);
});

test('bounded clock rejects expired, future and long-lived intents, especially presence', () => {
  const p = planner(true);
  for (const update of [
    {expires_ms: NOW}, {created_ms: NOW + 1},
    {expires_ms: NOW + 300_001}, {expires_ms: 0},
  ]) assert.throws(() => p.plan({...input(), ...update}), /expired, future/);
  assert.throws(() => p.plan({...input('presence'), expires_ms: NOW + 60_001}), /expired, future/);
});

test('duplicate IDs are rejected, and planner instances are isolated', () => {
  const p = planner(true);
  p.plan(input());
  assert.throws(() => p.plan(input()), /duplicate/);
  assert.equal(planner(true).plan(input()).status, 'admitted_to_offline_plan');
});

test('malformed or overprivileged fixture grants fail closed', () => {
  assert.throws(() => createOfflineSignalPlanner({grants: [{...grant(), arbitrary: true}]}), /invalid/);
  assert.throws(() => createOfflineSignalPlanner({grants: [{...grant(), kinds: ['presence', 'presence']}]}), /invalid/);
  assert.throws(() => createOfflineSignalPlanner({grants: [{...grant(), kinds: ['dispatch']}]}), /invalid/);
});
