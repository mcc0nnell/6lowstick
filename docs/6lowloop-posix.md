# 6lowLoop First Journey — OpenThread POSIX UDP

**Status: experimental simulated-radio adapter. Not physical RF, Matrix, or an accessible hardware notification.**

The existing in-memory [First Journey](6lowloop-first-journey.md) models two consenting friends finding one another. This optional runner replaces its in-memory JSON transfer with **two actual OpenThread POSIX simulated nodes** exchanging compact authenticated application frames over simulated-radio IPv6 UDP.

## Run on a host with OpenThread POSIX

Use a compatible, separately compiled `ot-cli-ftd` binary (as required by the existing [6lowFlare POSIX lab](6lowflare.md)):

```sh
npm ci
npm test
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --json
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --scenario drop-ack
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --scenario expired
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --scenario offline
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run loop:posix -- --sam-disabled
```

The tool **refuses to run without an absolute existing simulator binary**. The test suite includes an opt-in actual network integration test: set `OT_CLI_PATH` when running `node --test test/loop-posix.test.mjs`. Without it, codec/security and missing-binary tests still run, but the real POSIX test is skipped. CI success alone is **not** evidence that a two-node OpenThread simulation ran.

## Transport and receipt contract

- Creates one simulated OpenThread dataset and attaches Alice and Sam as separate `ot-cli-ftd` nodes. Each opens UDP and binds a distinct port. A per-run `PORT_OFFSET` isolates POSIX simulated-radio processes on the same host.
- Existing pairwise `create6lowLoop` produces presence/ping/ACK envelopes. New `LO1` compact ASCII encoding carries only authenticated frame fields: no Matrix IDs, coordinates, pairing keys, or arbitrary text. The receiving Loop core validates HMAC, freshness and replay state.
- The receiving application signs an `LR1` presence receipt, bound to sender's frame nonce, receiver label and kind. Both authenticated presence receipts are required before sending the ping.
- Sam processes the ping and can send the existing signed Loop `ack` envelope. In `drop-ack` the harness deliberately withholds that response, so the report distinguishes **Sam processing a ping** from **Alice receiving its ACK**.
- The `here` signal reuses the existing `FL1` 6lowFlare UDP codec and `FA2` application receipt validation. It requests text/haptic modalities **without** actuating a device; a replayed signal is refused by the receiver core.
- Scenarios `offline` and `expired` are controlled application fault injections, not measured RF coverage or packet loss. Inactive peers transmit no application frames.
- The JSON report records observed per-node application admissions, receiver-authenticated receipts, the bounded replay counter, and unknown physical/human outcomes. Source labels and synthetic keys are controlled by this one local test runner; neither device identity attestation nor field deployment is established.

## Scope and acceptance

The operator must control the research host and choose appropriate `LOOP_POSIX_BASE_ID` (default 14, range 1–27) and `LOOP_POSIX_PORT_OFFSET` (randomized 20–499) to avoid simulated network clashes. Actual `ot-cli-ftd` behavior, simulated-node startup timing, packet delivery, and repeatability still require an executed on-host integration run; passing JavaScript unit tests does not validate those stages.

This experiment provides **simulated-radio UDP application processing**, not hardware 802.15.4 emissions, direct-LoRa transport, a running Matrix session, peer proximity or trustworthy friend location, an actual LED/haptic/text display, or human detection/comprehension. The demo keys are ephemeral on each run and are not Matrix verified-device credentials. Do not use this for emergency warning or real-world friend tracking.

The next meaningful laboratory gate is to run and capture the two-node POSIX experiment on an authorized host, save redacted receipts and source/binary hashes, then progress to separately funded and authorized hardware validation.
