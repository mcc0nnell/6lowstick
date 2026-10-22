// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Fixed vectors from a separate, offline Python reference generator.
// These cases deliberately do not import 6lowStick spinelFcs to build frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {recordSpinelCapture} from '../src/spinel/recorder.mjs';

const uri = new URL('../fixtures/spinel/reference-vectors.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fileURLToPath(uri), 'utf8'));
assert.equal(fixtures.schema, '6lowstick.spinel-reference-vectors.v1');

for (const vector of fixtures.vectors) {
  test('offline Spinel reference: ' + vector.name, () => {
    const options = vector.max_frame_bytes === undefined
      ? {} : {maxFrameBytes: vector.max_frame_bytes};
    const frames = recordSpinelCapture(Buffer.from(vector.capture_hex, 'hex'), options);
    assert.equal(frames.length, vector.expected.length, 'unexpected frame count');
    for (let i = 0; i < frames.length; i++) {
      const actual = frames[i];
      const expected = vector.expected[i];
      for (const [field, value] of Object.entries(expected))
        assert.deepEqual(actual[field], value, field + ' differs');
      assert.equal(actual.schema, '6lowstick.spinel-frame.v1');
      assert.equal(actual.source, 'offline-capture');
      assert.equal(actual.radioStateVerified, false);
      assert.equal(actual.framing, 'hdlc-lite');
    }
  });
}
