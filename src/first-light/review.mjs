// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only First Light evidence correlation. Does not control radios or actuators.
// Sensor files and their provenance are NOT independently authenticated here.
const HEX24 = /^[0-9a-f]{24}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const MODES = ['light', 'haptic'];
const REQUESTED = ['text', 'light', 'haptic'];
const validMs = n => Number.isSafeInteger(n) && n >= 0;
const SCHEMA = '6lowstick.first-light-capture.v0';

function assertJourney(journey) {
  if (!journey || journey.schema !== '6lowstick.loop-first-journey.v0' ||
      journey.transport !== 'openthread-posix-simulated-radio-ipv6-udp' ||
      journey.simulationOnly !== true || journey.physicalRadioVerified !== false ||
      !journey.signal || typeof journey.signal.samApplicationReceived !== 'boolean') {
    throw new TypeError('a bounded OpenThread POSIX journey is required');
  }
  const request = journey.signal.outputRequest;
  if (!journey.signal.samApplicationReceived) {
    if (request != null) throw new TypeError('no application admission may claim an output request');
    return null;
  }
  if (!request || !HEX24.test(request.id) || !HEX24.test(request.sessionId) ||
      !validMs(request.atUnixMs) ||
      !Array.isArray(request.requestedModalities) ||
      request.requestedModalities.length < 1 ||
      request.requestedModalities.length > 3 ||
      new Set(request.requestedModalities).size !== request.requestedModalities.length ||
      request.requestedModalities.some(mode => !REQUESTED.includes(mode)) ||
      !Array.isArray(journey.signal.requestedModalities) ||
      request.requestedModalities.join(',') !== journey.signal.requestedModalities.join(',')) {
    throw new TypeError('missing or invalid receiver-side output request');
  }
  return request;
}
function assertCapture(capture) {
  if (!capture || capture.schema !== SCHEMA ||
      capture.source !== 'operator-supplied-sensor-capture' ||
      !HEX24.test(capture.sessionId) ||
      typeof capture.instrument !== 'string' ||
      !/^[a-zA-Z0-9 ._/-]{3,80}$/.test(capture.instrument) ||
      !HEX64.test(capture.calibrationSha256) ||
      !Number.isSafeInteger(capture.clockUncertaintyMs) ||
      capture.clockUncertaintyMs < 0 || capture.clockUncertaintyMs > 1000 ||
      !Array.isArray(capture.observations) || capture.observations.length > 128)
    throw new TypeError('invalid or unbounded sensor capture');
  for (const observation of capture.observations) {
    if (!observation || typeof observation !== 'object' ||
        !MODES.includes(observation.modality) ||
        !validMs(observation.atUnixMs) ||
        typeof observation.value !== 'number' || !Number.isFinite(observation.value) ||
        observation.value < 0 || observation.value > 1e9 ||
        observation.unit !== (observation.modality === 'light' ? 'lux' : 'm/s2'))
      throw new TypeError('malformed or unsupported sensor sample');
  }
}

/**
 * Compare a receiver application request to separately supplied sensor events.
 * Presence of a value in a CSV/JSON capture is NOT validation of a sensor,
 * calibration, clock synchronization, output actuation, or human perception.
 */
export function reviewFirstLightCapture({journey, capture, windowMs = 500}) {
  if (!Number.isSafeInteger(windowMs) || windowMs < 1 || windowMs > 5000)
    throw new RangeError('invalid correlation window');
  const request = assertJourney(journey);
  assertCapture(capture);
  if (request && capture.sessionId !== request.sessionId)
    throw new Error('capture and application request belong to different sessions');
  const requested = request?.requestedModalities ?? [];
  const modalities = requested.filter(mode => MODES.includes(mode));
  const observations = modalities.map(modality => {
    const matches = capture.observations.filter(item =>
      item.modality === modality && item.atUnixMs >=
        request.atUnixMs - capture.clockUncertaintyMs &&
      item.atUnixMs <= request.atUnixMs + windowMs + capture.clockUncertaintyMs);
    return {
      modality,
      sensorCandidates: matches.length,
      status: matches.length === 0 ? 'not-observed-in-supplied-capture' :
        matches.length === 1 ? 'time-correlated-candidate' : 'ambiguous-multiple-candidates'
    };
  });
  // A sensor sample is merely a candidate; this function has no independent
  // chain-of-custody verification or sensor calibration test authority.
  return {
    schema: '6lowstick.first-light-review.v0',
    sessionId: request?.sessionId ?? capture.sessionId,
    applicationAdmitted: journey.signal.samApplicationReceived,
    requestId: request?.id ?? null,
    windowMs,
    claimedInstrument: capture.instrument,
    claimedCalibrationSha256: capture.calibrationSha256,
    sourceProvenance: 'unverified-operator-supplied-capture',
    observations,
    notSensorMeasured: requested.filter(mode => !MODES.includes(mode)),
    physicalOutputVerified: false,
    humanDetected: 'unknown',
    humanUnderstood: 'unknown',
    assessment: !request ? 'no-application-output-request' :
      observations.every(record => record.status === 'time-correlated-candidate') ?
        'candidate-correlations-only' : 'insufficient-or-ambiguous-sensor-observations'
  };
}
