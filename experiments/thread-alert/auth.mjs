// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Synthetic lab-only authenticated application envelope, not CAP/IPAWS.
import {createHmac, timingSafeEqual} from 'node:crypto';

const ID = /^[A-Za-z0-9_-]{1,32}$/;
const MAC = /^[a-f0-9]{32}$/;
export function signAlert(key, id, action = 'EVACUATE') {
  if (!ID.test(id) || action !== 'EVACUATE') throw new Error('invalid synthetic alert');
  const body = `EA2|${id}|${action}`;
  const tag = createHmac('sha256', key).update(body).digest('hex').slice(0, 32);
  return `${body}|${tag}`;
}
export function verifyAlert(key, wire) {
  if (typeof wire !== 'string' || wire.length > 100) return null;
  const parts = wire.split('|');
  if (parts.length !== 4 || parts[0] !== 'EA2' || !ID.test(parts[1]) ||
      parts[2] !== 'EVACUATE' || !MAC.test(parts[3])) return null;
  const expected = signAlert(key, parts[1], parts[2]).split('|')[3];
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts[3], 'hex'))) return null;
  return {id: parts[1], action: parts[2]};
}
