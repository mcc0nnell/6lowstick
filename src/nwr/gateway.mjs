// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Offline, synthetic SAME-to-local-alert policy adapter. Not an RF receiver.
import {createHash} from 'node:crypto';
import {parseSameHeader, matchesArea} from './same.mjs';
import {signAlert} from '../../experiments/thread-alert/auth.mjs';

const EVENT_ACTION = Object.freeze({TOR: 'EVACUATE', SVR: 'EVACUATE'});
export function evaluateSame(input, {areas, key, now, year}) {
  const header = parseSameHeader(input);
  if (!header) return {accepted: false, reason: 'invalid_header'};
  if (!Array.isArray(areas) || !areas.every(x => /^[0-9]{6}$/.test(x)) || !matchesArea(header, areas))
    return {accepted: false, reason: 'out_of_area'};
  if (!Object.hasOwn(EVENT_ACTION, header.event)) return {accepted: false, reason: 'unsupported_event'};
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || !Number.isInteger(year))
    return {accepted: false, reason: 'invalid_clock'};
  const start = new Date(Date.UTC(year, 0, 1));
  start.setUTCDate(header.issuedDayOfYear);
  start.setUTCHours(header.issuedHour, header.issuedMinute, 0, 0);
  const ageMs = now.getTime() - start.getTime();
  const endMs = start.getTime() + header.durationMinutes * 60000;
  if (header.durationMinutes === 0 || ageMs < 0 || now.getTime() >= endMs)
    return {accepted: false, reason: 'outside_validity'};
  // Local identity derived from the complete normalized header, not a claimed NOAA signature.
  const id = createHash('sha256').update(input).digest('hex').slice(0, 24);
  return {accepted: true, id, event: header.event, areaCodes: header.areaCodes,
    wire: signAlert(key, id, EVENT_ACTION[header.event]),
    provenance: 'synthetic SAME input; gateway authenticated, broadcast origin unverified'};
}
