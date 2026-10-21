# 6lowStick experimental threat model

## Assets and trust boundaries

* **NWR input:** SAME broadcast reception is unauthenticated. An attacker with RF access could spoof or jam it. A signed gateway message does **not** authenticate NOAA as the origin.
* **Gateway:** Location policy, clock, keys, firmware integrity and configured area codes are trusted assumptions. Compromise can issue forged local alerts.
* **Thread mesh:** Thread network security is separate from application HMAC; devices may be captured or jammed. Mesh routing does not imply guaranteed delivery.
* **Receivers:** An ACK means application receipt, not actual light/vibration activation, accessibility, or human comprehension.
* **Matter bridge:** Commissioned fabric credentials, endpoint selection and controller authority are separate. A successful command does not prove physical illumination.

## Initial controls and gaps

The prototype has HMAC-SHA256 authentication, bounded synthetic message syntax, receiver replay journaling, and geographic/time filtering. It has no key rotation, provisioning, hardware root of trust, robust crash recovery, RF spoofing mitigation, actual NWR demodulator, standards-complete SAME decoder, independent source corroboration, CAP verification, operational monitoring, human factors evidence, or certification. Do not use for life safety.

## Evaluation plan

Test malformed input, inconsistent repeated SAME headers, stale and future warnings, area mismatch, spoofed gateway, key loss, reboot and power-loss behavior, partitioned networks, RF interference, Matter command failures, and alert fatigue. Report failed delivery explicitly rather than inferring it from send success.

## Observed reliability caveat (2026-10-20)

A four-node POSIX simulation run missed the haptic ACK during an otherwise
healthy three-receiver drill; an immediate subsequent run acknowledged all
three. The current sender transmits one UDP datagram per receiver and waits
2.5 seconds for ACKs. This is an observed intermittent delivery failure, not
a solved problem. Before claiming reliable delivery, run a statistically
meaningful repeated trial set and examine convergence, packet capture,
receiver journals, retransmission policy, and duplicate handling. A resend
must preserve the same alert ID and must never count duplicate notifications
as new alerts. Do not merely extend the timeout to make the failure disappear.

## Synthetic cross-radio failover boundary (2026-10-20)

The multi-radio prototype is **scripted simulation only**. Each application
receipt binds a recipient, synthetic alert ID and newly issued 96-bit attempt
challenge under a lab HMAC key. Lack of authenticated application receipt means
unconfirmed; it does not prove that the receiver did not activate. A durable
application journal suppresses duplicate simulated activations across routes.

The model does not authenticate NOAA, provision devices, isolate per-receiver
keys, guarantee anti-replay following key compromise, validate true physical
actuation, handle radio regulation or LoRaWAN receive windows, or observe the
Thread Spinel interface. The simulation transport contract refuses non-simulation
drivers and live-mode calls. See [dual-radio research](multiradio-fabric.md).
