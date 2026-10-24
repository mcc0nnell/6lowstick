// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Two-person, process-local 6lowLoop + 6lowFlare integration exercise.
// The link is a JSON round-trip, NOT OpenThread, BLE, LoRa, a device, or a service.
import {create6lowLoop} from './core.mjs';
import {create6lowFlare} from '../flare/core.mjs';

const SCENARIOS = Object.freeze(['nominal', 'drop-ack', 'offline', 'expired']);
const ALICE = '@alice:example.org';
const SAM = '@sam:example.org';
const PAIR_KEY = Buffer.alloc(32, 0x31); // public demo fixture only, NEVER production pairing
const GROUP_KEY = Buffer.alloc(32, 0x42); // public demo fixture only, NEVER production key
const AUDIENCE = 'friends';
const TTL_MS = 10000;
const MAX_WIRE_BYTES = 512;
const SCHEMA = '6lowstick.loop-first-journey.v0';
const bool = value => value === true;

// Modeled transfer: serialize one authenticated application frame. The receiver
// still independently checks HMAC, expiry, paired contact, and replay state.
function transfer(frame, receiver, {enabled, blocked, now}) {
  if (!frame || !enabled || blocked) return null;
  const bytes = JSON.stringify(frame);
  if (Buffer.byteLength(bytes, 'utf8') > MAX_WIRE_BYTES)
    throw new Error('scripted application frame exceeds the bound');
  return receiver.receive(JSON.parse(bytes), {now});
}

export function run6lowLoopJourney({
  scenario = 'nominal', now = 600000, aliceEnabled = true, samEnabled = true
} = {}) {
  if (!SCENARIOS.includes(scenario) ||
      !Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - 30000 ||
      typeof aliceEnabled !== 'boolean' || typeof samEnabled !== 'boolean')
    throw new TypeError('invalid synthetic journey configuration');

  const alice = create6lowLoop({
    friends: [{id: SAM, key: PAIR_KEY}], enabled: aliceEnabled
  });
  const sam = create6lowLoop({
    friends: [{id: ALICE, key: PAIR_KEY}], enabled: samEnabled
  });
  const audience = [{id: AUDIENCE, key: GROUP_KEY, codes: ['here', 'attention']}];
  const aliceFlare = create6lowFlare({audiences: audience, enabled: aliceEnabled});
  const samFlare = create6lowFlare({
    audiences: audience, enabled: samEnabled, modalities: ['text', 'haptic']
  });

  // Both people must opt in before any transfer. "Offline" is a deliberate
  // scripted drop, not measured radio coverage or a hardware fault.
  const enabled = aliceEnabled && samEnabled;
  const blocked = scenario === 'offline';
  const deliveryTime = offset => now + (scenario === 'expired' ? 20000 : offset);
  const send = (frame, receiver, offset, drop = false) =>
    transfer(frame, receiver, {enabled, blocked: blocked || drop, now: deliveryTime(offset)});

  const aPresence = aliceEnabled ? alice.announce(SAM, {now, ttlMs: TTL_MS}) : null;
  const sPresence = samEnabled ? sam.announce(ALICE, {now, ttlMs: TTL_MS}) : null;
  const samObservedAlice = bool(send(aPresence, sam, 1)?.applicationReceived);
  const aliceObservedSam = bool(send(sPresence, alice, 2)?.applicationReceived);
  const mutualPresence = samObservedAlice && aliceObservedSam;

  // Do not pretend a successful application ping implies the sender got a
  // response; the ACK itself is a separate authenticated frame.
  const ping = mutualPresence ? alice.ping(SAM, {now: now + 3, ttlMs: TTL_MS}) : null;
  const pingReceived = send(ping, sam, 4);
  const samProcessedPing = pingReceived?.kind === 'ping';
  const ack = samProcessedPing
    ? sam.acknowledge(ALICE, ping.nonce, {now: now + 5, ttlMs: TTL_MS}) : null;
  const ackReceived = send(ack, alice, 6, scenario === 'drop-ack');
  const aliceGotAck = ackReceived?.kind === 'ack' && ackReceived.replyTo === ping?.nonce;

  // A group signal is separate from the private ping. The receiver's Flare
  // result is an application-level fact only: no real display or vibration.
  const flare = mutualPresence
    ? aliceFlare.flare(AUDIENCE, 'here', {now: now + 7, ttlMs: TTL_MS, hops: 0}) : null;
  const signalReceived = send(flare, samFlare, 8);
  const samProcessedSignal = signalReceived?.applicationReceived === true;

  return {
    schema: SCHEMA, scenario,
    transport: 'scripted-in-memory-application-frames',
    simulationOnly: true, physicalRadioVerified: false,
    consent: {alice: aliceEnabled, sam: samEnabled},
    presence: {aliceObservedSam, samObservedAlice, mutuallyObserved: mutualPresence},
    ping: {samApplicationReceived: samProcessedPing, aliceApplicationAck: bool(aliceGotAck)},
    signal: {
      code: 'here', samApplicationReceived: samProcessedSignal,
      requestedModalities: samProcessedSignal ? [...signalReceived.requestedModalities] : [],
      physicalOutput: 'unknown', humanDetection: 'unknown', humanComprehension: 'unknown'
    }
  };
}

// Plain, stable, screen-reader-friendly presentation; no colors, animated
// status icons, synthetic buzzes, geographic-distance claims, or fake receipt.
export function render6lowLoopJourney(result) {
  if (!result || result.schema !== SCHEMA) throw new TypeError('unsupported journey');
  const yesNo = value => value ? 'yes' : 'no';
  const status = result.presence.mutuallyObserved
    ? 'Mutual synthetic contact observed'
    : 'No mutual contact established in the simulation';
  return [
    '6lowLoop: Find your people — SOFTWARE SIMULATION',
    'Scenario: ' + result.scenario,
    'Opt-in — Alice: ' + yesNo(result.consent.alice) +
      '; Sam: ' + yesNo(result.consent.sam),
    'Presence: ' + status,
    'Ping processed by Sam application: ' + yesNo(result.ping.samApplicationReceived),
    'Authenticated ping ACK received by Alice application: ' +
      yesNo(result.ping.aliceApplicationAck),
    'Here signal processed by Sam application: ' + yesNo(result.signal.samApplicationReceived),
    'Requested presentation: ' +
      (result.signal.requestedModalities.join(', ') || 'none') +
      ' (request only; not actuated)',
    'Physical output: unknown. Human detection: unknown. Human understanding: unknown.',
    (result.transport === 'openthread-posix-simulated-radio-ipv6-udp'
      ? 'Transport: OpenThread POSIX simulated-radio IPv6 UDP. No physical RF, Matrix session, physical notification, or human receipt was measured.'
      : 'No radio link, Matrix session, physical notification, or human receipt was measured.')
  ].join('\n');
}
