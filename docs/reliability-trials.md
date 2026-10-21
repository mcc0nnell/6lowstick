# Bounded OpenThread simulation reliability trials

6lowStick has previously observed an intermittent missing application ACK during an otherwise healthy four-node OpenThread POSIX **simulated-radio** run. A single successful simulation does not establish a failure probability or operational reliability. This collector preserves failing outcomes instead of discarding them or widening the lab's deadlines.

## Reproduce

Build an isolated `ot-cli-ftd` using the source/build settings in [monotonic evidence](monotonic-evidence.md). Use Node.js 22+.

```sh
npm ci
npm test
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run evidence:reliability -- --trials 3
# Optional: --out evidence/reliability-trials-custom.json
```

The runner executes **1–20 serial, independent** four-node synthetic trials; default is 3. It reuses the existing strict lab and gives each child its own temporary simulator state, ephemeral authentication key, and simulated port offset. Trials time out after 120 seconds individually. They are not parallel, do not dispatch public alerts, and do not require a hardware transmitter.

The local output is `evidence/reliability-trials.json`, ignored by Git. It contains the source commit, OpenThread binary SHA-256, Node version, trial duration, completion/failure state, observed missing receipt sets when available, and the count of monotonic *harness* events. Do **not** mistake elapsed harness time for on-air packet time. If the lab fails before producing complete evidence, the summary says so explicitly. A receipt-only stderr diagnostic may identify the most recent failed phase and missing receivers; no HMAC secrets, signed wire envelopes or alert IDs are copied into the aggregate.

**Exit code:** zero only when *every* trial completes with the exact expected synthetic invariants. A nonzero exit means one or more trials failed or were incomplete; the aggregate report is still written. This is an intentional hard failure, not an excuse to silently rerun until green.

## Required observations

- Healthy baseline and independent synthetic SAME phase: all three simulated applications acknowledge.
- Forged envelope: no application acknowledgement or activation.
- Replayed envelope: application ACK without a second activation.
- Deliberate haptic process stop: missing haptic ACK, with strobe and display still acknowledging.
- No unexpected harness errors, no failed CLI sends, and nonempty monotonic harness observations.

The sample size is explicitly reported. `completed_as_expected` is **not** a statistically defensible physical delivery rate, RF coverage measurement, system availability SLA, device actuation proof, or evidence of human receipt. A timed-out, malformed or crashing child cannot count as success; any missing receipt in a nominally healthy phase is recorded as a failure.

## Follow-on investigation

If a trial fails, investigate its phase, receiver, simulator state and reproducible source/binary hashes. Preserve the failure evidence and reproduce under the same OpenThread build before modifying deadlines. When confidence from simulation is adequate, physical RF, independent actuator measurements, and human-centered accessible notification studies must be designed and evaluated separately, with applicable radio controls and safety review.

## Recorded ten-trial sample — October 21, 2026

A clean-checkout run on Butcher completed all **10 of 10** independent,
serial OpenThread POSIX simulated-radio trials as expected, with **zero**
unexpected healthy-phase application ACK gaps, 49 monotonic parent-harness
events per trial (490 total), and the intended missing haptic receipt after
each deliberate simulated receiver stop. Individual trial durations ranged
from **17,638 to 19,219 ms**. Source commit:
`16472255aebf2b55bec4b208b4fdfa5683cd2569`
(clean worktree); Node `v22.23.3`. Simulator binary SHA-256:
`679e6a0f719f98c04049f7a7f35f615b8a1c155999c66f317616e46810a8d543`.

Local ignored evidence:
`evidence/reliability-trials-10.json`. The report was not committed
and should not be described as public machine-verifiable evidence.
The earlier intermittent ACK gap did **not** recur in these ten trials,
but remains an unresolved reliability question. This limited sample
does **not** estimate real-world radio reliability or human receipt.
