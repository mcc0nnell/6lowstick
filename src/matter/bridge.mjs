// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Test-only Matter lighting adapter; no controller, network or device access.
// Caller supplies a commissioned Matter OnOff cluster client explicitly.
export async function sendVisualDrill({alert, controller, endpointId = 1, enabled = false}) {
  if (!enabled) return {status: 'disabled'};
  if (!alert || alert.accepted !== true || typeof alert.id !== 'string' ||
      !/^[a-f0-9]{24}$/.test(alert.id)) return {status: 'rejected'};
  if (!controller || typeof controller.on !== 'function') return {status: 'unavailable'};
  if (!Number.isInteger(endpointId) || endpointId < 1 || endpointId > 65534)
    return {status: 'invalid_endpoint'};
  try {
    await controller.on(endpointId);
    return {status: 'command_completed', alertId: alert.id, endpointId,
      warning: 'Matter command completion does not prove illumination or human perception'};
  } catch (error) {
    return {status: 'command_failed', reason: String(error?.message ?? error)};
  }
}
