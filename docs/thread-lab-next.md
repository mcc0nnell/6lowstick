# Thread lab next steps — command sequence, evidence shape, and R2 sketch

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

# Optional: single lab run for detailed JSON
node experiments/thread-alert/lab.mjs > evidence/single-lab-run.json
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

A single `lab.mjs` run produces a richer object with `baseline`, `rejected`, `replay`, `sameGateway`, `degraded`, `timing` (monotonic harness events), and the explicit warning that ACKs are application receipts only.

Record the exact source commit, binary SHA-256, and Node version with any sample. Local evidence files are not public machine-verifiable proof.

## 3. Code sketch — optional R2 receipts from Thread lab receivers

Existing receivers emit `ACK1|id|receiver`. The synthetic fabric uses challenge-bound `R2|id|receiver|nonce|tag`. To exercise the same receipt format on the real simulated UDP path without breaking current assertions, add an optional phase.

Minimal sketch (insert after the existing ACK1 send inside the receiver `onPacket` handler, gated by an environment variable):

```js
// Inside node.onPacket, after the ACK1 send (preserve existing path):
if (process.env.THREAD_ALERT_R2 === '1') {
  const nonce = randomBytes(12).toString('hex'); // 96-bit challenge
  const r2 = signReceipt(alertKey, alert.id, node.name, nonce); // from src/fabric/receipts.mjs
  await node.command('udp send ' + gateway.address + ' ' + PORT_ACK + ' ' + r2);
  // Gateway side must be extended to parse and verify R2 in addition to ACK1.
}
```

Required supporting changes (not yet applied):
- Import `signReceipt` / `verifyReceipt` from `src/fabric/receipts.mjs`.
- Extend the gateway packet parser regex and `activeSend` matching to accept R2 and verify the nonce/challenge.
- Add a dedicated phase that sends an alert, collects R2 receipts, and asserts verification succeeds while the journal still suppresses duplicates.
- Keep the existing ACK1 assertions and 2.5 s window unchanged.

This remains a lab-only shared-key scheme. Do not treat R2 verification as proof of physical actuation or human comprehension.

## 4. Recommended immediate sequence

1. Run the 10-trial collector on the current main (or PR #8 head) and record whether the 20 Oct intermittent gap reappears.
2. Add a short “Current evidence status” note to `experiments/thread-alert/README.md` citing the latest sample size and the still-open caveat.
3. Optionally implement the R2 optional phase behind the env flag and re-run the trial collector.
4. Only after simulation confidence is adequate, follow the physical-radio test protocol for any RF claims.

See also: [reliability-trials.md](reliability-trials.md), [multiradio-fabric.md](multiradio-fabric.md), open PR #8.
