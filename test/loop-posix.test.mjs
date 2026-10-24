// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {create6lowLoop} from '../src/loop/core.mjs';
import {create6lowFlare} from '../src/flare/core.mjs';
import {encodeFlareUdp,decodeFlareUdp} from '../experiments/flare/posix-transport.mjs';
import {encodeLoopUdp, decodeLoopUdp, isLoopUdpPayload,
  signLoopAppReceipt,verifyLoopAppReceipt} from '../experiments/loop/posix-transport.mjs';
import {render6lowLoopJourney} from '../src/loop/experience.mjs';

const key=Buffer.alloc(32,0x31),groupKey=Buffer.alloc(32,0x42),now=600000;
const alice=()=>create6lowLoop({
  friends:[{id:'@sam:example.org',key}],enabled:true
});
const sam=()=>create6lowLoop({
  friends:[{id:'@alice:example.org',key}],enabled:true
});

test('bounded UDP frame round-trip preserves authenticated presence and no identity fields',()=>{
  const a=alice(),s=sam();
  const presence=a.announce('@sam:example.org',{now,ttlMs:10000});
  const wire=encodeLoopUdp(presence);
  assert.match(wire,/^LO1\|presence\|/);
  assert.equal(wire.length<256,true);
  assert.equal(wire.includes('@'),false);
  assert.equal(wire.includes('example.org'),false);
  assert.equal(wire.includes(key.toString('hex')),false);
  assert.equal(isLoopUdpPayload(wire),true);
  const reconstructed=decodeLoopUdp(wire);
  assert.deepEqual(reconstructed,presence);
  const accepted=s.receive(reconstructed,{now:now+1});
  assert.equal(accepted?.friend,'@alice:example.org');
  assert.equal(accepted?.kind,'presence');
  assert.equal(s.receive(reconstructed,{now:now+2}),null,'replay still rejected by Loop core');
});

test('ping and ACK each remain authenticated Loop frames',()=>{
  const a=alice(),s=sam();
  const ping=a.ping('@sam:example.org',{now});
  const receipt=s.receive(decodeLoopUdp(encodeLoopUdp(ping)),{now:now+1});
  assert.equal(receipt?.kind,'ping');
  const ack=s.acknowledge('@alice:example.org',receipt.nonce,{now:now+2});
  const encoded=encodeLoopUdp(ack);
  assert.match(encoded,/^LO1\|ack\|/);
  const received=a.receive(decodeLoopUdp(encoded),{now:now+3});
  assert.equal(received?.kind,'ack');
  assert.equal(received?.replyTo,ping.nonce);
  assert.equal(a.receive(decodeLoopUdp(encoded),{now:now+4}),null);
});

test('signed application receipts cannot be forged, relabeled or replayed as other kinds',()=>{
  const nonce='ab'.repeat(12);
  const wire=signLoopAppReceipt({key,node:'sam',kind:'presence',nonce});
  assert.equal(isLoopUdpPayload(wire),true);
  assert.equal(verifyLoopAppReceipt({wire,key,node:'sam',kind:'presence',nonce}),true);
  assert.equal(verifyLoopAppReceipt({wire,key,node:'alice',kind:'presence',nonce}),false);
  assert.equal(verifyLoopAppReceipt({wire,key,node:'sam',kind:'ping',nonce}),false);
  assert.equal(verifyLoopAppReceipt({wire,key,node:'sam',kind:'presence',nonce:'cd'.repeat(12)}),false);
  assert.equal(verifyLoopAppReceipt({wire,key:groupKey,node:'sam',kind:'presence',nonce}),false);
  assert.equal(verifyLoopAppReceipt({wire:wire.slice(0,-1)+'0',key,node:'sam',kind:'presence',nonce}),false);
  assert.throws(()=>signLoopAppReceipt({key,node:'bob',kind:'presence',nonce}),/invalid/);
});

