// SPDX-License-Identifier: Apache-2.0
// Passive offline Spinel HDLC-lite frame integrity and metadata recorder.
// Never opens an RCP port, transmits frames or interprets network authority.
import {createHash} from 'node:crypto';

// Spinel HDLC-lite uses the reflected CRC-16/CCITT (PPP FCS-16).
export function spinelFcs(data) {
  let fcs = 0xffff;
  for (const byte of data) {
    fcs ^= byte;
    for (let bit = 0; bit < 8; bit++) fcs = (fcs & 1) ? (fcs >>> 1) ^ 0x8408 : fcs >>> 1;
  }
  return (fcs ^ 0xffff) & 0xffff;
}

// A Spinel command is a packed uint limited to 21 bits / three octets.
// This is narrower than generic packed uint32 properties.
function parseCommand(bytes, offset) {
  let result = 0;
  for (let i = 0; i < 3 && offset + i < bytes.length; i++) {
    const byte = bytes[offset + i];
    result += (byte & 0x7f) * 2 ** (7 * i);
    if (!(byte & 0x80)) {
      // Reject overlong encodings so corrupted command prefixes never
      // acquire a false semantic identity.
      if (i > 0 && result < 2 ** (7 * i)) return null;
      return {value: result, length: i + 1};
    }
  }
  return null;
}

export function recordSpinelCapture(bytes, {maxFrameBytes = 2048} = {}) {
  if (!(bytes instanceof Uint8Array) || !Number.isInteger(maxFrameBytes) || maxFrameBytes < 3 || maxFrameBytes > 65535)
    throw new TypeError('invalid capture or frame limit');
  const frames = []; let buffer = []; let escaped = false; let overflow = false; let inFrame = false;
  function flush() {
    if (!inFrame || (!buffer.length && !overflow && !escaped)) return;
    const raw = Uint8Array.from(buffer);
    const complete = !overflow && !escaped && raw.length >= 3;
    const body = complete ? raw.subarray(0, -2) : new Uint8Array();
    const receivedFcs = complete ? raw[raw.length - 2] | (raw[raw.length - 1] << 8) : null;
    const crcVerified = complete && spinelFcs(body) === receivedFcs;
    const header = crcVerified ? body[0] : null;
    // Spinel headers must begin with binary 10 (0x80..0xbf).
    const headerValid = crcVerified && (header & 0xc0) === 0x80;
    const command = headerValid ? parseCommand(body, 1) : null;
    frames.push({schema:'6lowstick.spinel-frame.v1',index:frames.length,
      bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
      truncated:overflow || escaped,framing:'hdlc-lite',crcVerified,
      header:crcVerified ? header : null,headerValid,
      commandId:command?.value ?? null,
      commandDecoded:command !== null,
      radioStateVerified:false,source:'offline-capture'});
  }
  for (const b of bytes) {
    if (b === 0x7e) {flush(); buffer=[];escaped=false;overflow=false;inFrame=true;continue;}
    if (!inFrame || overflow) continue;
    if (escaped) {buffer.push(b ^ 0x20);escaped=false;}
    else if (b === 0x7d) {escaped=true;continue;}
    else buffer.push(b);
    if (buffer.length > maxFrameBytes) {buffer=[];overflow=true;}
  }
  // No closing delimiter: incomplete trailing data must not become evidence.
  return frames;
}
