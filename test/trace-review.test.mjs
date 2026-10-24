import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reviewFixture, claimsTemplate, checkClaims} from '../src/reliability/trace-review.mjs';

const fixture = JSON.parse(readFileSync(new URL('../site/multiradio.json', import.meta.url)));
const review = reviewFixture(fixture);
const byId = id => review.scenarios.find(s => s.scenario_id === id);
const clone = x => structuredClone(x);

test('review identifies supported application observations and preserves unknown physical/human stages', () => {
  assert.equal(review.simulation_only, true);
  assert.equal(review.scenarios.length, 5);
  assert.equal(byId('thread_healthy').application_state, 'authenticated_application_receipt');
  assert.equal(byId('thread_healthy').confirmed_route, 'thread');
  assert.equal(byId('both_links_unavailable').application_state, 'unconfirmed');
  assert.equal(byId('both_links_unavailable').receiver_journal_state, 'none_recorded');
  assert.equal(byId('lost_thread_ack_lora_duplicate').duplicate_suppressions, 1);
  assert.equal(byId('lost_thread_ack_lora_duplicate').synthetic_activations, 1);
  assert.equal(byId('invalid_thread_receipt_lora_receipt').invalid_application_receipts, 1);
  for (const s of review.scenarios) {
    assert.deepEqual(s.unknowns, {physical_output: 'unknown',
      human_detection: 'unknown', human_comprehension: 'unknown'});
    assert.equal(s.evidence_kind, 'scripted_software_simulation');
    assert.ok(s.evidence_references.length > 0);
    assert.ok(s.proposed_next_test.length > 20);
  }
});

test('multiple synthetic activations for one delivery are rejected despite a valid receipt', () => {
  for (const corruption of ['replace_suppression', 'repeat_activation']) {
    const bad = clone(fixture);
    const scenario = bad.scenarios.find(s => s.scenario === 'lost_thread_ack_lora_duplicate');
    const originalReceipt = clone(scenario.receipt);
    const activation = scenario.receiverEvents.find(e => e.outcome === 'synthetic_activation');
    const duplicate = scenario.receiverEvents.find(e => e.outcome === 'duplicate_suppressed');
    assert.ok(activation);
    assert.ok(duplicate);
    assert.equal(activation.id, duplicate.id);
    assert.notEqual(activation.route, duplicate.route);
    if (corruption === 'replace_suppression') {
      duplicate.outcome = 'synthetic_activation';
    } else {
      scenario.receiverEvents.push(clone(activation));
    }
    assert.deepEqual(scenario.receipt, originalReceipt);
    assert.equal(scenario.receipt.status, 'app_acknowledged');
    assert.equal(scenario.receipt.attempts.at(-1).outcome, 'authenticated_app_receipt');
    assert.equal(scenario.receipt.confirmedRoute, scenario.receipt.attempts.at(-1).route);
    assert.throws(() => reviewFixture(bad),
      /Inconsistent synthetic receiver journal: multiple synthetic activations for the same delivery id/,
      corruption);
  }
});

test('legitimate lost-ACK retry preserves suppression evidence and unknown physical outcomes', () => {
  const input = clone(fixture);
  const before = clone(input);
  const result = reviewFixture(input);
  const index = input.scenarios.findIndex(s => s.scenario === 'lost_thread_ack_lora_duplicate');
  const source = input.scenarios[index];
  const scenario = result.scenarios[index];
  assert.equal(scenario.synthetic_activations, 1);
  assert.equal(scenario.duplicate_suppressions, 1);
  assert.equal(scenario.receiver_journal_state, 'synthetic_activation_recorded');
  assert.equal(scenario.application_state, 'authenticated_application_receipt');
  assert.equal(scenario.confirmed_route, 'lora-p2p');
  assert.deepEqual(scenario.evidence_references, [
    ...source.receipt.attempts.map((_, i) => `scenarios[${index}].receipt.attempts[${i}]`),
    ...source.receiverEvents.map((_, i) => `scenarios[${index}].receiverEvents[${i}]`),
  ]);
  assert.deepEqual(scenario.unknowns, {physical_output: 'unknown',
    human_detection: 'unknown', human_comprehension: 'unknown'});
  assert.equal(result.simulation_only, true);
  assert.equal(result.physical_radio_verified, false);
  assert.equal(result.human_receipt_verified, false);
  assert.equal(checkClaims(result, claimsTemplate(result)).result, 'PASS');
  assert.deepEqual(input, before);
});

test('typed template passes but invented outcomes, receipt, and references fail independently', () => {
  const good = claimsTemplate(review);
  assert.deepEqual(checkClaims(review, good), {schema: '6lowstick.trace-claim-check.v1',
    result: 'PASS', failures: []});
  for (const [field, value, reason] of [
    ['physical_output', 'verified', 'unverified_physical_output'],
    ['human_detection', 'confirmed', 'unverified_human_detection'],
    ['human_comprehension', 'yes', 'unverified_human_comprehension'],
    ['application_state', 'authenticated_application_receipt', 'unsupported_application_state'],
    ['receiver_journal_state', 'synthetic_activation_recorded', 'unsupported_receiver_journal_state'],
  ]) {
    const altered = clone(good);
    const caseIndex = field === 'application_state' || field === 'receiver_journal_state'
      ? altered.scenarios.findIndex(s => s.scenario_id === 'both_links_unavailable') : 0;
    altered.scenarios[caseIndex][field] = value;
    assert.match(checkClaims(review, altered).failures.join(','), new RegExp(reason));
  }
  const wrongRef = clone(good);
  wrongRef.scenarios[0].evidence_references[0] = 'scenarios[4].receipt.attempts[0]';
  assert.match(checkClaims(review, wrongRef).failures.join(','), /ungrounded_or_incomplete_references/);
});

