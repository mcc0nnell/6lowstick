// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// 6lowLoop opt-in proximity *model*. No radio, Matrix, GPS, or dispatch.
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

const MATRIX_USER_ID = /^@[a-z0-9._=+\/-]{1,64}:[a-z0-9.-]{1,128}(?::[0-9]{1,5})?$/;
const TAG = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const NONCE = /^[0-9a-f]{24}$/;
const KINDS = ['presence', 'ping', 'ack'];
const MAX_TTL = 120000;
const MAX_CONTACTS = 32;
const MAX_REPLAYS = 1024;
const FRAME_KEYS = ['v', 'kind', 'token', 'nonce', 'issuedAt', 'expiresAt', 'replyTo', 'tag'];

const mac = (key, data) => createHmac('sha256', key).update(data).digest('hex');
const token = (key, ms) => mac(key, '6lowLoop:v1:token:' + Math.floor(ms / 60000)).slice(0, 32);
const payload = f => [f.v, f.kind, f.token, f.nonce, f.issuedAt, f.expiresAt, f.replyTo].join('|');
const validTime = ms => Number.isSafeInteger(ms) && ms >= 0;
const same = (a, b) => timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

function validFrame(f) {
  return f && typeof f === 'object' && !Array.isArray(f) &&
    Object.keys(f).length === FRAME_KEYS.length && FRAME_KEYS.every(k => Object.hasOwn(f, k)) &&
    f.v === 1 && KINDS.includes(f.kind) && TOKEN.test(f.token) &&
    typeof f.nonce === 'string' && NONCE.test(f.nonce) &&
    typeof f.token === 'string' && typeof f.tag === 'string' && TAG.test(f.tag) &&
    validTime(f.issuedAt) && validTime(f.expiresAt) &&
    (f.kind === 'ack' ? typeof f.replyTo === 'string' && NONCE.test(f.replyTo) : f.replyTo === null);
}

// Pairing is deliberately out of scope: each friend has a distinct 32-byte
// key exchanged through a trusted channel, not obtained from a public beacon.
export function create6lowLoop({friends = [], enabled = false, nonceSource = () => randomBytes(12)} = {}) {
  if (!Array.isArray(friends) || friends.length > MAX_CONTACTS ||
      typeof enabled !== 'boolean' || typeof nonceSource !== 'function')
    throw new TypeError('invalid 6lowLoop configuration');
  const keys = new Map();
  for (const friend of friends) {
    if (!friend || !MATRIX_USER_ID.test(friend.id) || keys.has(friend.id))
      throw new TypeError('invalid or repeated friend');
    const key = Buffer.isBuffer(friend.key) ? Buffer.from(friend.key) :
      typeof friend.key === 'string' && TAG.test(friend.key) ? Buffer.from(friend.key, 'hex') : null;
    if (!key || key.length !== 32) throw new TypeError('friend key must be 32 bytes');
    if (Array.from(keys.values()).some(existing => existing.equals(key)))
      throw new TypeError('pairwise friend keys must be distinct');
    keys.set(friend.id, key);
  }
  let on = enabled;
  const replay = new Map();
  const nearby = new Map();
  const outstanding = new Map();
  function expire(now) {
    for (const [k, until] of replay) if (until <= now) replay.delete(k);
    for (const [k, item] of nearby) if (item.expiresAt <= now) nearby.delete(k);
    for (const [k, item] of outstanding) if (item.expiresAt <= now) outstanding.delete(k);
  }
  function emit(kind, friend, {now = Date.now(), ttlMs = 60000, replyTo = null} = {}) {
    if (!on) throw new Error('6lowLoop disabled');
    if (!keys.has(friend)) throw new Error('friend not paired');
    if (!validTime(now) || !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_TTL ||
        !validTime(now + ttlMs)) throw new RangeError('invalid time or TTL');
    if (kind === 'ack' ? !NONCE.test(replyTo) : replyTo !== null)
      throw new TypeError('invalid reply reference');
    const nonce = nonceSource().toString('hex');
    if (!NONCE.test(nonce)) throw new TypeError('invalid nonce source');
    const key = keys.get(friend);
    const frame = {v: 1, kind, token: token(key, now), nonce,
      issuedAt: now, expiresAt: now + ttlMs, replyTo};
    frame.tag = mac(key, payload(frame));
    if (kind === 'ping') outstanding.set(nonce, {friend, expiresAt: frame.expiresAt});
    return frame;
  }
  return {
    enable() { on = true; },
    disable() { on = false; replay.clear(); nearby.clear(); outstanding.clear(); },
    isEnabled() { return on; },
    announce(friend, options) { return emit('presence', friend, options); },
    ping(friend, options) { return emit('ping', friend, options); },
    acknowledge(friend, pingNonce, options) {
      return emit('ack', friend, {...options, replyTo: pingNonce});
    },
    receive(f, {now = Date.now()} = {}) {
      if (!on || !validTime(now) || !validFrame(f) ||
          f.issuedAt > now + 5000 || f.expiresAt <= now ||
          f.expiresAt <= f.issuedAt || f.expiresAt - f.issuedAt > MAX_TTL) return null;
      expire(now);
      let friend = null;
      for (const [id, key] of keys) {
        if (f.token === token(key, f.issuedAt) && same(f.tag, mac(key, payload(f)))) {
          friend = id;
          break;
        }
      }
      if (!friend) return null;
      const rid = friend + ':' + f.nonce;
      if (replay.has(rid) || replay.size >= MAX_REPLAYS) return null;
      if (f.kind === 'ack') {
        const ping = outstanding.get(f.replyTo);
        if (!ping || ping.friend !== friend || ping.expiresAt <= now) return null;
        outstanding.delete(f.replyTo);
      }
      replay.set(rid, f.expiresAt);
      nearby.set(friend, {lastSeen: now, expiresAt: f.expiresAt});
      return {friend, kind: f.kind, nonce: f.nonce, replyTo: f.replyTo,
        applicationReceived: true};
    },
    friendsNearby({now = Date.now()} = {}) {
      if (!validTime(now) || !on) return [];
      expire(now);
      return Array.from(nearby, ([friend, record]) => ({friend,
        status: 'reachable-in-local-model', ...record}));
    }
  };
}
