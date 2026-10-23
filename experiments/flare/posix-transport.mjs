// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// 6lowFlare over OpenThread POSIX simulated UDP (CLI-only experimental seam).
import {createHmac, timingSafeEqual} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const FRAME = /^FL1\|([0-9a-f]{32})\|([0-9a-f]{24})\|(here|rendezvous|attention|assistance)\|(0|[1-9][0-9]{0,15})\|(0|[1-9][0-9]{0,15})\|([0-4])\|([0-9a-f]{64})$/;
const RECEIPT = /^FA2\|([A-Za-z0-9_-]{1,32})\|([0-9a-f]{24})\|([0-9a-f]{64})$/;
const NONCE = /^[0-9a-f]{24}$/;
const KEY = /^[0-9a-f]{64}$/;
const BOUND = 256;
function parseKey(input) {
  const value = Buffer.isBuffer(input) ? Buffer.from(input) :
    typeof input === 'string' && KEY.test(input) ? Buffer.from(input, 'hex') : null;
  if (!value || value.length !== 32) throw new TypeError('invalid simulation group key');
  return value;
}
function sign(key, body) { return createHmac('sha256', key).update(body).digest('hex'); }

// Encodes one *already authenticated by the receiver's core* frame.
// CLI only supports printable ASCII; no JSON or arbitrary user-supplied text.
export function encodeFlareUdp(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f) ||
      Object.keys(f).sort().join(',') !==
      ['v', 'kind', 'token', 'nonce', 'code', 'issuedAt', 'expiresAt', 'hopsRemaining', 'tag'].sort().join(',') ||
      f.v !== 1 || f.kind !== 'flare') throw new TypeError('invalid flare envelope');
  const wire = ['FL1', f.token, f.nonce, f.code, f.issuedAt,
    f.expiresAt, f.hopsRemaining, f.tag].join('|');
  if (wire.length > BOUND || !decodeFlareUdp(wire))
    throw new TypeError('invalid bounded UDP envelope');
  return wire;
}
export function decodeFlareUdp(body) {
  if (typeof body !== 'string' || body.length > BOUND) return null;
  const match = FRAME.exec(body);
  if (!match) return null;
  const issuedAt = Number(match[4]), expiresAt = Number(match[5]);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
  return {v: 1, kind: 'flare', token: match[1], nonce: match[2],
    code: match[3], issuedAt, expiresAt, hopsRemaining: Number(match[6]), tag: match[7]};
}

export function signFlareAppReceipt({key, node, nonce}) {
  const bytes = parseKey(key);
  if (typeof node !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(node) ||
      typeof nonce !== 'string' || !NONCE.test(nonce))
    throw new TypeError('invalid receipt fields');
  return 'FA2|' + node + '|' + nonce + '|' +
    sign(bytes, '6lowFlare:v1:app-receipt:' + node + ':' + nonce);
}
export function verifyFlareAppReceipt({wire, key, node, nonce}) {
  if (typeof wire !== 'string' || wire.length > BOUND ||
      typeof node !== 'string' || typeof nonce !== 'string') return false;
  const match = RECEIPT.exec(wire);
  if (!match || match[1] !== node || match[2] !== nonce) return false;
  const expected = signFlareAppReceipt({key, node, nonce}).split('|')[3];
  return timingSafeEqual(Buffer.from(match[3], 'hex'), Buffer.from(expected, 'hex'));
}
export const isFlareUdpPayload = value =>
  typeof value === 'string' && value.length <= BOUND &&
  (FRAME.test(value) || RECEIPT.test(value));

// Reusable receipt wait for forwarded second-hop traffic. Start time must
// be captured BEFORE the original send; a repeated transmission may be
// correctly suppressed and must not be used to create a fresh ACK.
export async function awaitFlareAppReceipt({sender, key, node, nonce, since, waitMs = 1500}) {
  parseKey(key);
  if (!sender || !Array.isArray(sender.received) || !Number.isFinite(since) ||
      since < 0 || !Number.isSafeInteger(waitMs) || waitMs < 1 || waitMs > 30000 ||
      typeof node !== 'string' || typeof nonce !== 'string') {
    throw new TypeError('invalid receipt wait context');
  }
  const deadline = performance.now() + waitMs;
  do {
    const match = sender.received.find(packet =>
      packet.time >= since && verifyFlareAppReceipt({
        wire: packet.body, key, node, nonce
      }));
    if (match) return {applicationReceipt: true, simulated: true, confirmedNodeLabel: node};
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (performance.now() < deadline);
  return {applicationReceipt: false, simulated: true, confirmedNodeLabel: null};
}

// The underlying command's "Done" is NOT an application receipt.
export function createFlarePosixAdapter({sender, targetAddress, port, key, receiptFrom, waitMs = 1500}) {
  parseKey(key);
  if (!sender || typeof sender.command !== 'function' || !Array.isArray(sender.received) ||
      typeof targetAddress !== 'string' ||
      !/^[0-9a-f:]+$/i.test(targetAddress) || targetAddress.length > 64 ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      typeof receiptFrom !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(receiptFrom) ||
      !Number.isSafeInteger(waitMs) || waitMs < 1 || waitMs > 30000)
    throw new TypeError('invalid simulated POSIX adapter');
  return {
    kind: 'openthread-posix-simulation',
    async transmit(frame) {
      const wire = encodeFlareUdp(frame);
      const start = performance.now();
      await sender.command('udp send ' + targetAddress + ' ' + port + ' ' + wire);
      return awaitFlareAppReceipt({sender, key, node: receiptFrom,
        nonce: frame.nonce, since: start, waitMs});
    }
  };
}
