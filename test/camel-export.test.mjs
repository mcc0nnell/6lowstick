// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeObservations, writeSpool} from '../src/camel/export.mjs';
const fixture = new URL('../fixtures/tui/illustrative-drill.json', import.meta.url);
const raw = readFileSync(fixture, 'utf8');
const digest = createHash('sha256').update(raw).digest('hex');
const input = JSON.parse(raw);
const exporter = fileURLToPath(new URL('../src/camel/export.mjs', import.meta.url));

test('Camel bridge exposes allowlisted observation fields only', () => {
  const events = makeObservations(input, digest);
  assert.ok(events.length >= 12);
  assert.ok(events.some(x => x.observation === 'missing' && x.receiver === 'haptic'));
  assert.ok(events.some(x => x.observation === 'reject'));
  assert.ok(events.some(x => x.observation === 'duplicate'));
  const allowed = ['schema','source','evidence_sha256','sequence','phase','observation',
    'receiver','meaning','ack_latency_ms','measured_packet_timestamp',
    'physical_actuation_verified','human_receipt_verified'];
  for (const ev of events) {
    assert.deepEqual(Object.keys(ev), allowed);
    assert.equal(ev.evidence_sha256, digest);
    assert.equal(ev.measured_packet_timestamp, null);
    assert.equal(ev.human_receipt_verified, false);
    assert.equal(ev.physical_actuation_verified, false);
  }
  const all = JSON.stringify(events);
  assert.doesNotMatch(all, /drill001|forged002|ZCZC-|EA2\|/);
});

test('Camel exporter preserves absence of latency and never invents RF timestamps', () => {
  const events = makeObservations(input, digest);
  assert.ok(events.some(x => x.observation === 'missing' && x.ack_latency_ms === null));
  assert.ok(events.every(x => x.measured_packet_timestamp === null));
  assert.throws(() => makeObservations(input, 'invalid'), /fingerprint/);
  assert.throws(() => makeObservations({schema:'nope'}, digest), /Expected/);
});

test('spool exports atomic, stable files and a second export is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), '6low-camel-test-'));
  try {
    const records = makeObservations(input, digest);
    assert.deepEqual(writeSpool(records, root).written, records.length);
    const files = readdirSync(root);
    assert.equal(files.length, records.length);
    assert.ok(files.every(name => name.endsWith('.json')));
    assert.deepEqual(writeSpool(records, root), {
      directory:root, total:records.length, written:0, existing:records.length
    });
    const parsed = JSON.parse(readFileSync(join(root, files[0]), 'utf8'));
    assert.equal(parsed.schema, '6lowstick.camel-observation.v1');
    const cliDir = join(root, 'cli');
    const report = JSON.parse(execFileSync(process.execPath, [exporter, '--demo', '--out', cliDir],
      {encoding:'utf8'}));
    assert.equal(report.source, 'illustrative-fixture');
    assert.equal(report.written, records.length);
    assert.equal(JSON.parse(execFileSync(process.execPath,
      [exporter, '--demo', '--out', cliDir], {encoding:'utf8'})).written, 0);
  } finally { rmSync(root, {recursive:true, force:true}); }
});

test('Camel DSL is explicitly file-only, noop, and log-only', () => {
  const yaml = readFileSync(new URL('../integrations/camel/mesh-observe.camel.yaml', import.meta.url), 'utf8');
  assert.match(yaml, /noop:\s*true/);
  assert.match(yaml, /idempotent:\s*true/);
  assert.match(yaml, /autoCreate:\s*false/);
  assert.match(yaml, /uri:\s*["']?file:/);
  assert.match(yaml, /uri:\s*["']?log:/);
  assert.equal((yaml.match(/^\s+uri:/gm) || []).length, 2);
  assert.doesNotMatch(yaml, /http:|https:|udp:|mqtt:|kafka:|exec:|shell:/);
});
