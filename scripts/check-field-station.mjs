// SPDX-License-Identifier: Apache-2.0
// Read-only candidate gate; executable through WindAnvil Blade / TalkPipe.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { stationSummary, validateResearchFixture } from '../site/station-model.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(resolve(root, file));
const html = read('site/index.html').toString('utf8');
const css = read('site/station.css').toString('utf8');
const js = read('site/observatory.js').toString('utf8');
const fixture = validateResearchFixture(JSON.parse(read('site/multiradio.json').toString('utf8')));
const summary = stationSummary(fixture);

const ids = [
  'main','station','experiments','evidence','method',
  'scenario','scenarioMetric','routeMetric','network','timeline',
  'prev','next','play','motion','stepCount','liveStatus',
  'eventType','eventTitle','eventDescription','raw','textReport',
  'visual','text','haptic','rows',
];
for (const id of ids) {
  assert.match(html, new RegExp('\\bid="' + id + '"'),
    'Required Field Station element missing: ' + id);
}
for (const semantic of [
  'Not for emergency dispatch','Synthetic','No physical radio',
  'Read the status correctly','Accessible evidence report',
]) {
  assert.ok(html.toLowerCase().includes(semantic.toLowerCase()),
    'Missing safety/evidence wording: ' + semantic);
}
assert.match(html, /<html lang="en">/);
assert.match(html, /href="#main"/);
assert.match(html, /href="\.\/station\.css"/);
assert.match(html, /src="\.\/observatory\.js"/);
assert.match(html, /src="\.\/assets\/rizzer-transparent\.webp"/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media\(max-width:440px\)/);
assert.match(js, /\.\/station-model\.mjs/);
assert.match(js, /\.\/multiradio\.json/);
assert.doesNotMatch(js, /\b(?:WebSocket|sendBeacon|localStorage)\b/);
assert.equal(summary.physicalRadioVerified, false);
assert.equal(summary.humanReceiptVerified, false);
assert.equal(summary.scenarios, fixture.scenarioCount);
assert.ok(summary.modeledRoutes > 0);
const files = ['site/index.html','site/station.css','site/observatory.js',
  'site/station-model.mjs','site/multiradio.json','site/assets/rizzer-transparent.webp'];
const hashes = Object.fromEntries(files.map(file => [
  file, createHash('sha256').update(read(file)).digest('hex'),
]));
console.log(JSON.stringify({
  schema: '6lowstick.field-station-check.v1',
  result: 'PASS',
  readOnly: true,
  physicalRadioVerified: false,
  humanReceiptVerified: false,
  scenarios: summary.scenarios,
  modeledRoutes: summary.modeledRoutes,
  assetDigestsSha256: hashes,
}));