test('malformed, unsafe and expired serializations are rejected or fail authentication',()=>{
  const presence=alice().announce('@sam:example.org',{now,ttlMs:10000});
  const good=encodeLoopUdp(presence);
  for(const wire of [
    good+'|extra',good.replace('LO1','LA1'),good.replace('presence','pos'),
    good.replace('600000','600001'),good.replace('610000','600000'),
    good.replace(/\|-[|]/,'|'+ 'aa'.repeat(12)+'|'),
    'LO1|'+'x'.repeat(300),{},null
  ]) {
    const decoded=decodeLoopUdp(wire);
    assert.equal(decoded===null || sam().receive(decoded,{now:now+1})===null,true);
  }
  const expired=decodeLoopUdp(good);
  assert.equal(sam().receive(expired,{now:now+10001}),null);
  assert.equal(isLoopUdpPayload('LO1|anything'),false);
  assert.throws(()=>encodeLoopUdp({...presence,debug:1}),/invalid/);
});

test('Loop and Flare remain distinct authenticated application protocols over UDP',()=>{
  const a=create6lowFlare({audiences:[{id:'friends',key:groupKey,codes:['here']}],enabled:true});
  const s=create6lowFlare({audiences:[{id:'friends',key:groupKey,codes:['here']}],
    enabled:true,modalities:['text','haptic']});
  const f=a.flare('friends','here',{now,ttlMs:10000,hops:0});
  const wire=encodeFlareUdp(f);
  assert.equal(decodeLoopUdp(wire),null);
  const admitted=s.receive(decodeFlareUdp(wire),{now:now+1});
  assert.equal(admitted?.applicationReceived,true);
  assert.deepEqual(admitted?.requestedModalities,['text','haptic']);
  assert.equal(admitted?.physicalOutput,'unknown');
});

test('POSIX runner fails closed when OpenThread simulator binary is unavailable',()=>{
  const cli=fileURLToPath(new URL('../experiments/loop/posix-lab.mjs',import.meta.url));
  const env={...process.env}; delete env.OT_CLI_PATH;
  const result=spawnSync(process.execPath,[cli,'--json'],{env,encoding:'utf8',timeout:10000});
  assert.equal(result.status,2);
  assert.match(result.stderr,/OT_CLI_PATH.*No network simulation ran/i);
  assert.equal(result.stdout,'');
  const invalid=spawnSync(process.execPath,[cli,'--scenario','invalid'],{env,encoding:'utf8'});
  assert.equal(invalid.status,2);
  assert.match(invalid.stderr,/Usage:/);
});

test('first journey renderer differentiates real POSIX simulated UDP from pure in-memory',()=>{
  const report={schema:'6lowstick.loop-first-journey.v0',scenario:'nominal',
    transport:'openthread-posix-simulated-radio-ipv6-udp',
    consent:{alice:true,sam:true},
    presence:{aliceObservedSam:true,samObservedAlice:true,mutuallyObserved:true},
    ping:{samApplicationReceived:true,aliceApplicationAck:true},
    signal:{code:'here',samApplicationReceived:true,requestedModalities:['text','haptic'],
      physicalOutput:'unknown',humanDetection:'unknown',humanComprehension:'unknown'}};
  const output=render6lowLoopJourney(report);
  assert.match(output,/OpenThread POSIX simulated-radio IPv6 UDP/);
  assert.match(output,/No physical RF/);
  assert.match(output,/Human understanding: unknown/);
});

test('optional actual POSIX simulated radio path', {skip:!process.env.OT_CLI_PATH},()=>{
  const cli=fileURLToPath(new URL('../experiments/loop/posix-lab.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[cli,'--json'],{
    encoding:'utf8',env:process.env,timeout:110000,maxBuffer:1024*1024});
  assert.equal(result.status,0,result.stderr);
  const evidence=JSON.parse(result.stdout);
  assert.equal(evidence.transport,'openthread-posix-simulated-radio-ipv6-udp');
  assert.equal(evidence.presence.mutuallyObserved,true);
  assert.equal(evidence.ping.aliceApplicationAck,true);
  assert.equal(evidence.signal.samApplicationReceived,true);
  assert.equal(evidence.physicalRadioVerified,false);
});
