#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Offline review and typed claim checking; never communicates with a device.
import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {reviewFixture, claimsTemplate, checkClaims} from '../src/reliability/trace-review.mjs';
import {reviewPosixEvidence} from '../src/reliability/posix-review.mjs';

const args = process.argv.slice(2);
const fixturePath = fileURLToPath(new URL('../site/multiradio.json', import.meta.url));
function boundedRaw(path) {
  if (statSync(path).size > 1024 * 1024) throw new Error('JSON input exceeds 1 MiB');
  return readFileSync(path);
}
function boundedJson(path) {
  return JSON.parse(boundedRaw(path).toString('utf8'));
}
try {
  const posix = args[0] === '--posix';
  const customFixture = args[0] === '--fixture';
  const hasInput = posix || customFixture;
  const remaining = hasInput ? args.slice(2) : args;
  if ((hasInput && (!args[1] || args[1].startsWith('--'))) ||
      remaining.length > 2 ||
      (remaining.length === 1 && remaining[0] !== '--template') ||
      (remaining.length === 2 && remaining[0] !== '--check'))
    throw new Error('Usage: node scripts/review-traces.mjs [--fixture synthetic.json | --posix mesh-run.json] [--template | --check claims.json]');
  const raw = boundedRaw(hasInput ? args[1] : fixturePath);
  const review = posix ? reviewPosixEvidence(JSON.parse(raw.toString('utf8')))
    : reviewFixture(JSON.parse(raw.toString('utf8')));
  const fixtureSha256 = createHash('sha256').update(raw).digest('hex');
  if (remaining[0] === '--template') {
    console.log(JSON.stringify(claimsTemplate(review), null, 2));
  } else if (remaining[0] === '--check') {
    const checked = checkClaims(review, boundedJson(remaining[1]));
    console.log(JSON.stringify({...checked, fixture_sha256: fixtureSha256}, null, 2));
    if (checked.result !== 'PASS') process.exitCode = 1;
  } else {
    console.log(JSON.stringify({...review, fixture_sha256: fixtureSha256}, null, 2));
  }
} catch (error) {
  console.error('trace review refused input: ' + error.message);
  process.exitCode = 2;
}
