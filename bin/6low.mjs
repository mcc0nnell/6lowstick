#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Local, simulation-only command dispatcher. No radio or alert authority.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const commands = {
  'lab loop': ['scripts/loop-demo.mjs'],
  'lab flare': ['scripts/flare-demo.mjs'],
  'evidence review': ['scripts/review-traces.mjs'],
  'test': [],
};
const help = `6low — 6lowStick local research CLI (experimental)
Usage: 6low <command> [arguments]

  help                 Show this help
  status               Show implementation status (not live hardware state)
  lab loop             Run in-memory 6lowLoop demonstration
  lab flare            Run in-memory 6lowFlare demonstration
  evidence review      Review synthetic evidence
  tui [options]        Read-only evidence viewer
  test                 Run repository tests

No command transmits RF, dispatches alerts, or establishes human receipt.
`;
const args = process.argv.slice(2);
if (!args.length || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  process.stdout.write(help);
  process.exit(0);
}
if (args[0] === 'status') {
  if (args.length > 2 || (args.length === 2 && args[1] !== '--json')) {
    console.error('Usage: 6low status [--json]');
    process.exit(2);
  }
  const status = {project: '6lowStick', mode: 'simulation', hardwareVerified: false,
    rfVerified: false, humanReceiptVerified: false, operationalAlerting: false};
  process.stdout.write(args[1] === '--json' ? JSON.stringify(status) + '\n' :
    '6lowStick: simulation only; no verified RF, hardware, or human receipt\n');
  process.exit(0);
}
let key, extra;
if (args[0] === 'tui') {
  key = 'tui'; extra = args.slice(1);
} else {
  key = args.slice(0, 2).join(' ');
  extra = args.slice(2);
}
if (key !== 'tui' && !Object.hasOwn(commands, key)) {
  console.error('Unknown command. Run 6low help.');
  process.exit(2);
}
if (key !== 'tui' && extra.length) {
  console.error('Unexpected arguments. Run 6low help.');
  process.exit(2);
}
const script = key === 'tui' ? ['src/tui/cli.mjs', ...extra] : commands[key];
const result = key === 'test'
  ? spawnSync('npm', ['test'], {cwd: root, stdio: 'inherit'})
  : spawnSync(process.execPath, script, {cwd: root, stdio: 'inherit'});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.signal) {
  process.exit(result.signal === 'SIGINT' ? 130 : 1);
}
process.exit(result.status ?? 1);
