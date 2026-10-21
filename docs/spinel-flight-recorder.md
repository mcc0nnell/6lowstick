# Spinel Flight Recorder — offline frame-integrity research

**Status:** offline-only, metadata-only. The recorder never opens a live radio co-processor (RCP) port, sends Spinel commands, or acquires control of a Thread border router. Keep exclusive RCP ownership with the existing host driver.

`recordSpinelCapture(bytes, {maxFrameBytes})` consumes a `Uint8Array` copy of a captured HDLC-lite stream. It recognizes `0x7e` delimiters, unescapes `0x7d` sequences, enforces a bounded frame length, and discards incomplete trailing frames. It validates the little-endian CRC-16/CCITT reflected FCS (PPP FCS-16) on complete frames. For CRC-valid frames it records the raw Spinel header byte and a bounded unsigned packed command identifier; malformed or CRC-invalid frames do **not** receive decoded command IDs.

Output schema `6lowstick.spinel-frame.v1` includes a frame index, byte count, SHA-256 fingerprint of unescaped bytes including FCS, `truncated`, `crcVerified`, `header`, `commandId`, `commandDecoded`, `radioStateVerified:false`, and `source:'offline-capture'`. No frame payload bytes are stored in output. Frame fingerprints are **not** proof of source authenticity. The recorder does not validate property values, timestamp capture events, reconstruct packet timing, or prove transmission or reception over RF.

Run focused tests with `node --test test/spinel-recorder.test.mjs`; they cover a CRC reference vector, escaped bytes, tampering, oversize frames, and incomplete input. These are software tests, not independently measured RCP traces.

For future hardware testing, obtain explicitly authorized mirrored traffic or instrument the existing host driver without changing its behavior. Do not attach a second controller to the serial port. Correlating Spinel metadata with synthetic application receipts must preserve the distinction between **frame integrity**, **application acknowledgment**, **physical actuation**, and **human notification**.
