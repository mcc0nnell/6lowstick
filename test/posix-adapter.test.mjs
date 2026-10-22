// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {signAlert} from '../experiments/thread-alert/auth.mjs';
import {signReceipt} from '../src/fabric/receipts.mjs';
import {createPosixThreadAdapter, dispatchFabricUdp, isFabricUdpPayload} from
  '../experiments/multiradio/posix-adapter.mjs';

const key = Buffer.alloc(32, 8);
const wire = signAlert(key, 'radio001');
const nonce = '0123456789abcdef01234567';

test('recognized OT CLI payloads require complete bounded F1 or R2 frames', () => {
  assert.equal(isFabricUdpPayload('F1|' + nonce + '|' + wire), true);
  assert.equal(isFabricUdpPayload(signReceipt(key, 'radio001', 'haptic', nonce)), true);
  assert.equal(isFabricUdpPayload('F1|' + nonce + '|bad'), false);
  assert.equal(isFabricUdpPayload('R2|x|haptic|bad|tag'), false);
  assert.equal(isFabricUdpPayload('F1|' + 'a'.repeat(4000)), false);
});

test('UDP adapter awaits the matching fresh challenge, not ot-cli Done', async () => {
  const gateway = {received: [], async command(text) {
    assert.match(text, /udp send fd12::1 61616 F1\|/);
    gateway.received.push({body: signReceipt(key, 'radio001', 'haptic',
      '111111111111111111111111'), time: performance.now()});
    gateway.received.push({body: signReceipt(key, 'radio001', 'haptic', nonce),
      time: performance.now()});
  }};
  const adapter = createPosixThreadAdapter({gateway, target: {address: 'fd12::1'},
    alertPort: 61616, waitMs: 30});
  assert.equal(adapter.kind, 'simulation');
  const result = await adapter.transmit({wire, id: 'radio001', receiver: 'haptic', nonce});
  assert.equal(result.receipt, signReceipt(key, 'radio001', 'haptic', nonce));
});

test('a CLI send without app receipt remains unconfirmed', async () => {
  const adapter = createPosixThreadAdapter({
    gateway: {received: [], async command() {return ['Done'];}},
    target: {address: 'fd12::1'}, alertPort: 61616, waitMs: 15
  });
  const result = await adapter.transmit({wire, id: 'radio001', receiver: 'haptic', nonce});
  assert.equal(result.receipt, null);
});

test('receiver suppresses signed receipt on fault injection but still handles message', async () => {
  const sent = [];
  const received = [];
  const receiver = {receive({wire, nonce, route}) {
    received.push({wire, nonce, route});
    return signReceipt(key, 'radio001', 'haptic', nonce);
  }};
  const node = {async command(text) {sent.push(text);}};
  const original = 'F1|' + nonce + '|' + wire;
  assert.equal(await dispatchFabricUdp({body: original, node, gatewayAddress: 'fd12::2',
    ackPort: 61617, receiver, suppressReceiptFor: new Set(['radio001'])}), true);
  assert.equal(received.length, 1);
  assert.equal(sent.length, 0);
  assert.equal(await dispatchFabricUdp({body: 'F1|bad', node, gatewayAddress: 'fd12::2',
    ackPort: 61617, receiver}), true);
  assert.equal(received.length, 1);
  assert.equal(await dispatchFabricUdp({body: original, node, gatewayAddress: 'fd12::2',
    ackPort: 61617, receiver}), true);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /R2\|radio001\|haptic\|/);
  assert.equal(await dispatchFabricUdp({body: wire, node, gatewayAddress: 'fd12::2',
    ackPort: 61617, receiver}), false);
});
