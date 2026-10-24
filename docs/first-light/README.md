# First Light: software-first milestone

**Status: preparatory research, not a hardware demonstration.** No equipment has been purchased or funded. No physical LEDs, haptics, RF, sensors, on-air tests, or human perception data are supplied by this milestone. Its purpose is to make the first hardware experiment *fundable, reproducible, and falsifiable* before procurement.

## The next demonstration

An authorized **synthetic** signal requests a local, perceivable response. A laboratory receiver may eventually turn on a light, drive a haptic motor, or display text. An **independent instrument**, not the sender or receiver's assertion, must measure the actual physical output. Separately, any participant studies must measure detection and comprehension with consent.

The intended separation is:

```text
synthetic signal intent -> local policy -> transport attempt -> application ACK
                                                   |
                                        receiver-side evidence
                                                   |
                                  independent physical-output sensor
                                                   |
                                   optional opt-in human evaluation
```

None of the last three outcomes may be inferred from an earlier stage. A receipt is evidence of modeled application processing, not illumination or perception.

## What can be implemented before funding

- A bounded `6lowstick.signal-intent.v0` **local-only** data contract for `presence`, `request`, `condition`, `coordination`, and `warning` with `light`, `haptic`, or `text` as proposed modalities.
- Deterministic policy evaluation of source, destination, purpose code, category, modality, TTL, time and externally supplied replay IDs. This is not a device-authorizing security principal or a cryptographic grant. A calling experiment must persist replay state separately.
- Fail-closed rejection of unknown keys and speculative outcomes, with negative tests. There is **no connection to `createSyntheticFabric`, a socket, or any actuator**. All intents require `simulation: true` and `drill: true`.
- A proposed independently measured bench protocol, procurement gates and funding case.
- An experimental **source-only** release candidate, subject to the [maintainer's explicit release approval](../release-candidate.md#before-an-actual-tag-or-github-release).

## Reproduce the admission boundary

From a local Node.js 22+ checkout:

```sh
node --test test/signal-intent.test.mjs
npm test
npm run site:check
npm run release:check
```

The module is `src/signals/intent.mjs`. Calling `evaluateSignalIntent(intent, {policy, nowMs, seenIds})` yields either `DENY` or `SIMULATION_ONLY`, with all application, physical, and human outcomes `unknown`. The caller must provide a trusted local *simulation* policy and an independently maintained replay-ID set. No side effects occur, and this function provides no transport or hardware capability.

## Funding-to-hardware gates

1. **Fund and procure:** identify a grant, contract, partner lab or donated gear; document paid engineering time and laboratory operating support. Do not order devices against unawarded funds.
2. **Control the lab:** designate operator, authorized location, operating rules and fail-safe mechanism. Follow the existing [controlled physical radio protocol](../physical-radio-test-protocol.md). Do not connect public alert origination.
3. **First Light:** establish an instrumented single output (LED or haptic) under controlled conditions; measure its electrical/optical or mechanical output separately from an application acknowledgment. Record failed and censored trials.
4. **Thread on-air:** only with compatible hardware and authorization, add a Thread-only bench and passive RF evidence; *then* propose direct-LoRa as a separate approved physical test.
5. **Accessibility validation:** after ethics, privacy and opt-in procedures, compare independent detection and comprehension outcomes. Do not substitute lab success for participant results.

**Stop immediately** on unexpected output, uncertain RF authority, malformed/unbounded actuation, real warning inputs, replay confusion or lost independent measurement. No trials may be called successful when sensing is absent or data are missing.

The [funding case](funding-case.md) contains staffing, equipment and measurement assumptions. The draft [non-dilutive funding plan](non-dilutive-funding-plan.md) tracks program fit, recipient eligibility, non-overlapping budget workstreams and submission gates, with separate [Alpha-Omega security](alpha-omega-security-brief.md), [ARDC open-radio](ardc-open-radio-concept.md) and [NSF commercialization](nsf-project-pitch-outline.md) briefs. None have been submitted. The [release handoff](release-readiness.md) preserves the tag/approval boundary. The exact [Blade-admitted composition brief](composition-prompt.md) preserves the task inputs; Blade evidence is an authorization/provenance check, not a substitution for measured results.
