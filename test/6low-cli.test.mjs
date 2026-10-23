// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli = fileURLToPath(new URL('../bin/6low.mjs', import.meta.url));
function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
}
test('help describes simulation scope', () => {
  const r = run('help');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /6lowStick local research CLI/);
  assert.match(r.stdout, /No command transmits RF/);
});
test('status JSON does not imply physical verification', () => {
  const r = run('status', '--json');
  assert.equal(r.status, 0);
  const status = JSON.parse(r.stdout);
  assert.equal(status.mode, 'simulation');
  assert.equal(status.rfVerified, false);
  assert.equal(status.humanReceiptVerified, false);
});
test('unknown command exits with usage error', () => {
  const r = run('radio', 'transmit');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown command/);
});
test('unexpected arguments rejected', () => {
  assert.equal(run('lab', 'loop', '--send').status, 2);
});

test('evidence review accepts template option', () => {
  const r = run('evidence', 'review', '--template');
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotThrow(() => JSON.parse(r.stdout));
});
test('simulation demos run from the CLI', () => {
  const loop = run('lab', 'loop');
  assert.equal(loop.status, 0, loop.stderr);
  assert.match(loop.stdout, /software-only/);
  const flare = run('lab', 'flare');
  assert.equal(flare.status, 0, flare.stderr);
  assert.match(flare.stdout, /No radio/);
});
