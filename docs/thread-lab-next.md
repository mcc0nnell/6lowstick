# Thread lab next steps — command sequence, evidence shape, and optional R2

**Simulation only.** These steps exercise the existing OpenThread POSIX simulated-radio lab and the reliability collector. They do not establish RF reliability, physical actuation, or human receipt.

## 1. Reliability-trial command sequence

Prerequisites: Node 22+, isolated `ot-cli-ftd` built as described in [monotonic evidence](monotonic-evidence.md).

```sh
# Clean checkout recommended
git clone https://github.com/mcc0nnell/6lowstick.git
cd 6lowstick
npm ci
npm test   # confirm baseline (97+ tests)

# Point at your isolated simulator binary
export OT_CLI_PATH=/absolute/path/to/ot-cli-ftd

# Run 10 serial independent trials (adjust --trials 1-20)
npm run evidence:reliability -- --trials 10 --out evidence/reliability-trials-10.json

# Optional: single lab run for detailed JSON (ACK1 path)
node experiments/thread-alert/lab.mjs > evidence/single-lab-run.json

# Optional: enable challenge-bound R2 receipts (additive; ACK1 assertions unchanged)
THREAD_ALERT_R2=1 node experiments/thread-alert/lab.mjs > evidence/single-lab-r2.json
```

The collector exits zero only when every trial meets the strict invariants (healthy 3/3 ACK, forged rejected, replay suppressed, deliberate haptic stop correctly missing, nonempty monotonic events). Failures are preserved in the aggregate JSON; do not widen the 2.5 s window to hide them.

## 2. Expected evidence shape

`evidence/reliability-trials-*.json` (gitignored) contains approximately:

```json
{
  "schema": "6lowstick.reliability-trials.v0",
  "sourceCommit": "<git rev-parse HEAD>",
  "otBinarySha256": "<sha256 of ot-cli-ftd>",
  "nodeVersion": "v22.x",
  "trials": 10,
  "completedAsExpected": 10,
  "failedOrIncomplete": 0,
  "harnessEventsPerTrial": 49,
  "observedMissingHealthy": [],
  "notes": "Intermittent haptic ACK gap from 2026-10-20 did not recur in this sample."
}
```

A single `lab.mjs` run produces a richer object with `baseline`, `rejected`, `replay`, `sameGateway`, `degraded`, `timing` (monotonic harness events), `r2Enabled`, `r2VerifiedCount`, and the explicit warning that ACKs are application receipts only.

Record the exact source commit, binary SHA-256, and Node version with any sample. Local evidence files are not public machine-verifiable proof.

## 3. Optional R2 receipts (implemented)

Existing receivers always emit `ACK1|id|receiver`. When `THREAD_ALERT_R2=1`, they also emit a challenge-bound `R2|id|receiver|nonce|tag` (HMAC-SHA256 truncated, 96-bit nonce) using `signReceipt` from `src/fabric/receipts.mjs`.

Gateway packet parser accepts both formats. R2 packets are verified with `verifyReceipt` and logged in `r2Verified` / telemetry (`r2_verified` events). Existing ACK1 matching, 2.5 s window, and all assertions remain unchanged. When the flag is set, an additional assertion requires exactly 3 verified R2 receipts on the baseline phase.

Default behavior (flag unset) is identical to prior lab runs. This remains a lab-only shared-key scheme. Do not treat R2 verification as proof of physical actuation or human comprehension.

## 4. Recommended immediate sequence

1. Run the 10-trial collector on the current main (or this branch / PR #8 head) and record whether the 20 Oct intermittent gap reappears.
2. Optionally run with `THREAD_ALERT_R2=1` and confirm `r2VerifiedCount` and the baseline R2 assertion.
3. Only after simulation confidence is adequate, follow the physical-radio test protocol for any RF claims.

See also: [reliability-trials.md](reliability-trials.md), [multiradio-fabric.md](multiradio-fabric.md), open PR #8.
