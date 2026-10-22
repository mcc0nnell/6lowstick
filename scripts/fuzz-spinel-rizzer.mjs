// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Explicit opt-in Rizzer native fuzzing + differential replay into JS recorder.
// Local offline synthetic bytes only; Rizzer is an external, independent checkout.
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync,
  realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareSpinelBytes} from '../src/spinel/rizzer-differential.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'experiments/spinel-rizzer/native_harness.cc');
const fixture = resolve(root, 'fixtures/spinel/reference-vectors.json');
const options = {runs: 96, seconds: 30, seed: 17};
const args = process.argv.slice(2);
const usage = 'Usage: npm run fuzz:spinel -- --rizzer /absolute/path/to/rizzer --out evidence/NEW-DIR [--runs 1..256] [--seconds 5..60] [--seed 1..4294967295]';
for (let i = 0; i < args.length; i += 2) {
  const [flag, value] = args.slice(i, i + 2);
  if (!value || !['--rizzer', '--out', '--runs', '--seconds', '--seed'].includes(flag)) {
    console.error(usage); process.exit(2);
  }
  options[flag.slice(2)] = value;
}
for (const [key, lo, hi] of [['runs', 1, 256], ['seconds', 5, 60], ['seed', 1, 4294967295]]) {
  const x = Number(options[key]);
  if (!Number.isSafeInteger(x) || x < lo || x > hi) {
    console.error('Invalid bound: ' + key); process.exit(2);
  }
  options[key] = x;
}
const evidenceRoot = resolve(root, 'evidence');
const out = options.out && resolve(root, options.out);
if (!options.rizzer || !isAbsolute(options.rizzer) || !out ||
    !(out.startsWith(evidenceRoot + sep)) || existsSync(out)) {
  console.error('Require an absolute local Rizzer path and a new output directory under evidence/.');
  process.exit(2);
}
let rizzer;
try {
  rizzer = realpathSync(options.rizzer);
  for (const name of ['run.py', 'engine.cc']) {
    if (!existsSync(join(rizzer, name))) throw new Error('missing ' + name);
  }
} catch (e) {
  console.error('Invalid Rizzer checkout: ' + e.message); process.exit(2);
}

const hash = data => createHash('sha256').update(data).digest('hex');
const git = (dir, ...argv) => execFileSync('git', ['-C', dir, ...argv], {
  encoding: 'utf8', timeout: 5000}).trim();
let seeds;
try {
  // Rizzer requires a corpus directory: use independent, fixed synthetic frames.
  seeds = mkdtempSync(join(tmpdir(), '6lowstick-rizzer-seeds-'));
  const vectors = JSON.parse(readFileSync(fixture, 'utf8')).vectors;
  if (vectors.length < 1 || vectors.length > 100) throw new Error('invalid fixed corpus');
  vectors.forEach((x, i) => {
    if (!/^(?:[\da-f]{2})*$/i.test(x.capture_hex) || x.capture_hex.length > 8192)
      throw new Error('invalid vector');
    writeFileSync(join(seeds, 'seed-' + String(i).padStart(3, '0') + '.bin'),
      Buffer.from(x.capture_hex, 'hex'), {mode: 0o600});
  });
  mkdirSync(dirname(out), {recursive: true});
  const rizzerRun = spawnSync('python3', [join(rizzer, 'run.py'),
    '--source', source, '--corpus', seeds, '--out', out, '--runs', String(options.runs),
    '--seed', String(options.seed), '--seconds', String(options.seconds),
    '--timeout-ms', '1000'], {
    cwd: rizzer, encoding: 'utf8', timeout: (options.seconds + 100) * 1000,
    maxBuffer: 2 * 1024 * 1024
  });
  // run.py writes structured evidence even on an observed crash.
  const evidenceFile = join(out, 'evidence.json');
  if (!existsSync(evidenceFile)) throw new Error('Rizzer failed before writing evidence: ' +
      (rizzerRun.stderr || '').slice(-500));
  const nativeEvidence = JSON.parse(readFileSync(evidenceFile, 'utf8'));
  const nativeBinary = join(out, 'native-spinel-oracle');
  const compile = spawnSync('clang++', ['-std=c++17', '-O1', '-Wall', '-Wextra',
    '-Werror', '-DRIZZER_SPINEL_ORACLE', source, '-o', nativeBinary], {
    cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 1048576
  });
  if (compile.status !== 0) throw new Error('Native comparator build failed: ' +
    (compile.stderr || '').slice(-500));

  // Only replay seeds, retained coverage-growth inputs and failure candidates.
  // Rizzer does not retain every mutation; never claim comprehensive JS coverage.
  const samples = [];
  for (const directory of ['seeds', 'retained', 'findings']) {
    const folder = join(out, directory);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).sort()) {
      if (directory === 'seeds' || name.endsWith('.bin'))
        samples.push({label: directory + '/' + name, path: join(folder, name)});
    }
  }
  const comparisons = [];
  for (const sample of samples) {
    const bytes = readFileSync(sample.path);
    if (bytes.length > 4096) throw new Error('oversized retained byte sample');
    const native = spawnSync(nativeBinary, [sample.path], {
      encoding: 'utf8', timeout: 2000, maxBuffer: 1048576
    });
    if (native.status !== 0) {
      comparisons.push({sample: sample.label, sha256: hash(bytes),
        matches: false, error: 'native_comparator_failed'}); continue;
    }
    const cmp = compareSpinelBytes(bytes, JSON.parse(native.stdout));
    comparisons.push({sample: sample.label, sha256: hash(bytes),
      matches: cmp.matches, frames: cmp.frames, mismatch: cmp.mismatch});
  }
  const mismatches = comparisons.filter(x => !x.matches);
  const result = {
    schema: '6lowstick.rizzer-spinel-differential.v1',
    simulated_offline_input_only: true,
    radio_authority: false, js_coverage_guided: false,
    total_mutations_replayed: false,
    source_commit: git(root, 'rev-parse', 'HEAD'),
    source_dirty: Boolean(git(root, 'status', '--porcelain')),
    rizzer_commit: git(rizzer, 'rev-parse', 'HEAD'),
    rizzer_dirty: Boolean(git(rizzer, 'status', '--porcelain')),
    native_harness_sha256: hash(readFileSync(source)),
    seed_vectors_sha256: hash(readFileSync(fixture)),
    runs_requested: options.runs, seconds_budget: options.seconds, seed: options.seed,
    rizzer_exit: rizzerRun.status, rizzer_status: nativeEvidence.status,
    rizzer_executions: nativeEvidence.summary?.executions ?? null,
    rizzer_findings: nativeEvidence.summary?.findings ?? null,
    compared_samples: comparisons.length, mismatches: mismatches.length,
    comparisons
  };
  writeFileSync(join(out, 'differential-evidence.json'),
    JSON.stringify(result, null, 2) + '\n', {mode: 0o600});
  console.log(JSON.stringify({out, native_status: result.rizzer_status,
    executions: result.rizzer_executions, native_findings: result.rizzer_findings,
    compared_samples: result.compared_samples, mismatches: result.mismatches}, null, 2));
  // CI status must never be made green by a failing native campaign or discrepancy.
  if (rizzerRun.status !== 0 || nativeEvidence.status !== 'no_failure_observed' ||
      mismatches.length !== 0 || comparisons.length === 0) process.exitCode = 1;
} catch (e) {
  console.error('Rizzer Spinel campaign failed: ' + e.message);
  process.exitCode = 1;
} finally {
  if (seeds) rmSync(seeds, {recursive: true, force: true});
}
