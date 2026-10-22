# Signal intent v0 — admission is not delivery

**State: local, software-only proposal.** This is a constrained shape for expressing a physical-world signaling intention; it is not a radio frame, cryptographic identity, discovery protocol or deployable device API. The implementation lives at [`src/signals/offline-planner.mjs`](../src/signals/offline-planner.mjs), with a deterministic [example](../scripts/first-light-demo.mjs).

## Message

The general-purpose canonical *research proposal* parser, [`src/signals/intent.mjs`](../src/signals/intent.mjs), accepts exactly `schema` (`6lowstick.signal-intent.v0`), `id`, `source`, `target`, `kind`, `purpose_code`, `modality`, `issued_at_ms`, `expires_at_ms`, `simulation: true`, and `drill: true`. Its local policy scopes sources, targets, kinds, purposes, modalities, and maximum TTL. This is a proposal for simulation only, not execution authority. Its supported categories are `presence`, `request`, `condition`, `coordination`, and `warning`; the latter does **not** authorize an emergency warning.

A separate friend/check-in *fixture planner*, [`src/signals/offline-planner.mjs`](../src/signals/offline-planner.mjs), accepts only `schema` (`6lowstick.offline-fixture-intent.v0`), `signal_id`, `sender`, `recipient`, `kind`, `created_ms`, and `expires_ms`. This is intentionally a **different schema**, not an incompatible encoding of the general-purpose proposal. Names are 1–32 ASCII letters, digits, underscores or hyphens; times are nonnegative safe millisecond integers. Unknown fields fail closed, including arbitrary text, coordinates, emergency origin claims and self-declared consent.

The fixture planner supports `presence`, `check_in`, `coordination`, `assistance_request`, `sensor_event`, and `test_beacon`. **There is no live emergency-dispatch kind.** These labels do not grant permission to transmit or actuate anything.

`createOfflineSignalPlanner` requires explicitly supplied, constrained, local *fixture* grants matching sender, recipient, kind and expiration. Presence additionally requires a fixture-level `presence_opt_in: true`; absence is a rejection. All intents expire after at most five minutes; presence expires within 60 seconds. Caller-controlled clocks are used for deterministic tests. An in-process ID set rejects duplicates in that planner instance; it is **not** persistent or sufficient to prevent wire replay. The general-purpose parser and policy evaluator also require the caller to maintain replay state; evaluating a proposal does not itself update the supplied replay set.

## Evidence ladder

| Boundary | Today | Stronger evidence required |
| --- | --- | --- |
| Intent proposed | Strict typed local fixture input | Identity, consent and rate limits from an independent trust domain |
| Local plan admitted | Fixture grant and basic TTL / duplicate checks | Signed, revocable authorization and durability |
| Transport attempted | **No** | Instrumented Thread send and provenance |
| Application acknowledged | **No** for this protocol | Independently authenticated receiver application receipt |
| Physical output observed | **No** | Calibrated external sensor or bench instrument |
| Human noticed / understood | **Unknown** | Opt-in separately measured research with clear consent |

The existing alert-shaped synthetic fabric is a *separate* exercise. Its HMAC app receipt is not evidence that this new intent was transmitted, and the new planner is not wired to it. The returned plan has `transport_attempted: false` and all physical/human verification fields false.

## Friend finding is the core experience

The future 6lowStick experience should let mutual friends find each other nearby or offline where practical. Peer discovery must be **off by default**, explicitly visible and revocable, recipient-scoped, short lived, and pseudonymous. A presence fixture flag is not proof of two-party consent; there is no real discovery mechanism, secure contact pairing, encryption, shared location, data retention policy or device audit yet. Those belong to a separate threat-model and implementation gate before real people use it.

## Local reproduction

```sh
node scripts/first-light-demo.mjs
node --test test/signal-intent.test.mjs test/offline-signal-planner.test.mjs
```

Neither command transmits packets, runs a radio, records participants or invokes an actuator.
