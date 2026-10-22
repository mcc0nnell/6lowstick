# Monotonic Thread evidence — first simulated runtime verification

This document records one successful *local* OpenThread simulation on October 20,
2026 (US Eastern). It is not a reliability, hardware, RF, coverage, or
life-safety certification.

## Provenance

- OpenThread source commit: 4b8dae16f3912d57f17bd0370095960c54c36f43 (clean local work/openthread checkout).
- 6lowStick source commit: 60ba4dbe3fb73ec962c6f17bc8f10883cbb08f23.
- Host: Butcher, Linux, Node.js 22.23.3, CMake, Ninja.
- Isolated build: OT_PLATFORM=simulation, OT_APP_CLI=ON, OT_FTD=ON,
  OT_COMPILE_WARNING_AS_ERROR=OFF, OT_COVERAGE=OFF; ot-cli-ftd target.
  These are local build flags, not relaxed repository test gates.
- The evidence runner completed successfully with **55/55 Node tests**.
- Local output is stored in the ignored evidence directory, not committed.

## Observations

The genuine four-process **simulated-radio** experiment recorded 49
monotonic Node-harness events. The first was +11,785.727 ms after recorder
creation; the last was +17,411.292 ms. This is parent-process observation
time, **not** radio packet timestamps or physical device clock readings.

| Event category | Count |
| --- | ---: |
| Send-loop starts | 5 |
| Synthetic UDP send attempts | 11 |
| Receiver-side app acceptances | 9 |
| Synthetic harness activations recorded | 8 |
| Gateway-observed application ACKs | 9 |
| Forged-envelope authentication rejections | 1 |
| Duplicate suppressions | 1 |
| Missing ACKs at a deadline | 2 |
| Synthetic policy acceptances / rejections | 1 / 1 |
| Receiver stop requests | 1 |

Baseline: 3 of 3 simulated applications ACKed. Synthetic SAME-derived
notification: 3 of 3 ACKed. Deliberately forged message: rejected without ACK.
Degraded phase: the harness requested haptic shutdown; strobe and display
acknowledged while haptic was correctly reported missing.

The output had zero harness error entries. The Mesh Control text report showed
monotonic elapsed observations; the read-only Camel exporter produced 49
sanitized JSON records from the real simulated-run evidence. This export is
not a separate claim of Camel route runtime verification on this new run.

## Reproduction

Start with an OpenThread source checkout at the SHA above, with submodules and
build prerequisites available. Use isolated build and evidence directories.

~~~sh
cmake -S /path/to/openthread -B /tmp/6lowstick-ot-sim -GNinja \
  -DOT_PLATFORM=simulation -DOT_APP_CLI=ON -DOT_FTD=ON \
  -DOT_COMPILE_WARNING_AS_ERROR=OFF -DOT_COVERAGE=OFF
cmake --build /tmp/6lowstick-ot-sim --target ot-cli-ftd --parallel 2
OT_CLI_PATH=/tmp/6lowstick-ot-sim/examples/apps/cli/ot-cli-ftd \
  bash scripts/run-evidence.sh
npm run tui -- --input evidence/mesh-run.json
npm run tui -- --input evidence/mesh-run.json --report
npm run camel:export -- --input evidence/mesh-run.json
~~~

Legacy evidence without the optional timing object remains supported by
phase-only reconstruction. The built-in --demo fixture is illustrative and
does not pretend to contain measured timestamps.

## Boundaries and next evidence

One successful simulated run does **not** establish failure probability,
operational reliability, independent device clock synchronization, physical
Thread RF operation, radio-hop topology, NOAA authenticity, actual Matter
actuation, or human perception/acknowledgment. Earlier research observed an
intermittent missing ACK during an otherwise healthy simulation; this
successful experiment does not resolve that reliability finding.

Before making reliability claims, gather repeatable bounded trial sets and
report failures alongside successes. Preserve local trust boundaries: Camel
receives allowlisted *copies* of observations, not alert authority or raw
wire payloads.
