// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// 6lowSpark monochrome display projection: deliberately simulation-only.
// This module cannot access radios, keys, charging hardware, or actuators.

export const SPARK_PAGES = Object.freeze(['home', 'people', 'signals', 'power']);
const RADIO = new Set(['none', 'unknown', 'thread', 'lora', 'ble']);
const CODES = new Set(['here', 'rendezvous', 'attention', 'assistance']);
const EVENTS = Object.freeze({next: 1, back: -1});
const validTime = v => Number.isSafeInteger(v) && v >= 0;
const percent = v => Number.isInteger(v) && v >= 0 && v <= 100;

// Model only. Button navigation is NOT a send/authorization interface.
export function navigateSparkPage(page, event) {
  const current = SPARK_PAGES.indexOf(page);
  if (current < 0 || !Object.hasOwn(EVENTS, event))
    throw new TypeError('invalid page or navigation event');
  return SPARK_PAGES[(current + EVENTS[event] + SPARK_PAGES.length) % SPARK_PAGES.length];
}

function checkSnapshot(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s) ||
      !(s.batteryPercent === null || percent(s.batteryPercent)) ||
      !percent(s.reservePercent) || typeof s.phoneChargeRequested !== 'boolean' ||
      !RADIO.has(s.radio) || !Array.isArray(s.friends) || s.friends.length > 32 ||
      !Array.isArray(s.signals) || s.signals.length > 32)
    throw new TypeError('invalid 6lowSpark display snapshot');
  for (const f of s.friends) {
    if (!f || typeof f.alias !== 'string' || f.alias.length > 64 ||
        !validTime(f.expiresAtMs) || typeof f.consented !== 'boolean')
      throw new TypeError('invalid friend display entry');
  }
  for (const sgn of s.signals) {
    if (!sgn || !CODES.has(sgn.code) || !validTime(sgn.expiresAtMs) ||
        typeof sgn.authorized !== 'boolean' ||
        !['pending', 'ack', 'unknown'].includes(sgn.application))
      throw new TypeError('invalid signal display entry');
  }
}

function safeAlias(value) {
  // Small first-generation monochrome font, not arbitrary rich-text rendering.
  // Replace control characters and unsupported glyphs rather than exposing them.
  return value.replace(/[^A-Za-z0-9 _-]/g, '?').slice(0, 13) || 'Unnamed';
}

const boundedLines = lines => lines.slice(0, 8).map(line => line.slice(0, 16));

/**
 * Pure display frame for a hypothetical 128x128px monochrome panel.
 * Sources MUST be trusted, locally authorized application state in a real
 * integration. This experiment does not obtain, verify, or authorize it.
 * A locked frame contains no aliases, message bodies, IDs, or coordinates.
 */
export function projectSparkDisplay(snapshot, {
  nowMs, page = 'home', unlocked = false
} = {}) {
  checkSnapshot(snapshot);
  if (!validTime(nowMs) || !SPARK_PAGES.includes(page) || typeof unlocked !== 'boolean')
    throw new TypeError('invalid display options');

  const friends = snapshot.friends.filter(f => f.consented && f.expiresAtMs > nowMs);
  const signals = snapshot.signals.filter(s => s.authorized && s.expiresAtMs > nowMs);
  const battery = snapshot.batteryPercent === null ? 'unknown' : snapshot.batteryPercent + '%';
  const reserve = snapshot.batteryPercent === null ? 'unknown'
    : snapshot.batteryPercent <= snapshot.reservePercent ? 'protect' : 'normal';
  const radio = snapshot.radio === 'unknown' ? 'Radio unknown'
    : snapshot.radio === 'none' ? 'Radio none'
      : snapshot.radio.toUpperCase() + ' modeled';
  let lines;

  switch (page) {
    case 'home':
      lines = ['6lowSpark LAB', 'Battery ' + battery, radio,
        unlocked ? 'Friends ' + friends.length : 'Friends hidden',
        unlocked ? 'Signals ' + signals.length : 'Signals hidden',
        'SIMULATION ONLY'];
      break;
    case 'people':
      lines = unlocked ? ['People (model)', ...friends.slice(0, 5).map(f => safeAlias(f.alias)),
        friends.length === 0 ? 'None confirmed' : 'Recent, not GPS', 'NO RF']
        : ['People', 'Device locked', 'Unlock to view', 'NO RF'];
      break;
    case 'signals':
      lines = unlocked ? ['Signals (model)', 'Pending ' + signals.length,
        ...signals.slice(0, 2).map(s => s.code + ' ' + s.application),
        'Output unknown', 'Human unknown', 'NO DISPATCH']
        : ['Signals', 'Device locked', 'Unlock to view', 'NO DISPATCH'];
      break;
    case 'power':
      lines = ['Power (model)', 'Battery ' + battery,
        'Reserve ' + snapshot.reservePercent + '%',
        'State ' + reserve,
        snapshot.phoneChargeRequested ? 'Charge requested' : 'Charge not asked',
        'NO BMS CONTROL'];
      break;
  }

  // Only display glyph data and an explicit research label. No raw fixture,
  // keys, hidden contacts, coordinates, or arbitrary message content returned.
  return Object.freeze({
    version: '6lowspark.display.v0', simulated: true, page,
    lines: Object.freeze(boundedLines(lines))
  });
}
