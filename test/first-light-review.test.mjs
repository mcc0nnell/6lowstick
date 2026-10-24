// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewFirstLightCapture} from '../src/first-light/review.mjs';

const sessionId='ab'.repeat(12),id='cd'.repeat(12),time=100000;
const calibrationSha256='1'.repeat(64);
const journey=()=>({
  schema:'6lowstick.loop-first-journey.v0',
  transport:'openthread-posix-simulated-radio-ipv6-udp',
  simulationOnly:true,physicalRadioVerified:false,
  signal:{samApplicationReceived:true,requestedModalities:['text','haptic'],
    outputRequest:{sessionId,id,atUnixMs:time,requestedModalities:['text','haptic']}}
});
const capture=()=>({
  schema:'6lowstick.first-light-capture.v0',
  source:'operator-supplied-sensor-capture',
  sessionId,instrument:'bench-accelerometer',
  calibrationSha256,clockUncertaintyMs:10,
  observations:[{modality:'haptic',atUnixMs:time+100,value:1.5,unit:'m/s2'}]
});

test('one time-correlated sample is only a candidate, never verified physical or human receipt',()=>{
  const report=reviewFirstLightCapture({journey:journey(),capture:capture()});
  assert.equal(report.schema,'6lowstick.first-light-review.v0');
  assert.equal(report.applicationAdmitted,true);
  assert.equal(report.requestId,id);
  assert.equal(report.sourceProvenance,'unverified-operator-supplied-capture');
  assert.deepEqual(report.notSensorMeasured,['text']);
  assert.deepEqual(report.observations,[{
    modality:'haptic',sensorCandidates:1,status:'time-correlated-candidate'
  }]);
  assert.equal(report.assessment,'candidate-correlations-only');
  assert.equal(report.physicalOutputVerified,false);
  assert.equal(report.humanDetected,'unknown');
  assert.equal(report.humanUnderstood,'unknown');
});

test('no or ambiguous external sensor samples never promote an application receipt',()=>{
  const missed=capture(); missed.observations=[];
  const none=reviewFirstLightCapture({journey:journey(),capture:missed});
  assert.equal(none.observations[0].status,'not-observed-in-supplied-capture');
  assert.equal(none.assessment,'insufficient-or-ambiguous-sensor-observations');
  const multiple=capture();
  multiple.observations.push({modality:'haptic',atUnixMs:time+120,value:0.8,unit:'m/s2'});
  const many=reviewFirstLightCapture({journey:journey(),capture:multiple});
  assert.equal(many.observations[0].status,'ambiguous-multiple-candidates');
  assert.equal(many.physicalOutputVerified,false);
});

test('time correlation respects uncertainty, direction and bounded window',()=>{
  const sample=capture();
  sample.observations[0].atUnixMs=time-11;
  assert.equal(reviewFirstLightCapture({journey:journey(),capture:sample}).observations[0].sensorCandidates,0);
  sample.observations[0].atUnixMs=time-10;
  assert.equal(reviewFirstLightCapture({journey:journey(),capture:sample}).observations[0].sensorCandidates,1);
  sample.observations[0].atUnixMs=time+511;
  assert.equal(reviewFirstLightCapture({journey:journey(),capture:sample}).observations[0].sensorCandidates,0);
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:sample,windowMs:10000}),/window/);
});

test('no receiver application admission cannot be laundered into physical proof',()=>{
  const j=journey();
  j.signal.samApplicationReceived=false;
  j.signal.requestedModalities=[];
  j.signal.outputRequest=null;
  const report=reviewFirstLightCapture({journey:j,capture:capture()});
  assert.equal(report.applicationAdmitted,false);
  assert.equal(report.assessment,'no-application-output-request');
  assert.deepEqual(report.observations,[]);
  assert.equal(report.physicalOutputVerified,false);
  j.signal.outputRequest={sessionId,id,atUnixMs:time,requestedModalities:['haptic']};
  assert.throws(()=>reviewFirstLightCapture({journey:j,capture:capture()}),/no application admission/);
});

test('unrelated session, absent capture, impossible uncertainty or forged origin fail closed',()=>{
  const wrong=capture();wrong.sessionId='de'.repeat(12);
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:wrong}),/different sessions/);
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:null}),/invalid/);
  const unclocked=capture();unclocked.clockUncertaintyMs=1001;
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:unclocked}),/invalid/);
  const invented=capture();invented.source='independently-verified-physical-output';
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:invented}),/invalid/);
  const fake=capture();fake.calibrationSha256='not-a-sha';
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:fake}),/invalid/);
});

test('invalid modalities, malformed values and oversized observations fail closed',()=>{
  const bad=capture();bad.observations=[{modality:'haptic',atUnixMs:time+20,value:Infinity,unit:'m/s2'}];
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:bad}),/malformed/);
  bad.observations[0].value=1;bad.observations[0].modality='text';
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:bad}),/malformed/);
  const large=capture();large.observations=Array.from({length:129},()=>({modality:'haptic',atUnixMs:time+1,value:2,unit:'m/s2'}));
  assert.throws(()=>reviewFirstLightCapture({journey:journey(),capture:large}),/unbounded/);
  const j=journey();j.signal.outputRequest.requestedModalities=['haptic','text'];
  assert.throws(()=>reviewFirstLightCapture({journey:j,capture:capture()}),/receiver-side output request/);
});

test('light and haptic require their own independent candidate samples',()=>{
  const j=journey();
  j.signal.requestedModalities=['light','haptic'];
  j.signal.outputRequest.requestedModalities=['light','haptic'];
  const c=capture();
  const report=reviewFirstLightCapture({journey:j,capture:c});
  assert.equal(report.assessment,'insufficient-or-ambiguous-sensor-observations');
  assert.equal(report.observations.find(x=>x.modality==='light').sensorCandidates,0);
  assert.equal(report.observations.find(x=>x.modality==='haptic').sensorCandidates,1);
});

test('CLI needs independent journey and capture JSON files; output never asserts actuation',()=>{
  const dir=mkdtempSync(join(tmpdir(),'first-light-review-'));
  try {
    const j=join(dir,'journey.json'),c=join(dir,'capture.json');
    writeFileSync(j,JSON.stringify(journey()));
    writeFileSync(c,JSON.stringify(capture()));
    const script=fileURLToPath(new URL('../scripts/first-light-review.mjs',import.meta.url));
    const ok=spawnSync(process.execPath,[script,'--journey',j,'--capture',c],{encoding:'utf8'});
    assert.equal(ok.status,0,ok.stderr);
    const result=JSON.parse(ok.stdout);
    assert.equal(result.physicalOutputVerified,false);
    assert.equal(result.observations[0].status,'time-correlated-candidate');
    assert.match(result.inputBytesSha256.journey,/^[0-9a-f]{64}$/);
    assert.match(result.inputBytesSha256.capture,/^[0-9a-f]{64}$/);
    assert.notEqual(result.inputBytesSha256.journey,result.inputBytesSha256.capture);
    const missing=spawnSync(process.execPath,[script,'--journey',j],{encoding:'utf8'});
    assert.equal(missing.status,2);
    assert.match(missing.stderr,/Usage:/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
