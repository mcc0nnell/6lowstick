import test from 'node:test';
import assert from 'node:assert/strict';
import {signAlert, verifyAlert} from './auth.mjs';
const key = Buffer.alloc(32, 0x5a);
test('valid synthetic alert is authenticated', () => {
  assert.deepEqual(verifyAlert(key, signAlert(key, 'drill001')), {id: 'drill001', action: 'NOTIFY'});
});
test('forged, altered and malformed alerts fail closed', () => {
  const good = signAlert(key, 'drill001');
  for (const wire of [good.replace('drill001', 'drill002'), good.replace('NOTIFY', 'OTHER'),
    good.slice(0, -1) + (good.endsWith('0') ? '1' : '0'), 'EA1|drill001|NOTIFY',
    'EA2|drill001|NOTIFY|not-a-mac', good + '|extra', 'x'.repeat(200)]) {
    assert.equal(verifyAlert(key, wire), null);
  }
  assert.equal(verifyAlert(Buffer.alloc(32, 0x33), good), null);
});
