#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only decoder text -> bounded NDJSON research observations.
import {createSdrObserver, NWR_FREQUENCIES_HZ, MAX_DECODER_LINE} from '../src/nwr/sdr-observer.mjs';

function usage() {
  return 'Usage: node scripts/observe-nwr.mjs --frequency-hz 162550000 [--area 024510] < decoded-eas-lines.txt\n';
}
function parseArgs(argv) {
  let frequencyHz;
  const areaCodes = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--help') return {help: true};
    if (flag === '--frequency-hz') {
      const value = argv[++i];
      if (!value || !/^[0-9]+$/.test(value)) throw new Error('invalid --frequency-hz');
      frequencyHz = Number(value);
      if (!NWR_FREQUENCIES_HZ.includes(frequencyHz)) throw new Error('unsupported NWR frequency');
    } else if (flag === '--area') {
      const value = argv[++i];
      if (!value || !/^[0-9]{6}$/.test(value)) throw new Error('invalid --area');
      areaCodes.push(value);
    } else {
      throw new Error('unrecognized argument: ' + flag);
    }
  }
  if (frequencyHz === undefined) throw new Error('--frequency-hz is required');
  return {frequencyHz, areaCodes};
}

let config;
try {
  config = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(error.message + '\n' + usage());
  process.exit(2);
}
if (config.help) {
  process.stdout.write(usage());
} else {
  const observer = createSdrObserver(config);
  let line = '';
  let overflow = false;
  let droppedLongLines = 0;
  process.stdin.setEncoding('utf8');
  function finishLine() {
    if (overflow) droppedLongLines++;
    else {
      const observation = observer.consume(line);
      if (observation) process.stdout.write(JSON.stringify(observation) + '\n');
    }
    line = '';
    overflow = false;
  }
  // A hostile or broken decoder cannot grow this process's line buffer without limit.
  for await (const chunk of process.stdin) {
    for (const character of chunk) {
      if (character === '\n') finishLine();
      else if (!overflow) {
        if (line.length >= MAX_DECODER_LINE) {
          overflow = true;
          line = '';
        } else line += character;
      }
    }
  }
  if (line.length || overflow) finishLine();
  if (droppedLongLines)
    process.stderr.write('Dropped ' + droppedLongLines + ' oversized decoder lines\n');
}
