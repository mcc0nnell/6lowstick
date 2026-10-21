// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Synthetic decoded-header agreement gate. Not an audio decoder or full SAME receiver.
import {parseSameHeader} from './same.mjs';
export function reconcileSameHeaders(headers, required = 2) {
  if (!Array.isArray(headers) || headers.length > 3 || !Number.isInteger(required) || required < 2 || required > 3)
    return {accepted: false, reason: 'invalid_batch'};
  const counts = new Map();
  for (const header of headers) {
    if (!parseSameHeader(header)) return {accepted: false, reason: 'invalid_header'};
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }
  const matches = [...counts].filter(([, count]) => count >= required);
  if (matches.length !== 1) return {accepted: false, reason: 'insufficient_agreement'};
  return {accepted: true, header: matches[0][0], count: matches[0][1]};
}
