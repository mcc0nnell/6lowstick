// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Pure software-only intent admission. No transport, dispatch or physical capability.
const SCHEMA = '6lowstick.signal-intent.v0';
const NAME = /^[A-Za-z0-9_-]{1,32}$/;
const KINDS = Object.freeze(['presence', 'request', 'condition', 'coordination', 'warning']);
const MODALITIES = Object.freeze(['light', 'haptic', 'text']);
const FIELDS = Object.freeze(['schema', 'id', 'source', 'target', 'kind', 'purpose_code',
  'modality', 'issued_at_ms', 'expires_at_ms', 'simulation', 'drill']);
const MAX_TTL_MS = 60 * 60 * 1000;
const exact = (value, keys) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));
const time = value => Number.isSafeInteger(value) && value >= 0;
const names = (values) => Array.isArray(values) && values.length > 0 &&
  values.length <= 64 && values.every(value => typeof value === 'string' && NAME.test(value)) &&
  new Set(values).size === values.length;

export function parseSignalIntent(input) {
  if (!exact(input, FIELDS) || input.schema !== SCHEMA ||
      !NAME.test(input.id) || !NAME.test(input.source) || !NAME.test(input.target) ||
      !NAME.test(input.purpose_code) || !KINDS.includes(input.kind) ||
      !MODALITIES.includes(input.modality) || input.simulation !== true ||
      input.drill !== true || !time(input.issued_at_ms) ||
      !time(input.expires_at_ms) || input.expires_at_ms <= input.issued_at_ms ||
      input.expires_at_ms - input.issued_at_ms > MAX_TTL_MS) {
    throw new TypeError('invalid simulation-only signal intent');
  }
  return Object.freeze({...input});
}

function validatePolicy(policy) {
  if (!exact(policy, ['sources', 'targets', 'kinds', 'purpose_codes', 'modalities', 'max_ttl_ms']) ||
      !names(policy.sources) || !names(policy.targets) || !names(policy.purpose_codes) ||
      !names(policy.kinds) || policy.kinds.some(kind => !KINDS.includes(kind)) ||
      !names(policy.modalities) || policy.modalities.some(m => !MODALITIES.includes(m)) ||
      !Number.isSafeInteger(policy.max_ttl_ms) || policy.max_ttl_ms < 1 ||
      policy.max_ttl_ms > MAX_TTL_MS) throw new TypeError('invalid local simulation policy');
}

// The caller owns a trusted local policy and persisted replay journal. A PASS here
// authorizes *only further simulation*, not network sends, devices, or people.
export function evaluateSignalIntent(input, {policy, nowMs, seenIds} = {}) {
  validatePolicy(policy);
  if (!time(nowMs) || !(seenIds instanceof Set) || [...seenIds].some(x => typeof x !== 'string'))
    throw new TypeError('invalid evaluation context');
  const reasons = [];
  let intent;
  try { intent = parseSignalIntent(input); }
  catch { reasons.push('invalid_intent'); }
  if (intent) {
    if (nowMs < intent.issued_at_ms) reasons.push('not_yet_valid');
    if (nowMs >= intent.expires_at_ms) reasons.push('expired');
    if (seenIds.has(intent.id)) reasons.push('replayed_id');
    if (intent.expires_at_ms - intent.issued_at_ms > policy.max_ttl_ms)
      reasons.push('ttl_exceeds_policy');
    for (const [field, allowed] of [
      ['source', policy.sources], ['target', policy.targets], ['kind', policy.kinds],
      ['purpose_code', policy.purpose_codes], ['modality', policy.modalities]
    ]) if (!allowed.includes(intent[field])) reasons.push('out_of_scope_' + field);
  }
  return Object.freeze({
    schema: '6lowstick.signal-admission.v0',
    decision: reasons.length ? 'DENY' : 'SIMULATION_ONLY', reasons,
    evidence: {application_receipt: 'unknown', physical_output: 'unknown',
      human_detection: 'unknown', human_comprehension: 'unknown'},
    executable_authority: false, physical_radio_verified: false
  });
}

export const signalKinds = KINDS;
export const signalModalities = MODALITIES;
