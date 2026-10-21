// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Modelled transports only. No Thread RCP, Spinel, ChirpStack or LoRa RF.
import {verifyAlert} from '../../experiments/thread-alert/auth.mjs';
import {signReceipt} from './receipts.mjs';

const OUTCOMES = new Set(['deliver', 'down', 'drop_receipt', 'invalid_receipt', 'transport_error']);

export function createSyntheticReceiver({name, key, journal}) {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(name) ||
      typeof journal?.accept !== 'function') throw new TypeError('invalid receiver');
  const events = [];
  return {
    name, events,
    receive({wire, nonce, route}) {
      const message = verifyAlert(key, wire);
      if (!message) {
        events.push({route, outcome: 'rejected_auth'});
        return null;
      }
      const fresh = journal.accept(message.id);
      events.push({route, id: message.id,
        outcome: fresh ? 'synthetic_activation' : 'duplicate_suppressed'});
      return signReceipt(key, message.id, name, nonce);
    }
  };
}

export function createScriptedLink({route, receiver, outcomes = []}) {
  if (!['thread', 'lora-p2p'].includes(route) || typeof receiver?.receive !== 'function' ||
      !Array.isArray(outcomes) || outcomes.some(x => !OUTCOMES.has(x)))
    throw new TypeError('invalid simulated link configuration');
  let calls = 0;
  const observations = [];
  return {
    kind: 'simulation', route, observations,
    async transmit({wire, nonce, receiver: target}) {
      if (target !== receiver.name) throw new Error('receiver not reachable');
      const outcome = outcomes[calls++] ?? 'deliver';
      observations.push({attempt: calls, outcome});
      if (outcome === 'down') return {receipt: null};
      if (outcome === 'transport_error') throw new Error('simulated transport failure');
      const receipt = receiver.receive({wire, nonce, route});
      if (outcome === 'drop_receipt') return {receipt: null};
      if (outcome === 'invalid_receipt' && receipt)
        return {receipt: receipt.slice(0, -1) + (receipt.endsWith('0') ? '1' : '0')};
      return {receipt};
    }
  };
}
