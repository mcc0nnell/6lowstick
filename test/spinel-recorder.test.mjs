import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSpinelCapture,spinelFcs} from '../src/spinel/recorder.mjs';
function frame(body) {
  const fcs=spinelFcs(body);
  const encoded=[];
  for (const byte of [...body,fcs&255,fcs>>8]) {
    if ([0x7e,0x7d,0x11,0x13,0xf8].includes(byte)) encoded.push(0x7d,byte^0x20);
    else encoded.push(byte);
  }
  return Uint8Array.from([0x7e,...encoded,0x7e]);
}
test('valid HDLC-lite CRC and packed Spinel command decoded without claiming radio activity',()=>{
 const result=recordSpinelCapture(frame([0x81,0x7e,0x11]));
 assert.equal(result.length,1);
 assert.equal(result[0].crcVerified,true);
 assert.equal(result[0].header,0x81);
 assert.equal(result[0].commandId,0x7e);
 assert.equal(result[0].radioStateVerified,false);
});
test('bit corruption fails CRC and suppresses command decoding',()=>{
 const encoded=frame([0x81,0x02]);encoded[2]^=0x01;
 const result=recordSpinelCapture(encoded);
 assert.equal(result[0].crcVerified,false);
 assert.equal(result[0].commandId,null);
});
test('oversized, incomplete, and unterminated frames cannot be valid evidence',()=>{
 const result=recordSpinelCapture(Uint8Array.from([0x7e,1,2,3,4,0x7e,0x7d]),{maxFrameBytes:3});
 assert.equal(result.length,1);assert.equal(result[0].truncated,true);
 assert.equal(result[0].crcVerified,false);
 assert.deepEqual(recordSpinelCapture(Uint8Array.from([0x7e,1,2])),[]);
});
test('known PPP FCS vector',()=>{
 assert.equal(spinelFcs(Buffer.from('123456789')),0x906e);
});
