#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// A terminal-only, software-only 6lowLoop first-journey demonstration.
import {run6lowLoopJourney, render6lowLoopJourney} from '../src/loop/experience.mjs';

const args = process.argv.slice(2);
const usage = 'Usage: node scripts/loop-experience-demo.mjs [--scenario nominal|drop-ack|offline|expired] [--json] [--alice-disabled] [--sam-disabled]';
const config = {scenario:'nominal',aliceEnabled:true,samEnabled:true};
let json = false;
try {
  const seen = new Set();
  for (let i=0;i<args.length;i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error('duplicate flag');
    seen.add(flag);
    if (flag === '--json') json = true;
    else if (flag === '--alice-disabled') config.aliceEnabled = false;
    else if (flag === '--sam-disabled') config.samEnabled = false;
    else if (flag === '--scenario') {
      if (!args[++i] || !['nominal','drop-ack','offline','expired'].includes(args[i]))
        throw new Error('invalid scenario');
      config.scenario = args[i];
    } else throw new Error('unknown option');
  }
  const result = run6lowLoopJourney(config);
  console.log(json ? JSON.stringify(result,null,2) : render6lowLoopJourney(result));
} catch (error) {
  console.error(usage);
  console.error('Refused: '+error.message);
  process.exitCode = 2;
}
