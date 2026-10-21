import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  validateResearchFixture, stationSummary, eventsFor,
  labelFor, descriptionFor,
} from '../site/station-model.mjs';

const fixture = JSON.parse(readFileSync(new URL('../site/multiradio.json', import.meta.url), 'utf8'));
const clone = x => structuredClone(x);

test('Field Station derives readouts from the committed synthetic fixture, not claims', () => {
  assert.equal(validateResearchFixture(fixture), fixture);
  assert.deepEqual(stationSummary(fixture), {
    scenarios: 5, modeledRoutes: 2,
    physicalRadioVerified: false, humanReceiptVerified: false,
  });
  const all = fixture.scenarios.map(eventsFor);
  assert.deepEqual(all.map(x => x.length), [3, 4, 4, 2, 2]);
  assert.equal(all[3].every(e => e.outcome === 'no_authenticated_receipt'), true);
});

test('Field Station blocks accidental physical or human claims', () => {
  for (const key of ['physicalRadio', 'humanDelivery']) {
    const altered = clone(fixture); altered[key] = true;
    assert.throws(() => validateResearchFixture(altered), /non-synthetic/);
  }
  const altered = clone(fixture); altered.scenarios[0].receipt.humanAcknowledged = true;
  assert.throws(() => validateResearchFixture(altered), /Invalid synthetic/);
});

test('Field Station validates only fixed, known scenario event families', () => {
  const altered = clone(fixture);
  altered.scenarios[0].receipt.attempts[0].route = 'live-rcp';
  assert.throws(() => validateResearchFixture(altered), /Invalid attempt/);
  altered.scenarios[0].receipt.attempts[0].route = 'thread';
  altered.scenarios[0].receiverEvents[0].outcome = 'confirmed_human_perception';
  assert.throws(() => validateResearchFixture(altered), /Invalid receiver/);
});

test('Field Station describes invalid ACKs and duplicate suppression accurately', () => {
  assert.equal(labelFor('invalid_app_receipt'), 'Invalid application receipt');
  assert.match(descriptionFor({ type:'attempt', outcome:'invalid_app_receipt' }), /rejected/);
  assert.match(descriptionFor({ type:'receiver', outcome:'duplicate_suppressed' }), /suppressed/);
});

test('Field Station remains an inspect-only static interface with functional text fallback', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../site/observatory.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../site/station.css', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([A-Za-z0-9-]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
  for (const id of [
    'network','timeline','scenario','prev','next','play','motion','rows',
    'raw','textReport','liveStatus','scenarioMetric','routeMetric',
    'eventType','eventTitle','eventDescription','haptic','visual','text','stepCount',
  ]) assert.ok(ids.includes(id), 'missing UI element '+id);
  assert.match(html, /href="#main"/);
  assert.match(html, /id="textReport"/);
  assert.match(html, /not for emergency dispatch/i);
  assert.match(html, /station\.css/);
  assert.match(script, /validateResearchFixture/);
  assert.match(script, /\.\.?\/multiradio\.json/);
  assert.match(css, /prefers-reduced-motion/);
});

test('Field Station source verifier inventories six assets with SHA-256 provenance', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = execFileSync(process.execPath, ['scripts/check-field-station.mjs'], {
    cwd: root, encoding: 'utf8', timeout: 10000,
  });
  const evidence = JSON.parse(output);
  assert.equal(evidence.result, 'PASS');
  assert.equal(evidence.readOnly, true);
  assert.equal(evidence.humanReceiptVerified, false);
  assert.equal(evidence.physicalRadioVerified, false);
  assert.equal(Object.keys(evidence.assetDigestsSha256).length, 6);
  assert.ok(Object.values(evidence.assetDigestsSha256).every(
    digest => /^[0-9a-f]{64}$/.test(digest)));
});
