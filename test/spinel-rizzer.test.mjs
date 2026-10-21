// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compareSpinelBytes} from '../src/spinel/rizzer-differential.mjs';
import {recordSpinelCapture} from '../src/spinel/recorder.mjs';

test('differential replay catches a false native decoded-command claim', () => {
  const bytes = Buffer.from('7e810002db4b7e', 'hex');
  const baseline = recordSpinelCapture(bytes);
  assert.equal(compareSpinelBytes(bytes, baseline).matches, true);
  const bad = structuredClone(baseline);
  bad[0].commandDecoded = !bad[0].commandDecoded;
  const comparison = compareSpinelBytes(bytes, bad);
  assert.equal(comparison.matches, false);
  assert.ok(comparison.mismatch.some(e => e.field === 'commandDecoded'));
  assert.throws(() => compareSpinelBytes(Buffer.alloc(4097), []), /invalid bounded/);
});

const compiler = spawnSync('clang++', ['--version'], {timeout: 5000});
test('native Rizzer harness independently agrees with actual JS Spinel recorder',
  {skip: compiler.status !== 0 ? 'requires Clang++ for native differential test' : false},
  () => {
    const dir = mkdtempSync(join(tmpdir(), '6lowstick-native-compare-'));
    try {
      const exe = join(dir, 'spinel-reference');
      const build = spawnSync('clang++', ['-std=c++17', '-O1', '-Wall', '-Wextra',
        '-Werror', '-DRIZZER_SPINEL_ORACLE',
        new URL('../experiments/spinel-rizzer/native_harness.cc', import.meta.url).pathname,
        '-o', exe], {encoding: 'utf8', timeout: 60000});
      assert.equal(build.status, 0, build.stderr);
      const vectors = JSON.parse(readFileSync(
        new URL('../fixtures/spinel/reference-vectors.json', import.meta.url))).vectors;
      let compared = 0;
      const compare = bytes => {
        const file = join(dir, 'specimen.bin');
        writeFileSync(file, bytes);
        const result = spawnSync(exe, [file], {encoding: 'utf8', timeout: 2000});
        assert.equal(result.status, 0, result.stderr);
        const status = compareSpinelBytes(bytes, JSON.parse(result.stdout));
        assert.deepEqual(status.mismatch, [], 'native/JS drift in specimen ' + compared);
        compared++;
      };
      for (const vector of vectors) {
        const original = Buffer.from(vector.capture_hex, 'hex');
        // The oversized-limit fixture is intentionally a nondefault limit.
        if (vector.max_frame_bytes !== undefined) continue;
        compare(original);
        // Corrupt, insert and truncate deterministic specimens without shared encoders.
        if (original.length) {
          const corrupted = Buffer.from(original);
          corrupted[(compared * 7) % original.length] ^= 0x5a;
          compare(corrupted);
          compare(Buffer.concat([original, Buffer.from([0x7e,0x7d,0x7e])]));
          compare(original.subarray(0, Math.floor(original.length / 2)));
        }
      }
      assert.ok(compared >= 40);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
