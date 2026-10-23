#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Compose existing read-only 6low capabilities with external WindAnvil assurance.
// Blade/TalkPipe remain external; this does not install a runtime dependency.
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
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
  const recording = join(temp, 'state.txt');
  writeFileSync(recording, 'state\nrouter\nDone\n');
  const observed = JSON.parse(run(process.execPath,
    [join(root,'bin/6low.mjs'),'mesh','observe','state','--input',recording], root));
  if (observed.value !== 'router' || observed.source !== 'recorded_ot_cli_text' ||
      observed.physicalRadioVerified !== false) throw new Error('OpenThread parser contract failed');
  const loop = run(process.execPath, [join(root,'bin/6low.mjs'),'lab','loop'], root);
  if (!loop.includes('Alice presence accepted by Bob: true') ||
      !loop.includes('Bob ping accepted by Alice: true') ||
      !loop.includes('Alice application ACK accepted by Bob: true'))
    throw new Error('6lowLoop model assertions failed');
  const flare = run(process.execPath, [join(root,'bin/6low.mjs'),'lab','flare'], root);
  const flareResult = JSON.parse(flare.slice(flare.indexOf('{'), flare.lastIndexOf('}') + 1));
  if (flareResult.samApplicationReceipt !== true ||
      flareResult.bobApplicationReceipt !== true ||
      flareResult.duplicateSuppressed !== true ||
      flareResult.physicalOutput !== false || flareResult.humanDetected !== false)
    throw new Error('6lowFlare model assertions failed');
  const components = [
    {name:'openthread',mode:'recorded-parser',verified:true},
    {name:'celix',mode:'Blade source-assurance worker',verified:true},
    {name:'6lowLoop',mode:'offline model',verified:true},
    {name:'6lowFlare',mode:'offline model',verified:true},
  ];
  console.log(JSON.stringify({schema:'6lowstick.blade-composition.v1', specimenSha:sha,
    assurance:summary, components,
    mode:'offline-model-and-source-assurance', physicalRadioVerified:false,
    humanReceiptVerified:false, applicationExecutionThroughBlade:false},null,2));
} catch (error) {console.error('Blade composition failed: '+error.message);process.exitCode=1;}
finally {if (temp) rmSync(temp,{recursive:true,force:true});}
