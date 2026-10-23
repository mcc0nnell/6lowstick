// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Software-only relay demonstration. No packet goes on air.
import {create6lowFlare} from '../src/flare/core.mjs';

const friends = {id: 'camp', key: Buffer.alloc(32, 0x42),
  codes: ['here', 'rendezvous', 'attention']};
const alice = create6lowFlare({enabled: true, audiences: [friends]});
const sam = create6lowFlare({enabled: true, relayEnabled: true, audiences: [friends]});
const bob = create6lowFlare({enabled: true, audiences: [friends],
  modalities: ['light', 'haptic', 'text']});
const now = 600000;
const initial = alice.flare('camp', 'here', {now, ttlMs: 30000, hops: 1});
const atSam = sam.receive(initial, {now: now + 1});
const atBob = bob.receive(atSam.forward, {now: now + 2});
console.log('6lowFlare / offline, pre-paired audience model');
console.log(JSON.stringify({
  code: initial.code,
  hopBudget: [initial.hopsRemaining, atSam.forward.hopsRemaining],
  samApplicationReceipt: atSam.applicationReceived,
  bobApplicationReceipt: atBob.applicationReceived,
  suggestedModalities: atBob.requestedModalities,
  physicalOutput: atBob.physicalOutput,
  humanDetected: atBob.humanDetected,
  duplicateSuppressed: bob.receive(atSam.forward, {now: now + 3}) === null
}, null, 2));
console.log('No radio, Matrix, public broadcast, notification hardware, or human receipt.');
