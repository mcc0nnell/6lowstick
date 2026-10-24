#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Pure, offline correlation. No serial device, GPIO, USB or actuator access.
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewFirstLightCapture} from '../src/first-light/review.mjs';

const usage = 'Usage: node scripts/first-light-review.mjs --journey posix-result.json --capture independently-recorded-sensor.json [--window-ms 500]';
function readJson(path) {
  const size=statSync(path).size;
  if (!Number.isSafeInteger(size) || size < 1 || size > 256*1024)
    throw new Error('input must be a bounded JSON file (max 256 KiB)');
  const bytes=readFileSync(path);
  return {value:JSON.parse(bytes.toString('utf8')),
    sha256:createHash('sha256').update(bytes).digest('hex')};
}
try {
  const args=process.argv.slice(2);
  const opts={};
  for(let i=0;i<args.length;i+=2) {
    const key=args[i],value=args[i+1];
    if (!['--journey','--capture','--window-ms'].includes(key) ||
        !value || value.startsWith('--') || Object.hasOwn(opts,key))
      throw new Error('unexpected or missing argument');
    opts[key]=value;
  }
  if (!opts['--journey'] || !opts['--capture']) throw new Error('both independent input files required');
  const windowMs=opts['--window-ms']===undefined?500:Number(opts['--window-ms']);
  const journey=readJson(opts['--journey']);
  const capture=readJson(opts['--capture']);
  const reviewed=reviewFirstLightCapture({journey:journey.value,
    capture:capture.value,windowMs});
  console.log(JSON.stringify({...reviewed,
    inputBytesSha256:{journey:journey.sha256,capture:capture.sha256}},null,2));
} catch(error) {
  console.error(usage);
  console.error('First Light review refused: '+error.message);
  process.exitCode=2;
}
