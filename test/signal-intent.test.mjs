import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSignalIntent, evaluateSignalIntent, signalKinds} from '../src/signals/intent.mjs';

const policy = {sources: ['station'], targets: ['beacon'], kinds: [...signalKinds],
  purpose_codes: ['checkin'], modalities: ['light', 'haptic', 'text'], max_ttl_ms: 30000};
const intent = {schema: '6lowstick.signal-intent.v0', id: 'sig001', source: 'station',
  target: 'beacon', kind: 'presence', purpose_code: 'checkin', modality: 'light',
  issued_at_ms: 1000, expires_at_ms: 5000, simulation: true, drill: true};
const admit = (value, overrides = {}) => evaluateSignalIntent(value,
  {policy, nowMs: 2000, seenIds: new Set(), ...overrides});

test('valid bounded signal proposal admits only simulation and asserts no physical outcome', () => {
  const original = structuredClone(intent);
  const parsed = parseSignalIntent(intent);
  assert.equal(Object.isFrozen(parsed), true);
  assert.deepEqual(intent, original);
  const result = admit(parsed);
  assert.equal(result.decision, 'SIMULATION_ONLY');
  assert.deepEqual(result.reasons, []);
  assert.equal(result.executable_authority, false);
  assert.deepEqual(Object.values(result.evidence), ['unknown', 'unknown', 'unknown', 'unknown']);
});

test('unknown or injected claims are refused even when other fields are valid', () => {
  for (const field of ['dispatch', 'authorized', 'human_detected', 'payload']) {
    const result = admit({...intent, [field]: true});
    assert.deepEqual(result.reasons, ['invalid_intent']);
  }
  for (const value of [null, [], {}, {...intent, schema: 'other'},
    {...intent, simulation: false}, {...intent, drill: false}])
    assert.equal(admit(value).decision, 'DENY');
});

test('all signal categories are admitted only when explicitly policy-scoped', () => {
  for (const kind of signalKinds) assert.equal(admit({...intent, kind}).decision, 'SIMULATION_ONLY');
  assert.deepEqual(admit({...intent, kind: 'actuate'}).reasons, ['invalid_intent']);
  const restricted = {...policy, kinds: ['presence']};
  assert.deepEqual(admit({...intent, kind: 'warning'}, {policy: restricted}).reasons,
    ['out_of_scope_kind']);
});

test('expiry, future, policy TTL and replay are distinct failures', () => {
  assert.deepEqual(admit(intent, {nowMs: 5000}).reasons, ['expired']);
  assert.deepEqual(admit(intent, {nowMs: 999}).reasons, ['not_yet_valid']);
  assert.deepEqual(admit(intent, {seenIds: new Set(['sig001'])}).reasons, ['replayed_id']);
  const long = {...intent, expires_at_ms: 40000};
  assert.deepEqual(admit(long).reasons, ['ttl_exceeds_policy']);
  assert.deepEqual(admit({...intent, expires_at_ms: 1000}).reasons, ['invalid_intent']);
  assert.deepEqual(admit({...intent, expires_at_ms: 4000000}).reasons, ['invalid_intent']);
});

test('strict identity, scope and modality: fail closed on unauthorized targets', () => {
  for (const [field, value, reason] of [
    ['source', 'rogue', 'out_of_scope_source'],
    ['target', 'other', 'out_of_scope_target'],
    ['purpose_code', 'alarm', 'out_of_scope_purpose_code'],
    ['modality', 'haptic', null]]) {
    const restricted = field === 'modality' ? {...policy, modalities: ['light']} : policy;
    const expected = reason ?? 'out_of_scope_modality';
    assert.deepEqual(admit({...intent, [field]: value}, {policy: restricted}).reasons, [expected]);
  }
  assert.deepEqual(admit({...intent, id: '../escape'}).reasons, ['invalid_intent']);
  assert.deepEqual(admit({...intent, id: 123}).reasons, ['invalid_intent']);
  assert.deepEqual(admit({...intent, source: 123}).reasons, ['invalid_intent']);
  assert.deepEqual(admit({...intent, purpose_code: 'x'.repeat(33)}).reasons, ['invalid_intent']);
});

test('malformed local policy or replay context is never promoted to admission', () => {
  assert.throws(() => admit(intent, {policy: {...policy, unexpected: true}}), /policy/);
  assert.throws(() => admit(intent, {policy: {...policy, modalities: ['light', 'light']}}), /policy/);
  assert.throws(() => admit(intent, {nowMs: Number.NaN}), /context/);
  assert.throws(() => admit(intent, {seenIds: []}), /context/);
});
