# 6lowBang: native C OpenThread UDP lab (6lowStick-owned)

6lowStick owns the native C signed-caption protocol, packet codec, and OpenThread UDP adapter. **Tronix remains an optional Celix consumer**, not the source of the radio data plane.

## Implementation

- `native/bang/include/lowbang_ot.h` and `native/bang/src/lowbang_ot.c` implement direct OpenThread UDP socket lifecycle and binary event transfer with `otUdpOpen`, `otUdpBind(..., OT_NETIF_THREAD_INTERNAL)`, `otUdpSend`, and `otUdpReceive`. No host `sendto()`, OpenThread CLI hexadecimal UDP command, TCP service, cloud account, or proprietary radio SDK is used for caption events in this trial.
- Received datagrams are length-bounded before decoding via the **6s-owned** `lowbang_wire` codec. A decoded frame is only an **untrusted candidate**. The receiver's `bang_receiver_receive` separately validates the pinned Ed25519 publisher key, expiry, reordering, and replay protection before displaying a marker or acting on the text.
- The compiled demonstration is an **opt-in OpenThread CLI vendor extension** defined in `native/bang/openthread/vendor-extension.cmake` and `vendor.c`. It registers `bangopen`, `bangsend`, and `bangstats` commands in a dedicated test build, rather than modifying upstream OpenThread files. The commands intentionally use a **fixed test signing seed and synthetic caption/sound strings**. Never ship the test seed or use this extension for production devices.
- `experiments/bang/native-ot-lab.mjs` orchestrates a new two-node OpenThread POSIX simulated-radio network with isolated flash and randomized simulator UDP port offset. Only the network control plane goes through the CLI. **The actual signed caption event is binary data sent and received by OpenThread C APIs.**

## Reproduce

Supply a clean, explicitly pinned OpenThread checkout with its recursive third-party submodules installed. The tested revision was upstream OpenThread commit `da88541bed383be381c7ea39dc7b98fb9104e03b`; the local simulation used its checked-out source and `OT_PLATFORM=simulation`.

```sh
OT_SOURCE=/absolute/clean/openthread \
OT_EXPECTED_REV=da88541bed383be381c7ea39dc7b98fb9104e03b \
  npm run bang:native:ot
```

The script compiles a dedicated `ot-cli-ftd` with the 6s vendor extension in a disposable directory; does not mutate the OpenThread checkout, flash physical devices, or automatically download upstream code. If the binary is already built, skip the build and run the same isolated trial:

```sh
BANG_NATIVE_OT_CLI=/absolute/path/to/6s-extended/ot-cli-ftd \
  npm run bang:native:ot
```

GitHub Actions includes a separate source-pinned `Native 6lowBang OpenThread` simulated-radio workflow. Standard `npm test` and `npm run bang:native:test` remain independent of OpenThread and physical radio tooling.

## Verified local trial, October 23, 2026

On Butcher, the source-pinned extended OpenThread C executable compiled. **Four fresh-network trials initially passed 9/9 test checks each**, followed by an additional fifth trial after adding direct binary payload-length recording. That final run also passed; each binary signed event was **133 application bytes**, without converting it to 266 ASCII hex characters.

The receiver verified the signature and recovered the original order after **sequence #2 was sent before sequence #1**. It rejected a replay and a modified signed message. The application also confirmed exactly two delivered captions and two rejected frames.

Local observed CLI-send to native C receive-callback output varied by a few milliseconds across trials; **these are not physical-radio latencies, end-user presentation times, or statistically meaningful reliability estimates**. OpenThread POSIX's IEEE 802.15.4 simulation runs over local host networking, so it cannot demonstrate RF signal strength, range, interference, power consumption, or physical hardware performance.

## Still unimplemented

Real Thread hardware/Spinel RCP; probabilistic loss distributions, longer-lived partitions, repeated congestion/backpressure and memory profiling on embedded targets; optimized RF framing and airtime accounting; production publisher enrollment, revocation, and E2E private-caption encryption; authenticated human receipt, ASR/CART ingestion and accessible phone/6lowSpark UX. The 133-byte application event exceeds the 127-byte IEEE 802.15.4 PHY frame limit before MAC and 6LoWPAN overhead; fragmentation and airtime must be evaluated before any hardware deployment.

For the protocol, see [6lowBang](6lowbang.md) and [the common C binary/UDP transport](6lowbang-transport.md).

## Fault injection and bounded burst (October 23, 2026)

Run BANG_OT_RESILIENCE=1 npm run bang:native:ot to extend the two-node
simulation. The pinned-source CI also runs the same scenario.

Three distinct failure mechanisms are tested:

1. Test-only application loss (not radio loss): bangdrop 1 discards the
   next decoded but not-yet-authenticated event, sequence 3. The verified
   receiver holds signed sequence 4, then bangflush reports exactly
   BANG_GAP 3-3 after the required 250-ms hold and releases #4. No
   missing words are manufactured.
2. Bidirectional simulated radio partition: native OpenThread's
   nodeidfilter deny excludes both peer nodes. The harness checks
   zero presented captions for 1.1 seconds after sending #5.
   It clears the filters and resends the same signed #5 to confirm
   recovery. This does not prove radio RF range or long-term repairs.
3. Bounded eight-event burst: bangburst schedules separately signed
   sequences 6 through 13 over otUdpSend, recording the number
   scheduled, no-buffer failures, and other send errors. Independently
   count actual application presentation at the receiver. Scheduling
   a datagram does not prove receipt, and a successful small burst
   does not prove sustainable throughput or a captioning SLA.

The lab is run with new private OpenThread simulated flash and a
randomized radio port offset. No host firewall settings are altered.
These controls are restricted to the research-only vendor extension.

See 6lowbang-resilience-evidence.md for the measured trial results.
Physical RF, real ASR/CART, private-caption encryption, human receipt,
large-scale congestion and sustained fault distributions are still open.
