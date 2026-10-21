// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Synthetic lab-only authenticated application receipt. NOT human acknowledgement.
import {createHmac, timingSafeEqual} from 'node:crypto';

const NAME = /^[A-Za-z0-9_-]{1,32}$/;
const NONCE = /^[a-f0-9]{24}$/;
const TAG = /^[a-f0-9]{32}$/;

export function signReceipt(key, id, receiver, nonce) {
  if (!NAME.test(id) || !NAME.test(receiver) || !NONCE.test(nonce))
    throw new TypeError('invalid synthetic receipt fields');
  const body = `R2|${id}|${receiver}|${nonce}`;
  const tag = createHmac('sha256', key).update(body).digest('hex').slice(0, 32);
  return `${body}|${tag}`;
}

export function verifyReceipt(key, input, {id, receiver, nonce}) {
  if (typeof input !== 'string' || input.length > 160 ||
      !NAME.test(id) || !NAME.test(receiver) || !NONCE.test(nonce)) return false;
  const parts = input.split('|');
  if (parts.length !== 5 || parts[0] !== 'R2' || parts[1] !== id ||
      parts[2] !== receiver || parts[3] !== nonce || !TAG.test(parts[4])) return false;
  const expected = signReceipt(key, id, receiver, nonce).split('|')[4];
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts[4], 'hex'));
}
