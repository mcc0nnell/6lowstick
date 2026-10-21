# Mesh Control TUI — experimental read-only replay v0

Run Node 22+ in an ANSI terminal. This interface is local and read-only; it does not commission Matter devices, send Thread packets, access NOAA radio, or control alerts.

## Launch

```sh
npm ci
npm run tui -- --demo
# After a separately built OpenThread POSIX simulation run:
OT_CLI_PATH=/absolute/path/to/ot-cli-ftd bash scripts/run-evidence.sh
npm run tui -- --input evidence/mesh-run.json
# Noninteractive snapshot for logs, pipes, or assistive tooling:
npm run tui -- --demo --snapshot --plain
# Complete sequential text report for screen readers / CI attachments:
npm run tui -- --demo --report
```

Keyboard: left/right or h/l to step; Home/End to seek; space to play/pause; r rewind; up/down or j/k choose strobe/display/haptic; 1 topology, 2 timeline, 3 evidence and limitations, 4 or t text-reader view; ? help; q quits. Set NO_COLOR=1 or --plain to disable ANSI colors; --reduced-motion disables animated playback.

The demo is **illustrative**, not captured evidence. Newly generated OpenThread POSIX research evidence includes an optional `timing` object with monotonic elapsed observations measured at the **Node harness** (not at the radio). Mesh Control replays those observed gaps at 1× and shows elapsed milliseconds in the timeline and complete text report. The timestamps are from the CLI harness processing events, **not RF-airtime packet timestamps**. Older files without a `timing` object still use reconstructed phase-order replay at a fixed display cadence; that mode is explicitly labeled. The gateway-to-receiver lines are **logical intended application recipients**, not RF adjacency, propagation, routing hops, or physical positions.

An ACK means receipt by the simulated receiver application, not physical strobe/haptic behavior or human receipt. The NWR SAME header is synthetic and local gateway HMAC does not authenticate a NOAA broadcast. A missing ACK is reported as missing, not delivered. Recorded latencies, when present, measure from the harness send-loop start.

The TUI remains independent of Apache Camel and ECharts. The optional Camel 4.22.1 adapter exports allowlisted, read-only copies of evidence, including `harness_elapsed_ms` only when genuinely measured; it never exports raw alert IDs or wire payloads, and it must not acquire gateway authority.

One four-process POSIX simulated-radio run has now exercised the timestamp instrumentation successfully; see [the measured simulation evidence and its limitations](monotonic-evidence.md). Next: repeat trials to characterize intermittent missing ACKs, instrument observed Thread router/neighbor relationships, compare runs, and separately test physical radios. A single successful synthetic trial cannot establish reliability or human delivery.

**Not a life-safety product. Never use this for real emergency warning dispatch.**

The **4 / t text-reader** view presents the current event and each receiver's state as labeled text without requiring interpretation of the topology art. The `--plain` option disables ANSI colors; snapshots can be generated without a TTY for automation. The text reader describes recorded evidence only, not live observed nodes.

`--report` prints the complete ordered phase sequence with each observation, its interpretation and recorded application ACK latency. Unlike the interactive view, it does not truncate to terminal height or emit ANSI control sequences. This output is accessible text, not reconstructed packet timings.

## Clock and ordering contract

`timing.schema` is `6lowstick.harness-monotonic.v1`, with `clock: node.performance.now`, `unit: ms`, and ordered `events` containing a sequence number, `t_ms` relative to the harness recorder start, phase, event kind and receiver identifier. Raw datagrams and keys are deliberately excluded. The receiver's application acceptance, a gateway-observed ACK, and a missing ACK at the deadline are separate event kinds. Distinct Node processes are observed by one parent harness and asynchronously surfaced through the CLI, so clock values should **not** be treated as synchronized device clocks or packet-on-air timings. The harness sorts observations by captured monotonic time, preserving insertion order for ties. Its `activation_recorded` event is not proof of a physical strobe, display, or haptic output.
