#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Compose existing read-only 6low capabilities with external WindAnvil assurance.
// Blade/TalkPipe remain external; this does not install a runtime dependency.
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--windanvil' || !args[1]) {
  console.error('Usage: 6low blade compose --windanvil /absolute/path/to/windanvil');
  process.exit(2);
}
const windanvil = resolve(args[1]);
const run = (exe, argv, cwd, timeout=30000) => {
  const result = spawnSync(exe, argv, {cwd, encoding:'utf8', timeout, maxBuffer:1024*1024});
  if (result.error || result.status !== 0 || result.signal) throw new Error(`${exe} ${argv[0]} failed: ${(result.stderr || result.error?.message || '').slice(0,350)}`);
  return result.stdout;
};
let temp;
try {
  if (run('git', ['status','--porcelain'], root).trim()) throw new Error('Composition requires a clean Git checkout');
  const sha = run('git', ['rev-parse','HEAD'], root).trim();
  temp = mkdtempSync(join(tmpdir(), '6low-blade-'));
  const script = join(windanvil, 'scripts/windanvil.ts');
  const summary = [];
  for (const capability of ['git.object-integrity', 'git.repository-fsck']) {
    const out = join(temp, capability);
    run(process.execPath, ['--experimental-strip-types',script,'invoke',capability,root,'--out',out], windanvil, 90000);
    const result = JSON.parse(readFileSync(join(out,'summary.json'),'utf8'));
    if (result.specimenSha !== sha || result.execution?.executedSha !== sha ||
        result.execution?.exitStatus !== 0 || result.manifestExecutionContract?.satisfied !== true ||
        result.status !== 'completed') throw new Error(`Blade contract failed: ${capability}`);
    summary.push({capability, requestDigest:result.requestDigest, resultDigest:result.resultDigest,
      planDigest:result.planDigest, contractSatisfied:true});
  }
  const components = [
    ['openthread','recorded mesh observation parser', []],
    ['celix','external Blade worker assurance', []],
    ['6lowLoop','offline friend-finding', ['lab','loop']],
    ['6lowFlare','offline relay', ['lab','flare']],
  ];
  for (const [name,description,argv] of components) {
    if (argv.length) run(process.execPath, [join(root,'bin/6low.mjs'),...argv],root);
  }
  console.log(JSON.stringify({schema:'6lowstick.blade-composition.v1', specimenSha:sha,
    assurance:summary, components:components.map(([name,description])=>({name,description})),
    mode:'offline-model-and-source-assurance', physicalRadioVerified:false,
    humanReceiptVerified:false, applicationExecutionThroughBlade:false},null,2));
} catch (error) {console.error('Blade composition failed: '+error.message);process.exitCode=1;}
finally {if (temp) rmSync(temp,{recursive:true,force:true});}
