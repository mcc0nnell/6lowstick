// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// ASCII-only OpenThread POSIX CLI transport for existing authenticated Loop frames.
// Wire encoding is NOT cryptographic authority: create6lowLoop.receive owns validation.
import {createHmac, timingSafeEqual} from 'node:crypto';

const FRAME = /^LO1\|(presence|ping|ack)\|([0-9a-f]{32})\|([0-9a-f]{24})\|(0|[1-9][0-9]{0,15})\|(0|[1-9][0-9]{0,15})\|(-|[0-9a-f]{24})\|([0-9a-f]{64})$/;
const RECEIPT = /^LR1\|(alice|sam)\|(presence|ping)\|([0-9a-f]{24})\|([0-9a-f]{64})$/;
const KEY = /^[0-9a-f]{64}$/;
const MAX_BYTES = 256;
const FRAME_KEYS = ['v','kind','token','nonce','issuedAt','expiresAt','replyTo','tag'];
const serial = value => String(value);
const keyBytes = key => {
  const result = Buffer.isBuffer(key) ? Buffer.from(key) :
    typeof key === 'string' && KEY.test(key) ? Buffer.from(key, 'hex') : null;
  if (!result || result.length !== 32) throw new TypeError('invalid loop fixture key');
  return result;
};
const digest = (key, message) => createHmac('sha256', key).update(message).digest('hex');

// No Matrix user IDs, precise locations, free text or JSON on UDP.
export function encodeLoopUdp(frame) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame) ||
      Object.keys(frame).sort().join(',') !== FRAME_KEYS.slice().sort().join(',') ||
      frame.v !== 1) throw new TypeError('invalid loop frame fields');
  const wire = ['LO1',frame.kind,frame.token,frame.nonce,frame.issuedAt,
    frame.expiresAt,frame.replyTo ?? '-',frame.tag].map(serial).join('|');
  if (Buffer.byteLength(wire,'ascii') > MAX_BYTES || !decodeLoopUdp(wire))
    throw new TypeError('invalid bounded loop UDP frame');
  return wire;
}
export function decodeLoopUdp(wire) {
  if (typeof wire !== 'string' || wire.length > MAX_BYTES) return null;
  const m = FRAME.exec(wire);
  if (!m) return null;
  const issuedAt = Number(m[4]), expiresAt = Number(m[5]);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) ||
      expiresAt <= issuedAt || expiresAt - issuedAt > 120000 ||
      (m[1] === 'ack') !== (m[6] !== '-')) return null;
  return {v:1,kind:m[1],token:m[2],nonce:m[3],
    issuedAt,expiresAt,replyTo:m[6] === '-' ? null : m[6],tag:m[7]};
}

// A signed acknowledgement means the *receiver application* admitted the
// presence/ping frame. It is not a radio-layer or human-delivery receipt.
export function signLoopAppReceipt({key,node,kind,nonce}) {
  const bytes = keyBytes(key);
  if (!['alice','sam'].includes(node) || !['presence','ping'].includes(kind) ||
      typeof nonce !== 'string' || !/^[0-9a-f]{24}$/.test(nonce))
    throw new TypeError('invalid loop receipt fields');
  const body = ['6lowLoop:posix-app-receipt:v1',node,kind,nonce].join(':');
  return ['LR1',node,kind,nonce,digest(bytes,body)].join('|');
}
export function verifyLoopAppReceipt({wire,key,node,kind,nonce}) {
  if (typeof wire !== 'string' || wire.length > MAX_BYTES ||
      !['alice','sam'].includes(node) || !['presence','ping'].includes(kind) ||
      typeof nonce !== 'string' || !/^[0-9a-f]{24}$/.test(nonce)) return false;
  const m=RECEIPT.exec(wire);
  if (!m || m[1]!==node || m[2]!==kind || m[3]!==nonce) return false;
  const expected=signLoopAppReceipt({key,node,kind,nonce}).split('|')[4];
  return timingSafeEqual(Buffer.from(m[4],'hex'),Buffer.from(expected,'hex'));
}
export const isLoopUdpPayload = value => typeof value === 'string' &&
  value.length <= MAX_BYTES && (FRAME.test(value) || RECEIPT.test(value));
