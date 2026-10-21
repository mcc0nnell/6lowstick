// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Parse already-demodulated synthetic SAME headers. No RF or audio decoding.
const HEADER = /^ZCZC-([A-Z0-9]{3})-([A-Z0-9]{3})-((?:[0-9]{6}-){1,31})\+([0-9]{4})-([0-9]{7})-([A-Z0-9/]{1,8})-$/;
export function parseSameHeader(input) {
  if (typeof input !== 'string' || input.length > 300) return null;
  const match = HEADER.exec(input);
  if (!match) return null;
  const [, originator, event, areas, duration, issued, sender] = match;
  const areaCodes = areas.slice(0, -1).split('-');
  const hours = Number(duration.slice(0, 2));
  const minutes = Number(duration.slice(2));
  const day = Number(issued.slice(0, 3));
  const hour = Number(issued.slice(3, 5));
  const minute = Number(issued.slice(5));
  if (hours > 99 || minutes > 59 || day < 1 || day > 366 || hour > 23 || minute > 59 ||
      new Set(areaCodes).size !== areaCodes.length) return null;
  return {originator, event, areaCodes, durationMinutes: hours * 60 + minutes,
    issuedDayOfYear: day, issuedHour: hour, issuedMinute: minute, sender};
}
export function matchesArea(header, configuredAreas) {
  return header.areaCodes.some(code => configuredAreas.includes(code));
}
