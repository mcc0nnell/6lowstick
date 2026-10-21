// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only observation bridge. No Thread, Matter, NOAA, or gateway authority.
import {createHash, randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, lstatSync, openSync, closeSync, readFileSync, writeFileSync, linkSync, unlinkSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildTimeline, parseEvidence, RECEIVERS} from '../tui/evidence.mjs';

const PHASES = new Set(['baseline', 'rejected', 'replay', 'same', 'degraded']);
const MEANINGS = Object.freeze({
  send: 'synthetic_lab_send_attempt',
  attempt: 'synthetic_lab_send_attempt',
  received: 'simulated_receiver_accepted_authenticated_message',
  activated: 'synthetic_application_activation_recorded_no_physical_actuator',
  offline: 'synthetic_receiver_process_stop_requested',
  ack: 'simulated_application_ack_not_human_receipt',
  missing: 'missing_fresh_application_ack_at_deadline',
  unknown: 'receipt_not_established',
  error: 'synthetic_lab_send_error',
  gate: 'synthetic_policy_or_authentication_gate',
  reject: 'synthetic_envelope_rejected',
  duplicate: 'receiver_duplicate_suppression'
});
export function makeObservations(input, fingerprint) {
  parseEvidence(input);
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Invalid evidence fingerprint');
  const steps = buildTimeline(input);
  if (steps.length > 4096) throw new Error('Evidence observation count exceeds limit');
  return steps.map((step, index) => {
    if (!PHASES.has(step.phase) || !Object.hasOwn(MEANINGS, step.kind) ||
        (step.receiver !== null && !RECEIVERS.includes(step.receiver)))
      throw new Error('Unsupported observation');
    return {
      schema: '6lowstick.camel-observation.v1',
      source: 'simulated-lab-evidence',
      evidence_sha256: fingerprint,
      sequence: index + 1,
      phase: step.phase,
      observation: step.kind,
      source_observation: step.source_kind ?? null,
      receiver: step.receiver,
      meaning: MEANINGS[step.kind],
      ack_latency_ms: step.kind === 'ack' && Number.isFinite(step.latency) &&
        step.latency >= 0 && step.latency <= 600000 ? step.latency : null,
      harness_elapsed_ms: Number.isFinite(step.time_ms) ? step.time_ms : null,
      event_clock: Number.isFinite(step.time_ms) ? 'harness_monotonic' : 'reconstructed_phase_sequence',
      measured_packet_timestamp: null,
      physical_actuation_verified: false,
      human_receipt_verified: false
    };
  });
}
export function writeSpool(records, output) {
  const directory = resolve(output);
  mkdirSync(directory, {recursive: true, mode: 0o700});
  if (!lstatSync(directory).isDirectory()) throw new Error('Spool must be a directory');
  let written = 0;
  for (const record of records) {
    const name = record.evidence_sha256.slice(0, 32) + '-' +
      String(record.sequence).padStart(5, '0') + '.json';
    const destination = join(directory, name);
    const payload = JSON.stringify(record) + '\n';
    if (existsSync(destination)) {
      if (readFileSync(destination, 'utf8') !== payload) throw new Error('Spool collision: ' + name);
      continue;
    }
    const temp = join(directory, '.pending-' + randomBytes(12).toString('hex'));
    const fd = openSync(temp, 'wx', 0o600);
    try { writeFileSync(fd, payload); } finally { closeSync(fd); }
    try {
      linkSync(temp, destination); // atomic no-overwrite, Camel only watches *.json
      written++;
    } catch (err) {
      if (err.code !== 'EEXIST' || readFileSync(destination, 'utf8') !== payload) throw err;
    } finally { unlinkSync(temp); }
  }
  return {directory, total: records.length, written, existing: records.length - written};
}
export function main(args = process.argv.slice(2)) {
  const opts = {input:'evidence/mesh-run.json', out:'evidence/camel-observations', demo:false};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--demo') opts.demo = true;
    else if ((args[i] === '--input' || args[i] === '--out') && args[i+1] && !args[i+1].startsWith('--'))
      opts[args[i++].slice(2)] = args[i];
    else if (args[i] === '--help') {
      console.log('Usage: node src/camel/export.mjs [--demo | --input FILE] [--out DIRECTORY]');
      return;
    } else throw new Error('Unexpected option: ' + args[i]);
  }
  if (opts.demo && args.includes('--input')) throw new Error('Choose --demo or --input');
  const path = opts.demo
    ? fileURLToPath(new URL('../../fixtures/tui/illustrative-drill.json', import.meta.url))
    : resolve(opts.input);
  const raw = readFileSync(path, 'utf8');
  if (Buffer.byteLength(raw) > 8 * 1024 * 1024) throw new Error('Evidence exceeds 8 MiB');
  const digest = createHash('sha256').update(raw).digest('hex');
  const result = writeSpool(makeObservations(JSON.parse(raw), digest), opts.out);
  console.log(JSON.stringify({...result, source: opts.demo ? 'illustrative-fixture' : 'local-lab-json'}));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (err) { console.error('Camel export failed: ' + err.message); process.exitCode = 1; }
}
