# 6lowFlare — signal what matters

**6lowLoop finds your people. 6lowFlare lets a group signal. 6lowStick
investigates how a signal can become a perceptible physical event.**

6lowFlare is a core product direction, not another emergency-only alert
protocol. The first implementation deliberately models a narrow question:

> Can an opt-in participant issue a short-lived signal to a prearranged
> audience, have another authorized node relay it, and avoid pretending that
> an application's receipt means a person noticed anything?

**Current answer:** yes as a process-local, authenticated relay *model*.
There is no actual network, location discovery, Matrix login, radio,
physical activation, public broadcasting or human-receipt measurement.

## The first slice

Run from the repository root with Node 22+:

```sh
npm run flare:demo
node --test test/flare.test.mjs
```

`src/flare/core.mjs` exports `create6lowFlare` and `flareCodes`.
An endpoint starts disabled unless explicitly enabled. Relay permission is
independent and defaults to off.

1. Pre-provision an `audience` with an arbitrary **local** label, unique
   32-byte key, and allowed codes; keys must be distributed through a trusted
   out-of-band path. Neither Matrix nor radio pairing exists here.
2. Enable the sender and choose an authorized audience and one of the
   controlled semantic codes: `here`, `rendezvous`, `attention`, `assistance`.
   There is no free-form text, GPS coordinate, user ID, or message body.
3. `flare(audience, code, {now, ttlMs, hops})` returns a HMAC-authenticated
   frame containing a minute-rotated, audience-keyed token, fresh 12-byte
   nonce, expiration and signed hop budget. Maximum TTL: **120 seconds**.
   Maximum relay budget: **4**.
4. `receive(frame, {now})` checks schema, MAC, group membership, code
   authorization, lifetime, and process-local replay journal. It returns
   a modeled application admission event and, **only if separately opted
   into relay**, a newly authenticated frame with one fewer hop remaining.
5. Application admission may include local requested modality **labels**
   (`text`, `haptic`, `light`). No code opens a radio, emits a notification
   or drives an actuator. `physicalOutput`, `humanDetected` and
   `humanUnderstood` are always `unknown`.

```mermaid
flowchart LR
    A["Alice: opt-in flare"] -->|HMAC frame, hops=1| S["Sam: authorized relay"]
    S -->|re-authenticated, hops=0| B["Bob: model application receipt"]
    B --> U["Physical output: unknown"]
    B --> H["Human noticed: unknown"]
```

The simulator caller wires these frames together manually; there is
**no transport abstraction or automatic rebroadcast loop** in this PR.

## 6lowFlare versus 6lowLoop

| | 6lowLoop | 6lowFlare |
| --- | --- | --- |
| Human purpose | Find/reach a mutually paired friend | Signal a purpose to an authorized audience |
| First executable slice | Opt-in in-memory presence and ping/ACK | Opt-in in-memory bounded audience flare and relay |
| Credentials today | Pairwise friend HMAC keys labeled with Matrix IDs | Distinct pre-provisioned per-audience HMAC keys |
| Radio, location or internet | None | None |
| Planned relationship to Matrix | Verified identity, encrypted messaging and group membership | Future authorized group/addressing adapter; **not** Matrix traffic |

## What the security boundary actually means

- **Audience membership is not individual sender attribution.** Every node
  holding a shared group key can originate or re-sign a flare; these frames
  do not prove which group member sent them. Relays that possess the key can
  also re-sign the hop budget, so the decrement is a **cooperative model**,
  not Byzantine-resistant enforcement.
- **HMAC is not encryption.** The purpose code, nonce, timestamps and hop
  budget remain readable to passive observers. Tokens rotate each minute
  but can still be linked within a window. Traffic timing can reveal
  presence even without a location field.
- **No public flare mode.** An unauthenticated stranger cannot join,
  receive or rebroadcast. Actual public/community signaling needs a
  separately designed trust, consent, abuse and relay-budget policy.
- **No automatic discoverability.** Access to an audience key is a manual
  assumption in this lab, not evidence of consent, correct group
  membership, device verification or permission to reveal someone's
  whereabouts. A production version needs block/revoke, secure key
  distribution, rotation, lost-device handling, anti-stalking controls
  and an immediately accessible stop/disappear affordance.
