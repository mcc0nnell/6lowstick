// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Render only measured Node harness observation times; no inferred radio timing.
import {validateTelemetry} from '../telemetry/monotonic.mjs';

const MAPPING = Object.freeze({
  phase_start: ['send', 'START LAB DELIVERY', 'Harness begins a synthetic alert send loop'],
  send_attempt: ['attempt', 'SEND ATTEMPT', 'Gateway issued a simulated UDP send command'],
  gateway_ack: ['ack', 'GATEWAY RECEIVED ACK', 'Gateway CLI observed matching application ACK; no human delivery proof'],
  receiver_accept: ['received', 'AUTHENTICATED IN APPLICATION', 'Receiver application accepted the lab HMAC envelope'],
  auth_reject: ['reject', 'AUTHENTICATION REJECTED', 'Receiver application rejected a synthetic forged envelope'],
  duplicate: ['duplicate', 'DUPLICATE SUPPRESSED', 'Receiver replay journal reported duplicate alert ID'],
  activation_recorded: ['activated', 'HARNESS ACTIVATION RECORDED', 'Synthetic application activation recorded; no physical output'],
  missing: ['missing', 'APPLICATION ACK MISSING', 'No matching fresh ACK by the harness deadline'],
  send_error: ['error', 'SIMULATED SEND ERROR', 'Gateway send command reported failure'],
  receiver_offline: ['offline', 'RECEIVER PROCESS STOPPED', 'Harness stopped the simulated receiver process'],
  policy_reject: ['gate', 'OUT-OF-AREA POLICY REJECTION', 'Synthetic SAME geographic policy rejected input'],
  policy_accept: ['gate', 'SYNTHETIC POLICY ACCEPTANCE', 'Synthetic SAME input passed local policy; NOAA origin unverified']
});
export function buildTimedTimeline(timing) {
  validateTelemetry(timing);
  const firstSend = new Map();
  return timing.events.map((event, index) => {
    const [kind, name, detail] = MAPPING[event.kind];
    if (event.kind === 'phase_start') firstSend.set(event.phase, event.t_ms);
    const latency = event.kind === 'gateway_ack' && firstSend.has(event.phase)
      ? Math.round((event.t_ms - firstSend.get(event.phase)) * 1000) / 1000 : null;
    return {
      index, phase:event.phase, kind, receiver:event.receiver,
      title:event.receiver ? event.receiver.toUpperCase() + ' ' + name : name,
      detail, latency: Number.isFinite(latency) && latency >= 0 ? latency : null,
      time_ms:event.t_ms, time_kind:'harness_elapsed_monotonic'
    };
  });
}
export function isMeasuredTimeline(steps) {
  return steps.length > 0 && steps.every(step => step.time_kind === 'harness_elapsed_monotonic');
}
export function playbackDelayMs(steps, cursor, speed = 1) {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Invalid replay speed');
  if (cursor + 1 >= steps.length) return 0;
  if (!isMeasuredTimeline(steps)) return 850;
  if (cursor < 0) return 0;
  return Math.max(0, Math.round((steps[cursor+1].time_ms - steps[cursor].time_ms) / speed));
}
