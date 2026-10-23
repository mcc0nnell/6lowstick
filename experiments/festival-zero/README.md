# 6low ZERO — crowd network capacity model

**Status: synthetic traffic model, not a Thread / LoRa RF simulation.** This
is a small, seeded, reproducible *planning experiment* for the proposed
attendee-owned 6lowStick + 6lowLoop + 6lowReactor festival deployment. It
does not implement a radio MAC, physical propagation, OpenThread mesh routing,
Matrix synchronization, 6lowLoop cryptography, real battery drain, or
authenticated application receipts. Never extrapolate its percentages to a
real-world reliability or safety claim.

## Run

Requires Node.js 22+; no additional dependencies.

```sh
node experiments/festival-zero/cli.mjs
node experiments/festival-zero/cli.mjs --scenario outage --attendees 500 --minutes 45
node experiments/festival-zero/cli.mjs --scenario peak --seed 6
node experiments/festival-zero/cli.mjs --scenario outage --json > /tmp/6low-zero-outage.json
node --test test/festival-zero.test.mjs
```

The `--json` output includes per-minute counts for ECharts or other
downstream inspection. Re-running the same command produces identical JSON.

## What it models

- 1.4 km × 1.0 km rectangular synthetic venue with eight fixed coverage
  stations (245 m assumed radius) and two independent relay stations (830 m
  assumed radius). Positions are deliberately hypothetical.
- Groups of up to six friends whose position changes every 15 seconds, with
  simulated movement toward the stage and back toward camp.
- An opt-in friend ping-shaped workload, plus a small synthetic crew workload
  scheduled first. These are **not actual 6lowLoop frames or emergency alerts**.
- Same-station Thread delivery stays local; inter-station delivery requires
  both relevant Reactors online. `outage` removes the first Reactor halfway
  through the run, while same-station traffic can still flow.
- Direct LoRa relay is a separate, budget-limited application-level fallback.
  It is **not** transparent IP routing, LoRaWAN, proven LoRa mesh, or any
  estimate of legal airtime.
- Stations have a synthetic budget of 14 attempts per 15 seconds; relays have
  four. Modeled attempt success probabilities are 98% for local Thread, 94%
  for station-to-station Thread, and 82% for LoRa. **All numbers are arbitrary
  sensitivity-study inputs, not calibrated performance measurements.**
- Route outcomes are `modeledDelivered` or `notDeliveredInModel` with
  explicit coverage, capacity, and modeled-loss counts. Neither class asserts
  an actual device received a message. The fallback does not generate any
  cryptographically authenticated receipt.

## Questions to answer

1. With an assumed crowd of 250 versus 2,000, does the modeled capacity
   collapse under a fixed layout and per-link budgets?
2. How much inter-station traffic becomes fallback traffic if one Reactor
   disappears while local Thread still works?
3. What is the next smallest capacity or placement change worth modeling?
4. What actual hardware measurements are required before any deployment claim?

## Required field evidence

Measure antenna and site-specific RF coverage, 802.15.4 contention and
retransmission, real LoRa data rates / regional airtime limitations, busy
hours, device energy consumption, terrain and body occlusion, clock drift,
message size, queue limits, key distribution, station failures, and consented
human usability. A working simulation is not a substitute for permitting,
licensed operating constraints, accessible operations, or independent
emergency communications at a real gathering.

For existing **actual OpenThread POSIX simulated-radio** protocol exercises,
see [the multiradio fabric](../../docs/multiradio-fabric.md). That existing
lab is separate from this high-level crowd capacity model.
