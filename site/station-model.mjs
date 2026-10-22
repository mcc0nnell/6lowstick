// Synthetic fixture interpretation shared by the browser and offline tests.
// Pure functions: no transport, device, crypto authority, or HTML side effects.
export const outcomes = Object.freeze({
  no_authenticated_receipt: 'No authenticated receipt',
  invalid_app_receipt: 'Invalid application receipt',
  authenticated_app_receipt: 'Authenticated application receipt',
  synthetic_activation: 'Synthetic receiver activation',
  duplicate_suppressed: 'Duplicate suppressed',
});

const routes = new Set(['thread', 'lora-p2p']);
const attempts = new Set(['no_authenticated_receipt', 'invalid_app_receipt', 'authenticated_app_receipt']);
const receiverOutcomes = new Set(['synthetic_activation', 'duplicate_suppressed']);

export function validateResearchFixture(data) {
  if (!data || data.schema !== '6lowstick.multiradio-research.v0' ||
      data.physicalRadio !== false || data.humanDelivery !== false ||
      !Array.isArray(data.scenarios) || !data.scenarios.length || data.scenarios.length > 100) {
    throw new Error('Unsupported or non-synthetic evidence fixture');
  }
  for (const scenario of data.scenarios) {
    const receipt = scenario?.receipt;
    if (typeof scenario?.scenario !== 'string' || !/^[a-z0-9_]{1,80}$/.test(scenario.scenario) ||
        !receipt || receipt.schema !== '6lowstick.synthetic-fabric.v0' ||
        receipt.simulation !== true || receipt.physicalRadioVerified !== false ||
        receipt.humanAcknowledged !== false ||
        !Array.isArray(receipt.attempts) || !receipt.attempts.length || receipt.attempts.length > 30 ||
        !Array.isArray(scenario.receiverEvents) || scenario.receiverEvents.length > 30) {
      throw new Error('Invalid synthetic scenario receipt');
    }
    for (const event of receipt.attempts) {
      if (!routes.has(event.route) || !attempts.has(event.outcome) ||
          !Number.isSafeInteger(event.step) || event.step < 1) throw new Error('Invalid attempt');
    }
    for (const event of scenario.receiverEvents) {
      if (!routes.has(event.route) || !receiverOutcomes.has(event.outcome))
        throw new Error('Invalid receiver journal');
    }
  }
  return data;
}

export function eventsFor(scenario) {
  return [
    ...scenario.receipt.attempts.map(a => ({ type: 'attempt', route: a.route, outcome: a.outcome, step: a.step })),
    ...scenario.receiverEvents.map((e, i) => ({ type: 'receiver', route: e.route, outcome: e.outcome, step: i + 1 })),
  ];
}

export function stationSummary(fixture) {
  const data = validateResearchFixture(fixture);
  const allRoutes = new Set(data.scenarios.flatMap(s => s.receipt.attempts.map(a => a.route)));
  return Object.freeze({
    scenarios: data.scenarios.length,
    modeledRoutes: allRoutes.size,
    physicalRadioVerified: false,
    humanReceiptVerified: false,
  });
}

export const labelFor = value =>
  outcomes[value] ?? String(value ?? 'unknown').replaceAll('_', ' ');

export function descriptionFor(event) {
  if (!event) return 'No event is selected.';
  if (event.type === 'receiver') {
    if (event.outcome === 'duplicate_suppressed')
      return 'The synthetic replay journal suppressed another application activation. This does not establish whether a real device received a packet.';
    return 'The simulated receiver journal recorded an application-level activation. No physical haptic actuator was measured.';
  }
  if (event.outcome === 'authenticated_app_receipt')
    return 'An authenticated application receipt was validated on this scripted route. No physical delivery or human notification has been demonstrated.';
  if (event.outcome === 'invalid_app_receipt')
    return 'An invalid application receipt was rejected. The route does not count as confirmed even if an application event occurred.';
  return 'No authenticated application receipt was available on this scripted route. Delivery remains unconfirmed, not proven absent.';
}
