// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Passive observation of decoded EAS/SAME text. No RF decoding or mesh dispatch.
import {createHash} from 'node:crypto';
import {matchesArea, parseSameHeader} from './same.mjs';

export const NWR_FREQUENCIES_HZ = Object.freeze([
  162400000, 162425000, 162450000, 162475000,
  162500000, 162525000, 162550000
]);
export const MAX_DECODER_LINE = 1024;
const EAS_LINE = /^EAS:\s+(ZCZC-[A-Z0-9/+\-]+-)$/;
const DEFAULT_SUPPRESSION_MS = 5 * 60 * 1000;
const MAX_RECENT_IDS = 256;

/**
 * Observe a multimon-ng EAS text stream without trusting its origin.
 * A line is an observation, not an authenticated public alert.
 * The caller must never connect the return value directly to an actuator.
 */
export function createSdrObserver({
  frequencyHz,
  areaCodes = [],
  clock = () => new Date(),
  suppressionMs = DEFAULT_SUPPRESSION_MS
} = {}) {
  if (!NWR_FREQUENCIES_HZ.includes(frequencyHz))
    throw new RangeError('frequencyHz must be one of the seven NWR channels');
  if (!Array.isArray(areaCodes) || !areaCodes.every(x => typeof x === 'string' && /^[0-9]{6}$/.test(x)))
    throw new TypeError('areaCodes must contain six-digit SAME location codes');
  if (!Number.isSafeInteger(suppressionMs) || suppressionMs < 0 || suppressionMs > 3600000)
    throw new RangeError('invalid suppressionMs');
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');
  const areas = [...new Set(areaCodes)];
  const recent = new Map();

  function consume(line) {
    if (typeof line !== 'string' || line.length > MAX_DECODER_LINE) return null;
    // Require exactly the decoder's EAS framing. Ignore logs, timestamps,
    // other protocols, partial headers and EOM markers.
    const match = EAS_LINE.exec(line.trim());
    if (!match) return null;
    const header = parseSameHeader(match[1]);
    if (!header) return null;
    const at = clock();
    if (!(at instanceof Date) || !Number.isFinite(at.getTime()))
      throw new TypeError('clock returned an invalid Date');
    const nowMs = at.getTime();
    const id = createHash('sha256').update(match[1]).digest('hex').slice(0, 24);
    const previous = recent.get(id);
    if (previous !== undefined && nowMs >= previous && nowMs - previous < suppressionMs)
      return null;
    // Suppression is only for bounded research logs, not durable replay defense.
    for (const [key, timestamp] of recent) {
      if (nowMs < timestamp || nowMs - timestamp >= suppressionMs) recent.delete(key);
    }
    if (recent.size >= MAX_RECENT_IDS) recent.delete(recent.keys().next().value);
    recent.set(id, nowMs);
    return {
      schema: '6lowstick.sdr-observation.v0',
      kind: 'decoded_same_header',
      id,
      observedAt: at.toISOString(),
      frequencyHz,
      decoder: 'multimon-ng/EAS',
      event: header.event,
      originator: header.originator,
      sender: header.sender,
      areaCodes: header.areaCodes,
      areaMatch: areas.length === 0 ? 'not_configured' :
        matchesArea(header, areas) ? 'matched' : 'not_matched',
      issuedDayOfYear: header.issuedDayOfYear,
      issuedHour: header.issuedHour,
      issuedMinute: header.issuedMinute,
      durationMinutes: header.durationMinutes,
      provenance: 'untrusted over-the-air decoder text; broadcaster identity unverified',
      broadcastAuthenticated: false,
      repeatAgreementIndependentlyVerified: false,
      deliveryEligible: false,
      drill: false
    };
  }

  return {consume};
}
