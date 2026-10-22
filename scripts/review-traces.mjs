#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Offline review and typed claim checking; never communicates with a device.
import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {reviewFixture, claimsTemplate, checkClaims} from '../src/reliability/trace-review.mjs';

const args = process.argv.slice(2);
const fixturePath = fileURLToPath(new URL('../site/multiradio.json', import.meta.url));
function boundedJson(path) {
  if (statSync(path).size > 1024 * 1024) throw new Error('JSON input exceeds 1 MiB');
  return JSON.parse(readFileSync(path, 'utf8'));
}
try {
  if (args.length > 2 || (args.length === 1 && args[0] !== '--template') ||
      (args.length === 2 && args[0] !== '--check'))
    throw new Error('Usage: node scripts/review-traces.mjs [--template | --check claims.json]');
  const raw = readFileSync(fixturePath);
  const review = reviewFixture(JSON.parse(raw.toString('utf8')));
  const fixtureSha256 = createHash('sha256').update(raw).digest('hex');
  if (args[0] === '--template') {
    console.log(JSON.stringify(claimsTemplate(review), null, 2));
  } else if (args[0] === '--check') {
    const checked = checkClaims(review, boundedJson(args[1]));
    console.log(JSON.stringify({...checked, fixture_sha256: fixtureSha256}, null, 2));
    if (checked.result !== 'PASS') process.exitCode = 1;
  } else {
    console.log(JSON.stringify({...review, fixture_sha256: fixtureSha256}, null, 2));
  }
} catch (error) {
  console.error('trace review refused input: ' + error.message);
  process.exitCode = 2;
}
