import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSameHeader, matchesArea} from '../src/nwr/same.mjs';
const sample = 'ZCZC-WXR-TOR-024510-024003-+0030-2941830-KLWX-';
test('decode synthetic SAME header and area filter', () => {
  const h = parseSameHeader(sample);
  assert.deepEqual(h.areaCodes, ['024510', '024003']);
  assert.equal(h.event, 'TOR');
  assert.equal(h.durationMinutes, 30);
  assert.equal(matchesArea(h, ['024510']), true);
  assert.equal(matchesArea(h, ['036001']), false);
});
test('reject invalid or oversized headers', () => {
  for (const s of ['NNNN', sample.replace('+0030', '+0069'),
    sample.replace('2941830', '0001830'), sample.replace('2941830', '2942460'),
    sample.replace('024003', '024510'), 'X'.repeat(500)]) {
    assert.equal(parseSameHeader(s), null, s);
  }
});
