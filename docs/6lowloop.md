# 6lowLoop — find your people

**Sam wanted to find his friends. So do we.** 6lowLoop is a **core
capability** of 6lowStick, not a plug-in for the emergency lab.

The product question: *Can two consenting friends find and reach each other
at a crowded festival even when cellular service is unavailable?*

6lowLoop brings together presence, friendship, a ping and an acknowledged
response. A notification may eventually be carried by text, light, vibration,
or another accessible modality. Finding friends and signaling are two parts
of the same 6lowStick experience.

## Architecture decision: Matrix first

**Matrix is the target identity and messaging layer.** Use stable Matrix
user IDs, verified devices, encrypted direct rooms and group rooms for social
membership and conversation when a homeserver is reachable. Do not create a
competing global account registry, generic chat history or group protocol.

The 6lowLoop local plane is complementary, **not itself Matrix**:

- **Matrix online:** account and device verification, encrypted messages,
  group conversations and eventual server-backed sync.
- **6lowLoop local:** explicitly enabled, expiring friend presence and
  ping/ACK signals carried over a future authorized local transport.
- **Transport:** OpenThread IPv6, Bluetooth/Wi-Fi bridges, and future LoRa are
  separate engineering and validation paths. LoRa does not automatically run
  Matrix federation or the ordinary Matrix client/server APIs.
- **TalkPipe:** possible orchestration adapter; not required or shipped.
- **Merge boundary:** future application adapter must deduplicate local
  messages against eventual Matrix delivery, preserve trust and consent,
  and avoid promoting a modeled local ACK into proof of human delivery.

Never advertise a Matrix ID, GPS coordinate or contact list in a radio
discovery frame. Do not put recurring precise location in persistent Matrix
room state or a general-purpose timeline by default; short retention and
explicit recipient selection must be designed before implementing location.

The [Matrix specification](https://spec.matrix.org/latest/client-server-api/)
supports custom application event types, and
[Matrix E2EE](https://spec.matrix.org/latest/client-server-api/#end-to-end-encryption)
needs real device and session management. **This PR implements neither a
Matrix client nor E2EE.** Matrix IDs serve solely as local roster keys today.
The current HMAC envelopes are integrity/authenticity checks between
already-paired test endpoints and do **not encrypt content**. A Matrix E2EE
client must not silently downgrade to those envelopes when the server drops.

## First executable slice

`src/loop/core.mjs` is a dependency-free, in-memory **protocol model**.

1. Supply one manually paired 32-byte key **per Matrix-ID-labeled friend**
   through an already trusted channel; sharing a secret or binding it to a
   verified Matrix device is not yet automated.
2. Explicitly enable the local endpoint; otherwise it cannot issue or
   accept presence or ping frames.
3. Create `presence`, `ping`, and `ack` envelopes with bounded lifetimes
   (at most two minutes). The beacon uses a minute-rotated, friend-keyed
   token rather than the Matrix user ID.
4. A receiver checks the HMAC, replay cache, lifetime, known friend key and,
   for an ACK, the outstanding local ping. Its `friendsNearby()` method
   reports **recent authenticated local-model contact**, not physical distance.
5. Disabling 6lowLoop clears known presence, replay entries and pending pings.

Try it:

```sh
npm ci
npm run loop:demo
node --test test/loop.test.mjs
```

This demo runs two process-local endpoints; no network, GPS, Matrix login,
radio, TalkPipe, storage or notification hardware is called. Unit tests
cannot prove wireless proximity, successful human notification, encryption,
friend consent or an offline-to-Matrix sync implementation.

## Privacy and safety rules for subsequent PRs

- Discovery, location sharing and signaling are **off by default**. A
  contact accepting an invitation is not equivalent to consenting to
  broadcast precise location.
- Pairing requires mutual verification; use Matrix verified-device
  capabilities when online. Include revoke/block, key rotation, expiry,
  and anti-stalking UX before any real-world discovery service.
- Pseudonymous tokens rotate every minute, but observers can still link
  traffic within a period and infer timing/presence. These frames are not
  anonymity, unlinkability or radio privacy guarantees.
- Do not store or upload a location timeline by default. Nearby means
  *observed through the selected transport*, not measured geographic distance.
- Treat an application ACK as application processing only, never a
  human read receipt, physical notification or emergency delivery proof.
- The demo replay cache is bounded and **volatile**; reboot behavior,
  collision handling, key provenance and abuse testing need further work.

## Next integration gates

1. Matrix SDK client with actual account authentication, device verification,
   encrypted DMs/group rooms and error behavior when E2EE cannot be established.
2. Signed/verified local pairing bound to specific Matrix devices, revocation,
   and a real consent UI with a clear stop/disappear control.
3. A typed transport adapter with opt-in simulated IPv6 OpenThread first;
   demonstrate bounded transfer and non-disclosure, then validate hardware.
4. Intermittent-connectivity sync tests with duplicate prevention, offline
   confidentiality, and a documented conflict/expiry policy.
5. Accessible text/haptic/visual friend-finding prototype; hardware and
   consent-based human testing before any field claims.

**6lowLoop is a core product direction now. The Matrix and mesh integrations
are explicitly unimplemented.** Current 6lowStick remains experimental
research software, not a life-safety communications system.
