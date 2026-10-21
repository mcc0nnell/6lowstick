// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Compare a native offline Spinel decoder's metadata against the ACTUAL JS recorder.
import {recordSpinelCapture} from './recorder.mjs';

const fields = ['bytes', 'truncated', 'crcVerified', 'headerValid',
  'header', 'commandId', 'commandDecoded'];
export function compareSpinelBytes(bytes, nativeFrames) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 4096 ||
      !Array.isArray(nativeFrames)) throw new TypeError('invalid bounded offline sample');
  const jsFrames = recordSpinelCapture(bytes);
  const mismatch = [];
  if (jsFrames.length !== nativeFrames.length)
    mismatch.push({frame: null, field: 'frameCount',
      js: jsFrames.length, native: nativeFrames.length});
  for (let i = 0; i < Math.min(jsFrames.length, nativeFrames.length); i++) {
    for (const field of fields) {
      if (jsFrames[i][field] !== nativeFrames[i]?.[field])
        mismatch.push({frame: i, field, js: jsFrames[i][field],
          native: nativeFrames[i]?.[field] ?? null});
    }
  }
  return {matches: mismatch.length === 0, frames: jsFrames.length, mismatch};
}
