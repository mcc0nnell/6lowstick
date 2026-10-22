// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// OpenThread POSIX *simulated radio*, application-level UDP boundary.
// No physical IEEE 802.15.4, Spinel RCP, or live alert output.
import {performance} from 'node:perf_hooks';

const EA2 = 'EA2\\|[A-Za-z0-9_-]{1,32}\\|NOTIFY\\|[a-f0-9]{32}';
const RECEIPT = /^R2\|[A-Za-z0-9_-]{1,32}\|[A-Za-z0-9_-]{1,32}\|[a-f0-9]{24}\|[a-f0-9]{32}$/;
const FRAME = new RegExp('^F1\\|([a-f0-9]{24})\\|(' + EA2 + ')$');
const CHALLENGE = /^[a-f0-9]{24}$/;

// Accept only recognized application frames in ot-cli's UDP receive output.
// Source addresses must not be inferred from an authenticated application receipt.
export function isFabricUdpPayload(value) {
  return typeof value === 'string' && (FRAME.test(value) || RECEIPT.test(value));
}

export function createPosixThreadAdapter({gateway, target, alertPort, waitMs = 1600}) {
  if (!gateway || !target || typeof gateway.command !== 'function' ||
      !Array.isArray(gateway.received) || typeof target.address !== 'string' ||
      !Number.isInteger(alertPort) || alertPort < 1 || alertPort > 65535 ||
      !Number.isInteger(waitMs) || waitMs < 1 || waitMs > 30000)
    throw new TypeError('invalid OpenThread simulated-radio adapter configuration');
  return {
    kind: 'simulation',
    async transmit({wire, id, receiver, nonce}) {
      if (typeof id !== 'string' || typeof receiver !== 'string' ||
          !CHALLENGE.test(nonce) ||
          typeof wire !== 'string' || !new RegExp('^' + EA2 + '$').test(wire))
        throw new TypeError('invalid synthetic transport message');
      const started = performance.now();
      // The CLI's "Done" only means the command was accepted, not delivered.
      await gateway.command('udp send ' + target.address + ' ' + alertPort +
        ' F1|' + nonce + '|' + wire);
      const prefix = 'R2|' + id + '|' + receiver + '|' + nonce + '|';
      const deadline = performance.now() + waitMs;
      do {
        // Match *this* attempt's challenge and an arrival after the send.
        const match = gateway.received.find(packet =>
          packet.time >= started && packet.body.startsWith(prefix));
        if (match) return {receipt: match.body};
        await new Promise(resolve => setTimeout(resolve, 40));
      } while (performance.now() < deadline);
      return {receipt: null};
    }
  };
}

export async function dispatchFabricUdp({body, node, gatewayAddress, ackPort, receiver,
  suppressReceiptFor = new Set()}) {
  if (typeof body !== 'string' || !body.startsWith('F1|')) return false;
  const match = FRAME.exec(body);
  if (!match) return true; // Consume malformed F1, never forward to ordinary EA2 handler.
  const [_, nonce, wire] = match;
  const receipt = receiver.receive({wire, nonce, route: 'thread'});
  // Deliberately simulate a missing application receipt, not a missing send.
  const id = wire.split('|')[1];
  if (receipt && !suppressReceiptFor.has(id))
    await node.command('udp send ' + gatewayAddress + ' ' + ackPort + ' ' + receipt);
  return true;
}
