// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Deterministic synthetic two-link delivery policy, independent of RF/MAC layers.
import {randomBytes} from 'node:crypto';
import {signAlert} from '../../experiments/thread-alert/auth.mjs';
import {verifyReceipt} from './receipts.mjs';

const NAME = /^[A-Za-z0-9_-]{1,32}$/;
const NONCE = /^[a-f0-9]{24}$/;
const SUPPORTED = Object.freeze(['thread', 'lora-p2p']);

// Deliberately restricted to simulation drivers: this API cannot send live
// warnings or invoke radio/actuator hardware.
export function createSyntheticFabric({key, adapters, nonceFactory = () => randomBytes(12).toString('hex')}) {
  if (!key || !adapters || typeof adapters !== 'object' || typeof nonceFactory !== 'function')
    throw new TypeError('invalid synthetic fabric configuration');
  for (const [route, driver] of Object.entries(adapters)) {
    if (!SUPPORTED.includes(route) || driver?.kind !== 'simulation' ||
        typeof driver.transmit !== 'function')
      throw new TypeError('only explicitly labeled simulation adapters are supported');
  }
  async function deliver({id, receiver, routes = SUPPORTED, drill}) {
    if (drill !== true) throw new Error('live delivery is prohibited');
    if (!NAME.test(id) || !NAME.test(receiver) ||
        !Array.isArray(routes) || routes.length < 1 || routes.length > 2 ||
        new Set(routes).size !== routes.length ||
        routes.some(route => !SUPPORTED.includes(route) || !adapters[route]))
      throw new TypeError('invalid id, receiver, or configured routes');

    const wire = signAlert(key, id, 'NOTIFY');
    const attempts = [];
    const challenges = new Set();
    for (const [index, route] of routes.entries()) {
      const nonce = nonceFactory();
      if (typeof nonce !== 'string' || !NONCE.test(nonce) || challenges.has(nonce))
        throw new TypeError('nonceFactory must provide fresh 96-bit hexadecimal challenges');
      challenges.add(nonce);
      let response;
      try {
        response = await adapters[route].transmit({wire, id, receiver, nonce});
      } catch {
        attempts.push({step: index + 1, route, outcome: 'transport_error'});
        continue;
      }
      const authenticated = verifyReceipt(key, response?.receipt, {id, receiver, nonce});
      const outcome = authenticated ? 'authenticated_app_receipt' :
        response?.receipt ? 'invalid_app_receipt' : 'no_authenticated_receipt';
      attempts.push({step: index + 1, route, outcome});
      if (authenticated) {
        return {
          schema: '6lowstick.synthetic-fabric.v0', simulation: true, drill: true,
          id, receiver, status: 'app_acknowledged', confirmedRoute: route,
          attempts, humanAcknowledged: false, physicalRadioVerified: false
        };
      }
    }
    return {
      schema: '6lowstick.synthetic-fabric.v0', simulation: true, drill: true,
      id, receiver, status: 'unconfirmed', confirmedRoute: null,
      attempts, humanAcknowledged: false, physicalRadioVerified: false
    };
  }
  return {deliver};
}