- **No persistent replay defense.** The cache is bounded to 1,024
  observations and volatile; restart, compromise, colliding nonces,
  clock manipulation and real network partitions require further work.
- **No operational alerts.** `assistance` is a synthetic purpose label,
  not an authenticated emergency declaration. This prototype must not
  originate public warnings, actuate devices or trigger safety responses.

## OpenThread POSIX simulated-radio integration (follow-up PR)

The second executable research slice exercises **actual simulated-network UDP**
between three `ot-cli-ftd` processes, using OpenThread POSIX **simulated
radio**, not mock driver calls. It requires a separately built OpenThread CLI:

```sh
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd npm run flare:posix
node --test test/flare-posix-output.test.mjs
```

The optional harness creates a private temporary flash directory, picks an
isolated simulation port offset, brings up a three-node Thread network, and
cleans up spawned processes and files on exit. `FLARE_POSIX_BASE_ID` (default
22, permitted 1–27) and `FLARE_POSIX_PORT_OFFSET` (default randomized,
permitted 1–500) control isolation when several experiments share a machine.

The transport codec `experiments/flare/posix-transport.mjs` encodes a bounded
ASCII `FL1` frame; the *receiving application* validates the complete HMAC,
audience, TTL, token, hop count and replay state with `src/flare/core.mjs`.
Application acknowledgments are separately HMAC-bound `FA2` replies:
the sender must observe a matching, authenticated receipt **after** sending;
an `ot-cli` `Done` response is not evidence of delivery.

The fixture exercises:

1. Gateway (Alice) sends `here` to Sam with one permitted relay hop.
2. Sam's enabled relay validates it, sends an application receipt and forwards
   a re-signed hop-zero frame to Bob over a second simulated UDP route.
3. Bob validates it, sends an application receipt, and writes a **modeled**
   request for light/haptic outputs into a separate in-memory recorder.
4. The fixture injects an observation for **light only**, leaving the
   haptic fixture observation absent. Neither is a physical measurement.
5. Repeating Alice's identical frame is rejected without another application
   admission or relay. The assertion measures **one** successful local run,
   not transport reliability.

The output recorder `src/flare/output-evidence.mjs` requires an explicit
application admission and a second explicit **scripted fixture observation**.
It never translates either into `physicalOutput: verified`; real photometry,
vibration sensing, human detection and comprehension are all **unknown**.
An absent fixture observation does not establish that a real light or motor
failed.

The `FA2` group-key receipt validates a participant *holding the shared
key*, not an independently attested Bob or Sam. The key also enables
members to re-sign the hop count. A real deployment needs device-bound
identity, per-sender authorization, revocation, anti-stalking consent UX,
traffic-volume and power limits, and physical observation.

The optional POSIX test is **not** built or pinned in CI; the current CI
checks the codec, fake-CLI negative tests and output-recorder behavior.
The POSIX binary and compiled radio model must be separately provisioned.
There is no automatic broadcast listener, background relay daemon,
on-air RF, LoRa fallback, Matrix E2EE integration or emergency dispatch.

## Evidence ladder / next integration gates

1. Expand the opt-in OpenThread POSIX research harness to measure packet
   size, repeated trials, partitions, retries, group/device pairing and
   relay loops (the first 3-node simulated UDP exercise now exists).
2. Integrate real Matrix identity/device verification and membership
   through an explicitly authorized bridge. Matrix homeservers and E2EE
   sessions are not replaced by offline HMAC frames.
3. Add independent permission checks and recipient-controlled output
   preferences for text, haptic and light. Record the **device action**
   independently from application receipt.
4. Measure physical RF delivery on an authorized bench, including
   Thread/Spinel, separate direct-LoRa transport and network partitions.
5. Validate human detection and comprehension through consent-based
   accessible testing. No synthetic test can establish life-safety reliability.

See [6lowLoop](6lowloop.md), [signal intent](first-light/README.md),
[physical radio protocol](physical-radio-test-protocol.md) and
[threat model](threat-model.md) for adjacent boundaries.
