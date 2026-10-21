# 6lowStick

**Light the mesh. Make alerts accessible.**

Experimental, open-source research into authenticated, accessible alerting over low-power IPv6 mesh networks, beginning with OpenThread's simulated radio environment.

The first lab exercises three receiver modalities—visual strobe, text display, and haptic vibration—using synthetic messages and application acknowledgments. It tests forged-alert rejection, replay suppression, and missing receiver detection.

See [the Thread alert experiment](experiments/thread-alert/README.md) for setup, verification, and limitations.

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

## Receive-only software-defined radio research

6lowStick now has an **SDR observation path**, separate from the synthetic
OpenThread alert-delivery lab. With locally installed `rtl_fm` and
`multimon-ng`, it can turn NOAA Weather Radio SAME decoder text into
bounded JSON Lines research records. There is also a no-hardware replay
path with tests. The observer **never authenticates an on-air broadcaster,
issues an active alert, or actuates a mesh endpoint**.

See [SDR ingress and replay](docs/sdr-ingress.md) for the receiver pipeline,
supported frequencies, safety boundary, and limitations.
