#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// All links and activations simulated. No RF device, on-air warning or actuator.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReplayJournal} from '../thread-alert/replay.mjs';
import {createSyntheticFabric} from '../../src/fabric/delivery.mjs';
import {createScriptedLink, createSyntheticReceiver} from '../../src/fabric/simulation.mjs';

const directory = mkdtempSync(join(tmpdir(), '6lowstick-dual-radio-'));
const key = randomBytes(32); // ephemeral lab-only key, never written to trace
let sequence = 0;
// Deterministic *test-only* challenges; production adapters must use crypto-random nonces.
const nonceFactory = () => (++sequence).toString(16).padStart(24, '0');
const scenarios = [
  {name: 'thread_unavailable_lora_receipt', id: 'drill100',
    thread: ['down'], lora: ['deliver'], expected: 'lora-p2p', activations: 1},
  {name: 'lost_thread_ack_lora_duplicate', id: 'drill101',
    thread: ['drop_receipt'], lora: ['deliver'], expected: 'lora-p2p', activations: 1},
  {name: 'invalid_thread_receipt_lora_receipt', id: 'drill102',
    thread: ['invalid_receipt'], lora: ['deliver'], expected: 'lora-p2p', activations: 1},
  {name: 'both_links_unavailable', id: 'drill103',
    thread: ['down'], lora: ['down'], expected: null, activations: 0},
  {name: 'thread_healthy', id: 'drill104',
    thread: ['deliver'], lora: ['down'], expected: 'thread', activations: 1}
];

try {
  const reports = [];
  for (const scenario of scenarios) {
    const journal = new ReplayJournal(join(directory, scenario.name + '-replay.log'));
    const receiver = createSyntheticReceiver({name: 'haptic', key, journal});
    const adapters = {
      thread: createScriptedLink({route: 'thread', receiver, outcomes: scenario.thread}),
      'lora-p2p': createScriptedLink({route: 'lora-p2p', receiver, outcomes: scenario.lora})
    };
    const fabric = createSyntheticFabric({key, adapters, nonceFactory});
    const receipt = await fabric.deliver({id: scenario.id, receiver: 'haptic', drill: true});
    assert.equal(receipt.confirmedRoute, scenario.expected);
    assert.equal(receiver.events.filter(x => x.outcome === 'synthetic_activation').length,
      scenario.activations);
    if (scenario.name === 'lost_thread_ack_lora_duplicate')
      assert.deepEqual(receiver.events.map(x => x.outcome),
        ['synthetic_activation', 'duplicate_suppressed']);
    reports.push({scenario: scenario.name, receipt, receiverEvents: receiver.events});
  }
  console.log(JSON.stringify({
    schema: '6lowstick.multiradio-research.v0',
    links: ['simulated Thread', 'simulated peer-to-peer LoRa'],
    physicalRadio: false, spinel: false, loraWAN: false, humanDelivery: false,
    scenarioCount: reports.length, scenarios: reports,
    limitation: 'Scripted paths and simulated receiver only; application receipts do not prove RF or human delivery.'
  }, null, 2));
} finally {
  rmSync(directory, {recursive: true, force: true});
}
