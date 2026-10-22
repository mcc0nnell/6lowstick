# Composition brief — 6lowStick First Light

**Operator-approved scope:** compose and implement the software and funding-readiness work we can complete without buying hardware or receiving a grant. Use WindAnvil Blade as the local admission/evidence boundary for a read-only verification step. Do not impersonate a model execution when Blade has only deterministic capabilities.

## Product

6lowStick is the proverbial glow stick for the physical world: an open, low-power means to signal presence, a need, a change, or a warning, eventually with independently verifiable light, haptic, text or relay outputs. **Finding and connecting with friends is a core use case**, not a bolt-on. A Loopt-inspired experience must require mutual opt-in, short-lived presence, and the ability to disappear; no persistent tracking, GPS broadcast, or covert discovery by default. Emergency signaling is one specialized use case, not the whole product.

## Existing baseline

Preserve the merged OpenThread POSIX simulated-radio lab, scripted LoRa fallback, R2 application receipts, source release gates, read-only Field Station/TUI, and the known intermittent ACK reliability caveat. Software ACK != independently measured physical response != human detection != comprehension. NOAA observation is never a dispatch authorization. Do not weaken tests, trust policy, or experimental labels.

## Deliverables

1. Implement a small, strict `signal-intent.v0` proposal policy **and** a distinct local offline-fixture admission model, isolated from live transports and actuators. Permit bounded check-in, consented presence and other general-purpose signal types; require explicit operator-supplied local fixture grants, expires-at timestamps, a bounded ID, fail-closed unknown fields and in-process duplicate rejection. Do not call it cryptographic authentication, durable replay protection, or verified consent. Include negative tests and a deterministic CLI example.
2. Write a precise protocol note separating proposal/admission, transport send, application receipt, observed actuator response, human detection and comprehension. Define consent and friend-discovery gates for later.
3. Write the `v0.2.0 — First Light` engineering roadmap and first physical bench protocol, with conditional procurement and independent measurement acceptance criteria. No fake hardware observations.
4. Produce a grant-ready 12-month $275,000 **illustrative** research budget, case for support, milestones, and evidence matrix. Distinguish unquoted projections from actual vendor quotes; no application submission or personal financial claims.
5. Keep `v0.1.0-rc.1` as a strictly source-only release candidate pending exact-maintainer-commit/tag approval. Run local release gates and twice check reproducible source-archive digests only after a clean committed source tree. Do not create a GitHub release or npm publication without that gate.
6. Run bounded validation through the existing, admitted WindAnvil Blade -> TalkPipe path against a read-only first-light audit script. Record what it actually verifies, with its limitations. Do not claim Blade generated code, provisioned hardware, or measured RF.
7. Produce one focused GitHub PR with commit/test/CI evidence. Keep blast radius small and do not touch live alert routing or production secrets. Merge only after checks pass.

## Non-goals until funded

No hardware orders or physical radio operation; no public signal dispatch, CAP/IPAWS feed or life-safety claims; no physical light or haptic confirmation, GPS tracking, real peer discovery, user data collection, human subjects or enrollment, grant submission, billing, or deployed services.

## Review checklist

`npm ci`, `npm test`, `npm run site:check`, `npm run release:check`, `git diff --check`, local admission-model negative tests, CLI output, source archive determinism, PR CI, and explicit per-gate evidence. Record refusals as refusals rather than widening permissions.
