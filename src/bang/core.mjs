// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// 6lowBang: process-local authenticated caption-event MODEL.
// No audio capture, recognition, translation, encryption, radio, or alerts.
import {createPrivateKey, createPublicKey, KeyObject, randomBytes, sign, verify} from 'node:crypto';

const CHANNEL = /^[a-z][a-z0-9-]{0,31}$/;
const SESSION = /^[0-9a-f]{32}$/;
const LANGUAGE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
const SIG = /^[A-Za-z0-9_-]{86}$/;
const KEYS = ['v', 'kind', 'channel', 'language', 'session', 'seq',
  'capturedAt', 'expiresAt', 'text', 'signature'];
const MAX_BYTES = 96;
const MAX_TTL_MS = 30000;
const WINDOW = 32;
const MAX_SESSIONS = 32;
const MAX_CHANNELS = 16;
const validTime = t => Number.isSafeInteger(t) && t >= 0;
const validText = text => typeof text === 'string' && text.trim().length > 0 &&
  Buffer.byteLength(text, 'utf8') <= MAX_BYTES && !/[\u0000-\u001f\u007f]/u.test(text);
const validFrame = f => f && typeof f === 'object' && !Array.isArray(f) &&
  Object.keys(f).length === KEYS.length && KEYS.every(k => Object.hasOwn(f, k)) &&
  f.v === 1 && (f.kind === 'caption' || f.kind === 'sound') &&
  typeof f.channel === 'string' && CHANNEL.test(f.channel) &&
  typeof f.language === 'string' && LANGUAGE.test(f.language) &&
  typeof f.session === 'string' && SESSION.test(f.session) &&
  Number.isSafeInteger(f.seq) && f.seq >= 1 &&
  validTime(f.capturedAt) && validTime(f.expiresAt) &&
  f.expiresAt > f.capturedAt && f.expiresAt - f.capturedAt <= MAX_TTL_MS &&
  validText(f.text) && typeof f.signature === 'string' && SIG.test(f.signature);
const payload = f => Buffer.from('6lowBang:v1:' + JSON.stringify([
  f.v, f.kind, f.channel, f.language, f.session, f.seq,
  f.capturedAt, f.expiresAt, f.text
]), 'utf8');

export function create6lowBangSource({channel, language = 'en', privateKey,
  session = randomBytes(16).toString('hex')} = {}) {
  if (typeof channel !== 'string' || !CHANNEL.test(channel) ||
      typeof language !== 'string' || !LANGUAGE.test(language) ||
      typeof session !== 'string' || !SESSION.test(session))
    throw new TypeError('invalid channel, language or session');
  const key = privateKey instanceof KeyObject ? privateKey : createPrivateKey(privateKey);
  if (key.type !== 'private' || key.asymmetricKeyType !== 'ed25519') throw new TypeError('Ed25519 private key required');
  let seq = 0;
  return {
    emit(kind, text, {now = Date.now(), ttlMs = 15000} = {}) {
      if (kind !== 'caption' && kind !== 'sound') throw new TypeError('invalid event kind');
      if (!validText(text)) throw new RangeError('invalid caption text or byte budget');
      if (!validTime(now) || !Number.isSafeInteger(ttlMs) || ttlMs < 1 ||
          ttlMs > MAX_TTL_MS || !validTime(now + ttlMs))
        throw new RangeError('invalid time or TTL');
      if (seq >= Number.MAX_SAFE_INTEGER) throw new RangeError('sequence exhausted');
      const f = {v: 1, kind, channel, language, session, seq: ++seq,
        capturedAt: now, expiresAt: now + ttlMs, text};
      return {...f, signature: sign(null, payload(f), key).toString('base64url')};
    }
  };
}

// Subscriber pins a distinct public key per channel, not a shared group signing key.
export function create6lowBangReceiver({channels = [], enabled = false} = {}) {
  if (!Array.isArray(channels) || channels.length > MAX_CHANNELS ||
      typeof enabled !== 'boolean') throw new TypeError('invalid bang configuration');
  const publishers = new Map();
  for (const item of channels) {
    if (!item || typeof item.id !== 'string' || !CHANNEL.test(item.id) ||
        publishers.has(item.id)) throw new TypeError('invalid or duplicate channel');
    const key = item.publicKey instanceof KeyObject ? item.publicKey : createPublicKey(item.publicKey);
    if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') throw new TypeError('Ed25519 public key required');
    publishers.set(item.id, key);
  }
  let on = enabled;
  const subscriptions = new Set();
  const streams = new Map();
  const streamId = f => f.channel + ':' + f.session;
  function drain(s, now) {
    const ready = [];
    while (s.pending.has(s.next)) {
      const {frame: part} = s.pending.get(s.next);
      s.pending.delete(s.next++);
      // Expired buffered entries are dropped, not displayed late.
      if (part.expiresAt > now) ready.push({kind: part.kind, channel: part.channel,
        language: part.language, text: part.text, seq: part.seq,
        capturedAt: part.capturedAt});
    }
    return ready;
  }
  function prune(now) {
    for (const [id, record] of streams) if (record.until <= now) streams.delete(id);
  }
  return {
    isEnabled() { return on; },
    enable() { on = true; },
    disable() { on = false; subscriptions.clear(); streams.clear(); },
    subscribe(channel) {
      if (!on) throw new Error('6lowBang disabled');
      if (!publishers.has(channel)) throw new Error('unknown caption channel');
      subscriptions.add(channel);
    },
    unsubscribe(channel) {
      subscriptions.delete(channel);
      for (const id of streams.keys()) if (id.startsWith(channel + ':')) streams.delete(id);
    },
    receive(f, {now = Date.now()} = {}) {
      if (!on || !validTime(now) || !validFrame(f) ||
          !subscriptions.has(f.channel) || f.capturedAt > now + 5000 ||
          f.expiresAt <= now) return null;
      const key = publishers.get(f.channel);
      if (!key) return null;
      let verified = false;
      try { verified = verify(null, payload(f), key, Buffer.from(f.signature, 'base64url')); }
      catch { return null; }
      if (!verified) return null;
      prune(now);
      const id = streamId(f);
      let s = streams.get(id);
      if (!s) {
        if (streams.size >= MAX_SESSIONS) return null;
        s = {next: 1, pending: new Map(), until: f.expiresAt};
        streams.set(id, s);
      }
      if (f.seq < s.next || f.seq >= s.next + WINDOW || s.pending.has(f.seq)) return null;
      s.pending.set(f.seq, {frame: f, observedAt: now});
      s.until = Math.max(s.until, f.expiresAt);
      const ready = drain(s, now);
      return {applicationReceived: true, ready, waitingFor: s.pending.size ? s.next : null,
        physicalOutput: 'unknown', humanDetected: 'unknown', humanUnderstood: 'unknown'};
    },
    // Caller-driven jitter-buffer timeout. Never invents missing words.
    flush(channel, session, {now = Date.now(), holdMs = 250} = {}) {
      if (!on || !validTime(now) || !Number.isSafeInteger(holdMs) ||
          holdMs < 0 || holdMs > 5000) return null;
      prune(now);
      const s = streams.get(channel + ':' + session);
      if (!s || s.pending.size === 0) return null;
      const seq = Math.min(...s.pending.keys());
      const first = s.pending.get(seq);
      if (seq <= s.next || now - first.observedAt < holdMs) return null;
      const missingFrom = s.next, missingThrough = seq - 1;
      s.next = seq;
      return {skipped: {from: missingFrom, through: missingThrough},
        ready: drain(s, now), physicalOutput: 'unknown', humanDetected: 'unknown'};
    }
  };
}
