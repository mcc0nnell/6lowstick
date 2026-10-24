// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Parse recorded, read-only OpenThread CLI observations. No CLI process or radio is started.
const commands = Object.freeze({
  state: /^(disabled|detached|child|router|leader)$/,
  rloc16: /^(?:0x)?[0-9a-fA-F]{1,4}$/,
});
export function parseOtObservation(command, stdout) {
  if (!Object.hasOwn(commands, command)) throw new Error('Unsupported observation command');
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > 8192 || stdout.includes('\0'))
    throw new Error('Invalid or oversized observation');
  const lines = stdout.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  const normalized = lines.filter(line => line !== '>' && line !== command && line !== 'Done');
  if (normalized.length !== 1 || !commands[command].test(normalized[0]))
    throw new Error('Malformed OpenThread observation');
  const value = normalized[0];
  return Object.freeze({schema:'6lowstick.ot-observation.v1', source:'recorded_ot_cli_text',
    command, value:command === 'rloc16' ? value.toLowerCase().replace(/^0x/, '').padStart(4, '0') : value,
    physicalRadioVerified:false, humanReceiptVerified:false});
}
