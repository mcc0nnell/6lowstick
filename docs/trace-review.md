# Offline trace review and claim checking

**Status: deterministic software-only baseline.** This command reads the
committed [Field Station synthetic fixture](../site/multiradio.json). It
makes no radio, actuator, network, AI-model or alert-dispatch calls.
It is not a live telemetry processor or a reliability test.

## Why this exists

An AI-assisted analyst may describe an application ACK as though a person
received a notification. This evaluator supplies a reference judgment,
evidence pointers, explicit unknowns, a bounded possible explanation and
a proposed *test* for each synthetic scenario. It also checks structured
interpretations against those reference judgments before anyone treats a
generated report as factual evidence.

It does **not** evaluate free-form prose, model security, user outcomes, or
a physical radio lab. The typed checker deliberately rejects extra prose
rather than pretending to validate it.

## Reproduce

From the repo root with Node.js 22+:

```sh
npm run evidence:review
npm run evidence:review -- --template > /tmp/6lowstick-claims.json
npm run evidence:review -- --check /tmp/6lowstick-claims.json
npm test
```

The default command emits `6lowstick.trace-review.v1` JSON with a SHA-256 of
the exact committed synthetic evidence file. `--template` produces a
structurally valid example of `6lowstick.trace-claims.v1`, **not an independent
AI evaluation**. The `--check` mode reads one JSON file, prints a
`6lowstick.trace-claim-check.v1` result and returns exit code 0 on PASS,
1 on unsupported typed claims, 2 on invalid input. There are no output
files written by the tool; shell redirection is optional.

A structured candidate must provide exactly one entry for every named
committed scenario and exactly these fields:

- `scenario_id`, `application_state`, `receiver_journal_state`;
- `physical_output`, `human_detection`, `human_comprehension`
  (all three **unknown** for the current fixture);
- `evidence_references` using exact, scenario-scoped JSON paths such
  as `scenarios[4].receipt.attempts[0]`.

Only two application classifications are justified by this fixture:
`authenticated_application_receipt` and `unconfirmed`. A receiver
journal can report a `synthetic_activation_recorded` or `none_recorded`.
The latter does not prove that a physical device failed to actuate.
An invalid receipt never counts as a successful application receipt, and a
scripted duplicate suppression never counts as a second activation.

`evidence_references` are *structural references to fixture entries*,
not signatures, endorsements or RF measurements. The output includes
hypotheses and next tests as **proposals**, not established causes or
authorization to perform a physical experiment.

## Optional OpenThread POSIX simulated-radio report (PR #8)

For a *separately generated*, complete, locally retained
`experiments/thread-alert/lab.mjs` result from PR #8, use:

```sh
npm run evidence:review -- --posix /path/to/mesh-run.json
npm run evidence:review -- --posix /path/to/mesh-run.json --template > /tmp/posix-claims.json
npm run evidence:review -- --posix /path/to/mesh-run.json --check /tmp/posix-claims.json
```

This optional mode expects the **specific** `tronix.thread-alert-lab.v1`
output with the `6lowstick.posix-multiradio.v0` section. It does not
execute the lab, launch OpenThread, commission devices, or generate a radio
transmission. The mode refuses incomplete/error-bearing results,
unexpected transport descriptions, physical-RF or human-delivery flags,
inconsistent application receipts, mismatched receiver-journal IDs,
or a failed original lab baseline/security invariant.

The three source cases remain separate:

- `healthy`: OpenThread POSIX simulated UDP reports one authenticated
  application receipt.
- `lostThreadReceipt`: a deliberately withheld *application* receipt
  leads to a **scripted** LoRa fallback and suppression of a second
  synthetic application activation.
- `stoppedThreadNode`: stopping the OpenThread simulated receiver process
  leads to an unconfirmed Thread attempt and **scripted** LoRa fallback.

Source pointers map to actual report JSON paths, including the original
`multiradio.receiverEvents[n]` indices. Grouping entries by scenario does
**not** invent an interleaved timeline or on-air timestamps. The CLI
SHA-256 identifies the *input bytes* for comparison, **not the authenticity
of the lab execution, simulator build, or radio measurements**. Verify the
simulator source commit, binary hash, environment and complete trial log
separately. Existing intermittent ACK failures remain unresolved.

All POSIX evidence is still **simulation**. The LoRa leg is a scripted
peer-to-peer application route, not a LoRaWAN or physical modem. Neither
a simulated receiver activation nor a positive application receipt
verifies electrical/optical/haptic output, person detection, or
comprehension. Do not merge these records with field-reliability
denominators. The optional mode can be exercised against PR #8 before
that PR merges, but is not itself proof that PR #8 is integrated into
`main`.

## Negative evaluations

`test/trace-review.test.mjs` rejects invented authenticated receipts,
asserted physical output, asserted human detection or comprehension,
a spoofed cross-scenario reference, missing/duplicate scenarios, free-form
extra claims, and internally inconsistent receipt records. The test
also verifies nonzero CLI exit codes. These are specific deterministic
invariants, **not proof that a language model is reliable**.

## How it fits the larger program

This supplies an audit boundary for the initial read-only evaluator
discussed in [OpenThread + AI](ai-physical-systems.md). It does **not**
integrate an AI engine. A future model may propose a *typed* interpretation
of an exported trace; deterministic comparison can reject unsupported
claims while leaving diagnosis clearly labeled as a hypothesis.

The **default committed Field Station fixture** is entirely scripted.
The optional POSIX mode consumes a separate caller-supplied report and
keeps those cases and source references distinct; it does not change the
Field Station dataset. Do not ingest physical bench records. New source
types require their own provenance, trust model and acceptance rules.
