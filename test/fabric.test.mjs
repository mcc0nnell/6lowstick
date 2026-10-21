// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReplayJournal} from '../experiments/thread-alert/replay.mjs';
import {signAlert} from '../experiments/thread-alert/auth.mjs';
import {createSyntheticFabric} from '../src/fabric/delivery.mjs';
import {createScriptedLink, createSyntheticReceiver} from '../src/fabric/simulation.mjs';
import {signReceipt, verifyReceipt} from '../src/fabric/receipts.mjs';

const key = Buffer.alloc(32, 6);
const nonce1 = '000000000000000000000001';
const nonce2 = '000000000000000000000002';
const nonces = () => {
  let counter = 0;
  return () => (++counter).toString(16).padStart(24, '0');
};

function setup() {
  const dir = mkdtempSync(join(tmpdir(), '6lowstick-test-fabric-'));
  const path = join(dir, 'receiver.journal');
  const receiver = createSyntheticReceiver({name: 'haptic', key, journal: new ReplayJournal(path)});
  const adapters = {
    thread: createScriptedLink({route: 'thread', receiver}),
    'lora-p2p': createScriptedLink({route: 'lora-p2p', receiver})
  };
  return {receiver, adapters, path, close: () => rmSync(dir, {force: true, recursive: true})};
}
function fabric(adapters) {
  return createSyntheticFabric({key, adapters, nonceFactory: nonces()});
}

test('R2 receipt HMAC binds ID, endpoint and fresh per-attempt challenge', () => {
  const wire = signReceipt(key, 'drill1', 'haptic', nonce1);
  assert.equal(verifyReceipt(key, wire, {id: 'drill1', receiver: 'haptic', nonce: nonce1}), true);
  assert.equal(verifyReceipt(key, wire, {id: 'drill1', receiver: 'display', nonce: nonce1}), false);
  assert.equal(verifyReceipt(key, wire, {id: 'drill2', receiver: 'haptic', nonce: nonce1}), false);
  assert.equal(verifyReceipt(key, wire, {id: 'drill1', receiver: 'haptic', nonce: nonce2}), false);
  assert.equal(verifyReceipt(Buffer.alloc(32, 9), wire,
    {id: 'drill1', receiver: 'haptic', nonce: nonce1}), false);
  assert.equal(verifyReceipt(key, wire + 'extra',
    {id: 'drill1', receiver: 'haptic', nonce: nonce1}), false);
  assert.equal(verifyReceipt(key, 'ACK1|drill1|haptic',
    {id: 'drill1', receiver: 'haptic', nonce: nonce1}), false);
  assert.throws(() => signReceipt(key, 'drill1', 'haptic', 'bad'), /invalid/);
});

test('healthy Thread short circuits; LoRa is not sent', async () => {
  const t = setup();
  try {
    const result = await fabric(t.adapters).deliver({id: 'drill1', receiver: 'haptic', drill: true});
    assert.equal(result.status, 'app_acknowledged');
    assert.equal(result.confirmedRoute, 'thread');
    assert.deepEqual(result.attempts.map(x => x.route), ['thread']);
    assert.equal(t.adapters['lora-p2p'].observations.length, 0);
  } finally { t.close(); }
});

test('Thread radio unavailable leads to signed receipt on direct-LoRa simulation', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver, outcomes: ['down']});
    const result = await fabric(t.adapters).deliver({id: 'drill2', receiver: 'haptic', drill: true});
    assert.equal(result.confirmedRoute, 'lora-p2p');
    assert.deepEqual(result.attempts.map(x => x.outcome),
      ['no_authenticated_receipt', 'authenticated_app_receipt']);
    assert.equal(t.receiver.events.length, 1);
    assert.equal(result.humanAcknowledged, false);
    assert.equal(result.physicalRadioVerified, false);
  } finally { t.close(); }
});

test('lost Thread ACK triggers same alert ID on LoRa, never a second activation', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver,
      outcomes: ['drop_receipt']});
    const f = fabric(t.adapters);
    const result = await f.deliver({id: 'drill3', receiver: 'haptic', drill: true});
    assert.equal(result.confirmedRoute, 'lora-p2p');
    assert.deepEqual(t.receiver.events.map(x => x.outcome),
      ['synthetic_activation', 'duplicate_suppressed']);
    assert.equal(t.receiver.events[0].id, t.receiver.events[1].id);
    const afterRestart = createSyntheticReceiver({name: 'haptic', key,
      journal: new ReplayJournal(t.path)});
    const second = createScriptedLink({route: 'thread', receiver: afterRestart});
    const again = await fabric({thread: second}).deliver({
      id: 'drill3', receiver: 'haptic', routes: ['thread'], drill: true
    });
    assert.equal(again.status, 'app_acknowledged');
    assert.deepEqual(afterRestart.events.map(x => x.outcome), ['duplicate_suppressed']);
  } finally { t.close(); }
});

