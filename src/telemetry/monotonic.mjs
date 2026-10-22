// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Monotonic *harness* observations, not radio timestamps or human outcomes.
import {performance} from 'node:perf_hooks';

export const TELEMETRY_SCHEMA = '6lowstick.harness-monotonic.v1';
export const TELEMETRY_PHASES = Object.freeze(['baseline','rejected','replay','same','degraded']);
export const TELEMETRY_KINDS = Object.freeze([
  'phase_start','send_attempt','gateway_ack','receiver_accept','auth_reject',
  'duplicate','activation_recorded','missing','send_error','receiver_offline',
  'policy_reject','policy_accept'
]);
const PHASE = new Set(TELEMETRY_PHASES), KIND = new Set(TELEMETRY_KINDS);
const NODE = new Set(['strobe','display','haptic']);
export function validateTelemetry(timing) {
  if (!timing || timing.schema !== TELEMETRY_SCHEMA ||
      timing.clock !== 'node.performance.now' || timing.unit !== 'ms' ||
      !Array.isArray(timing.events) || timing.events.length > 4096)
    throw new Error('Invalid monotonic harness telemetry schema');
  let last = -1;
  for (let i = 0; i < timing.events.length; i++) {
    const e = timing.events[i];
    if (!e || typeof e !== 'object' || Object.keys(e).sort().join(',') !== 'kind,phase,receiver,seq,t_ms' ||
        e.seq !== i + 1 || !PHASE.has(e.phase) || !KIND.has(e.kind) ||
        !(e.receiver === null || NODE.has(e.receiver)) ||
        !Number.isFinite(e.t_ms) || e.t_ms < last || e.t_ms < 0 || e.t_ms > 3600000)
      throw new Error('Invalid or unordered monotonic telemetry event at index ' + i);
    last = e.t_ms;
  }
  return timing;
}
export function createTelemetryRecorder({now = () => performance.now()} = {}) {
  const origin = now();
  const events = [];
  return Object.freeze({
    record(phase, kind, receiver = null, observedAt = now()) {
      if (!PHASE.has(phase) || !KIND.has(kind) || !(receiver === null || NODE.has(receiver)) ||
          !Number.isFinite(observedAt) || observedAt < origin ||
          observedAt - origin > 3600000)
        throw new Error('Invalid monotonic harness observation');
      events.push({t_ms: Math.round((observedAt - origin) * 1000) / 1000,
        phase, kind, receiver});
    },
    snapshot() {
      // Application callbacks can be scheduled after a packet was read; restore the
      // order of observed timestamps without claiming UDP packet or RF arrival order.
      const sorted = events.map((item, i) => ({item, i}))
        .sort((a, b) => a.item.t_ms - b.item.t_ms || a.i - b.i)
        .map(({item}, i) => ({seq:i + 1, ...item}));
      return validateTelemetry({
        schema: TELEMETRY_SCHEMA, clock:'node.performance.now',
        unit:'ms', events:sorted
      });
    }
  });
}
