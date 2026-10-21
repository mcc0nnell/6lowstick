# Thread emergency alert receipt lab

**Experimental, non-life-safety test harness.** This demonstration uses four actual
`ot-cli-ftd` processes in OpenThread's POSIX simulated-radio network. It does
not create a real emergency warning, access IPAWS, or operate physical devices.

```text
synthetic evacuation gateway  (OpenThread leader, UDP 61617)
            │
            ├── UDP EA2|drill001|EVACUATE|<tag> --> "strobe"  (UDP 61616)
            ├── UDP EA2|drill001|EVACUATE|<tag> --> "display" (UDP 61616)
            └── UDP EA2|drill001|EVACUATE|<tag> --> "haptic"  (UDP 61616)
                      <-- UDP ACK1|drill001|<receiver> from each live receiver
```

## Run

From the Tronix repository checkout, with Node 22 and the POSIX simulation
`ot-cli-ftd` executable already built:

```sh
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd \
  node experiments/thread-alert/lab.mjs
```

The lab has **no additional npm dependencies**. It starts node IDs 10–13
(default; override with `THREAD_ALERT_BASE_ID=18`, for example). It creates a
mode-0700 private temporary working directory with fresh simulated flash per
run, and a randomized OpenThread `PORT_OFFSET` for radio-port isolation.
Override the latter with `THREAD_ALERT_PORT_OFFSET=75` only for controlled
reproduction when no other simulation uses that offset. The simulated nodes
receive a fresh operational dataset generated in-process; it is not logged.
The private temporary directory is removed after the spawned nodes exit.

## Assertions

1. All three healthy alert devices attach to the same real simulated Thread
   network and each returns a separate application UDP acknowledgement.
2. Re-sending the same alert ID yields a fresh ACK without invoking a second
   visual/haptic activation in the harness application.
3. After killing the simulated haptic receiver, a second alert is ACKed by
   the two live nodes; the missing haptic receipt is **reported missing**,
   even though the sender's UDP command may still return `Done`.
4. The final JSON includes per-recipient observed time from the start of send
   to the first matching **fresh** ACK. The harness exits nonzero on
   failed assertions.

## Evidence and limitations

- Output describes receipt at the **simulated receiver application**. It does
  **not** prove that a human saw, felt, or understood an alert.
- Duplicate suppression is in this Node.js harness, **not in OpenThread
  firmware**, and resets when the harness restarts.
- `EA2` / `ACK1` are lab-only ASCII framing formats. EA2 uses an ephemeral
  shared HMAC key and rejects forged messages, but there is **no**
  CAP parsing, authority provisioning, anti-replay persistence,
  COAP, multicast fanout, retry queue, delivery deadline policy, or external
  emergency-alert integration. Thread's own link security alone does not
  authenticate an emergency alert's originating authority.
- This is an isolated UDP test of the actual OpenThread data path, **not**
  an RF interference, power-failure, sleepy-end-device latency, or certification test.
- Never connect this fixture to a real alert actuator or represent it as
  certified or code-compliant fire/life-safety infrastructure.
- No modifications to Tronix's existing read-only Thread bridge,
  authority boundaries, or ongoing upstream OpenThread branches.

## Sensible next increment

Use a bounded, application-authenticated alert envelope, durable replay
tracking, signed source-policy verification, retries under congestion and
partitions, and a small separate real-hardware test. Treat the proof of
receipt as a measured observation, not a delivery guarantee.

## EA2 authentication prototype (integrated into simulated mesh)

`auth.mjs` provides a lab-only HMAC-SHA-256 envelope (`EA2|id|EVACUATE|tag`),
with a 128-bit truncated tag and constant-time comparison. Run its focused
negative tests with `node --test experiments/thread-alert/auth.test.mjs`.
The key must be provisioned out-of-band; this prototype does not define key
rotation, source authorization, durable anti-replay storage, or CAP/IPAWS
validation. The live simulator now uses authenticated EA2, including a forged-message rejection test.
Do not use this prototype for real emergency warnings.

## Durable replay journal prototype

`replay.mjs` appends authenticated alert IDs to a private per-receiver journal
and calls `fsync` before reporting a new activation. The live lab reopens the
strobe journal before resending `drill001` and verifies suppression. The
standalone test reinitializes the journal and rejects the same ID. This is
**not** a full simulated-device restart or a crash-consistent transactional
actuator protocol: journal/actuator ordering, storage failures, concurrent
writers, journal corruption, unbounded growth, key rotation and alert expiry
still need engineering. Journals are discarded with the private simulation
working directory at the end of each lab run.

## Synthetic NOAA SAME end-to-end path

The lab also feeds a **fixed synthetic** SAME header into the offline NWR
policy adapter, verifies that an out-of-area policy rejects it, and sends an
in-area, time-valid alert over the same real simulated OpenThread UDP path.
All three simulated accessible receivers must acknowledge the HMAC-authenticated
EA2 message. The synthetic `TOR` event is mapped to the lab's generic
`EVACUATE` token only to exercise the protocol; **this is not safe real-world
tornado guidance**. No NOAA radio receiver, audio demodulation, CAP feed,
physical actuator, or real public warning is involved.
