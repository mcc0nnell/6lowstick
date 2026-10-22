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

The current fixture is entirely scripted, even though a separate
OpenThread POSIX simulated-radio experiment is under review in PR #8.
Do not ingest physical bench records or present PR #8's stopped-receiver
experiment as a committed Field Station scenario. New source types need
their own provenance, trust model and explicit acceptance rules.
