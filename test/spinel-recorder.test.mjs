import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSpinelCapture} from '../src/spinel/recorder.mjs';
test('offline Spinel recorder identifies bounded escaped frames without claiming CRC', () => {
 const frames=recordSpinelCapture(Uint8Array.from([0x7e,0x81,0x7d,0x5e,0x7e]));
 assert.equal(frames.length,1);assert.equal(frames[0].bytes,2);
 assert.equal(frames[0].crcVerified,false);assert.equal(frames[0].radioStateVerified,false);
});
test('oversized and incomplete capture cannot be mistaken for valid radio evidence',()=>{
 const frames=recordSpinelCapture(Uint8Array.from([0x7e,1,2,3,0x7e,0x7d]),{maxFrameBytes:2});
 assert.equal(frames.length,1);assert.equal(frames[0].truncated,true);
 assert.deepEqual(recordSpinelCapture(Uint8Array.from([0x7e,1,2])),[]);
});
