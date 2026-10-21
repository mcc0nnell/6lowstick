// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Phase-only compatibility for old labs; use measured monotonic harness events where present.
import {validateTelemetry} from '../telemetry/monotonic.mjs';
import {buildTimedTimeline} from './timed.mjs';
export const RECEIVERS = Object.freeze(['strobe', 'display', 'haptic']);
const PHASES = Object.freeze([
  ['baseline', 'BASELINE DELIVERY'],
  ['rejected', 'FORGED ENVELOPE'],
  ['replay', 'DUPLICATE REPLAY'],
  ['same', 'SYNTHETIC SAME'],
  ['degraded', 'DEGRADED DELIVERY']
]);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export function parseEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.schema !== 'tronix.thread-alert-lab.v1') {
    throw new Error('Expected a tronix.thread-alert-lab.v1 research evidence JSON object');
  }
  for (const key of ['baseline', 'rejected', 'replay', 'degraded']) {
    const p = value[key];
    if (!p || typeof p !== 'object' || !Array.isArray(p.requested) ||
        !Array.isArray(p.acknowledged) || !Array.isArray(p.missing) ||
        typeof p.id !== 'string') throw new Error(`Invalid ${key} delivery evidence`);
    if (p.requested.some(n => !RECEIVERS.includes(n)) ||
        p.acknowledged.some(n => !p.requested.includes(n)) ||
        p.missing.some(n => !p.requested.includes(n)) ||
        p.requested.length !== new Set(p.requested).size ||
        p.acknowledged.some(n => p.missing.includes(n))) {
      throw new Error(`Inconsistent ${key} receiver evidence`);
    }
  }
  if (value.timing !== undefined) validateTelemetry(value.timing);
  return value;
}

export function buildTimeline(input) {
  const data = parseEvidence(input);
  if (data.timing) return buildTimedTimeline(data.timing);
  const steps = [];
  const add = (phase, kind, receiver, title, detail, latency = null) => {
    steps.push({index: steps.length, phase, kind, receiver, title, detail, latency});
  };
  const delivery = (phase, result, title) => {
    if (!result || !Array.isArray(result.requested)) return;
    add(phase, 'send', null, title, `Alert ${result.id} / ${result.requested.length} logical recipients`);
    for (const name of result.requested) {
      const gotAck = result.acknowledged.includes(name);
      const missed = result.missing.includes(name);
      const ms = own(result.ack_latency_ms ?? {}, name) ? result.ack_latency_ms[name] : null;
      add(phase, gotAck ? 'ack' : missed ? 'missing' : 'unknown', name,
          `${name.toUpperCase()} ${gotAck ? 'APPLICATION ACK' : missed ? 'ACK MISSING' : 'UNRESOLVED'}`,
          gotAck ? 'Simulator application receipt; no proof of physical or human notification' :
          missed ? 'No matching fresh application ACK observed by the harness deadline' :
          'Requested receiver has no conclusive receipt classification', ms);
    }
    for (const failure of result.send_errors ?? []) {
      if (RECEIVERS.includes(failure.target)) add(phase, 'error', failure.target,
          `${failure.target.toUpperCase()} SEND ERROR`, String(failure.error ?? 'unspecified').slice(0, 120));
    }
  };
  delivery('baseline', data.baseline, 'SEND SYNTHETIC DRILL');
  add('rejected', 'gate', null, 'AUTHENTICATION CHECK', 'Tampered EA2 envelope submitted as a negative test');
  for (const ev of data.events ?? []) {
    if (ev.event === 'rejected_auth' && RECEIVERS.includes(ev.node))
      add('rejected', 'reject', ev.node, `${ev.node.toUpperCase()} REJECTED FORGERY`, 'Authentication rejected in receiver application');
  }
  if ((data.events ?? []).every(ev => ev.event !== 'rejected_auth'))
    add('rejected', 'unknown', null, 'AUTHENTICATION OUTCOME NOT RECORDED', 'Do not infer rejection from missing ACK alone');
  delivery('replay', data.replay, 'RESEND ORIGINAL ALERT ID');
  for (const ev of data.events ?? []) {
    if (ev.event === 'duplicate_suppressed' && RECEIVERS.includes(ev.node))
      add('replay', 'duplicate', ev.node, `${ev.node.toUpperCase()} SUPPRESSED REPLAY`, 'Receiver journal reports duplicate suppression');
  }
  const same = data.sameGateway;
  if (same) {
    if (same.policyRejected?.accepted === false)
      add('same', 'gate', null, 'OUT-OF-AREA SAME REJECTED', `Policy reason: ${same.policyRejected.reason ?? 'unspecified'}`);
    if (same.policyAlert?.id)
      add('same', 'gate', null, 'SYNTHETIC SAME POLICY ACCEPTED', `Alert ID: ${same.policyAlert.id}; not an authenticated NOAA broadcast`);
    delivery('same', same.delivery, 'SEND SAME-DERIVED LAB NOTIFICATION');
  }
  delivery('degraded', data.degraded, 'SEND AFTER HAPTIC PROCESS STOP');
  return steps;
}

export function replayState(steps, cursor) {
  const safe = Math.max(-1, Math.min(steps.length - 1, cursor));
  const status = Object.fromEntries(RECEIVERS.map(n => [n, {state: 'idle', latency: null, detail: 'No receipt in current phase'}]));
  let phase = 'baseline';
  for (let i = 0; i <= safe; i++) {
    const step = steps[i];
    if (step.phase !== phase) {
      phase = step.phase;
      for (const name of RECEIVERS) status[name] = {state: 'idle', latency: null, detail: 'Not targeted in current phase'};
    }
    if (step.kind === 'send' && !step.time_kind) {
      const nextPhaseTargets = steps.slice(i + 1).filter(s => s.phase === phase &&
        ['ack', 'missing', 'unknown'].includes(s.kind)).map(s => s.receiver);
      for (const name of nextPhaseTargets) status[name] = {state: 'pending', latency: null, detail: 'Awaiting recorded result in replay'};
    }
    if (step.receiver && step.kind === 'attempt') {
      status[step.receiver] = {state:'pending', latency:null, detail:step.detail};
    }
    if (step.receiver && ['ack', 'missing', 'unknown', 'error', 'reject', 'duplicate', 'received', 'activated', 'offline'].includes(step.kind)) {
      // A forged-message rejection is more specific than its expected lack of ACK.
      if (!(step.kind === 'missing' && status[step.receiver].state === 'reject'))
        status[step.receiver] = {state: step.kind, latency: step.latency, detail: step.detail};
    }
  }
  return {cursor: safe, phase, status, current: safe < 0 ? null : steps[safe],
          counts: {acked: RECEIVERS.filter(n => status[n].state === 'ack').length,
                   missing: RECEIVERS.filter(n => status[n].state === 'missing').length,
                   pending: RECEIVERS.filter(n => status[n].state === 'pending').length}};
}

export function phaseLabel(id) { return PHASES.find(([k]) => k === id)?.[1] ?? id.toUpperCase(); }
