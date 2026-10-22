import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewPosixEvidence} from '../src/reliability/posix-review.mjs';
import {claimsTemplate, checkClaims} from '../src/reliability/trace-review.mjs';

const clone = x => structuredClone(x);
const attempt=(step,route,outcome)=>({step,route,outcome});
const record = (id, attempts, route)=>({
  schema:'6lowstick.synthetic-fabric.v0',simulation:true,drill:true,id,
  receiver:'haptic',status:'app_acknowledged',confirmedRoute:route,attempts,
  humanAcknowledged:false,physicalRadioVerified:false,
});
const event=(id,route,outcome)=>({id,route,outcome});
const all=['display','haptic','strobe'];
const phase=(requested,acknowledged,missing)=>({requested,acknowledged,missing,send_errors:[]});
const samePhase=()=>phase(all,all,[]);
const baseline=()=>({
  baseline:samePhase(),
  rejected:phase(['strobe'],[],['strobe']),
  replay:phase(['strobe'],['strobe'],[]),
  sameGateway:{delivery:samePhase()},
  degraded:phase(all,['display','strobe'],['haptic']),
  activations:{display:['d1','d2','d3'],haptic:['h1','h2'],strobe:['s1','s2','s3']},
  events:[{node:'strobe',event:'rejected_auth'},{node:'strobe',event:'duplicate_suppressed'}],
});
const example=()=>({
  ...baseline(),
  schema:'tronix.thread-alert-lab.v1',
  transport:'OpenThread ot-cli-ftd UDP POSIX simulation (no physical radio)',
  errors:[],
  timing:{schema:'6lowstick.harness-monotonic.v1',events:[{seq:1,phase:'baseline'}]},
  multiradio:{
    schema:'6lowstick.posix-multiradio.v0',
    thread:'OpenThread POSIX simulator UDP (actual ot-cli-ftd processes, no physical RF)',
    lora:'scripted peer-to-peer LoRa model (no modem or air interface)',
    spinel:false,physicalRadio:false,humanDelivery:false,
    healthy:record('radio001',[attempt(1,'thread','authenticated_app_receipt')],'thread'),
    lostThreadReceipt:record('radio002',[
      attempt(1,'thread','no_authenticated_receipt'),
      attempt(2,'lora-p2p','authenticated_app_receipt')],'lora-p2p'),
    stoppedThreadNode:record('radio003',[
      attempt(1,'thread','no_authenticated_receipt'),
      attempt(2,'lora-p2p','authenticated_app_receipt')],'lora-p2p'),
    receiverEvents:[
      event('radio001','thread','synthetic_activation'),
      event('radio002','thread','synthetic_activation'),
      event('radio002','lora-p2p','duplicate_suppressed'),
      event('radio003','lora-p2p','synthetic_activation'),
    ],
  },
});

test('POSIX report adapter maps exact source paths and never promotes to measured RF',()=>{
  const review=reviewPosixEvidence(example());
  assert.equal(review.fixture_schema,'6lowstick.posix-multiradio.v0');
  assert.equal(review.simulation_only,true);
  assert.equal(review.physical_radio_verified,false);
  assert.equal(review.human_receipt_verified,false);
  assert.match(review.timing_clock,/not RF/);
  assert.deepEqual(review.scenarios.map(s=>s.scenario_id),[
    'posix_thread_healthy','posix_receipt_withheld','posix_receiver_stopped']);
  assert.deepEqual(review.scenarios.map(s=>s.confirmed_route),[
    'thread','lora-p2p','lora-p2p']);
  assert.equal(review.scenarios[1].duplicate_suppressions,1);
  assert.deepEqual(review.scenarios[1].evidence_references,[
    'multiradio.lostThreadReceipt.attempts[0]',
    'multiradio.lostThreadReceipt.attempts[1]',
    'multiradio.receiverEvents[1]',
    'multiradio.receiverEvents[2]',
  ]);
  for(const scenario of review.scenarios){
    assert.equal(scenario.evidence_kind,'posix_simulated_udp_with_scripted_lora');
    assert.deepEqual(scenario.unknowns,{physical_output:'unknown',
      human_detection:'unknown',human_comprehension:'unknown'});
  }
  assert.equal(checkClaims(review,claimsTemplate(review)).result,'PASS');
});

