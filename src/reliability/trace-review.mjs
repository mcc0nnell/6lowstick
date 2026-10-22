// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Deterministic, offline interpretation of the committed synthetic Field Station fixture.
// No AI service, packet dispatch, physical measurement, or recipient authority.
import {validateResearchFixture} from '../../site/station-model.mjs';

const TRACE = '6lowstick.trace-review.v1';
const CLAIMS = '6lowstick.trace-claims.v1';
const CHECK = '6lowstick.trace-claim-check.v1';
const fields = ['scenario_id', 'application_state', 'receiver_journal_state',
  'physical_output', 'human_detection', 'human_comprehension', 'evidence_references'];
const refFor = (scenario, type, index) =>
  `scenarios[${scenario}].${type === 'attempt' ? 'receipt.attempts' : 'receiverEvents'}[${index}]`;
const uniqueSorted = values => [...new Set(values)].sort();
const equals = (a, b) => JSON.stringify(uniqueSorted(a)) === JSON.stringify(uniqueSorted(b));

// A receipt authenticates modeled application processing, not on-air transmission,
// independent physical output, human detection, or comprehension.
export function reviewFixture(fixture) {
  validateResearchFixture(fixture);
  if (fixture.scenarioCount !== fixture.scenarios.length) {
    throw new Error('Inconsistent scenario count');
  }
  const names = new Set();
  const scenarios = fixture.scenarios.map((scenario, scenarioIndex) => {
    const {receipt, receiverEvents} = scenario;
    if (names.has(scenario.scenario)) throw new Error('Duplicate scenario identifier');
    names.add(scenario.scenario);
    if (receipt.drill !== true || typeof receipt.id !== 'string' ||
        receiverEvents.some(event => event.id !== receipt.id ||
          !receipt.attempts.some(attempt => attempt.route === event.route)))
      throw new Error('Inconsistent synthetic receiver journal');
    const acknowledged = [];
    const invalid = [];
    const references = [];
    const steps = receipt.attempts.map(attempt => attempt.step);
    if (steps.some((step, i) => step !== i + 1))
      throw new Error('Non-sequential attempt steps');
    for (const [index, attempt] of receipt.attempts.entries()) {
      const reference = refFor(scenarioIndex, 'attempt', index);
      references.push(reference);
      if (attempt.outcome === 'authenticated_app_receipt') acknowledged.push({reference, route: attempt.route});
      if (attempt.outcome === 'invalid_app_receipt') invalid.push(reference);
    }
    if (acknowledged.length > 1 ||
        (acknowledged.length === 1 && (acknowledged[0].reference !==
          refFor(scenarioIndex, 'attempt', receipt.attempts.length - 1) ||
          receipt.status !== 'app_acknowledged' ||
          receipt.confirmedRoute !== acknowledged[0].route)) ||
        (acknowledged.length === 0 &&
          (receipt.status !== 'unconfirmed' || receipt.confirmedRoute !== null))) {
      throw new Error('Inconsistent application receipt outcome');
    }
    const activations = [];
    const duplicates = [];
    for (const [index, event] of receiverEvents.entries()) {
      const reference = refFor(scenarioIndex, 'receiver', index);
      references.push(reference);
      if (event.outcome === 'synthetic_activation') activations.push(reference);
      if (event.outcome === 'duplicate_suppressed') duplicates.push(reference);
    }
    const applicationState = acknowledged.length ? 'authenticated_application_receipt' : 'unconfirmed';
    const nextTest = applicationState === 'unconfirmed'
      ? 'Repeat a bounded synthetic trial with independent receiver-side logging; distinguish message arrival from a missing return receipt.'
      : 'Add independent output sensing on an authorized, test-only device before making an actuation claim.';
    return {
      scenario_id: scenario.scenario,
      evidence_kind: 'scripted_software_simulation',
      application_state: applicationState,
      confirmed_route: acknowledged[0]?.route ?? null,
      receiver_journal_state: activations.length ? 'synthetic_activation_recorded' : 'none_recorded',
      synthetic_activations: activations.length,
      duplicate_suppressions: duplicates.length,
      invalid_application_receipts: invalid.length,
      evidence_references: references,
      unknowns: {physical_output: 'unknown', human_detection: 'unknown', human_comprehension: 'unknown'},
      hypothesis: applicationState === 'unconfirmed'
        ? 'The absence of a valid application receipt has multiple possible causes; it does not prove a receiver failed to process the message.'
        : 'A valid synthetic receipt does not establish that any physical actuator operated.',
      proposed_next_test: nextTest,
    };
  });
  return {schema: TRACE, fixture_schema: fixture.schema, simulation_only: true,
    physical_radio_verified: false, human_receipt_verified: false, scenarios};
}

// Generates a typed *example*, not an independent AI interpretation.
export function claimsTemplate(review) {
  if (review?.schema !== TRACE) throw new TypeError('Unsupported trace review');
  return {schema: CLAIMS, scenarios: review.scenarios.map(s => ({
    scenario_id: s.scenario_id, application_state: s.application_state,
    receiver_journal_state: s.receiver_journal_state,
    physical_output: 'unknown', human_detection: 'unknown', human_comprehension: 'unknown',
    evidence_references: [...s.evidence_references],
  }))};
}

// Score only typed claims against trace-derived facts. Reject free-form prose
// rather than pretending to detect natural-language hallucinations.
export function checkClaims(review, claims) {
  if (review?.schema !== TRACE) throw new TypeError('Unsupported trace review');
  const failures = [];
  if (!claims || claims.schema !== CLAIMS || !Array.isArray(claims.scenarios) ||
      claims.scenarios.length > 100 ||
      Object.keys(claims).some(key => !['schema', 'scenarios'].includes(key))) {
    return {schema: CHECK, result: 'FAIL', failures: ['invalid_claim_document']};
  }
  const expected = new Map(review.scenarios.map(s => [s.scenario_id, s]));
  const seen = new Set();
  for (const [index, claim] of claims.scenarios.entries()) {
    const name = typeof claim?.scenario_id === 'string' ? claim.scenario_id : `index_${index}`;
    if (!claim || typeof claim !== 'object' || Array.isArray(claim) ||
        Object.keys(claim).some(key => !fields.includes(key)) ||
        fields.some(key => !Object.hasOwn(claim, key))) {
      failures.push(`${name}:invalid_claim_shape`);
      continue;
    }
    if (seen.has(name)) { failures.push(`${name}:duplicate_scenario`); continue; }
    seen.add(name);
    const evidence = expected.get(name);
    if (!evidence) { failures.push(`${name}:unknown_scenario`); continue; }
    if (claim.application_state !== evidence.application_state)
      failures.push(`${name}:unsupported_application_state`);
    if (claim.receiver_journal_state !== evidence.receiver_journal_state)
      failures.push(`${name}:unsupported_receiver_journal_state`);
    for (const field of ['physical_output', 'human_detection', 'human_comprehension']) {
      if (claim[field] !== 'unknown') failures.push(`${name}:unverified_${field}`);
    }
    if (!Array.isArray(claim.evidence_references) ||
        !claim.evidence_references.every(x => typeof x === 'string') ||
        claim.evidence_references.length !== evidence.evidence_references.length ||
        !equals(claim.evidence_references, evidence.evidence_references))
      failures.push(`${name}:ungrounded_or_incomplete_references`);
  }
  for (const name of expected.keys()) {
    if (!seen.has(name)) failures.push(`${name}:missing_scenario`);
  }
  return {schema: CHECK, result: failures.length ? 'FAIL' : 'PASS', failures};
}
