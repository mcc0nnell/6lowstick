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