test('injected prose, duplicates, missing cases, and internally inconsistent fixture are rejected', () => {
  const extra = claimsTemplate(review);
  extra.scenarios[0].narrative = 'All recipients were notified';
  assert.match(checkClaims(review, extra).failures.join(','), /invalid_claim_shape/);
  const duplicate = claimsTemplate(review);
  duplicate.scenarios[1].scenario_id = duplicate.scenarios[0].scenario_id;
  assert.match(checkClaims(review, duplicate).failures.join(','), /duplicate_scenario/);
  const missing = claimsTemplate(review);
  missing.scenarios.pop();
  assert.match(checkClaims(review, missing).failures.join(','), /missing_scenario/);
  const bad = clone(fixture);
  bad.scenarios[4].receipt.status = 'unconfirmed';
  assert.throws(() => reviewFixture(bad), /Inconsistent application receipt/);
  const badSteps = clone(fixture);
  badSteps.scenarios[0].receipt.attempts[1].step = 1;
  assert.throws(() => reviewFixture(badSteps), /Non-sequential/);
  const badCount = clone(fixture);
  badCount.scenarioCount = 1;
  assert.throws(() => reviewFixture(badCount), /Inconsistent scenario count/);
  const wrongId = clone(fixture);
  wrongId.scenarios[0].receiverEvents[0].id = 'drill999';
  assert.throws(() => reviewFixture(wrongId), /Inconsistent synthetic receiver/);
  const duplicateScenario = clone(fixture);
  duplicateScenario.scenarios[1].scenario = duplicateScenario.scenarios[0].scenario;
  assert.throws(() => reviewFixture(duplicateScenario), /Duplicate scenario/);
  const wrongRoute = clone(fixture);
  wrongRoute.scenarios[4].receiverEvents[0].route = 'lora-p2p';
  assert.throws(() => reviewFixture(wrongRoute), /Inconsistent synthetic receiver/);
  const notADrill = clone(fixture);
  notADrill.scenarios[0].receipt.drill = false;
  assert.throws(() => reviewFixture(notADrill), /Inconsistent synthetic receiver/);
});

test('offline CLI emits a digest and returns nonzero on hallucinated typed claims', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const base = execFileSync(process.execPath, ['scripts/review-traces.mjs'], {
    cwd: root, encoding: 'utf8'});
  assert.match(JSON.parse(base).fixture_sha256, /^[a-f0-9]{64}$/);
  const directory = mkdtempSync(join(tmpdir(), '6lowstick-trace-claims-'));
  try {
    const goodPath = join(directory, 'good.json');
    const badPath = join(directory, 'bad.json');
    writeFileSync(goodPath, JSON.stringify(claimsTemplate(review)));
    const good = spawnSync(process.execPath, ['scripts/review-traces.mjs', '--check', goodPath],
      {cwd: root, encoding: 'utf8'});
    assert.equal(good.status, 0, good.stderr);
    const bad = claimsTemplate(review);
    bad.scenarios[0].human_comprehension = 'confirmed';
    writeFileSync(badPath, JSON.stringify(bad));
    const denied = spawnSync(process.execPath, ['scripts/review-traces.mjs', '--check', badPath],
      {cwd: root, encoding: 'utf8'});
    assert.equal(denied.status, 1);
    assert.match(denied.stdout, /unverified_human_comprehension/);
    const malformed = spawnSync(process.execPath, ['scripts/review-traces.mjs', '--check', join(directory, 'absent.json')],
      {cwd: root, encoding: 'utf8'});
    assert.equal(malformed.status, 2);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});


test('CLI can review a generated synthetic drill JSON without changing claim bounds', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), '6low-generated-trace-'));
  try {
    const input = join(dir, 'drill.json');
    const claims = join(dir, 'claims.json');
    writeFileSync(input, JSON.stringify(fixture));
    const reviewResult = spawnSync(process.execPath, ['scripts/review-traces.mjs', '--fixture', input],
      {cwd: root, encoding: 'utf8'});
    assert.equal(reviewResult.status, 0, reviewResult.stderr);
    assert.equal(JSON.parse(reviewResult.stdout).scenarios.length, 5);
    writeFileSync(claims, JSON.stringify(claimsTemplate(review)));
    const check = spawnSync(process.execPath,
      ['scripts/review-traces.mjs', '--fixture', input, '--check', claims],
      {cwd: root, encoding: 'utf8'});
    assert.equal(check.status, 0, check.stderr);
    assert.equal(JSON.parse(check.stdout).result, 'PASS');
    const corrupted = clone(fixture);
    corrupted.scenarioCount = 42;
    writeFileSync(input, JSON.stringify(corrupted));
    const refusal = spawnSync(process.execPath, ['scripts/review-traces.mjs', '--fixture', input],
      {cwd: root, encoding: 'utf8'});
    assert.equal(refusal.status, 2);
    assert.match(refusal.stderr, /Inconsistent scenario count/);
    const mixed = spawnSync(process.execPath,
      ['scripts/review-traces.mjs', '--fixture', input, '--posix', input],
      {cwd: root, encoding: 'utf8'});
    assert.equal(mixed.status, 2);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
