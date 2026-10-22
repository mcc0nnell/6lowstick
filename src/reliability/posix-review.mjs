// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Adapter for the separately exercised PR #8 POSIX simulated-radio evidence.
// Strictly read-only; no radio, AI inference, file writes or dispatch.
import {reviewFixture} from './trace-review.mjs';
import {analyzeTrial} from './analyze.mjs';

const CASES = Object.freeze([
  {key:'healthy', name:'posix_thread_healthy', routes:['thread'],
    outcomes:['authenticated_app_receipt'], journal:['thread:synthetic_activation']},
  {key:'lostThreadReceipt', name:'posix_receipt_withheld',
    routes:['thread','lora-p2p'],
    outcomes:['no_authenticated_receipt','authenticated_app_receipt'],
    journal:['thread:synthetic_activation','lora-p2p:duplicate_suppressed']},
  {key:'stoppedThreadNode', name:'posix_receiver_stopped',
    routes:['thread','lora-p2p'],
    outcomes:['no_authenticated_receipt','authenticated_app_receipt'],
    journal:['lora-p2p:synthetic_activation']},
]);

const exact = (a,b) => JSON.stringify(a) === JSON.stringify(b);

// Review only the known, successfully completed synthetic lab shape.
// A lab JSON report is a *claim by the lab*, not an independently signed
// source of truth; the input SHA-256 is for integrity comparison only.
export function reviewPosixEvidence(data) {
  const radio = data?.multiradio;
  if (data?.schema !== 'tronix.thread-alert-lab.v1' ||
      data.transport !== 'OpenThread ot-cli-ftd UDP POSIX simulation (no physical radio)' ||
      !radio || radio.schema !== '6lowstick.posix-multiradio.v0' ||
      radio.thread !== 'OpenThread POSIX simulator UDP (actual ot-cli-ftd processes, no physical RF)' ||
      radio.lora !== 'scripted peer-to-peer LoRa model (no modem or air interface)' ||
      radio.spinel !== false || radio.physicalRadio !== false ||
      radio.humanDelivery !== false || !Array.isArray(data.errors) ||
      data.errors.length !== 0 || !Array.isArray(radio.receiverEvents) ||
      radio.receiverEvents.length > 30 || !radio.receiverEvents.length ||
      data.timing?.schema !== '6lowstick.harness-monotonic.v1' ||
      !Array.isArray(data.timing.events) || !data.timing.events.length) {
    throw new Error('Unsupported, incomplete or unsuccessful POSIX simulation evidence');
  }

  // Reuse the existing negative-security, reliability-phase and receipt
  // invariants. A synthetic report with only a plausible multi-radio
  // subsection is *not* a completed successful lab run.
  if (analyzeTrial({status:0, stdout:JSON.stringify(data)}).outcome !== 'completed_as_expected')
    throw new Error('Incomplete POSIX lab baseline or failed security assertions');

  const byId = new Map();
  const artificialScenarios = CASES.map(spec => {
    const receipt = radio[spec.key];
    if (!receipt || receipt.schema !== '6lowstick.synthetic-fabric.v0' ||
        receipt.simulation !== true || receipt.drill !== true ||
        typeof receipt.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(receipt.id) ||
        receipt.receiver !== 'haptic' || byId.has(receipt.id) ||
        !Array.isArray(receipt.attempts) ||
        !exact(receipt.attempts.map(a => a.route),spec.routes) ||
        !exact(receipt.attempts.map(a => a.outcome),spec.outcomes) ||
        receipt.status !== 'app_acknowledged' ||
        receipt.confirmedRoute !== spec.routes[spec.routes.length-1]) {
      throw new Error('Inconsistent POSIX scenario: '+spec.key);
    }
    byId.set(receipt.id, spec);
    return {scenario:spec.name, receipt, receiverEvents:[]};
  });

  // Retain source-journal indices; grouping here never invents a chronology
  // between application receipt attempts and receiver-side journal entries.
  const sourceIndexes = new Map(CASES.map(spec => [spec.name, []]));
  for (const [index, event] of radio.receiverEvents.entries()) {
    const spec = byId.get(event?.id);
    if (!spec) throw new Error('Unmatched POSIX receiver-journal event');
    const scenarioIndex = CASES.indexOf(spec);
    artificialScenarios[scenarioIndex].receiverEvents.push(event);
    sourceIndexes.get(spec.name).push(index);
  }
  for (const [index, spec] of CASES.entries()) {
    const actual = artificialScenarios[index].receiverEvents.map(e => e.route+':'+e.outcome);
    if (!exact(actual,spec.journal)) throw new Error('Inconsistent POSIX receiver journal: '+spec.key);
  }
  const synthetic = {schema:'6lowstick.multiradio-research.v0',
    physicalRadio:false, humanDelivery:false, scenarioCount:CASES.length,
    scenarios:artificialScenarios};
  const reviewed = reviewFixture(synthetic);
  return {
    ...reviewed,
    fixture_schema:radio.schema,
    source_schema:data.schema,
    source_description:'reported OpenThread POSIX simulated UDP; scripted direct LoRa',
    // Harness event times are not on-air packet timestamps.
    timing_clock:'Node harness monotonic, not RF',
    scenarios:reviewed.scenarios.map((scenario,index) => {
      const spec=CASES[index];
      const numAttempts=artificialScenarios[index].receipt.attempts.length;
      return {
        ...scenario,
        evidence_kind:'posix_simulated_udp_with_scripted_lora',
        evidence_references:[
          ...Array.from({length:numAttempts},(_,i)=>`multiradio.${spec.key}.attempts[${i}]`),
          ...sourceIndexes.get(spec.name).map(i=>`multiradio.receiverEvents[${i}]`),
        ],
      };
    }),
  };
}