test('tampered ACK cannot confirm delivery or hide missing receiver', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver,
      outcomes: ['invalid_receipt']});
    t.adapters['lora-p2p'] = createScriptedLink({route: 'lora-p2p', receiver: t.receiver,
      outcomes: ['down']});
    const result = await fabric(t.adapters).deliver({id: 'drill4', receiver: 'haptic', drill: true});
    assert.equal(result.status, 'unconfirmed');
    assert.equal(result.confirmedRoute, null);
    assert.deepEqual(result.attempts.map(x => x.outcome),
      ['invalid_app_receipt', 'no_authenticated_receipt']);
    assert.equal(t.receiver.events.filter(x => x.outcome === 'synthetic_activation').length, 1,
      'lost ACK is not evidence of non-activation');
  } finally { t.close(); }
});

test('both links down yields explicit unconfirmed outcome', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver,
      outcomes: ['down']});
    t.adapters['lora-p2p'] = createScriptedLink({route: 'lora-p2p', receiver: t.receiver,
      outcomes: ['down']});
    const result = await fabric(t.adapters).deliver({id: 'drill5', receiver: 'haptic', drill: true});
    assert.equal(result.status, 'unconfirmed');
    assert.equal(t.receiver.events.length, 0);
  } finally { t.close(); }
});

test('transport exceptions are recorded without turning into acknowledgments', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver,
      outcomes: ['transport_error']});
    const result = await fabric(t.adapters).deliver({id: 'drill6', receiver: 'haptic', drill: true});
    assert.deepEqual(result.attempts.map(x => x.outcome),
      ['transport_error', 'authenticated_app_receipt']);
    assert.equal(result.confirmedRoute, 'lora-p2p');
  } finally { t.close(); }
});

test('a stale signed ACK from a previous attempt cannot verify', async () => {
  const t = setup();
  try {
    const stale = signReceipt(key, 'drillx', 'haptic', nonce2);
    const f = fabric({
      thread: {kind: 'simulation', async transmit() {return {receipt: stale};}},
      'lora-p2p': createScriptedLink({route: 'lora-p2p', receiver: t.receiver,
        outcomes: ['down']})
    });
    const report = await f.deliver({id: 'drillx', receiver: 'haptic', drill: true});
    assert.equal(report.status, 'unconfirmed');
    assert.equal(report.attempts[0].outcome, 'invalid_app_receipt');
    assert.equal(t.receiver.events.length, 0);
  } finally {t.close();}
});

test('reused challenge within one delivery attempt is rejected', async () => {
  const t = setup();
  try {
    t.adapters.thread = createScriptedLink({route: 'thread', receiver: t.receiver,
      outcomes: ['down']});
    const f = createSyntheticFabric({key, adapters: t.adapters,
      nonceFactory: () => nonce1});
    await assert.rejects(f.deliver({id: 'drilly', receiver: 'haptic', drill: true}),
      /fresh/);
    assert.equal(t.adapters['lora-p2p'].observations.length, 0);
  } finally {t.close();}
});

test('malformed and forged EA2 cannot trigger receiver or receipt', () => {
  const t = setup();
  try {
    const badWire = signAlert(key, 'drill7').replace('drill7', 'drill8');
    assert.equal(t.receiver.receive({wire: badWire, nonce: nonce1, route: 'thread'}), null);
    assert.deepEqual(t.receiver.events.map(x => x.outcome), ['rejected_auth']);
    assert.deepEqual(new ReplayJournal(t.path).seen.size, 0);
  } finally { t.close(); }
});

test('no real alerts or undefined radios: validation before first send', async () => {
  const t = setup();
  try {
    const f = fabric(t.adapters);
    await assert.rejects(f.deliver({id: 'x', receiver: 'haptic', drill: false}), /prohibited/);
    await assert.rejects(f.deliver({id: 'x', receiver: 'haptic', drill: true,
      routes: ['thread', 'thread']}), /invalid/);
    await assert.rejects(f.deliver({id: 'x', receiver: 'haptic', drill: true,
      routes: ['lorawan']}), /invalid/);
    assert.throws(() => createSyntheticFabric({key, adapters: {
      thread: {kind: 'hardware', transmit() {}}
    }}), /simulation/);
    assert.equal(t.receiver.events.length, 0);
  } finally { t.close(); }
});

test('reproducible drill CLI generates five explicit, verified simulation traces', () => {
  const run = spawnSync(process.execPath, ['experiments/multiradio/drill.mjs'],
    {encoding: 'utf8', timeout: 10000});
  assert.equal(run.status, 0, run.stderr);
  const evidence = JSON.parse(run.stdout);
  assert.equal(evidence.schema, '6lowstick.multiradio-research.v0');
  assert.equal(evidence.physicalRadio, false);
  assert.equal(evidence.spinel, false);
  assert.equal(evidence.loraWAN, false);
  assert.equal(evidence.scenarioCount, 5);
  assert.equal(evidence.scenarios[0].receipt.confirmedRoute, 'lora-p2p');
  assert.equal(evidence.scenarios[3].receipt.status, 'unconfirmed');
  assert.equal(evidence.scenarios[4].receipt.confirmedRoute, 'thread');
});
