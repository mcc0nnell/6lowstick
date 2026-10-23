// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Two OpenThread POSIX simulated nodes using NATIVE C otUdpSend/Receive,
// not the OpenThread CLI hex payload path or Linux loopback.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomInt} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';

const cli=process.env.BANG_NATIVE_OT_CLI;
if(!cli || !isAbsolute(cli) || !existsSync(cli))
  throw Error('BANG_NATIVE_OT_CLI must point to an existing absolute 6s-linked OpenThread CLI');
const base=Number(process.env.BANG_OT_BASE_ID??25);
const offset=Number(process.env.BANG_OT_PORT_OFFSET??randomInt(60,850));
assert.ok(Number.isSafeInteger(base)&&base>=1&&base<=30);
assert.ok(Number.isSafeInteger(offset)&&offset>=1&&offset<=950);
const scratch=await mkdtemp(join(tmpdir(),'sixs-bang-native-ot-'));
await mkdir(join(scratch,'tmp'),{mode:0o700});
class Node {
  constructor(id) {
    this.events=[];this.buffer='';this.output='';this.error='';this.queue=Promise.resolve();
    this.pending=null;this.closed=false;
    this.proc=spawn(cli,[String(id)],{
      cwd:scratch,env:{...process.env,PORT_OFFSET:String(offset)},
      stdio:['pipe','pipe','pipe']
    });
    this.proc.stdout.on('data',d=>this.feed(d.toString()));
    this.proc.stderr.on('data',d=>this.error=(this.error+d.toString()).slice(-2048));
    this.proc.on('error',e=>this.fail(e));
    this.proc.on('exit',()=>this.fail(Error('node '+id+' exited: '+this.error)));
    this.proc.stdin.on('error',()=>{});
  }
  fail(e) {
    this.closed=true;
    if(this.pending) {
      const p=this.pending;this.pending=null;clearTimeout(p.timer);p.reject(e);
    }
  }
  feed(chunk) {
    this.output=(this.output+chunk).slice(-8192);this.buffer+=chunk;
    if(this.buffer.length>16000)this.buffer=this.buffer.slice(-6000);
    let p;
    while((p=this.buffer.indexOf('\n'))>=0) {
      const line=this.buffer.slice(0,p).replace(/\r/g,'').trim().replace(/^>\s*/,'');
      this.buffer=this.buffer.slice(p+1);
      if(line.startsWith('BANG_'))this.events.push({line,time:performance.now()});
      if(!this.pending)continue;
      if(line==='Done') {
        const op=this.pending;this.pending=null;clearTimeout(op.timer);op.resolve(op.lines);
      }else if(/^Error \d+:/.test(line)) {
        const op=this.pending;this.pending=null;clearTimeout(op.timer);
        op.reject(Error(op.command+' → '+line));
      }else if(line && line!==this.pending.command)this.pending.lines.push(line);
    }
  }
  command(command,ms=6500) {
    const run=()=>new Promise((resolve,reject)=>{
      if(this.closed)return reject(Error('node offline'));
      const timer=setTimeout(()=>{this.pending=null;reject(Error('CLI timeout: '+command+' '+this.output));},ms);
      this.pending={command,resolve,reject,timer,lines:[]};
      this.proc.stdin.write(command+'\n');
    });
    const next=this.queue.then(run);
    this.queue=next.catch(()=>{});
    return next;
  }
  stop(){if(!this.closed)this.proc.kill('SIGTERM');}
}
const nodes=[new Node(base),new Node(base+1)];
async function until(predicate,limit=35000) {
  const end=performance.now()+limit;
  while(performance.now()<end) {
    if(await predicate())return;
    await sleep(120);
  }
  throw Error('OpenThread simulated native C UDP condition timed out');
}
const result={
 schema:'6lowstick.bang.native-ot-udp.v1',
 simulated:true,radioHardware:false,transport:'native OpenThread C otUdpSend/otUdpReceive',
 checks:[],nodeIds:[base,base+1],radioPortOffset:offset
};
function check(label,yes) {
  assert.ok(yes,label);
  result.checks.push(label);
}
const evidence=node=>node.events.map(x=>x.line);
try {
  const [tx,rx]=nodes;
  await tx.command('dataset init new');
  await tx.command('dataset commit active');
  await tx.command('ifconfig up');
  await tx.command('thread start');
  await until(async()=>(await tx.command('state'))[0]==='leader');
  const dataset=(await tx.command('dataset active -x'))[0];
  check('leader formed fresh simulated Thread dataset',/^[a-f0-9]{40,512}$/i.test(dataset));
  await rx.command('dataset set active '+dataset);
  await rx.command('ifconfig up');
  await rx.command('thread start');
  await until(async()=>['child','router'].includes((await rx.command('state'))[0]));
  check('second simulated Thread node joined',true);
  const address=(await rx.command('ipaddr mleid'))[0];
  check('receiver mesh-local IPv6 resolved',/^[a-f0-9:]+$/i.test(address));
  check('native OpenThread C endpoint opens',
    (await rx.command('bangopen')).some(x=>x==='BANG_READY 61634') &&
    (await tx.command('bangopen')).some(x=>x==='BANG_READY 61634'));
  await sleep(250);
  const sent2=performance.now();
  await tx.command('bangsend '+address+' 2');
  await until(()=>evidence(rx).includes('BANG_HELD 1'),8000);
  const heldAt=rx.events.find(x=>x.line==='BANG_HELD 1').time;
  check('signed C binary event 2 held for missing sequence 1',true);
  const sent1=performance.now();
  await tx.command('bangsend '+address+' 1');
  await until(()=>evidence(rx).includes('BANG_DELIVER 2 [APPLAUSE]'),8000);
  check('native C OpenThread UDP reorders and delivers caption and sound',evidence(rx).includes('BANG_DELIVER 1 Gates open'));
  await tx.command('bangsend '+address+' 1');
  await until(()=>evidence(rx).includes('BANG_REJECT replay'),8000);
  check('signed replay rejected after native UDP delivery',true);
  await tx.command('bangsend '+address+' tamper');
  await until(()=>evidence(rx).includes('BANG_REJECT unauthorized'),8000);
  check('modified signed text rejected after native UDP delivery',true);
  const stats=(await rx.command('bangstats')).find(x=>x.startsWith('BANG_STATS '));
  check('receiver delivered exactly two events; rejected two others',
    /delivered=2 rejected=2 malformed=0 candidates=4 binary_bytes=133$/.test(stats??''));
  const deliveredAt=rx.events.find(x=>x.line==='BANG_DELIVER 2 [APPLAUSE]').time;
  result.observedCliInitiationToNativeCallbackMs=[
    Math.round((heldAt-sent2)*1000)/1000,
    Math.round((deliveredAt-sent1)*1000)/1000
  ];
  result.applicationFrameCount=4;
  result.receivedBinaryApplicationBytes=133;
  result.reliableDeliveryClaim=false;
  result.caveats=[
    'No physical RF; OpenThread POSIX software-simulated IEEE 802.15.4 only',
    'C otUdpSend and C otUdpReceive transfer binary bytes, not CLI ASCII hex',
    'Ed25519 authenticity does not encrypt venue captions',
    'Fixed key/text are controlled test fixtures, never production key material',
    'Timing is local CLI initiation to callback output, not a latency SLA'
  ];
  result.outcome='PASS';
  console.log(JSON.stringify(result,null,2));
}finally{
  for(const node of nodes)node.stop();
  await sleep(120);
  for(const node of nodes)if(node.proc.exitCode===null)node.proc.kill('SIGKILL');
  await rm(scratch,{recursive:true,force:true});
}
