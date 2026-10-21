import test from 'node:test';
import assert from 'node:assert/strict';
import {OnOffClient} from '@matter/main/behaviors/on-off';
import {createMatterOnOffController} from '../src/matter/controller.mjs';
import {sendVisualDrill} from '../src/matter/bridge.mjs';

test('real pinned SDK OnOffClient token flows through bridge and adapter', async () => {
  const calls = [];
  const peer = {start: async () => calls.push('start'), parts: new Map([[7, {
    commandsOf: behavior => {
      assert.equal(behavior, OnOffClient);
      return {on: async () => calls.push('on')};
    }
  }]])};
  const alert = {accepted:true,id:'0123456789abcdef01234567'};
  const result = await sendVisualDrill({alert, controller:createMatterOnOffController(peer,OnOffClient),endpointId:7,enabled:true});
  assert.equal(result.status,'command_completed');
  assert.deepEqual(calls,['start','on']);
});
