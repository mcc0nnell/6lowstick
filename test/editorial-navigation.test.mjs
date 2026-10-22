// The public research path should not regress into an unstructured catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');

test('README explains purpose before commands or research catalog', () => {
  const source = read('README.md');
  const sections = [
    '## Why 6lowStick',
    '## How it works',
    '## Try the lab',
    '## What we can show',
    '## Architecture and trust boundaries',
    '## Research guide',
    '## Meet Rizzer',
  ];
  let previous = -1;
  for (const heading of sections) {
    const at = source.indexOf(heading);
    assert.ok(at > previous, 'missing or out-of-order heading ' + heading);
    previous = at;
  }
  assert.match(source, /not an emergency warning system/i);
  assert.match(source, /untagged source-only release candidate/i);
  assert.match(source, /human understanding/i);
  assert.match(source, /not demonstrated/i);
  assert.ok(source.indexOf('## Why 6lowStick') < source.indexOf('npm ci'));
});

test('Field Station moves from the question to experiments to evidence', () => {
  const html = read('site/index.html');
  const anchors = ['id="station"', 'id="why"', 'id="experiments"', 'id="evidence"', 'id="method"'];
  let last = -1;
  for (const anchor of anchors) {
    const at = html.indexOf(anchor);
    assert.ok(at > last, 'missing or out-of-order page anchor '+anchor);
    last = at;
  }
  assert.match(html, /href="#why"/);
  assert.match(html, /A receipt is not a warning/);
  assert.match(html, /That requires independent actuation measurements and human testing/);
  assert.match(html, /id="textReport"/);
  assert.match(html, /No physical radio or human receipt verified/);
  assert.match(html, /github\.com\/mcc0nnell\/6lowstick\/blob\/main\/docs\/README\.md/);
});

test('local links in introductory README and guide resolve to actual files', () => {
  for (const filename of ['README.md', 'docs/README.md']) {
    const content = read(filename);
    const links = Array.from(content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g), m => m[1]);
    assert.ok(links.length > 8, 'expected a navigable research guide: '+filename);
    for (const link of links) {
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      const pathname = decodeURIComponent(link.split('#')[0]);
      assert.ok(existsSync(resolve(root, dirname(filename), pathname)),
        'broken local link in '+filename+': '+link);
    }
  }
});
