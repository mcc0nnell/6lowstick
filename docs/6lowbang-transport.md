# 6lowBang native transport — owned by 6lowStick

The signed 6lowBang protocol **and its reusable binary transport code** belong to `mcc0nnell/6lowstick`, not to the Tronix runtime. Tronix's Celix bundles are optional service adapters and MUST consume 6s library targets instead of vendoring codec/socket implementations.

## Native targets

| Library | Language | Responsibility |
| --- | --- | --- |
| `lowbang` | C11 | Ed25519 event signing, pinned publisher verification, replay/expiry/order/gap state |
| `lowbang_wire` | C11 | Fixed-layout bounded signed-event encoding/decoding, no authorization |
| `lowbang_udp` | POSIX C | Opt-in host-only IPv6 `::1` binary UDP send/receive, bounded poll, oversized datagram rejection |

`lowbang_wire_decode` and `lowbang_udp_recv_untrusted` only produce **untrusted candidates**. A caller must pass each event through `bang_receiver_receive` (or an adapter backed by the same verified core) before any caption presentation, forwarding or receipt claim. There is no private-caption encryption.

Binary lab envelope: two magic bytes, version, kind, lengths, binary session, three big-endian 64-bit sequence/time fields, Ed25519 signature, channel, language and text. Header 111 bytes; maximum 269 bytes; a typical short caption/sound marker is 133 bytes. This is **NOT a single IEEE 802.15.4 PHY frame**, a production on-air codec, or a guaranteed MTU. Real fragmentation and security overhead must be evaluated.

## Verified 6s-owned tests

Run the native tests with `npm run bang:native:test` (or standard CMake/CTest). The new C transport test uses a forked publisher/receiver, sends two authentic events deliberately out of order, rejects a replay, rejects a different signing key, and rejects oversized/malformed datagrams. It does not contact outside hosts or build hardware.

For a separate software-radio exercise, supply a reviewed OpenThread POSIX `ot-cli-ftd` executable:

```bash
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run bang:posix
```

The harness creates a fresh disposable simulated network and private OpenThread flash for every run, randomizes the simulated radio port offset, then carries signed **ASCII hex** over two simulated Thread nodes. Each 133-byte binary event is 266 ASCII characters in the CLI UDP payload, so this is a test-only bridge. The 6s C fixture decodes and verifies with two independently provisioned native C receivers, reorders #2 before #1, verifies signatures/replays, and separately checks a deliberately withheld #1 gap. It does not invoke native OpenThread UDP APIs from C; Node controls the CLI processes.

Observed on Butcher, October 23, 2026: all three local CTest suites passed; the 6s-owned two-node OpenThread POSIX lab passed 9/9 application checks in each of two tested runs after porting, with one send attempt per event. These are short process-side observations, **not physical RF, reliability percentages, or end-user latency**.

## Separation from Tronix

Tronix can link the exported `lowbang_wire` and `lowbang_udp` targets when supplied an explicitly reviewed, pinned 6lowStick source directory. The Celix layer may register services, provision trust, manage bounded subscribers, handle lifecycle and coordinate routing. It should NOT carry caption text inside Tronix's `int64` operation job API or duplicate this codec.

## Unimplemented gates

Native OpenThread C UDP binding; experimentally verified framing/fragmentation overhead; physical Thread and LoRa radios; secure device provisioning and key revocation; E2E encrypted private captions; CART/ASR acquisition, corrections, translation, user interface and human receipt. No operational alerts.
