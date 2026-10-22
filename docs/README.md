# 6lowStick research guide

6lowStick studies what a notification system **can prove** between a send,
an application receipt, a device response, and a person's understanding.
This is a software-first lab, not an operational emergency-alert service.

**Start with the [Field Station](https://mcc0nnell.github.io/6lowstick/)** to
inspect five synthetic trials, then choose the research question below. Every
experiment distinguishes recorded facts from what requires hardware or people.

## Start here

| Your question | Begin with | You'll find |
| --- | --- | --- |
| How will I find and reach my friends? | [6lowLoop](6lowloop.md) | Core Matrix-first vision, opt-in local presence model and integration gates |
| What can 6lowStick demonstrate today? | [README](../README.md#what-we-can-show) | An instrument-by-instrument software/physical evidence boundary |
| What comes after simulation when funding is secured? | [First Light plan](first-light/README.md) and [funding case](first-light/funding-case.md) | Software-only signal intent, laboratory dependencies, independent physical measurement and a non-submitted budget |
| Where could AI fit without gaining physical authority? | [OpenThread + AI research direction](ai-physical-systems.md) | Advisory architecture, trust boundaries, evidence levels and research gates |
| How can we reject unsupported AI trace claims? | [Offline trace review](trace-review.md) | Deterministic reference interpretations and a typed, fail-closed claim check |
| How does scripted failover behave? | [Multi-radio fabric](multiradio-fabric.md) | Attempts, application ACKs, fallback and duplicate suppression |
| How do I reproduce a simulated run? | [OpenThread POSIX lab](../experiments/thread-alert/README.md) | Environment setup, commands and limitations |
| Where does a result come from? | [Reliability trials](reliability-trials.md) and [monotonic events](monotonic-evidence.md) | Fixture generation, run provenance, timestamps and exceptions |
| What would a hardware release require? | [Physical radio protocol](physical-radio-test-protocol.md) | Controlled bench, receipts, independent actuator measurements and stop conditions |
| What remains unsafe or unknown? | [Threat model](threat-model.md) | Origin trust, replay, failure interpretation and missing validation |

## Experiments and instruments

The **Thread alert lab** models accessible notification behavior in OpenThread
POSIX; it is a network simulation, not an 802.15.4 lab. See the
[lab introduction](../experiments/thread-alert/README.md), the
[multi-radio scripted experiment](multiradio-fabric.md), the
[reliability collector](reliability-trials.md), and the
[measured Node-harness event notes](monotonic-evidence.md).

The **observe-only instruments** examine data that must not authorize alert
origination: [NOAA/SAME ingestion](sdr-ingress.md) and the
[offline Spinel Flight Recorder](spinel-flight-recorder.md). The independent
[Rizzer Spinel fuzzing guide](rizzer-spinel-fuzzing.md) documents bounded native
fuzzing and the separate JavaScript parser comparison.

The **interfaces** only read experimental records. See
[Field Station](field-station.md) for web presentation and accessible
text equivalents, [Mesh Control](mesh-control-tui.md) for the TUI, and the
[synthetic alert schema](alert-schema.json) for machine-readable input.

The **Matter adapter** is still a mocked SDK boundary; see
[the adapter README](../src/matter/README.md).

## Reproduce and evaluate

Run `npm ci && npm test` using Node.js 22 or newer.
`npm run evidence:multiradio` regenerates deterministic synthetic trials.
The optional OpenThread POSIX toolchain must be provisioned separately.
The browser uses committed synthetic evidence and never dispatches alerts.

A green unit test, successful application ACK, offline CRC, or recorded
simulator outcome does not prove actual RF coverage, physical actuation,
reliable warning delivery, or human comprehension.

Before interpreting a result, read the [threat model](threat-model.md).
Before connecting authorized hardware, read the
[physical-radio test protocol](physical-radio-test-protocol.md).

## Release and maintenance

The [candidate release checklist](release-candidate.md) distinguishes a
source-only research snapshot from an operational system. The root
[changelog](../CHANGELOG.md) records changes; the
[security policy](../SECURITY.md) describes reporting and supported scope.

This guide is the entry point to existing technical notes. It introduces no
runtime dependency, new radio behavior, deployment credential or release claim.