test('POSIX adapter rejects flags, incomplete reports, errors and falsified route results',()=>{
  for(const path of [
    ['multiradio','physicalRadio',true],
    ['multiradio','humanDelivery',true],
    ['multiradio','spinel',true],
    ['multiradio','thread','real 802.15.4'],
    ['multiradio','lora','real modem'],
    ['multiradio','healthy',null],
    ['multiradio','receiverEvents',[]],
    ['multiradio','lostThreadReceipt',{}],
    ['timing','events',[]],
  ]) {
    const data=example();
    data[path[0]][path[1]]=path[2];
    assert.throws(()=>reviewPosixEvidence(data),/POSIX|scenario|fixture/);
  }
  const absent=example();delete absent.baseline;
  assert.throws(()=>reviewPosixEvidence(absent),/Incomplete POSIX lab baseline/);
  const failedSecurity=example();failedSecurity.events=[];
  assert.throws(()=>reviewPosixEvidence(failedSecurity),/Incomplete POSIX lab baseline/);
  const missed=example();missed.degraded.missing=[];
  assert.throws(()=>reviewPosixEvidence(missed),/Incomplete POSIX lab baseline/);
  const err=example();err.errors.push({message:'timeout'});
  assert.throws(()=>reviewPosixEvidence(err),/unsuccessful/);
  const noTransport=example();noTransport.transport='OpenThread RF hardware';
  assert.throws(()=>reviewPosixEvidence(noTransport),/unsupported|incomplete|POSIX/i);
  const dup=example();dup.multiradio.stoppedThreadNode.id='radio002';
  assert.throws(()=>reviewPosixEvidence(dup),/Inconsistent POSIX/);
  const badReceipt=example();
  badReceipt.multiradio.lostThreadReceipt.attempts[0].outcome='authenticated_app_receipt';
  assert.throws(()=>reviewPosixEvidence(badReceipt),/Inconsistent POSIX/);
  const ackChange=example();ackChange.multiradio.healthy.humanAcknowledged=true;
  assert.throws(()=>reviewPosixEvidence(ackChange),/synthetic/);
  const unknownEvent=example();unknownEvent.multiradio.receiverEvents[0].id='madeup';
  assert.throws(()=>reviewPosixEvidence(unknownEvent),/Unmatched POSIX/);
  const misleading=example();misleading.multiradio.receiverEvents[2].outcome='synthetic_activation';
  assert.throws(()=>reviewPosixEvidence(misleading),/Inconsistent POSIX receiver journal/);
});

test('POSIX typed review rejects invented human understanding and guessed path',()=>{
  const review=reviewPosixEvidence(example());
  const template=claimsTemplate(review);
  const human=clone(template);
  human.scenarios[1].human_comprehension='understood';
  assert.match(checkClaims(review,human).failures.join(','),/unverified_human_comprehension/);
  const refs=clone(template);
  refs.scenarios[1].evidence_references[0]='multiradio.healthy.attempts[0]';
  assert.match(checkClaims(review,refs).failures.join(','),/ungrounded_or_incomplete_references/);
});

test('CLI POSIX mode works offline with validated source and fails on fabricated physical output',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const dir=mkdtempSync(join(tmpdir(),'6lowstick-posix-review-'));
  try{
    const input=join(dir,'simulated-run.json');
    writeFileSync(input,JSON.stringify(example()));
    const output=JSON.parse(execFileSync(process.execPath,
      ['scripts/review-traces.mjs','--posix',input],{cwd:root,encoding:'utf8'}));
    assert.match(output.fixture_sha256,/^[0-9a-f]{64}$/);
    assert.equal(output.scenarios.length,3);
    const claimsPath=join(dir,'claims.json');
    const template=JSON.parse(execFileSync(process.execPath,
      ['scripts/review-traces.mjs','--posix',input,'--template'],{cwd:root,encoding:'utf8'}));
    writeFileSync(claimsPath,JSON.stringify(template));
    const good=spawnSync(process.execPath,
      ['scripts/review-traces.mjs','--posix',input,'--check',claimsPath],{cwd:root,encoding:'utf8'});
    assert.equal(good.status,0,good.stderr);
    template.scenarios[0].physical_output='measured';
    writeFileSync(claimsPath,JSON.stringify(template));
    const rejected=spawnSync(process.execPath,
      ['scripts/review-traces.mjs','--posix',input,'--check',claimsPath],{cwd:root,encoding:'utf8'});
    assert.equal(rejected.status,1);
    assert.match(rejected.stdout,/unverified_physical_output/);
    const malformed=spawnSync(process.execPath,
      ['scripts/review-traces.mjs','--posix',join(dir,'missing.json')],{cwd:root,encoding:'utf8'});
    assert.equal(malformed.status,2);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
