// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Serial, bounded OpenThread POSIX simulated-radio trial collector.
import {spawnSync, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {isAbsolute, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {analyzeTrial, summarizeTrials} from '../src/reliability/analyze.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let trials = 3;
let out = resolve(root, 'evidence/reliability-trials.json');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--trials' && args[i + 1]) trials = Number(args[++i]);
  else if (args[i] === '--out' && args[i + 1]) out = resolve(args[++i]);
  else {
    console.error('Usage: node scripts/reliability-trials.mjs [--trials 1..20] [--out file.json]');
    process.exit(2);
  }
}
if (!Number.isInteger(trials) || trials < 1 || trials > 20 ||
    !process.env.OT_CLI_PATH || !isAbsolute(process.env.OT_CLI_PATH) ||
    !existsSync(process.env.OT_CLI_PATH)) {
  console.error('Requires --trials 1..20 and OT_CLI_PATH pointing to an existing absolute simulation binary.');
  process.exit(2);
}
const hash = createHash('sha256').update(readFileSync(process.env.OT_CLI_PATH)).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const worktreeDirty = execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim().length > 0;
const measured = [];
for (let i = 1; i <= trials; i++) {
  const began = performance.now();
  const run = spawnSync(process.execPath, [resolve(root, 'experiments/thread-alert/lab.mjs')], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024
  });
  const trial = analyzeTrial({...run, elapsedMs: performance.now() - began});
  measured.push({trial: i, ...trial});
  console.error('Trial ' + i + '/' + trials + ': ' + trial.outcome +
    ' (' + trial.elapsed_ms + ' ms)' +
    (trial.failure_reasons.length ? ' [' + trial.failure_reasons.join(', ') + ']' : ''));
}
const summary = summarizeTrials(measured, {
  source_commit: commit,
  source_worktree_dirty: worktreeDirty,
  node_version: process.version,
  ot_cli_sha256: hash,
  protocol: 'OpenThread POSIX simulated radio, scripted synthetic alerts',
  per_trial_timeout_ms: 120000,
  time_basis: 'parent harness monotonic elapsed time; not RF frame time'
});
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, JSON.stringify(summary, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify(summary, null, 2));
console.error('Wrote local research evidence: ' + out);
if (summary.failed > 0) process.exitCode = 1;
