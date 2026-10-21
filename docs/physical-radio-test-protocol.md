# Controlled physical-radio laboratory — proposed test protocol

**Status: design only.** 6lowStick has not demonstrated physical 802.15.4
delivery, live Spinel RCP captures, a LoRa modem, physical accessible
actuation, NOAA origin authentication, or human comprehension.
This protocol is a gate for responsible future laboratory work, not an
authorization to transmit or originate emergency alerts.

## Go/no-go prerequisites

1. Identify the research host, lab owner, responsible operator, device
   certification and permitted operating conditions. Verify applicable
   spectrum rules, antenna/power constraints, site policies and institutional
   safety approvals **before any physical RF experiments**. Prefer enclosed,
   attenuated/shielded bench fixtures where available.
2. Establish a **hardware kill switch**, a software receive-only default,
   independent current limiting and a clear stop procedure. Do not wire
   6lowStick to public warning origination, EAS/IPAWS dispatch, outdoor
   sirens, shared infrastructure, or uncommissioned actuators.
3. Review the threat model and reproducible software-only evidence first.
   Do not add a second controller to an RCP serial port: collect a passive
   copy at an authorized existing host-driver boundary.
4. Use **synthetic, unmistakably test-labeled messages** and no real alert
   event codes in transmitted demonstrations. Separate receiver tests from
   receipt generation, and prohibit accidental live-gateway integration.
5. Record consent and accessibility review before any participant testing;
   lab application ACKs are not evidence that someone noticed a warning.

## Bench 0 — bill of materials to validate before purchase

| Role | Candidate category / need | Measurement |
| --- | --- | --- |
| Thread border/router nodes | >=4 compatible development boards or certified 802.15.4 RCPs, matching firmware builds | Board ID, firmware hash, channel, power |
| Controlled environment | Shielded enclosure/attenuators if supported, isolated power and an RF-safe stop method | RF boundary, interlock state |
| Receive-only observation | Authorized host-driver Spinel byte-copy tap and time source | Captured provenance; no extra serial owner |
| Independent RF evidence | Compatible passive 802.15.4 sniffer/analyzer with known timing limits | Captured frames, channel and timestamps |
| Accessible modalities | Commissioned test-only text display, visual indicator and haptic actuator | Independent sensing of output, not just ACK |
| Measurement + documentation | Logic analyzer or scope, calibrated time references where feasible, versioned lab log | Event alignment and uncertainty |

Procurement requires compatibility checks (OpenThread version, USB
interface, Spinel transport, region, radio certifications, actuator control
and replaceability). No unverified device prices or grant funding promises
are included.

## Bench 1 — no RF transmission from 6lowStick

- Start with passive host-driver Spinel copies on an already authorized
  lab network. Record USB/UART byte capture provenance, timing-clock
  resolution, hardware/firmware revisions and SHA-256 evidence hashes.
- Compare complete offline capture frames against the Spinel Flight
  Recorder and the fixed reference vectors. Preserve CRC errors rather
  than suppressing them; explicitly label any missing/truncated bytes.
- Acceptance: zero new authority paths from the passive recorder;
  bounded input handling; no claim about radio state from CRC alone.

## Bench 2 — lab-only application receipt versus physical output

- Use a deliberately synthetic input on the isolated development network.
  Measure separately: (a) sender accepted command, (b) receiver application
  ACK, (c) independent electrical/optical/mechanical output sensing, and
  (d) observable warning state.
- Induce exactly bounded faults: power off one receiver, interrupt its
  application, withhold an application receipt, and corrupt an offline
  replay copy. Ensure missing receipts remain **unconfirmed**, not
  automatically classified as no actuation.
- Record negative/security cases: forged envelope, replay duplicate,
  expired synthetic input, out-of-area synthetic policy and unintended
  repeated output. Never route passive NOAA observations to dispatch.
- Acceptance: exact per-gate traces; independent physical observation
  distinguishes false positives/negatives; fail-closed control behavior.

## Bench 3 — controlled RF measurements (separate approval)

- Pre-register topology, channel, transmit power, antenna, distance,
  attenuators and disturbance scenarios. Keep tests within authorized,
  controlled conditions. Record interference and measurement uncertainty.
- Repeat adequate, predeclared trials for each scenario. Publish every
  incomplete/failed run, denominator, limits and reproducible fixture
  provenance. Do not extrapolate from POSIX simulated-radio trials.
- Cross-correlate sniffer times and application receipt times without
  falsely treating parent-process harness clocks as RF timestamps.

## Bench 4 — additional modality and transport research

Treat any direct-LoRa or LoRaWAN hardware path as **a separate device,
spectrum, interoperability and duty-cycle design review**. Existing
6lowStick LoRa fallback is scripted software only; it must not appear in
a physical mesh reliability denominator before separate validation.

If and when participant research is approved, evaluate perception and
comprehension for **Deaf, hard-of-hearing and hearing users** across text,
light and haptic signals with opt-in studies and accessible communication.
Measure notification detection and understanding independently of
application ACK or actuator sensing; do not substitute accessibility
heuristics for people-centered validation.

## Required evidence format

Every report should record experiment ID, date/time zone, researcher,
source commit, clean/dirty worktree state, binary/firmware hashes,
device inventory, lab approval, transmission state, channel/power,
synthetic fixture ID, measurement equipment, raw/censored observations,
fault injection, missing data, trials and denominators. Keep any
human-participant data separate with informed consent and privacy review.

**No-go** on unsafe/unauthorized transmission, ambiguous provenance,
unbounded actuator behavior, or any risk of real public alert origination.
A research prototype remains a research prototype even if every bench
trial succeeds.
