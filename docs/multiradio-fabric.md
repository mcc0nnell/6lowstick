# 6lowStick synthetic multi-radio failover research

**Status:** deterministic software-only experiment. **Not** a LoRa radio
implementation, LoRaWAN endpoint, Spinel driver, real Thread link, NOAA alert
bridge, emergency alerting system, or physical accessible actuator.

## Reproduce

```sh
npm test
node experiments/multiradio/drill.mjs > multiradio-trace.json
```

Node 22 with repository dependencies installed. The experiment uses a private,
deleted-after-run replay journal. It emits a JSON artifact recording per-path
attempts, failed receipt checks, receiver-side synthetic activations and a
bounded evidence statement. Neither keys nor raw on-air packets enter the trace.

## Protocol boundary

- An alert uses the existing synthetic `EA2|id|NOTIFY|HMAC` format.
- Each transport attempt generates a fresh 96-bit challenge.
- A receiving **simulator** validates EA2; on first receipt it journals the ID
  durably and records one synthetic activation. It returns
  `R2|id|recipient|challenge|HMAC`. Duplicate delivery returns a new signed
  receipt but not another activation.
- The sender verifies the R2 receipt over ID + recipient + challenge using
  HMAC-SHA-256 (128-bit truncated tag), and only then marks the simulator
  application as acknowledged. A missing or invalid receipt causes fallback
  to the next configured transport, preserving the alert ID.
- If no valid receipt arrives, the trace reports `unconfirmed`. This may
  conceal an activation when the receipt was lost. No claim of human receipt
  is possible.

**This is a laboratory shared-key scheme**, not production key provisioning,
device identity, authority validation or forward secrecy. A compromised
receiver with the shared key could forge receipts; there is no expiry or
cross-device trust isolation. ReplayJournal is append+fsync and survives an
application restart, but is not a transaction with an actual actuator; journal
corruption, storage exhaustion, concurrent writes, rollback and id reuse
still need engineering.

## Radio semantics

`thread` and `lora-p2p` are *scripted interfaces* in this increment. Thread
would use OpenThread's existing UDP application path; Spinel belongs underneath
OpenThread as the host-RCP control/data protocol, **not** as a generic
multi-radio messaging API. The separate LoRa path models direct peer-to-peer
links, **not LoRaWAN**. ChirpStack, LoRaWAN Class A downlink windows, gateway
and network-server dependencies, air-time/duty-cycle/region restrictions, and
radio interference are not simulated here. Do not treat a simulated LoRa
failover as verified long-range RF delivery.

The sequencer tries Thread first and LoRa second. It does not automatically
discover coverage, optimize energy, guarantee latency, or route IP packets over
LoRa. This is application-message forwarding between heterogeneous links,
not transparent Thread↔LoRa bridge functionality.

## Five explicit fault experiments

1. Thread unavailable → LoRa receipt accepted.
2. Thread delivers, its acknowledgment is lost → LoRa retransmits same ID;
   receiving app suppresses duplicate activation and signs a fresh receipt.
3. Thread receipt fails verification → LoRa authenticated receipt succeeds.
4. Both links unavailable → delivery remains unconfirmed.
5. Healthy Thread receipt → LoRa unused.

## Next real-world gate

Run the same test with the existing *actual OpenThread POSIX simulated radio*
harness as one adapter, preserving its known intermittent haptic ACK evidence.
Then verify a locally authorized point-to-point LoRa pair with measured
payload budget, latency, airtime and signed return receipts. Record separate
claims for link send, application receipt, physical actuation and human
notification. Before any field use, review interference, local RF law,
emergency-alert authority, security, safety, accessibility, and failure
handling. Never feed live SDR/SAME observations into this synthetic engine.

References:
- [OpenThread co-processor design](https://openthread.io/platforms/co-processor)
- [OpenThread Spinel implementation](https://github.com/openthread/openthread/blob/main/src/lib/spinel/spinel.h)

## OpenThread POSIX simulated-radio integration

`experiments/thread-alert/lab.mjs` also exercises `createPosixThreadAdapter`
against actual `ot-cli-ftd` processes on OpenThread's POSIX *simulated
radio*. This is a real execution of OpenThread's protocol stack and UDP
application path, **not physical Thread RF and not a Spinel RCP test**.
The LoRa transport is still a scripted peer-to-peer model.

A separate `F1|nonce|EA2|id|NOTIFY|tag` framing layer carries the
per-attempt receipt challenge through OpenThread UDP. The receiving simulator
checks the existing EA2 HMAC and uses its fsync-backed receiver journal to
suppress repeated synthetic activations across both transports. It returns
`R2|id|haptic|nonce|HMAC` by UDP, and the sender checks the application
HMAC before claiming an acknowledgment. OpenThread CLI `Done` is *never*
counted as recipient delivery. Invalid F1 payloads are ignored.

The lab adds three observable scenarios after its existing SAME and mesh
tests:

1. Healthy simulated Thread path -> R2 is actually returned across OpenThread
   UDP, so the modeled LoRa adapter is not used.
2. Thread data arrives but the receiver *deliberately withholds* R2 ->
   sender records no authenticated Thread receipt, falls back to modeled
   LoRa, and receiving app suppresses a second activation of the same ID.
   **This models application receipt loss, not measured RF packet loss.**
3. After the OpenThread haptic process is stopped -> Thread send yields
   no application acknowledgment and modeled LoRa acknowledges.

### Reproduce with a separately built OpenThread simulator

OpenThread's standard simulation build produces `ot-cli-ftd` under
`build/simulation/examples/apps/cli`. From the OpenThread source checkout:

```sh
./script/cmake-build simulation
```

From this repository, with that absolute binary path:

```sh
npm ci
npm test
OT_CLI_PATH=/absolute/path/to/openthread/build/simulation/examples/apps/cli/ot-cli-ftd \
  node experiments/thread-alert/lab.mjs > evidence-mesh.json
```

Inspect `multiradio.healthy`, `multiradio.lostThreadReceipt`,
`multiradio.stoppedThreadNode`, and `multiradio.receiverEvents`. The
OpenThread version/build is not pinned by this repo; local evidence must
identify the binary source and commit. The existing simulated mesh lab has
previously shown intermittent ACK losses, so a single successful experiment
cannot establish reliability. Do not relax the existing baseline assertions
or infer a service-level delivery guarantee.

This code path does not use the live SDR observer, NOAA source authority,
LoRaWAN/ChirpStack, Spinel, physical LoRa modems, Matter devices, or human
notification. The `createSyntheticFabric` contract intentionally permits
simulation adapters and drill messages only.
