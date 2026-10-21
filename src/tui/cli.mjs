#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only local lab evidence viewer; cannot dispatch alerts or operate radios.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildTimeline, parseEvidence, RECEIVERS} from './evidence.mjs';
import {renderScreen, renderReport} from './render.mjs';

const args = process.argv.slice(2);
const usage = '6lowStick Mesh Control (experimental, read-only)\n' +
  'Usage: npm run tui -- [--demo | --input evidence/mesh-run.json] [--snapshot | --report] [--plain] [--reduced-motion]\n' +
  'Keys: arrows/h/l step; j/k select receiver; space play; 1/2/3/4 views; ? help; q quit\n';
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0); }
const known = new Set(['--demo', '--input', '--snapshot', '--report', '--plain', '--reduced-motion']);
if (args.some((a,i) => !known.has(a) && !(i > 0 && args[i-1] === '--input')) ||
    args.filter(a => a === '--input').length > 1 ||
    (args.includes('--demo') && args.includes('--input')) ||
    (args.includes('--input') && !args[args.indexOf('--input') + 1])) {
  console.error(usage); process.exit(2);
}
const demo = args.includes('--demo');
const path = demo ? fileURLToPath(new URL('../../fixtures/tui/illustrative-drill.json', import.meta.url)) :
  resolve(args.includes('--input') ? args[args.indexOf('--input') + 1] : 'evidence/mesh-run.json');
let data;
try {
  const json = readFileSync(path, 'utf8');
  if (json.length > 8 * 1024 * 1024) throw new Error('8 MiB evidence limit exceeded');
  data = parseEvidence(JSON.parse(json));
} catch (err) {
  console.error('Cannot load evidence: ' + err.message);
  console.error('Use --demo or generate evidence with OT_CLI_PATH=... bash scripts/run-evidence.sh');
  process.exit(1);
}
const steps = buildTimeline(data);
if (args.includes('--snapshot') && args.includes('--report')) {
  console.error('Choose --snapshot or --report, not both'); process.exit(2);
}
if (args.includes('--report')) { process.stdout.write(renderReport({data, steps})); process.exit(0); }
if (!steps.length) { console.error('No observations'); process.exit(1); }
const snapshot = args.includes('--snapshot') || !process.stdin.isTTY || !process.stdout.isTTY;
const plain = args.includes('--plain') || process.env.NO_COLOR !== undefined || snapshot;
const reduced = args.includes('--reduced-motion') || process.env.REDUCE_MOTION === '1';
let cursor = snapshot ? steps.length - 1 : -1, selection = 0, view = 'topology', help = false, playing = false;
let timer;
function render() {
  const frame = renderScreen({data, steps, cursor, selected: RECEIVERS[selection], view, help, playing,
    plain, width: process.stdout.columns || 90, height: process.stdout.rows || 34});
  process.stdout.write(snapshot ? frame : '\x1b[H\x1b[2J' + frame);
}
if (snapshot) {
  render();
} else {
  process.stdout.write('\x1b[?1049h\x1b[?25l');
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  function pause() { playing = false; if (timer) clearInterval(timer); timer = undefined; }
  function cleanup() {
    pause(); process.stdin.setRawMode(false); process.stdin.pause();
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
  function seek(n) { pause(); cursor = Math.max(-1, Math.min(steps.length - 1, n)); render(); }
  function toggle() {
    if (playing) { pause(); render(); return; }
    if (reduced) { seek(steps.length - 1); return; }
    if (cursor >= steps.length - 1) cursor = -1;
    playing = true;
    timer = setInterval(() => {
      cursor++;
      if (cursor >= steps.length - 1) pause();
      render();
    }, 850);
    render();
  }
  process.stdin.on('data', key => {
    if (key === 'q' || key === '\x03') { cleanup(); process.exit(0); }
    if (key === '\x1b[D' || key === 'h') return seek(cursor - 1);
    if (key === '\x1b[C' || key === 'l') return seek(cursor + 1);
    if (key === '\x1b[H' || key === '\x1b[1~') return seek(-1);
    if (key === '\x1b[F' || key === '\x1b[4~') return seek(steps.length - 1);
    if (key === ' ') return toggle();
    if (key === '\x1b[A' || key === 'k') selection = (selection + RECEIVERS.length - 1) % RECEIVERS.length;
    if (key === '\x1b[B' || key === 'j') selection = (selection + 1) % RECEIVERS.length;
    if (key === 'r') return seek(-1);
    if (key === '1') { view = 'topology'; help = false; }
    if (key === '2') { view = 'timeline'; help = false; }
    if (key === '3') { view = 'evidence'; help = false; }
    if (key === '4' || key === 't') { view = 'text'; help = false; }
    if (key === '?') help = !help;
    render();
  });
  process.stdout.on('resize', render);
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
  process.on('uncaughtException', err => { cleanup(); console.error(err); process.exit(1); });
  render();
}
