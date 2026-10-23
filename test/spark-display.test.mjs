// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {navigateSparkPage, projectSparkDisplay, SPARK_PAGES} from '../src/spark/display.mjs';

const nowMs = 100_000;
const make = () => ({
  batteryPercent: 42, reservePercent: 25, phoneChargeRequested: true,
  radio: 'lora',
  friends: [
    {alias: 'Casey', consented: true, expiresAtMs: nowMs + 1000},
    {alias: 'NoConsent', consented: false, expiresAtMs: nowMs + 1000},
    {alias: 'Expired', consented: true, expiresAtMs: nowMs}
  ],
  signals: [
    {code: 'here', authorized: true, expiresAtMs: nowMs + 500, application: 'ack'},
    {code: 'attention', authorized: false, expiresAtMs: nowMs + 500, application: 'pending'}
  ]
});

test('locked frames hide identities, codes and counts; output is explicitly modeled', () => {
  const snapshot = make();
  for (const page of SPARK_PAGES) {
    const frame = projectSparkDisplay(snapshot, {nowMs, page});
    assert.equal(frame.simulated, true);
    assert.equal(frame.version, '6lowspark.display.v0');
    assert.equal(JSON.stringify(frame).includes('Casey'), false);
    assert.equal(JSON.stringify(frame).includes('here'), false);
    assert.equal(JSON.stringify(frame).includes('NoConsent'), false);
    assert.equal(JSON.stringify(frame).includes('Expired'), false);
    assert.equal(frame.lines.every(s => s.length <= 16), true);
    assert.equal(frame.lines.length <= 8, true);
  }
  assert.match(projectSparkDisplay(snapshot, {nowMs}).lines.join('\n'), /SIMULATION ONLY/);
});

test('unlocked frames include only live consented friend aliases and authorized signals', () => {
  const snapshot = make();
  const people = projectSparkDisplay(snapshot, {nowMs, page: 'people', unlocked: true}).lines.join('\n');
  assert.match(people, /Casey/);
  assert.doesNotMatch(people, /NoConsent|Expired/);
  const signals = projectSparkDisplay(snapshot, {nowMs, page: 'signals', unlocked: true}).lines.join('\n');
  assert.match(signals, /here ack/);
  assert.doesNotMatch(signals, /attention/);
  assert.match(signals, /Human unknown/);
  assert.match(signals, /Output unknown/);
  assert.match(signals, /NO DISPATCH/);
});

test('reserve protection display is an advisory observation, never a charging command', () => {
  const snapshot = make();
  snapshot.batteryPercent = 20;
  const frame = projectSparkDisplay(snapshot, {nowMs, page: 'power'});
  assert.match(frame.lines.join('\n'), /State protect/);
  assert.match(frame.lines.join('\n'), /NO BMS CONTROL/);
  snapshot.batteryPercent = null;
  assert.match(projectSparkDisplay(snapshot, {nowMs, page: 'power'}).lines.join('\n'), /unknown/);
  assert.equal(Object.hasOwn(frame, 'command'), false);
});

test('aliases cannot inject control characters or arbitrary screen layout', () => {
  const snapshot = make();
  snapshot.friends[0].alias = 'Bob\nSEND\u001b[31m';
  const frame = projectSparkDisplay(snapshot, {nowMs, page: 'people', unlocked: true});
  assert.doesNotMatch(frame.lines.join('\n'), /\u001b|\nSEND|\[31m/);
  assert.equal(frame.lines.every(s => !/[\r\n\t\u001b]/.test(s)), true);
});

test('expired observations disappear without relying on device clocks or radio', () => {
  const snapshot = make();
  const people = projectSparkDisplay(snapshot, {nowMs: nowMs + 1001, page: 'people', unlocked: true});
  assert.match(people.lines.join('\n'), /None confirmed/);
  const signals = projectSparkDisplay(snapshot, {nowMs: nowMs + 1001, page: 'signals', unlocked: true});
  assert.match(signals.lines.join('\n'), /Pending 0/);
});

test('navigation is bounded to four pages and never creates a transmit intent', () => {
  assert.equal(navigateSparkPage('home', 'next'), 'people');
  assert.equal(navigateSparkPage('home', 'back'), 'power');
  assert.equal(navigateSparkPage('power', 'next'), 'home');
  assert.throws(() => navigateSparkPage('home', 'signal'), /invalid/);
  assert.throws(() => navigateSparkPage('unlisted', 'next'), /invalid/);
});

test('malformed and unbounded inputs fail closed', () => {
  const s = make();
  assert.throws(() => projectSparkDisplay({...s, batteryPercent: 101}, {nowMs}), /snapshot/);
  assert.throws(() => projectSparkDisplay({...s, radio: 'connected'}, {nowMs}), /snapshot/);
  assert.throws(() => projectSparkDisplay({...s, friends: Array(33).fill(s.friends[0])}, {nowMs}), /snapshot/);
  assert.throws(() => projectSparkDisplay({...s, signals: [{code: 'EMERGENCY', authorized: true, expiresAtMs: 110000, application: 'ack'}]}, {nowMs}), /signal/);
  assert.throws(() => projectSparkDisplay(s, {nowMs: -1}), /options/);
  assert.throws(() => projectSparkDisplay(s, {nowMs, page: 'admin'}), /options/);
});
