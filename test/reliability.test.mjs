// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTrial, summarizeTrials} from '../src/reliability/analyze.mjs';

const receipt = (acknowledged, missing, requested) =>
  ({acknowledged, missing, requested, send_errors: []});
const good = () => ({
  schema: 'tronix.thread-alert-lab.v1',
  transport: 'OpenThread POSIX simulation',
  baseline: receipt(['strobe','display','haptic'], [], ['strobe','display','haptic']),
  rejected: receipt([], ['strobe'], ['strobe']),
  replay: receipt(['strobe'], [], ['strobe']),
  sameGateway: {delivery: receipt(['strobe','display','haptic'], [], ['strobe','display','haptic'])},
  degraded: receipt(['strobe','display'], ['haptic'], ['strobe','display','haptic']),
  timing: {events: [{kind: 'phase_start'}]},
  events: [{node:'strobe',event:'rejected_auth'}, {node:'strobe',event:'duplicate_suppressed'}],
  activations: {strobe:['a','b','c'],display:['a','b','c'],haptic:['a','b']},
  errors: []
});

test('complete observed simulator trial is labeled simulation only', () => {
  const trial = analyzeTrial({status: 0, stdout: JSON.stringify(good()), elapsedMs: 12.5});
  assert.equal(trial.outcome, 'completed_as_expected');
  assert.equal(trial.elapsed_ms, 13);
  const summary = summarizeTrials([trial], {source_commit:'fixture'});
  assert.equal(summary.completed_as_expected, 1);
  assert.equal(summary.physical_radio_verified, false);
  assert.equal(summary.human_receipt_verified, false);
});

test('unexpected healthy ACK gap never passes', () => {
  const evidence = good();
  evidence.baseline = receipt(['strobe','display'], ['haptic'], ['strobe','display','haptic']);
  const trial = analyzeTrial({status: 0, stdout: JSON.stringify(evidence)});
  assert.equal(trial.outcome, 'failed');
  assert.deepEqual(trial.baseline_missing, ['haptic']);
  assert.ok(trial.failure_reasons.includes('baseline_receipt_invariant'));
});

test('hiding a failed phase, missing telemetry, or reporting harness errors never passes', () => {
  for (const mutation of [
    e => {delete e.degraded;},
    e => {e.timing.events = [];},
    e => {e.errors.push({error:'unexpected'});},
    e => {e.events = [];},
    e => {e.activations.strobe = ['a','b','c','c'];}
  ]) {
    const e = good();
    mutation(e);
    assert.equal(analyzeTrial({status:0,stdout:JSON.stringify(e)}).outcome, 'failed');
  }
});

test('nonzero, malformed, timed-out, and missing-output runs remain failures', () => {
  for (const fields of [
    {status: 1, stdout: JSON.stringify(good())},
    {status: 0, stdout: '{bad'},
    {status: null, signal: 'SIGTERM', error: {code:'ETIMEDOUT'}, stdout:''},
    {status: 1, stdout:''}
  ]) {
    assert.equal(analyzeTrial(fields).outcome, 'failed');
  }
});

test('failure diagnostic exposes only phase and missing receivers', () => {
  const trial = analyzeTrial({status:1,stdout:'',stderr:
    'THREAD_ALERT_LAB_DIAGNOSTIC: {"schema":"6lowstick.lab-failure.v1","phase":"baseline","missing":["haptic"]}\n'});
  assert.equal(trial.failed_phase, 'baseline');
  assert.deepEqual(trial.last_delivery_missing, ['haptic']);
  assert.equal(trial.outcome,'failed');
});
