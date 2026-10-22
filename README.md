<div align="center">
  <img src="assets/rizzer-transparent.webp" alt="Rizzer: a bright pink and lime-green six made from two polo shirts, with both collars popped." width="230" />

  <h1>6lowStick</h1>
  <p><strong>What happens after you send the warning?</strong></p>
  <p>Open-source research into low-power networks, accessible notifications, and the evidence that separates delivery from perception.</p>
  <p>
    <a href="https://mcc0nnell.github.io/6lowstick/"><strong>Explore the Field Station ↗</strong></a>
    &nbsp;·&nbsp; <a href="#try-the-lab">Try the lab</a>
    &nbsp;·&nbsp; <a href="#what-we-can-show">Evidence and limits</a>
    &nbsp;·&nbsp; <a href="#openthread-and-ai">OpenThread + AI</a>
    &nbsp;·&nbsp; <a href="docs/README.md">Research guide</a>
  </p>
  <p><code>APACHE-2.0</code> &nbsp; <code>NODE 22+</code> &nbsp; <code>EXPERIMENTAL</code> &nbsp; <code>SIMULATION FIRST</code></p>
</div>

> [!IMPORTANT]
> **Research software, not an emergency warning system.** The alert fabric, Thread/direct-LoRa fallback, and receiver scenarios are software-only. There is no demonstrated on-air delivery, physical actuation, or human receipt. Do not use this code to originate operational warnings.

**Release state:** `v0.1.0-rc.1` is a **prepared, untagged source-only release candidate**, not an npm package or a published GitHub Release. See the [release checklist](docs/release-candidate.md), [changelog](CHANGELOG.md), and [security policy](SECURITY.md).

## Why 6lowStick

A warning can leave the sender and never reach a receiver. It can reach an application without turning on a light or vibrating a device. A device can activate without anyone noticing it.

**Those are different failures, and they need different evidence.**

6lowStick investigates the boundaries between transmission, application acknowledgment, device response, and human understanding. Accessibility isn't a final presentation layer here: it is part of the question the experiment is trying to answer.

The project does **not** claim to solve emergency communications. It gives us a controlled place to reproduce failures and learn what a physical, user-tested system would have to prove.

## OpenThread and AI

**OpenThread moves observations. AI helps interpret them. Deterministic policy authorizes actions. Evidence tells us what actually happened.**

The longer-term research question is how an AI system could reason about the physical world **without being trusted to control it**. OpenThread supplies local, low-power IPv6 connectivity; an edge analysis service *could* correlate sensor observations and explain uncertain mesh behavior. A separate, deterministic policy gateway would have to authorize any proposed physical action. 6lowStick's role is to make the boundary visible: a sent packet, an authenticated application receipt, measured actuator output, and a person's comprehension are **four different outcomes**.

The first practical AI experiment is **offline and read-only**: give an evaluator synthetic 6lowStick traces, require it to cite evidence for every conclusion, and test whether it flags missing receipts, invalid acknowledgments, and duplicate suppression without inventing physical or human success. That evaluator **has not been implemented**. It would have no radio, dispatch, or actuator authority.

A future direct-LoRa fallback would be a **separate application transport**, not a longer-range OpenThread mesh. Today the Thread work uses POSIX simulated radio and LoRa remains scripted; neither demonstrates physical RF failover or life-safety performance.

[Read the full OpenThread + AI research architecture →](docs/ai-physical-systems.md) for the proposed trust boundaries, evidence ladder, and research gates.

## How it works

| Research lane | What it does | What it does **not** establish |
| --- | --- | --- |
| **Observe** | Parses receive-only NOAA/SAME decoder lines and offline Spinel frames. | Authenticity of an external warning, or permission to dispatch one. |
| **Simulate** | Runs local authenticated application-message and replay tests over OpenThread POSIX and scripted Thread/direct-LoRa routes. | Actual 802.15.4 or LoRa RF delivery. |
| **Inspect** | Exposes attempts, application receipts, duplicate suppression, and synthetic receiver-journal entries in JSON, a text-friendly terminal, and the Field Station. | Physical actuation, human perception, or understanding. |

The observation and simulation lanes are deliberately separate. NOAA data cannot trigger the synthetic sender, and an application receipt cannot become a claim that a human was reached.

## Try the lab

