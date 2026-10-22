# Spinel Flight Recorder — offline frame-integrity research

**Status:** offline-only, metadata-only. The recorder never opens a live radio co-processor (RCP) port, sends Spinel commands, or acquires control of a Thread border router. Keep exclusive RCP ownership with the existing host driver.

`recordSpinelCapture(bytes, {maxFrameBytes})` consumes a `Uint8Array` copy of a captured HDLC-lite stream. It recognizes `0x7e` delimiters, unescapes `0x7d` sequences, enforces a bounded frame length, and discards incomplete trailing frames. It validates the little-endian CRC-16/CCITT reflected FCS (PPP FCS-16) on complete frames. For CRC-valid frames it records the raw Spinel header byte, independently checks its required `10` flag bits (`headerValid`), and decodes a **canonical, at-most-three-byte / 21-bit Spinel command identifier** only when the header is valid. A generic packed uint32 is *not* necessarily a legal Spinel command. Malformed or CRC-invalid frames, invalid headers, overlong encodings, and missing command bytes do **not** receive decoded command IDs.

Output schema `6lowstick.spinel-frame.v1` includes a frame index, byte count, SHA-256 fingerprint of unescaped bytes including FCS, `truncated`, `crcVerified`, `header`, `headerValid`, `commandId`, `commandDecoded`, `radioStateVerified:false`, and `source:'offline-capture'`. No frame payload bytes are stored in output. Frame fingerprints are **not** proof of source authenticity. The recorder does not validate property values, timestamp capture events, reconstruct packet timing, or prove transmission or reception over RF.

Run focused tests with `node --test test/spinel-recorder.test.mjs`; they cover a CRC reference vector, escaped bytes, tampering, oversize frames, and incomplete input. These are software tests, not independently measured RCP traces.

For future hardware testing, obtain explicitly authorized mirrored traffic or instrument the existing host driver without changing its behavior. Do not attach a second controller to the serial port. Correlating Spinel metadata with synthetic application receipts must preserve the distinction between **frame integrity**, **application acknowledgment**, **physical actuation**, and **human notification**.

## Independent offline reference vectors

`fixtures/spinel/reference-vectors.json` contains 15 fixed, synthetic
HDLC-lite streams generated **without calling the JavaScript recorder or
its CRC function** by `scripts/generate-spinel-reference.py`. Each vector
has expected framing/CRC, header validity, decoded command metadata,
and available byte count/SHA-256 assertions. Reproduce deterministically:

```sh
python3 scripts/generate-spinel-reference.py
node --test test/spinel-reference.test.mjs test/spinel-recorder.test.mjs
```

Fixtures cover single/two/three-byte command IDs, all five escaped special
bytes (0x7e, 0x7d, XON, XOFF, 0xf8), consecutive delimiters, corrupted FCS,
invalid headers, noncanonical and truncated packed commands, out-of-range
four-byte commands, a dangling escape, an oversized frame, and unclosed
trailing data. An independently implemented Python FCS function verifies
the known PPP FCS-16 check value `123456789 → 0x906e` before generating
the fixtures. This reduces the prior risk that tests encoded frames with
the exact same CRC implementation they were attempting to validate.

**Source references:** the public
[OpenThread Spinel HDLC-lite framing specification](https://github.com/openthread/spinel-spec/blob/master/core/appendix-framing.md)
and the [OpenThread Spinel protocol definition](https://github.com/openthread/openthread/blob/main/src/lib/spinel/spinel.h)
(header pattern `10`, packed command identifier at most 21 bits).
These static fixtures are cross-checks against *specified wire format*,
not independently acquired UART traffic, OpenThread runtime decoding, or
live RCP captures. A CRC pass only demonstrates frame integrity, not
authenticity or valid property semantics.
