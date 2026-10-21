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
```

Keyboard: left/right or h/l to step; Home/End to seek; space to play/pause; r rewind; up/down or j/k choose strobe/display/haptic; 1 topology, 2 timeline, 3 evidence and limitations, 4 or t text-reader view; ? help; q quits. Set NO_COLOR=1 or --plain to disable ANSI colors; --reduced-motion disables animated playback.

The demo is **illustrative**, not captured evidence. The experimental lab produces a final JSON document with harness phases and application ACK results. It does **not** contain timestamped packets or real-world neighbor topology. The TUI reconstructs the *phase sequence* from that document: observations within a phase are presented in receiver order, **not measured arrival order**. The gateway-to-receiver lines are **logical intended application recipients**, not RF adjacency, propagation, routing hops, or physical positions.

An ACK means receipt by the simulated receiver application, not physical strobe/haptic behavior or human receipt. The NWR SAME header is synthetic and local gateway HMAC does not authenticate a NOAA broadcast. A missing ACK is reported as missing, not delivered. Recorded latencies, when present, measure from the harness send-loop start.

The present TUI is independent of Apache Camel and ECharts. A future Camel 4.22 read-only adapter may consume *sanitized copies* of evidence, but must not acquire authority to originate alerts or modify authentication, replay protection, or the mesh.

Next: add monotonic event timestamps to the harness; instrument observed Thread router/neighbor relationships; compare recorded runs; build a separate physical-radio experiment with rigorous limitations.

**Not a life-safety product. Never use this for real emergency warning dispatch.**

The **4 / t text-reader** view presents the current event and each receiver's state as labeled text without requiring interpretation of the topology art. The `--plain` option disables ANSI colors; snapshots can be generated without a TTY for automation. The text reader describes recorded evidence only, not live observed nodes.
