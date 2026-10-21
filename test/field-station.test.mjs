import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validateResearchFixture, stationSummary, eventsFor,
  labelFor, descriptionFor,
} from '../site/station-model.mjs';

const fixture = JSON.parse(readFileSync(new URL('../site/multiradio.json', import.meta.url)));
const clone = x => structuredClone(x);

test('Field Station validates committed software-only fixture and summary', () => {
  assert.equal(validateResearchFixture(fixture), fixture);
  const summary = stationSummary(fixture);
  assert.equal(summary.scenarios, 5);
  assert.equal(summary.scenarios, fixture.scenarioCount);
  assert.equal(summary.modeledRoutes, 2);
  assert.equal(summary.physicalRadioVerified, false);
  assert.equal(summary.humanReceiptVerified, false);
});

test('synthetic route/receiver event order stays accessible and bounded', () => {
  const events = eventsFor(fixture.scenarios[0]);
  assert.deepEqual(events.map(event => event.outcome),
    ['no_authenticated_receipt','authenticated_app_receipt','synthetic_activation']);
  assert.match(labelFor(events[1].outcome), /authenticated application receipt/i);
  assert.match(descriptionFor(events[1]), /No physical delivery/);
  assert.match(descriptionFor(events[2]), /No physical haptic actuator/);
  const failure = eventsFor(fixture.scenarios.find(s => s.scenario === 'both_links_unavailable'));
  assert.equal(failure.length, 2);
  assert.ok(failure.every(event => event.outcome === 'no_authenticated_receipt'));
  assert.match(descriptionFor(failure[0]), /unconfirmed/);
});

test('unsupported live RF/human receipt claims are rejected before rendering', () => {
  for (const field of ['physicalRadio','humanDelivery']) {
    const invalid = clone(fixture); invalid[field] = true;
    assert.throws(() => validateResearchFixture(invalid), /non-synthetic/i);
  }
  const invalid = clone(fixture);
  invalid.scenarios[0].receipt.physicalRadioVerified = true;
  assert.throws(() => validateResearchFixture(invalid), /Invalid synthetic scenario/);
  const human = clone(fixture);
  human.scenarios[0].receipt.humanAcknowledged = true;
  assert.throws(() => validateResearchFixture(human), /Invalid synthetic scenario/);
  const unexpected = clone(fixture);
  unexpected.scenarios[0].receipt.attempts[0].route = 'live-device';
  assert.throws(() => validateResearchFixture(unexpected), /Invalid attempt/);
  const bogusReceipt = clone(fixture);
  bogusReceipt.scenarios[0].receiverEvents[0].outcome = 'human_acknowledged';
  assert.throws(() => validateResearchFixture(bogusReceipt), /Invalid receiver journal/);
});

test('read-only Field Station static check includes complete source digests', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = JSON.parse(execFileSync(
    process.execPath, ['scripts/check-field-station.mjs'],
    { cwd: root, encoding: 'utf8', timeout: 10000 },
  ));
  assert.equal(result.result, 'PASS');
  assert.equal(result.scenarios, 5);
  assert.equal(result.physicalRadioVerified, false);
  assert.equal(result.humanReceiptVerified, false);
  assert.equal(Object.keys(result.assetDigestsSha256).length, 6);
  assert.ok(Object.values(result.assetDigestsSha256).every(d => /^[0-9a-f]{64}$/.test(d)));
});
