// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createSdrObserver, NWR_FREQUENCIES_HZ} from '../src/nwr/sdr-observer.mjs';

const header = 'ZCZC-WXR-RWT-024510-+0030-2941830-KLWX/NWS-';
const line = 'EAS: ' + header;
const config = {frequencyHz: 162550000, areaCodes: ['024510'], clock: () => new Date('2026-10-20T22:00:00Z')};

test('passive observation retains provenance and cannot authorize delivery', () => {
  const observer = createSdrObserver(config);
  const event = observer.consume(line);
  assert.equal(event.schema, '6lowstick.sdr-observation.v0');
  assert.equal(event.event, 'RWT');
  assert.equal(event.areaMatch, 'matched');
  assert.equal(event.frequencyHz, config.frequencyHz);
  assert.equal(event.broadcastAuthenticated, false);
  assert.equal(event.deliveryEligible, false);
  assert.equal(event.repeatAgreementIndependentlyVerified, false);
  assert.equal(event.drill, false);
  assert.equal('wire' in event, false);
  assert.match(event.id, /^[0-9a-f]{24}$/);
});
test('malformed lines, EOM, non-EAS diagnostics, and partial decodes are ignored', () => {
  const observer = createSdrObserver(config);
  for (const value of ['EAS: NNNN', 'Enabled demodulators: EAS', 'EAS: ZCZC-',
    line.slice(0, -3), 'X'.repeat(4096), '', null]) {
    assert.equal(observer.consume(value), null, String(value).slice(0, 30));
  }
  assert.ok(observer.consume(line));
});
test('only configured area is marked matched; no area defaults to unknown', () => {
  assert.equal(createSdrObserver({...config, areaCodes: ['036001']}).consume(line).areaMatch, 'not_matched');
  assert.equal(createSdrObserver({...config, areaCodes: []}).consume(line).areaMatch, 'not_configured');
});
test('duplicate research observations suppressed in bounded time window', () => {
  let time = 0;
  const observer = createSdrObserver({...config, suppressionMs: 5000, clock: () => new Date(time)});
  assert.ok(observer.consume(line));
  time = 4999;
  assert.equal(observer.consume(line), null);
  time = 5000;
  assert.ok(observer.consume(line));
});
test('invalid frequencies, areas, and clocks fail closed', () => {
  assert.equal(NWR_FREQUENCIES_HZ.length, 7);
  assert.throws(() => createSdrObserver({frequencyHz: 433920000}), /frequency/);
  assert.throws(() => createSdrObserver({...config, areaCodes: ['12*345']}), /areaCodes/);
  assert.throws(() => createSdrObserver({...config, clock: () => new Date(NaN)}).consume(line), /clock/);
});
test('CLI consumes synthetic decoder text and emits observation-only NDJSON', () => {
  const result = spawnSync(process.execPath,
    ['scripts/observe-nwr.mjs', '--frequency-hz', '162550000', '--area', '024510'],
    {input: [line, line, 'EAS: NNNN', line.slice(0, 10), 'garbage'].join('\n') + '\n', encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const emitted = result.stdout.trim().split('\n');
  assert.equal(emitted.length, 1);
  const record = JSON.parse(emitted[0]);
  assert.equal(record.areaMatch, 'matched');
  assert.equal(record.deliveryEligible, false);
});
test('CLI rejects unsafe frequency and oversized decoder lines', () => {
  const bad = spawnSync(process.execPath, ['scripts/observe-nwr.mjs', '--frequency-hz', '915000000'],
    {encoding: 'utf8', input: line});
  assert.equal(bad.status, 2);
  const good = spawnSync(process.execPath, ['scripts/observe-nwr.mjs', '--frequency-hz', '162550000'],
    {encoding: 'utf8', input: 'EAS: ' + 'Z'.repeat(250000) + '\n' + line + '\n'});
  assert.equal(good.status, 0, good.stderr);
  assert.equal(good.stdout.trim().split('\n').length, 1);
  assert.match(good.stderr, /Dropped 1 oversized/);
});

test('hardware shell pipeline can be exercised with mock decoder executables', async () => {
  const {mkdtempSync, writeFileSync, chmodSync, rmSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const directory = mkdtempSync(join(tmpdir(), '6lowstick-sdr-'));
  try {
    const rtl = join(directory, 'rtl_fm');
    const decoder = join(directory, 'multimon-ng');
    writeFileSync(rtl, '#!/bin/sh\nprintf "synthetic PCM"\n');
    writeFileSync(decoder, '#!/bin/sh\ncat >/dev/null\nprintf "%s\\n" "' + line + '"\n');
    chmodSync(rtl, 0o755);
    chmodSync(decoder, 0o755);
    const result = spawnSync('bash',
      ['scripts/observe-nwr-sdr.sh', '--area', '024510'],
      {encoding: 'utf8', env: {...process.env, NWR_FREQ_HZ: '162550000',
        PATH: directory + ':' + process.env.PATH}});
    assert.equal(result.status, 0, result.stderr);
    const record = JSON.parse(result.stdout.trim());
    assert.equal(record.areaMatch, 'matched');
    assert.equal(record.deliveryEligible, false);
    const refused = spawnSync('bash', ['scripts/observe-nwr-sdr.sh'],
      {encoding: 'utf8', env: {...process.env, NWR_FREQ_HZ: '915000000',
        PATH: directory + ':' + process.env.PATH}});
    assert.equal(refused.status, 2);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
