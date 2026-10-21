# NOAA Weather Radio input — research prototype

`same.mjs` parses **already-demodulated synthetic** SAME header strings and exposes geographic filtering. It is not a receiver, RF demodulator, complete SAME validator, or trusted alert source. The example test string is synthetic; it is not an actual NOAA warning.

Planned boundary: receive-only 162 MHz radio -> SAME audio demodulation and repeated-header reconciliation -> time/area/event policy -> authenticated local 6lowStick alert -> OpenThread receivers. Optionally enrich with NWS CAP v1.2 over HTTPS when connectivity exists, without substituting internet availability for the radio path.

Before hardware deployment: verify against the full NWR SAME specification, including valid originator/event codes, issuance year rollover, message validity, multiple headers, EOM, cancellation/update semantics, and malformed/hostile input. SAME broadcasts are not cryptographically authenticated; an authenticated local mesh message only attests to the gateway, not to NOAA origination. Never connect this prototype to life-safety actuators.
