// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// 6lowFlare: opt-in, authenticated, process-local group relay MODEL only.
// No RF, Matrix, GPS, public broadcasting, actuator or dispatch capability.
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

const CODES = Object.freeze(['here', 'rendezvous', 'attention', 'assistance']);
const CODE_SET = new Set(CODES);
const ID = /^[A-Za-z0-9_-]{1,32}$/;
const KEY_HEX = /^[0-9a-f]{64}$/;
const TOKEN = /^[0-9a-f]{32}$/;
const NONCE = /^[0-9a-f]{24}$/;
const FIELDS = ['v', 'kind', 'token', 'nonce', 'code', 'issuedAt',
  'expiresAt', 'hopsRemaining', 'tag'];
const MAX_TTL = 120000;
const MAX_HOPS = 4;
const MAX_REPLAY = 1024;
const validTime = t => Number.isSafeInteger(t) && t >= 0;
const mac = (key, string) => createHmac('sha256', key).update(string).digest('hex');
const token = (key, time) => mac(key, '6lowFlare:v1:token:' + Math.floor(time / 60000)).slice(0, 32);
const body = f => ['6lowFlare:v1', f.v, f.kind, f.token, f.nonce, f.code,
  f.issuedAt, f.expiresAt, f.hopsRemaining].join('|');
const same = (a, b) => timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

function validFrame(f) {
  return f && typeof f === 'object' && !Array.isArray(f) &&
    Object.keys(f).length === FIELDS.length && FIELDS.every(k => Object.hasOwn(f, k)) &&
    f.v === 1 && f.kind === 'flare' &&
    typeof f.token === 'string' && TOKEN.test(f.token) &&
    typeof f.nonce === 'string' && NONCE.test(f.nonce) &&
    CODE_SET.has(f.code) && validTime(f.issuedAt) && validTime(f.expiresAt) &&
    f.expiresAt > f.issuedAt && f.expiresAt - f.issuedAt <= MAX_TTL &&
    Number.isInteger(f.hopsRemaining) && f.hopsRemaining >= 0 &&
    f.hopsRemaining <= MAX_HOPS &&
    typeof f.tag === 'string' && KEY_HEX.test(f.tag);
}
function parseKey(input) {
  const key = Buffer.isBuffer(input) ? Buffer.from(input) :
    typeof input === 'string' && KEY_HEX.test(input) ? Buffer.from(input, 'hex') : null;
  if (!key || key.length !== 32) throw new TypeError('audience key must be 32 bytes');
  return key;
}

// Audiences are manually provisioned local group keys; not Matrix rooms.
export function create6lowFlare({audiences = [], enabled = false,
  relayEnabled = false, modalities = [], nonceSource = () => randomBytes(12)} = {}) {
  if (!Array.isArray(audiences) || audiences.length > 16 ||
      typeof enabled !== 'boolean' || typeof relayEnabled !== 'boolean' ||
      (relayEnabled && !enabled) || typeof nonceSource !== 'function' ||
      !Array.isArray(modalities) || modalities.length > 3 ||
      new Set(modalities).size !== modalities.length ||
      modalities.some(m => !['light', 'haptic', 'text'].includes(m)))
    throw new TypeError('invalid flare configuration');
  const groups = new Map();
  for (const entry of audiences) {
    if (!entry || typeof entry.id !== 'string' || !ID.test(entry.id) ||
        groups.has(entry.id) || !Array.isArray(entry.codes) ||
        entry.codes.length === 0 || entry.codes.length > CODES.length ||
        new Set(entry.codes).size !== entry.codes.length ||
        entry.codes.some(code => !CODE_SET.has(code)))
      throw new TypeError('invalid or duplicate audience');
    const key = parseKey(entry.key);
    if ([...groups.values()].some(g => g.key.equals(key)))
      throw new TypeError('audience keys must be distinct');
    groups.set(entry.id, {key, codes: new Set(entry.codes)});
  }
  let on = enabled;
  let relay = relayEnabled;
  const seen = new Map(); // bounded volatile replay journal
  function expire(now) {
    for (const [id, until] of seen) if (until <= now) seen.delete(id);
  }
  function remember(group, frame) {
    const id = group + ':' + frame.nonce;
    if (seen.has(id) || seen.size >= MAX_REPLAY) return false;
    seen.set(id, frame.expiresAt);
    return true;
  }
  function signed(frame, key) {
    return {...frame, tag: mac(key, body(frame))};
  }
  return {
    isEnabled() { return on; },
    isRelayEnabled() { return on && relay; },
    enable() { on = true; },
    enableRelay() {
      if (!on) throw new Error('6lowFlare disabled');
      relay = true;
    },
    disableRelay() { relay = false; },
    disable() { on = false; relay = false; seen.clear(); },
    // Produces a frame in memory. Has no transport authority.
    flare(audience, code, {now = Date.now(), ttlMs = 60000, hops = 0} = {}) {
      if (!on) throw new Error('6lowFlare disabled');
      const group = groups.get(audience);
      if (!group || !group.codes.has(code)) throw new Error('audience or code not authorized');
      if (!validTime(now) || !Number.isSafeInteger(ttlMs) || ttlMs < 1 ||
          ttlMs > MAX_TTL || !validTime(now + ttlMs) ||
          !Number.isInteger(hops) || hops < 0 || hops > MAX_HOPS)
        throw new RangeError('invalid flare TTL or hop bound');
      const nonce = nonceSource().toString('hex');
      if (!NONCE.test(nonce)) throw new TypeError('invalid nonce source');
      expire(now);
      const frame = signed({v: 1, kind: 'flare', token: token(group.key, now),
        nonce, code, issuedAt: now, expiresAt: now + ttlMs, hopsRemaining: hops}, group.key);
      if (!remember(audience, frame)) throw new Error('nonce reused or replay capacity reached');
      return frame;
    },
    // A receipt is application admission only, not a device/human receipt.
    receive(frame, {now = Date.now()} = {}) {
      if (!on || !validTime(now) || !validFrame(frame) ||
          frame.issuedAt > now + 5000 || frame.expiresAt <= now) return null;
      expire(now);
      for (const [audience, group] of groups) {
        if (frame.token !== token(group.key, frame.issuedAt) ||
            !same(frame.tag, mac(group.key, body(frame)))) continue;
        if (!group.codes.has(frame.code) || !remember(audience, frame)) return null;
        const forward = relay && frame.hopsRemaining > 0
          ? signed({...frame, hopsRemaining: frame.hopsRemaining - 1}, group.key)
          : null;
        return {audience, code: frame.code, nonce: frame.nonce,
          applicationReceived: true, physicalOutput: 'unknown',
          humanDetected: 'unknown', humanUnderstood: 'unknown',
          requestedModalities: [...modalities], forward};
      }
      return null;
    }
  };
}
export const flareCodes = CODES;
