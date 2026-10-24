# 6lowLoop — First Journey (software-only)

**Status: process-local integration demonstration.** This exercise connects
existing 6lowLoop pairwise presence/ping/ACK and 6lowFlare group signaling into
one user-facing sequence. It is **not** OpenThread POSIX, BLE, LoRa, Matrix,
live networking, radio range measurement, a hardware display, a haptic actuator,
or a human-notification test.

## Run

Requires Node.js 22+ in the project checkout:

```sh
node scripts/loop-experience-demo.mjs
node scripts/loop-experience-demo.mjs --scenario drop-ack
node scripts/loop-experience-demo.mjs --scenario offline
node scripts/loop-experience-demo.mjs --scenario expired
node scripts/loop-experience-demo.mjs --sam-disabled
node scripts/loop-experience-demo.mjs --json
node --test test/loop-experience.test.mjs
npm test
```

## What actually happens

1. **Mutual opt-in:** Alice and Sam already share a **synthetic fixture**
   pairwise key and a separate group key. Both local models must be enabled.
   No actual Matrix login, user discovery or device pairing takes place.
2. **Presence:** both submit their signed, rotating-token 6lowLoop presence
   envelopes through a bounded JSON application-frame round-trip. The receiver
   independently checks its paired HMAC, TTL and replay journal. This is
   observed **local-model contact**, not measured nearby distance.
3. **Ping and ACK:** Alice sends a signed ping. Sam may process it even when
   Alice never receives a valid ACK. The UI reports those distinct states.
4. **Signal:** Alice sends a `here` Flare with zero relay hops. Sam's model
   checks its audience key, expiry, consent and replay state. It records
   a **request** for text and haptic modalities; nothing lights up or vibrates.
5. **Presentation:** a plain, line-oriented text summary, or machine-readable
   JSON, preserves unknown physical output, human detection and comprehension.

The sample keys are deterministic public test fixtures; **never use them for
real devices or people**. Matrix IDs are local contact labels and do not appear
in a transmitted modeled frame or the report. No real-world friend location,
free-form messaging, persistence or secure provisioning is implemented.

## Deterministic scenarios

| Scenario | Expected behavior |
| --- | --- |
| `nominal` | Mutual presence, ping processed, ACK received, Flare processed |
| `drop-ack` | Ping processed by Sam but Alice's ACK missing; Flare still processed |
| `offline` | All frame transfer deliberately dropped, no mutual contact |
| `expired` | Synthetic delivery after TTL, authenticated frames rejected |
| `--sam-disabled` or `--alice-disabled` | Opt-out disables exchange |

Even nominal success proves only **application-layer processing inside this
single Node.js process**. Dropped ACK does not prove failed peer processing.
Text and haptic are *requested* modalities, not actual device behavior.

## Next integration gate

Keep `run6lowLoopJourney` as the isolated, tested application experience.
Before replacing its scripted transfer with real OpenThread POSIX IPv6 UDP,
introduce an explicit typed transport boundary, receiver-side authenticated
application receipts, and bounded failure tests. Carry the same privacy and
consent rules into a Matrix verified-device pairing interface later, without
silently downgrading encrypted Matrix messaging to shared-key local frames.
Do not add a radio or actuator claim based on this demo alone.
