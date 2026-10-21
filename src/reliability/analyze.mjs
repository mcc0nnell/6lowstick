// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only analysis of synthetic OpenThread POSIX lab runs.
const receivers = ['display', 'haptic', 'strobe'];
const same = (a, b) => Array.isArray(a) && a.length === b.length &&
  new Set(a).size === a.length && a.every(x => b.includes(x));

export function analyzeTrial({status, signal = null, error = null, stdout = '', stderr = '', elapsedMs = 0}) {
  const result = {
    elapsed_ms: Math.round(elapsedMs),
    outcome: 'failed',
    exit_code: status,
    signal,
    failure_reasons: [],
    baseline_missing: null,
    same_missing: null,
    degraded_missing: null,
    timing_events: null
  };
  const diagnosticLine = String(stderr ?? '').split('\n').find(line => line.startsWith('THREAD_ALERT_LAB_DIAGNOSTIC: '));
  if (diagnosticLine) {
    try {
      const diagnostic = JSON.parse(diagnosticLine.slice('THREAD_ALERT_LAB_DIAGNOSTIC: '.length));
      if (diagnostic.schema === '6lowstick.lab-failure.v1') {
        result.failed_phase = diagnostic.phase ?? null;
        result.last_delivery_missing = Array.isArray(diagnostic.missing) ? diagnostic.missing : null;
      }
    } catch { /* A malformed diagnostic never makes a failed run pass. */ }
  }
  if (diagnosticLine) result.failure_reasons.push('failure_diagnostic_present');
  if (error) result.failure_reasons.push(error.code === 'ETIMEDOUT' ? 'trial_timeout' : 'process_error');
  if (status !== 0) result.failure_reasons.push('lab_nonzero_exit');
  if (!String(stdout ?? '').trim()) {
    result.failure_reasons.push('no_complete_evidence');
    return result;
  }
  let evidence;
  try { evidence = JSON.parse(stdout); }
  catch {
    result.failure_reasons.push('invalid_evidence_json');
    return result;
  }
  if (!evidence || evidence.schema !== 'tronix.thread-alert-lab.v1' ||
      !String(evidence.transport).includes('simulation')) {
    result.failure_reasons.push('unexpected_evidence_schema');
    return result;
  }
  result.baseline_missing = evidence.baseline?.missing ?? null;
  result.same_missing = evidence.sameGateway?.delivery?.missing ?? null;
  result.degraded_missing = evidence.degraded?.missing ?? null;
  result.timing_events = evidence.timing?.events?.length ?? null;
  const checks = [
    ['baseline', evidence.baseline, receivers, [], receivers],
    ['rejected', evidence.rejected, [], ['strobe'], ['strobe']],
    ['replay', evidence.replay, ['strobe'], [], ['strobe']],
    ['same', evidence.sameGateway?.delivery, receivers, [], receivers],
    ['degraded', evidence.degraded, ['display', 'strobe'], ['haptic'], receivers]
  ];
  for (const [name, phase, acked, missing, requested] of checks) {
    if (!same(phase?.acknowledged, acked) || !same(phase?.missing, missing) ||
        !same(phase?.requested, requested) ||
        !Array.isArray(phase?.send_errors) || phase.send_errors.length !== 0) {
      result.failure_reasons.push(name + '_receipt_invariant');
    }
  }
  if (!Array.isArray(evidence.errors) || evidence.errors.length !== 0)
    result.failure_reasons.push('harness_errors');
  if (!Array.isArray(evidence.events) ||
      !evidence.events.some(x => x.node === 'strobe' && x.event === 'rejected_auth') ||
      !evidence.events.some(x => x.node === 'strobe' && x.event === 'duplicate_suppressed'))
    result.failure_reasons.push('negative_security_checks_missing');
  if (evidence.activations?.strobe?.length !== 3 ||
      evidence.activations?.display?.length !== 3 ||
      evidence.activations?.haptic?.length !== 2)
    result.failure_reasons.push('unexpected_activation_count');
  if (!Number.isInteger(result.timing_events) || result.timing_events < 1)
    result.failure_reasons.push('missing_monotonic_observations');
  if (result.failure_reasons.length === 0) result.outcome = 'completed_as_expected';
  return result;
}

export function summarizeTrials(trials, metadata) {
  const completed = trials.filter(x => x.outcome === 'completed_as_expected').length;
  return {
    schema: '6lowstick.reliability-trials.v1',
    ...metadata,
    simulation_only: true,
    physical_radio_verified: false,
    human_receipt_verified: false,
    trial_count: trials.length,
    completed_as_expected: completed,
    failed: trials.length - completed,
    trials
  };
}
