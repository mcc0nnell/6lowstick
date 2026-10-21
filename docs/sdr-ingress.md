# Receive-only SDR ingress: NOAA Weather Radio

Status: **research observer, not public-warning or life-safety infrastructure**.

This increment connects a *locally installed external* RTL-SDR demodulator and
EAS/SAME decoder to structured, bounded **observation records**. No RF hardware,
radio decoding library, internet feed, Matter endpoint, or OpenThread node is
shipped by this change. It neither signs local alerts nor transmits over Thread.

## Flow

```text
NOAA Weather Radio (162 MHz, unauthenticated broadcast)
    -> RTL-SDR (receive-only)
    -> rtl_fm (FM audio, 22050 Hz, signed 16-bit samples)
    -> multimon-ng -a EAS (external decoder)
    -> scripts/observe-nwr.mjs (untrusted input boundary)
    -> NDJSON research observations (stdout)
                       X  no bridge to active alerts or actuators
```

`multimon-ng` may itself reconcile repeated SAME transmissions, depending on
version. The observer **does not** claim it independently checked two or three
RF headers. A single output line is only a decoded-text observation.

## Replay a synthetic decoder line (no SDR required)

```sh
printf '%s\n' 'EAS: ZCZC-WXR-RWT-024510-+0030-2941830-KLWX/NWS-' \
  | node scripts/observe-nwr.mjs --frequency-hz 162550000 --area 024510
npm test
```

`--area` is an explicit six-digit SAME location code, not a GPS coordinate.
Specify multiple `--area` flags if useful; omitted area policy is recorded
as `not_configured`, **not** implicitly matched. Validate codes independently
against NWS tables; the example code is purely a synthetic fixture.

## Optional receive-only hardware experiment

On a Linux machine with authorized receive-only RTL-SDR equipment, an antenna
suitable for the 162 MHz NWR band, `rtl_fm`, and `multimon-ng` installed:

```sh
NWR_FREQ_HZ=162550000 bash scripts/observe-nwr-sdr.sh --area 024510 \
  | tee observations.ndjson
```

Choose the strongest locally available NOAA Weather Radio frequency from:
162.400, 162.425, 162.450, 162.475, 162.500, 162.525, or 162.550 MHz.
The script only receives; no RF transmission, key provisioning, remote
publishing, or physical device actuation is implemented. Redirect output to
a local file only if appropriate, and treat it as potentially sensitive
location/event telemetry. Equipment and on-air reception were **not** tested
in this increment. Frequencies, receiver gain, antenna, and actual station
coverage must be independently verified.

The CLI accepts the `EAS: ZCZC-...` line format commonly printed by
`multimon-ng`; diagnostics, end-of-message markers, malformed headers,
and oversized lines are discarded. Identical headers are suppressed for
five minutes **in process memory** only. This is neither source
authentication nor restart-persistent replay prevention. Receiver crashes,
signal loss, truncated audio, channel changes, EOM correlation, and same-code
reissues are not yet tracked. A silent output stream is **not** proof of
no weather warnings.

## Trust boundary

- A decoded SAME header can be spoofed or jammed. `sender`, `originator`,
  `event`, and `areaCodes` are untrusted on-air claims.
- `broadcastAuthenticated: false`, `deliveryEligible: false`,
  `repeatAgreementIndependentlyVerified: false`, and `drill: false` are
  deliberate, immutable choices in this observer.
- The existing `evaluateSame` gateway accepts **synthetic drills only** and
  maps two synthetic events to neutral `NOTIFY`. **Do not call it from this
  live observer**. If an integration is developed, introduce separately
  reviewed source-authority, verification, replay, expiry, and safe-message
  policies before even considering public-warning delivery.
- A real radio observation never becomes a verified public warning merely
  because a gateway later applies HMAC for transport.
- No human delivery, RF reliability, or certified emergency alerting is claimed.

References: [NWS SAME](https://www.weather.gov/dsb/usingsame),
[multimon-ng](https://github.com/EliasOenal/multimon-ng),
[dsame](https://github.com/cuppa-joe/dsame).
