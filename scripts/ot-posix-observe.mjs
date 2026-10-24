#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only query of an opt-in OpenThread POSIX simulated-radio CLI process.
import {spawn} from 'node:child_process';
import {statSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, isAbsolute} from 'node:path';
import {parseOtObservation} from '../src/telemetry/ot-observation.mjs';
const args=process.argv.slice(2);
if(args.length!==5 || !['state','rloc16'].includes(args[0]) || args[1]!=='--binary' || !isAbsolute(args[2]) || args[3]!=='--node-id' || !/^[1-9][0-9]{0,4}$/.test(args[4])) {
  console.error('Usage: 6low mesh query state|rloc16 --binary /absolute/ot-cli-ftd --node-id N');
  process.exit(2);
}
const [command,,binary,,nodeId]=args;
try {
  if(Number(nodeId)>65535 || !statSync(binary).isFile()) throw new Error('not a regular file');
} catch {console.error('Invalid simulator binary or node ID');process.exit(2);}
const workdir=mkdtempSync(join(tmpdir(),'6low-ot-query-'));
mkdirSync(join(workdir,'tmp'),{mode:0o700});
let output='',stderr='',settled=false;
const child=spawn(binary,[nodeId],{cwd:workdir,stdio:['pipe','pipe','pipe'],env:{...process.env},shell:false});
const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill('SIGKILL');rmSync(workdir,{recursive:true,force:true});
  if(error){console.error('POSIX observation failed: '+error);process.exitCode=2;return;}
  try{const value=parseOtObservation(command,output.replace(/\r/g,'\n').replace(/(?:^|\n)>\s*/g,'\n>\n'));console.log(JSON.stringify({...value,source:'ot_posix_simulator',physicalRadioVerified:false,humanReceiptVerified:false}));}
  catch(e){console.error('POSIX observation rejected: '+e.message);process.exitCode=2;}
};
const timer=setTimeout(()=>finish('timeout'),3000);
child.on('error',e=>finish(e.message));
child.on('exit',(code)=>{if(!settled)finish('simulator exited before response ('+code+')');});
child.stdout.on('data',chunk=>{if(settled)return;output+=chunk.toString();if(Buffer.byteLength(output)>8192)return finish('oversized response');
  if(/(?:^|\n)Done\r?(?:\n|$)/.test(output.replace(/\r/g,'\n')))finish(null);
});
child.stderr.on('data',chunk=>{if(settled)return;stderr+=chunk.toString();if(Buffer.byteLength(stderr)>8192)return finish('oversized stderr');
  // OpenThread simulation UART intentionally redirects its CLI output to stderr.
  if(/(?:^|\n)Done\r?(?:\n|$)/.test(stderr.replace(/\r/g,'\n'))){output=stderr;finish(null);}
});
child.stdin.on('error',()=>{});
child.stdin.write(command+'\n');
