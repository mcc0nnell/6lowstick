#!/usr/bin/env node
// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// OPT-IN OpenThread POSIX simulated-radio UDP, NOT hardware RF or notifications.
import {spawn} from 'node:child_process';
import {createHash, randomBytes, randomInt} from 'node:crypto';
import {existsSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {isAbsolute, join} from 'node:path';
import {tmpdir} from 'node:os';
import {performance} from 'node:perf_hooks';
import {create6lowLoop} from '../../src/loop/core.mjs';
import {create6lowFlare} from '../../src/flare/core.mjs';
import {render6lowLoopJourney} from '../../src/loop/experience.mjs';
import {encodeLoopUdp, decodeLoopUdp, isLoopUdpPayload,
  signLoopAppReceipt, verifyLoopAppReceipt} from './posix-transport.mjs';
import {encodeFlareUdp, decodeFlareUdp, isFlareUdpPayload,
  signFlareAppReceipt, awaitFlareAppReceipt} from '../flare/posix-transport.mjs';

const ALICE = '@alice:example.org', SAM = '@sam:example.org';
const PORT_ALICE = 61730, PORT_SAM = 61731, WAIT_MS = 4500;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const args=process.argv.slice(2);
const usage='Usage: OT_CLI_PATH=/absolute/ot-cli-ftd node experiments/loop/posix-lab.mjs [--scenario nominal|drop-ack|offline|expired] [--alice-disabled] [--sam-disabled] [--json]';
const config={scenario:'nominal',aliceEnabled:true,samEnabled:true,json:false};
const seen=new Set();
try {
  for(let i=0;i<args.length;i++) {
    const flag=args[i];
    if(seen.has(flag)) throw new Error('duplicate argument');
    seen.add(flag);
    if(flag==='--json') config.json=true;
    else if(flag==='--alice-disabled') config.aliceEnabled=false;
    else if(flag==='--sam-disabled') config.samEnabled=false;
    else if(flag==='--scenario' && ['nominal','drop-ack','offline','expired'].includes(args[i+1]))
      config.scenario=args[++i];
    else throw new Error('unknown argument');
  }
} catch(error) {
  console.error(usage+'\nRefused: '+error.message);
  process.exit(2);
}
const bin=process.env.OT_CLI_PATH;
if (!bin || !isAbsolute(bin) || !existsSync(bin)) {
  console.error('OT_CLI_PATH must name an existing absolute ot-cli-ftd binary; no network simulation ran.');
  process.exit(2);
}
const base=Number(process.env.LOOP_POSIX_BASE_ID ?? 14);
const offset=Number(process.env.LOOP_POSIX_PORT_OFFSET ?? randomInt(20,500));
if (!Number.isInteger(base) || base<1 || base>27 ||
    !Number.isInteger(offset) || offset<1 || offset>500) {
  console.error('Invalid LOOP_POSIX_BASE_ID or LOOP_POSIX_PORT_OFFSET');
  process.exit(2);
}
const directory=mkdtempSync(join(tmpdir(),'6lowloop-posix-'));
mkdirSync(join(directory,'tmp'),{mode:0o700});
const nodes=[], errors=[];
class OtNode {
  constructor(name,id) {
    this.name=name; this.received=[]; this.closed=false;
    this.pending=null; this.queue=Promise.resolve(); this.buffer='';
    this.onPacket=null;
    this.proc=spawn(bin,[String(id)],{cwd:directory,
      env:{...process.env,PORT_OFFSET:String(offset)},stdio:['pipe','pipe','pipe']});
    this.proc.stdout.on('data',chunk=>this.feed(chunk.toString()));
    this.proc.stderr.on('data',chunk=>errors.push({node:name,stderr:chunk.toString().slice(0,256)}));
    this.proc.on('error',err=>this.stop(err));
    this.proc.on('exit',()=>this.stop(new Error(name+' exited')));
    this.proc.stdin.on('error',()=>{});
  }
  feed(chunk) {
    this.buffer+=chunk;
    if(this.buffer.length>16384) this.buffer=this.buffer.slice(-4096);
    let index;
    while((index=this.buffer.indexOf('\n'))>=0) {
      const line=this.buffer.slice(0,index).replace(/\r/g,'').trim().replace(/^>\s*/,'');
      this.buffer=this.buffer.slice(index+1);
      const pkt=/^\d+ bytes from \S+ \d+ (.+)$/.exec(line);
      if(pkt && (isLoopUdpPayload(pkt[1]) || isFlareUdpPayload(pkt[1]))) {
        const item={body:pkt[1],time:performance.now()};
        this.received.push(item);
        if(this.onPacket) Promise.resolve().then(()=>this.onPacket(item))
          .catch(err=>errors.push({node:this.name,error:err.message}));
        continue;
      }
      const p=this.pending;
      if(!p) continue;
      if(line==='Done') {
        this.pending=null; clearTimeout(p.timer); p.resolve(p.lines);
      } else if(/^Error \d+:/.test(line)) {
        this.pending=null; clearTimeout(p.timer);
        p.reject(new Error(this.name+': '+line));
      } else if(line && line!==p.command) p.lines.push(line);
    }
  }
  command(command,timeoutMs=5000) {
    const task=()=>new Promise((resolve,reject)=>{
      if(this.closed) return reject(new Error(this.name+' is offline'));
      const timer=setTimeout(()=>{
        this.pending=null; this.stop(new Error(this.name+' command timeout'));
        reject(new Error(this.name+' command timeout'));
      },timeoutMs);
      this.pending={command,resolve,reject,timer,lines:[]};
      this.proc.stdin.write(command+'\n');
    });
    const next=this.queue.then(task);
    this.queue=next.catch(()=>{});
    return next;
  }
  stop(error=null) {
    this.closed=true;
    if(this.pending) {
      const p=this.pending; this.pending=null;clearTimeout(p.timer);
      p.reject(error ?? new Error(this.name+' stopped'));
    }
    if(this.proc && this.proc.exitCode===null) this.proc.kill('SIGTERM');
  }
}
async function until(predicate,timeout,label) {
  const limit=performance.now()+timeout;
  while(performance.now()<limit) {
    if(await predicate()) return true;
    await sleep(40);
  }
  if(label) throw new Error('timeout: '+label);
  return false;
}
async function attach(node,dataset) {
  await node.command('dataset set active '+dataset);
  await node.command('ifconfig up');
  await node.command('thread start');
  await until(async()=>['router','child'].includes((await node.command('state'))[0]),
    30000,node.name+' attach');
}
async function waitLoopReceipt(node,key,from,nonce,since) {
  return until(()=>node.received.some(item=>item.time>=since &&
    verifyLoopAppReceipt({wire:item.body,key,node:from,kind:'presence',nonce})),WAIT_MS);
}
async function main() {
  const aliceNode=new OtNode('alice',base);
  const samNode=new OtNode('sam',base+1);
  nodes.push(aliceNode,samNode);
  await aliceNode.command('dataset init new');
  await aliceNode.command('dataset commit active');
  await aliceNode.command('ifconfig up');
  await aliceNode.command('thread start');
  await until(async()=>(await aliceNode.command('state'))[0]==='leader',
    30000,'leader election');
  const dataset=(await aliceNode.command('dataset active -x'))[0];
  if(!/^[0-9a-f]{40,512}$/i.test(dataset)) throw new Error('invalid active dataset');
  await attach(samNode,dataset);
  for(const [node,port] of [[aliceNode,PORT_ALICE],[samNode,PORT_SAM]]) {
    node.address=(await node.command('ipaddr rloc'))[0];
    if(!/^[0-9a-f:]+$/i.test(node.address)) throw new Error('invalid RLOC');
    await node.command('udp open');
    await node.command('udp bind :: '+port);
  }
  const pairKey=randomBytes(32),groupKey=randomBytes(32);
  const sessionId=randomBytes(12).toString('hex');
  const alice=create6lowLoop({friends:[{id:SAM,key:pairKey}],enabled:config.aliceEnabled});
  const sam=create6lowLoop({friends:[{id:ALICE,key:pairKey}],enabled:config.samEnabled});
  const audience=[{id:'friends',key:groupKey,codes:['here']}];
  const aliceFlare=create6lowFlare({audiences:audience,enabled:config.aliceEnabled});
  const samFlare=create6lowFlare({audiences:audience,enabled:config.samEnabled,
    modalities:['text','haptic']});
  let pingNonce=null,alicePingAck=false,samPingReceived=false,samSignalReceived=false;
  let samModalities=[],outputRequest=null;
  let presenceAcceptedBySam=0,presenceAcceptedByAlice=0,duplicatesRejected=0;
  aliceNode.onPacket=async item=>{
    const frame=decodeLoopUdp(item.body);
    if(!frame) return;
    const accepted=alice.receive(frame,{now:Date.now()});
    if(!accepted) {duplicatesRejected++;return;}
    if(accepted.kind==='presence') {
      presenceAcceptedByAlice++;
      await aliceNode.command('udp send '+samNode.address+' '+PORT_SAM+' '+
        signLoopAppReceipt({key:pairKey,node:'alice',kind:'presence',nonce:accepted.nonce}));
    }
    if(accepted.kind==='ack' && accepted.replyTo===pingNonce) alicePingAck=true;
  };
  samNode.onPacket=async item=>{
    const loopFrame=decodeLoopUdp(item.body);
    if(loopFrame) {
      const accepted=sam.receive(loopFrame,{now:Date.now()});
      if(!accepted) {duplicatesRejected++;return;}
      if(accepted.kind==='presence') {
        presenceAcceptedBySam++;
        await samNode.command('udp send '+aliceNode.address+' '+PORT_ALICE+' '+
          signLoopAppReceipt({key:pairKey,node:'sam',kind:'presence',nonce:accepted.nonce}));
      }
      if(accepted.kind==='ping') {
        samPingReceived=true;
        if(config.scenario!=='drop-ack') {
          const reply=sam.acknowledge(ALICE,accepted.nonce,{now:Date.now(),ttlMs:10000});
          await samNode.command('udp send '+aliceNode.address+' '+PORT_ALICE+' '+encodeLoopUdp(reply));
        }
      }
      return;
    }
    const flareFrame=decodeFlareUdp(item.body);
    if(!flareFrame) return;
    const accepted=samFlare.receive(flareFrame,{now:Date.now()});
    if(!accepted) {duplicatesRejected++;return;}
    samSignalReceived=true;
    samModalities=[...accepted.requestedModalities];
    // Receiver-side application request, NOT a physical sensor observation.
    outputRequest={sessionId,id:createHash('sha256').update(accepted.nonce).digest('hex').slice(0,24),
      atUnixMs:Date.now(),requestedModalities:[...accepted.requestedModalities]};
    await samNode.command('udp send '+aliceNode.address+' '+PORT_ALICE+' '+
      signFlareAppReceipt({key:groupKey,node:'sam',nonce:accepted.nonce}));
  };
  const linkEnabled=config.aliceEnabled && config.samEnabled &&
    config.scenario!=='offline';
  const issueAt=Date.now()-(config.scenario==='expired'?30000:0);
  let samObservedAlice=false,aliceObservedSam=false;
  if(linkEnabled) {
    const aPresence=alice.announce(SAM,{now:issueAt,ttlMs:10000});
    const sPresence=sam.announce(ALICE,{now:issueAt,ttlMs:10000});
    const startA=performance.now();
    await aliceNode.command('udp send '+samNode.address+' '+PORT_SAM+' '+encodeLoopUdp(aPresence));
    samObservedAlice=await waitLoopReceipt(aliceNode,pairKey,'sam',aPresence.nonce,startA);
    const startS=performance.now();
    await samNode.command('udp send '+aliceNode.address+' '+PORT_ALICE+' '+encodeLoopUdp(sPresence));
    aliceObservedSam=await waitLoopReceipt(samNode,pairKey,'alice',sPresence.nonce,startS);
  }
  const mutual=samObservedAlice && aliceObservedSam;
  if(mutual) {
    const ping=alice.ping(SAM,{now:Date.now(),ttlMs:10000});
    pingNonce=ping.nonce;
    await aliceNode.command('udp send '+samNode.address+' '+PORT_SAM+' '+encodeLoopUdp(ping));
    await until(()=>samPingReceived,WAIT_MS);
    if(samPingReceived && config.scenario!=='drop-ack')
      await until(()=>alicePingAck,WAIT_MS);
    const flare=aliceFlare.flare('friends','here',{now:Date.now(),ttlMs:10000,hops:0});
    const firstSend=performance.now();
    await aliceNode.command('udp send '+samNode.address+' '+PORT_SAM+' '+encodeFlareUdp(flare));
    const receipt=await awaitFlareAppReceipt({sender:aliceNode,key:groupKey,
      node:'sam',nonce:flare.nonce,since:firstSend,waitMs:WAIT_MS});
    samSignalReceived=samSignalReceived && receipt.applicationReceipt;
    if(samSignalReceived) {
      // The exact duplicate may arrive as UDP but must not trigger a second application event.
      await aliceNode.command('udp send '+samNode.address+' '+PORT_SAM+' '+encodeFlareUdp(flare));
      await sleep(250);
    }
  }
  if(errors.length) throw new Error('OpenThread node errors: '+JSON.stringify(errors));
  const result={
    schema:'6lowstick.loop-first-journey.v0',scenario:config.scenario,
    transport:'openthread-posix-simulated-radio-ipv6-udp',
    simulationOnly:true,physicalRadioVerified:false,
    consent:{alice:config.aliceEnabled,sam:config.samEnabled},
    presence:{aliceObservedSam,samObservedAlice,mutuallyObserved:mutual},
    ping:{samApplicationReceived:samPingReceived,aliceApplicationAck:alicePingAck},
    signal:{code:'here',samApplicationReceived:samSignalReceived,
      requestedModalities:samSignalReceived?samModalities:[],
      outputRequest:samSignalReceived?outputRequest:null,
      physicalOutput:'unknown',humanDetection:'unknown',humanComprehension:'unknown'},
    transportEvidence:{nodeStates:['leader','router-or-child'],
      presenceAdmissions:{alice:presenceAcceptedByAlice,sam:presenceAcceptedBySam},
      duplicatesRejected,applicationReceiptsSigned:true},
    limitations:'POSIX simulated-radio IPv6 UDP only. No hardware RF, Matrix login, physical indicator, human detection or comprehension.'
  };
  const shouldSucceed=linkEnabled && config.scenario!=='expired';
  if(shouldSucceed && (!mutual || !samPingReceived || !samSignalReceived ||
      (config.scenario!=='drop-ack' && !alicePingAck))) {
    throw new Error('expected authenticated application flow not observed');
  }
  if(!shouldSucceed && (mutual || samPingReceived || alicePingAck || samSignalReceived))
    throw new Error('negative scenario was unexpectedly accepted');
  if(config.scenario==='drop-ack' && alicePingAck)
    throw new Error('injected missing ACK was falsely reported as accepted');
  return result;
}
let result;
try {
  result=await main();
} catch(error) {
  console.error('6lowLoop POSIX lab failed: '+(error.stack ?? error.message));
  process.exitCode=1;
} finally {
  for(const node of nodes) node.stop();
  await sleep(100);
  rmSync(directory,{recursive:true,force:true});
}
if(result) console.log(config.json ? JSON.stringify(result,null,2) : render6lowLoopJourney(result));
