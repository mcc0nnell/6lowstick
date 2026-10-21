import test from 'node:test';
import assert from 'node:assert/strict';
import {sendVisualDrill} from '../src/matter/bridge.mjs';
const alert = {accepted: true, id: '0123456789abcdef01234567'};
test('Matter adapter defaults off and refuses unvalidated alerts', async () => {
  let calls = 0;
  const controller = {on: async () => {calls++;}};
  assert.equal((await sendVisualDrill({alert, controller})).status, 'disabled');
  assert.equal((await sendVisualDrill({alert: {accepted: false}, controller, enabled: true})).status, 'rejected');
  assert.equal(calls, 0);
});
test('mock commissioned controller receives one On command, not proof of light', async () => {
  const endpoints = [];
  const result = await sendVisualDrill({alert, enabled: true, controller: {on: async id => endpoints.push(id)}});
  assert.deepEqual(endpoints, [1]);
  assert.equal(result.status, 'command_completed');
  assert.match(result.warning, /does not prove illumination/);
});
test('unavailable and failed Matter controller are reported without claiming delivery', async () => {
  assert.equal((await sendVisualDrill({alert, enabled: true})).status, 'unavailable');
  const result = await sendVisualDrill({alert, enabled: true, controller: {on: async () => {throw Error('offline');}}});
  assert.equal(result.status, 'command_failed');
});
