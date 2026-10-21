import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSameHeaders} from '../src/nwr/repetition.mjs';
const a = 'ZCZC-WXR-TOR-024510-+0030-2941830-KLWX-';
const b = 'ZCZC-WXR-SVR-024510-+0030-2941830-KLWX-';
test('two agreeing decoded synthetic SAME headers permit processing', () => {
  assert.deepEqual(reconcileSameHeaders([a,a,b]), {accepted:true,header:a,count:2});
});
test('single, conflicting, malformed and oversized batches fail closed', () => {
  for (const headers of [[a],[a,b],[a,'garbage'],[a,a,a,a]])
    assert.equal(reconcileSameHeaders(headers).accepted,false);
});
