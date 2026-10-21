# 6lowStick

**Light the mesh. Make alerts accessible.**

Experimental, open-source research into authenticated, accessible alerting over low-power IPv6 mesh networks, beginning with OpenThread's simulated radio environment.

The first lab exercises three receiver modalities—visual strobe, text display, and haptic vibration—using synthetic messages and application acknowledgments. It tests forged-alert rejection, replay suppression, and missing receiver detection.

See [the Thread alert experiment](experiments/thread-alert/README.md) for setup, verification, and limitations.

## Mesh Control — terminal-native evidence replay

6lowStick now has a keyboard-driven, **read-only** terminal UI (Node 22+). Inspect a logical receiver map, scrub experimental phases, review authentication rejections, replay suppression, missing ACKs, and inspect the provenance of each observation.

```sh
npm ci
npm run tui -- --demo
npm run tui -- --input evidence/mesh-run.json
npm run tui -- --demo --snapshot --plain
```

The demo is labeled illustrative, not a measured experiment. Recorded replay is a reconstruction from final lab JSON, not packet-by-packet live telemetry. Lines show logical intended recipients, **not radio topology**; application ACKs do not prove human receipt. See [TUI guide](docs/mesh-control-tui.md). Camel 4.22 is a potential future read-only integration and not a runtime requirement.

**Not a life-safety product.** No physical actuators, real emergency authority, CAP/IPAWS integration, production key management, or human delivery guarantee is provided. Do not use for actual emergency warnings.

WindAnvil and TalkPipe are development/testing tools, not required runtime components of 6lowStick.

## Reproduce synthetic research evidence

On a Linux host with a separately built OpenThread POSIX `ot-cli-ftd` binary,
run `OT_CLI_PATH=/absolute/path/to/ot-cli-ftd bash scripts/run-evidence.sh`.
The script runs unit tests and the simulated Thread mesh experiment, then
writes local TAP, JSON event logs and a summary to the ignored `evidence/`
directory. It does not prove RF, real Matter device, NOAA receiver or human
notification performance. The build of the OpenThread CLI is not yet pinned
or reproduced by this repository.
