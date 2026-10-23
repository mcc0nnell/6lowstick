// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Independent protocol parity probe: JS is the canonical synthetic v0 contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {signAlert, verifyAlert} from '../../../experiments/thread-alert/auth.mjs';
import {signReceipt, verifyReceipt} from '../../../src/fabric/receipts.mjs';

const executable = process.argv[2] && resolve(process.argv[2]);
if (!executable) throw new Error('pass path to s6_reactor_vectors executable');
const key = Buffer.alloc(32, 6); // Test fixture only, never production.
function native(...args) {
  const result = spawnSync(executable, args, {encoding: 'utf8', timeout: 4000});
  if (result.error) throw result.error;
  assert.equal(result.signal, null, 'native parity probe timed out or crashed');
  return {code: result.status, output: result.stdout.trim(), stderr: result.stderr.trim()};
}
function signed(...args) {
  const result = native(...args);
  assert.equal(result.code, 0, result.stderr || args.join(' '));
  return result.output;
}
function check(valid, ...args) {
  const result = native(...args);
  assert.equal(result.code, valid ? 0 : 1, args[0] + ' parity mismatch');
}
const ids = ['a', 'drill1', 'x_y-Z09', 'z'.repeat(32)];
const receivers = ['haptic', 'display_1', 'R'.repeat(32)];
const nonces = [
  '000000000000000000000001',
  '0123456789abcdef01234567',
  'ffffffffffffffffffffffff'
];

test('native EA2 alert bytes and validation agree with JavaScript', () => {
  for (const id of ids) {
    const js = signAlert(key, id);
    assert.equal(signed('alert', id), js);
    assert.deepEqual(verifyAlert(key, js), {id, action: 'NOTIFY'});
    check(true, 'check-alert', js);
    check(false, 'check-alert', js.slice(0, -1) + (js.endsWith('0') ? '1' : '0'));
    check(false, 'check-alert', js + '|extra');
  }
  assert.notEqual(native('alert', 'a'.repeat(33)).code, 0);
  assert.notEqual(native('alert', 'bad|id').code, 0);
});

test('native R2 receipt bytes and verification agree across 36 cases', () => {
  for (const id of ids) for (const receiver of receivers) for (const nonce of nonces) {
    const js = signReceipt(key, id, receiver, nonce);
    assert.equal(signed('receipt', id, receiver, nonce), js);
    assert.equal(verifyReceipt(key, js, {id, receiver, nonce}), true);
    check(true, 'check-receipt', id, receiver, nonce, js);
    const bad = js.slice(0, -1) + (js.endsWith('0') ? '1' : '0');
    assert.equal(verifyReceipt(key, bad, {id, receiver, nonce}), false);
    check(false, 'check-receipt', id, receiver, nonce, bad);
    check(false, 'check-receipt', id, receiver, 'aaaaaaaaaaaaaaaaaaaaaaaa', js);
  }
  assert.notEqual(native('receipt', 'x', 'haptic', 'invalid').code, 0);
});