**[Open the Field Station →](https://mcc0nnell.github.io/6lowstick/)**

Five deterministic scenarios let you inspect an unavailable Thread route, a scripted direct-LoRa fallback, invalid or missing receipts, and duplicate suppression. The diagram is an illustration of **model decisions**, not captured RF topology. The text table and raw JSON remain usable without a chart.

For a quick local run, clone the repository with **Node.js 22+**:

```bash
git clone https://github.com/mcc0nnell/6lowstick.git
cd 6lowstick
npm ci
npm test

npm run tui -- --demo --report    # Accessible, noninteractive text
npm run tui -- --demo             # Keyboard-operated Mesh Control
npm run evidence:multiradio       # Deterministic synthetic scenarios
```

`--demo` uses illustrative data. For a static, no-color terminal snapshot use `npm run tui -- --demo --snapshot --plain`. Interactive display has reduced-motion support. To replay separately generated POSIX simulator evidence use `npm run tui -- --input evidence/mesh-run.json` after creating that local file.

**OpenThread is a separate toolchain.** Building or supplying a compatible `ot-cli-ftd` and setting `OT_CLI_PATH` enables the opt-in POSIX lab via `bash scripts/run-evidence.sh`; the repository does not pin or build that binary. See [reproduction notes](experiments/thread-alert/README.md) and [measured Node-harness event limitations](docs/monotonic-evidence.md).

## What we can show

| Instrument | Demonstrated in software | Not demonstrated |
| --- | --- | --- |
| **Thread alert lab** | OpenThread POSIX simulated traffic, local HMAC, replay journal, synthetic modalities | RF delivery or reliably reaching a person |
| **Multi-radio fabric** | Scripted Thread/direct-LoRa fallback, application receipts, duplicate suppression | LoRa hardware, LoRaWAN, actual failover |
| **NOAA/SAME observer** | Receive-only decoder-line parsing and mock/replay input | Origin authentication or field measurement |
| **Spinel Flight Recorder** | Offline HDLC-lite parsing, CRC/FCS, command metadata, reference vectors | Live RCP instrumentation or authenticated origin |
| **Matter adapter** | Pinned SDK seam and mock endpoints | Commissioned hardware or measured output |
| **Mesh Control / Field Station** | Read-only evidence exploration, text reports and modeled event playback | On-air topology, RF packet timing or human outcomes |
| **Camel exporter** | Sanitized evidence export | Operational alert routing |

### An unresolved result worth keeping

One earlier four-node POSIX simulation intermittently failed to record a haptic application acknowledgment. Later serial simulated trials did not establish physical reliability. An absent ACK is **unconfirmed delivery**, not evidence that no receiver activated. The question remains open; see [the reliability record](docs/threat-model.md#observed-reliability-caveat-2026-10-20) and [trial protocol](docs/reliability-trials.md).

The next meaningful gates are an authorized physical radio bench, independent observation of light/text/haptic actuation, and consent-based studies of whether people notice and understand the notification. More green simulated tests cannot substitute for those measurements.

## Architecture and trust boundaries

![Architecture of 6lowStick: isolated receive-only observations, deterministic synthetic Thread/direct-LoRa experiments, and read-only evidence inspection. No observation authorizes alert dispatch and no simulated receipt verifies human perception.](assets/architecture.svg)

[View the full diagram](assets/architecture.svg)

**For readers who don't use the diagram:** receive-only NOAA/SAME and offline Spinel inspection feed an observation lane without dispatch authority. A separate synthetic policy and local HMAC sender models Thread/direct-LoRa routes to receivers; attempts, application ACKs and a replay journal become JSON research evidence. The terminal UI, ECharts Observatory and Camel exporter only **inspect** that evidence. A Spinel CRC validates frame integrity, not provenance. A local ACK confirms modeled application processing, not actuation or perception.

## Research guide

The [research guide](docs/README.md) is organized by what you want to do, not by how many subsystems exist:

- **Follow the experiment:** [Multi-radio fabric](docs/multiradio-fabric.md) and [OpenThread POSIX lab](experiments/thread-alert/README.md).
- **Audit the evidence:** [Reliability trials](docs/reliability-trials.md), [Spinel recorder](docs/spinel-flight-recorder.md) and [monotonic event capture](docs/monotonic-evidence.md).
- **Plan the next phase:** [Physical-radio test protocol](docs/physical-radio-test-protocol.md) and [threat model](docs/threat-model.md).
- **Use the interfaces:** [Field Station design and evidence boundaries](docs/field-station.md) and [Mesh Control TUI](docs/mesh-control-tui.md).

## Meet Rizzer

**Two collars. Zero trust.** Rizzer is the irreverent 6lowStick mascot and the name of a [separate Apache-2.0 native coverage-guided fuzzer](https://github.com/mcc0nnell/rizzer). The original [two-polo artwork](assets/6lowstick-two-polos.webp) remains the source for the cleaned README illustration; [Rizzer's character notes](https://github.com/mcc0nnell/rizzer/blob/main/docs/character.md) and [art script](https://github.com/mcc0nnell/rizzer/blob/main/scripts/prepare_original_logo.py) live in the independent repository.

6lowStick has an **opt-in offline Spinel fuzzing adapter** with retained input replay against its JavaScript recorder, not live radio fuzzing or a confirmed OpenThread vulnerability. Follow the [bounded fuzzing guide](docs/rizzer-spinel-fuzzing.md) to reproduce it. Rizzer's native coverage is not JavaScript coverage.

The mascot also appears in the **read-only** TUI: `npm run tui -- --mascot --plain` for a screen-reader-friendly line, or `--mascot --reduced-motion` for the static view. No fuzzer runs when the mascot is displayed.

---

**Safety and licensing:** Never connect the prototype to public alert origination, operational emergency dispatch, or uncommissioned actuators. NOAA/SAME reception is not authenticated by a local gateway HMAC. [Apache-2.0](LICENSE). WindAnvil and TalkPipe can support development verification but are not runtime dependencies.
