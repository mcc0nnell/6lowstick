// SPDX-License-Identifier: Apache-2.0
// Passive HDLC-lite frame recorder for OFFLINE captured Spinel byte streams.
// Never opens an RCP port, transmits frames or interprets network authority.
import {createHash} from 'node:crypto';
export function recordSpinelCapture(bytes, {maxFrameBytes = 2048} = {}) {
  if (!(bytes instanceof Uint8Array) || !Number.isInteger(maxFrameBytes) || maxFrameBytes < 2 || maxFrameBytes > 65535)
    throw new TypeError('invalid capture or frame limit');
  const frames = []; let buffer = []; let escaped = false; let overflow = false;
  function flush() {
    if (buffer.length || overflow || escaped) {
      const payload = Uint8Array.from(buffer);
      frames.push({schema:'6lowstick.spinel-frame.v0',index:frames.length,
        bytes:payload.length,sha256:createHash('sha256').update(payload).digest('hex'),
        truncated:overflow || escaped, framing:'hdlc-lite-unverified',
        crcVerified:false, radioStateVerified:false, source:'offline-capture'});
    }
    buffer=[]; escaped=false; overflow=false;
  }
  for (const b of bytes) {
    if (b === 0x7e) {flush(); continue;}
    if (overflow) continue;
    if (escaped) {buffer.push(b ^ 0x20);escaped=false;}
    else if (b === 0x7d) {escaped=true;continue;}
    else buffer.push(b);
    if (buffer.length > maxFrameBytes) {buffer=[];overflow=true;}
  }
  // Incomplete trailing data must not be reported as a complete frame.
  return frames;
}
