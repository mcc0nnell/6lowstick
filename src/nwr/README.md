# NOAA Weather Radio input — research prototype

`same.mjs` parses **already-demodulated synthetic** SAME header strings and exposes geographic filtering. It is not a receiver, RF demodulator, complete SAME validator, or trusted alert source. The example test string is synthetic; it is not an actual NOAA warning.

Planned boundary: receive-only 162 MHz radio -> SAME audio demodulation and repeated-header reconciliation -> time/area/event policy -> authenticated local 6lowStick alert -> OpenThread receivers. Optionally enrich with NWS CAP v1.2 over HTTPS when connectivity exists, without substituting internet availability for the radio path.

Before hardware deployment: verify against the full NWR SAME specification, including valid originator/event codes, issuance year rollover, message validity, multiple headers, EOM, cancellation/update semantics, and malformed/hostile input. SAME broadcasts are not cryptographically authenticated; an authenticated local mesh message only attests to the gateway, not to NOAA origination. Never connect this prototype to life-safety actuators.

## Offline policy adapter

`gateway.mjs` accepts a pre-decoded synthetic SAME header, configured six-digit
area codes, an explicit UTC clock/year, and a local HMAC key. It rejects
unrecognized event codes, mismatched areas, and messages outside their validity
window. It currently permits only `TOR` and `SVR` **for a synthetic drill** and
maps both to the existing lab-only `NOTIFY` token. This mapping is not an
appropriate real-world protective-action recommendation. No real warning should
be distributed using this mapping. The derived identifier is stable for an
identical header, enabling downstream replay suppression; it does not establish
broadcast authenticity or guarantee uniqueness across unrelated messages.

The parser and gateway are not yet wired to the live OpenThread simulator or a
physical NWR receiver. Year rollover, actual SAME event policy, threat modeling,
radio spoofing, CAP text enrichment, and safety-reviewed user instructions are
open work. Run `node --test test/*.test.mjs experiments/thread-alert/*.test.mjs`.
