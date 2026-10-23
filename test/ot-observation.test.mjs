// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOtObservation} from '../src/telemetry/ot-observation.mjs';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli = fileURLToPath(new URL('../bin/6low.mjs', import.meta.url));
test('accepts bounded recorded state and rloc16', () => {
  assert.equal(parseOtObservation('state', 'state\r\nrouter\r\nDone\r\n').value, 'router');
  assert.equal(parseOtObservation('rloc16', '0x3a2\nDone\n').value, '03a2');
});
test('refuses unknown commands and injected or ambiguous output', () => {
  for (const command of ['udp send', 'thread start', 'factoryreset'])
    assert.throws(() => parseOtObservation(command, 'Done\n'));
  for (const output of ['router\nleader\nDone', 'Error 7: InvalidArgs\n', 'router\0', 'router\n'.repeat(5000)])
    assert.throws(() => parseOtObservation('state', output));
});
test('CLI parses recording without launching an OpenThread process', () => {
  const dir = mkdtempSync(join(tmpdir(), '6low-ot-observe-'));
  try {
    const path = join(dir, 'state.txt');
    writeFileSync(path, 'router\nDone\n');
    const r = spawnSync(process.execPath, [cli, 'mesh', 'observe', 'state', '--input', path], {encoding:'utf8'});
    assert.equal(r.status, 0, r.stderr);
    const value = JSON.parse(r.stdout);
    assert.equal(value.source, 'recorded_ot_cli_text');
    assert.equal(value.physicalRadioVerified, false);
    assert.equal(value.value, 'router');
    assert.equal(spawnSync(process.execPath, [cli, 'mesh', 'observe', 'thread', '--input', path]).status, 2);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
