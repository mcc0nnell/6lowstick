import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatterOnOffController} from '../src/matter/controller.mjs';
test('controller adapter issues OnOff.On to specified endpoint', async () => {
  const calls = [];
  const behavior = Symbol('OnOffClient');
  const peer = {start: async () => calls.push('start'), parts: new Map([[2, {
    commandsOf: type => {assert.equal(type, behavior); return {on: async () => calls.push('on')};}
  }]])};
  await createMatterOnOffController(peer, behavior).on(2);
  assert.deepEqual(calls, ['start', 'on']);
});
test('missing endpoint fails without a command', async () => {
  const peer = {start: async () => {}, parts: new Map()};
  await assert.rejects(createMatterOnOffController(peer, {}).on(1), /unavailable/);
});
