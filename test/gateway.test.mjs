import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSame} from '../src/nwr/gateway.mjs';
import {verifyAlert} from '../experiments/thread-alert/auth.mjs';
const key = Buffer.alloc(32, 7);
const input = 'ZCZC-WXR-TOR-024510-+0030-2941830-KLWX-';
const args = {areas: ['024510'], key, year: 2026, now: new Date('2026-10-21T18:45:00Z')};
test('offline policy produces gateway-authenticated local synthetic alert', () => {
  const result = evaluateSame(input, args);
  assert.equal(result.accepted, true);
  assert.equal(result.event, 'TOR');
  assert.deepEqual(verifyAlert(key, result.wire), {id: result.id, action: 'EVACUATE'});
  assert.equal(evaluateSame(input, args).id, result.id);
});
test('out-of-area, unsupported, expired, future and invalid input fail closed', () => {
  const cases = [
    [input, {...args, areas: ['036001']}, 'out_of_area'],
    [input.replace('-TOR-', '-RWT-'), args, 'unsupported_event'],
    [input, {...args, now: new Date('2026-10-21T19:01:00Z')}, 'outside_validity'],
    [input, {...args, now: new Date('2026-10-21T18:20:00Z')}, 'outside_validity'],
    ['invalid', args, 'invalid_header']
  ];
  for (const [header, opts, reason] of cases) {
    assert.deepEqual(evaluateSame(header, opts), {accepted: false, reason});
  }
});
