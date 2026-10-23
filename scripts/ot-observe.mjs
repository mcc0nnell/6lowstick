#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {readFileSync, statSync} from 'node:fs';
import {parseOtObservation} from '../src/telemetry/ot-observation.mjs';
const args = process.argv.slice(2);
if (args.length !== 3 || args[1] !== '--input' || !['state','rloc16'].includes(args[0]) || args[2].startsWith('--')) {
  console.error('Usage: 6low mesh observe state|rloc16 --input RECORDED_TEXT');
  process.exit(2);
}
try {
  if (statSync(args[2]).size > 8192) throw new Error('Input exceeds 8 KiB');
  const value = parseOtObservation(args[0], readFileSync(args[2], 'utf8'));
  process.stdout.write(JSON.stringify(value) + '\n');
} catch (error) {
  console.error('OpenThread observation rejected: ' + error.message);
  process.exitCode = 2;
}
