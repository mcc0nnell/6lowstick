// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// First Light: typed, bounded intent admission for an OFFLINE software-only demo.
// Not an authenticated network protocol, device grant, or actuator authorization.
const SCHEMA = '6lowstick.offline-fixture-intent.v0';
const NAME = /^[A-Za-z0-9_-]{1,32}$/;
const KINDS = Object.freeze(['presence', 'check_in', 'coordination', 'assistance_request', 'sensor_event', 'test_beacon']);
const MAX_TTL_MS = 5 * 60 * 1000;
const PRESENCE_TTL_MS = 60 * 1000;
const REQUIRED = ['schema', 'signal_id', 'sender', 'recipient', 'kind', 'created_ms', 'expires_ms'];
const GRANT_KEYS = ['sender', 'recipient', 'kinds', 'expires_ms', 'presence_opt_in'];
const own = (obj, key) => Object.hasOwn(obj, key);

function validShape(obj, keys) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).length === keys.length && keys.every(k => own(obj, k));
}
function assertTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function deny(message) { throw new Error('offline signal denied: ' + message); }

/** Grants are locally supplied *fixtures*, not authenticated consent or credentials. */
export function createOfflineSignalPlanner({grants, now = () => Date.now()} = {}) {
  if (!Array.isArray(grants) || grants.length > 100 || typeof now !== 'function')
    throw new TypeError('invalid offline planner configuration');
  const validated = grants.map((g) => {
    if (!validShape(g, GRANT_KEYS) || !NAME.test(g.sender) || !NAME.test(g.recipient) ||
        !Array.isArray(g.kinds) || g.kinds.length < 1 || g.kinds.length > KINDS.length ||
        new Set(g.kinds).size !== g.kinds.length || g.kinds.some(k => !KINDS.includes(k)) ||
        !assertTimestamp(g.expires_ms) || typeof g.presence_opt_in !== 'boolean')
      throw new TypeError('invalid local fixture grant');
    return {...g, kinds: [...g.kinds]};
  });
  const observed = new Set();
  function plan(input) {
    if (!validShape(input, REQUIRED) || input.schema !== SCHEMA ||
        ![input.signal_id, input.sender, input.recipient].every(x => typeof x === 'string' && NAME.test(x)) ||
        !KINDS.includes(input.kind) || !assertTimestamp(input.created_ms) || !assertTimestamp(input.expires_ms))
      deny('unsupported or malformed envelope');
    const current = now();
    if (!assertTimestamp(current)) deny('invalid local clock');
    if (input.created_ms > current || input.expires_ms <= current ||
        input.expires_ms <= input.created_ms ||
        input.expires_ms - input.created_ms > (input.kind === 'presence' ? PRESENCE_TTL_MS : MAX_TTL_MS))
      deny('expired, future, or overlong intent');
    const grant = validated.find(g => g.sender === input.sender && g.recipient === input.recipient &&
      g.kinds.includes(input.kind) && g.expires_ms > current &&
      (input.kind !== 'presence' || g.presence_opt_in));
    if (!grant) deny('missing matching fixture grant or presence opt-in');
    // One-shot in-memory suppression is NOT a durable anti-replay protocol.
    const replayKey = `${input.sender}:${input.signal_id}`;
    if (observed.has(replayKey)) deny('duplicate signal identifier in this process');
    observed.add(replayKey);
    return Object.freeze({
      schema: '6lowstick.offline-signal-plan.v0',
      signal_id: input.signal_id, kind: input.kind, recipient: input.recipient,
      status: 'admitted_to_offline_plan',
      simulation_only: true, transport_attempted: false, physical_output_verified: false,
      human_detection_verified: false, human_comprehension_verified: false,
    });
  }
  return Object.freeze({plan});
}

export const SIGNAL_KINDS = KINDS;
