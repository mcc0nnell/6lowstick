<div align="center">
  <img src="assets/rizzer-transparent.webp" alt="Rizzer, the original two-polo-shirt six in hot pink and lime green, with two popped collars, on a transparent background" width="320" />

  <h1>6lowStick</h1>
  <p><strong>Light the mesh. Make alerts accessible.</strong></p>
  <p><a href="https://github.com/mcc0nnell/rizzer/blob/main/docs/character.md"><strong>Meet Rizzer ↗</strong></a> &nbsp;·&nbsp; Two collars. Zero trust.</p>

  <p>
    <a href="https://mcc0nnell.github.io/6lowstick/"><strong>Explore Mesh Observatory ↗</strong></a>
    &nbsp; · &nbsp;
    <a href="#run-the-lab">Run the lab</a>
    &nbsp; · &nbsp;
    <a href="#the-system">Inspect the architecture</a>
    &nbsp; · &nbsp;
    <a href="docs/threat-model.md">Threat model</a>
  </p>

  <p>
    <code>NODE 22+</code> &nbsp; <code>APACHE-2.0</code> &nbsp; <code>SIMULATION FIRST</code> &nbsp; <code>READ-ONLY OBSERVABILITY</code>
  </p>
</div>

> [!IMPORTANT]
> **6lowStick is a research instrument, not an emergency warning system.** The notification fabric, Thread/LoRa failover, receivers, and observatory scenarios are **software-only simulations**. No operational alert is originated; no physical radio delivery or human receipt has been established.

**Release track:** preparing **`v0.1.0-rc.1`**, an **untagged, source-only experimental research candidate**. No GitHub Release or npm package is published. See the [release candidate checklist](docs/release-candidate.md), [changelog](CHANGELOG.md), and [security policy](SECURITY.md).

# A research platform for the last meter of accessible alerting

A warning can be transmitted without being **received**. It can be received without being **perceived**. And it can be perceived without being **understood**.

6lowStick asks how low-power networks, diverse receiver modalities, authenticated application receipts, and reproducible evidence could help us study those gaps—without confusing a successful send with a successful warning.

| 01 / OBSERVE | 02 / MODEL | 03 / INSPECT | 04 / EVALUATE |
| :--- | :--- | :--- | :--- |
| Receive-only NOAA/SAME observations and offline Spinel bytes | Synthetic Thread delivery with scripted direct-LoRa fallback | Signed application receipts, replay suppression, JSON traces | Read-only terminal UI, ECharts observatory, accessible text reports |
| **Never grants dispatch authority** | **No physical RF** | **Not proof of actuation** | **Not proof of human comprehension** |

## See the experiment

**[Open the Mesh Observatory →](https://mcc0nnell.github.io/6lowstick/)**

The GitHub Pages experience offers five deterministic, synthetic fault scenarios, a logical route graph, application delivery-attempt comparisons, an evidence inspector, and an accessible attempt-by-attempt table. It visualizes **modeled delivery paths**, not captured RF topology or live devices.

Prefer the terminal? **Mesh Control** provides keyboard navigation, a text-reader view, `--plain`, `--reduced-motion`, and a complete `--report` for sequential evidence inspection. Newly instrumented OpenThread POSIX lab runs also capture monotonic **Node-harness** application events and replay their measured inter-event gaps; old evidence remains explicitly labeled as reconstructed phase replay. These are **not RF packet timestamps or proof of human notification**.

### Rizzer cameos in Mesh Control

Rizzer is our official mascot: two popped polo collars, one six, and a strong opinion on trust boundaries. The original [two-polo illustration](assets/6lowstick-two-polos.webp) is his canonical design. The README uses a cleaned transparent derivative of that same artwork, reproducible with [Rizzer’s art script](https://github.com/mcc0nnell/rizzer/blob/main/scripts/prepare_original_logo.py); vector expressions are optional supporting art. His independently developed [fuzzing engine](https://github.com/mcc0nnell/rizzer) is **not** required to display him.

```bash
npm run tui -- --mascot --plain                # one screen-reader-friendly line
npm run tui -- --mascot --animate              # four frames, interactive TTY only
npm run tui -- --mascot --reduced-motion       # always static
npm run tui -- --demo                          # press m to see Rizzer and m to return
```

Mascot mode is decorative and **read-only**: no radio transmission, alert origination, evidence mutation, or automatic fuzzing. Logs, piped output, plain text, and reduced-motion settings remain static and available.

## Run the lab

```bash
git clone https://github.com/mcc0nnell/6lowstick.git
cd 6lowstick
npm ci
npm test

# Navigate the read-only evidence TUI
npm run tui -- --demo

# Accessible, noninteractive text evidence
npm run tui -- --demo --report

# After generating local POSIX lab evidence with OT_CLI_PATH:
# npm run tui -- --input evidence/mesh-run.json

# Deterministic, software-only Thread/direct-LoRa scenarios
npm run evidence:multiradio
```

**Node.js 22+** is required. The TUI `--demo` uses illustrative evidence, not live captures. `npm run tui -- --demo --snapshot --plain` produces a noninteractive, color-free snapshot.

To reproduce the separately built OpenThread POSIX laboratory, point `OT_CLI_PATH` to your own `ot-cli-ftd` and run `bash scripts/run-evidence.sh`. See [the first timestamped simulation run](docs/monotonic-evidence.md) for the tested source SHA, isolated build instructions, observed results, and limitations. The repository does not pin or automatically build an OpenThread binary; interpret results accordingly.

## The system

![Mobile-friendly 6lowStick architecture diagram. Three separate trust boundaries: receive-only NOAA SAME and offline Spinel observations that cannot dispatch alerts; a software-only synthetic policy gate, HMAC notification and simulated Thread or direct-LoRa receiver paths with application receipts; and a read-only JSON evidence inspection path feeding the terminal UI, ECharts observatory and Camel exporter.](assets/architecture.svg)

[Open the full-size architecture diagram](assets/architecture.svg)

**Accessible architecture summary:** **Observe** records untrusted receive-only NOAA SAME and offline Spinel metadata; there is no connection to alert dispatch. **Simulate** independently creates test fixtures, passes them through an offline policy gate, signs local application notifications, and models Thread or direct-LoRa paths to synthetic text, light and haptic receivers. Authenticated receiver application receipts feed a replay journal and JSON evidence. **Inspect** reads that evidence through the text-oriented TUI, ECharts observatory, and Camel exporter, without authority to send alerts.

**Read the boundaries, not just the arrows.** The observation and simulation lanes are intentionally disconnected: a received SAME line does **not** authorize a synthetic alert. The Spinel CRC checks frame integrity, **not** authenticity or message meaning. The fallback arrows are scripted application routes, not measured radio links. Signed ACKs attest to simulated application processing, **not** device actuation, visual perception, or human acknowledgment.

## Built vs. demonstrated

| Instrument | Demonstrated in the repository | Still to establish |
| :--- | :--- | :--- |
| **Thread alert lab** | OpenThread POSIX simulation, local HMAC, replay journal, synthetic modalities | RF delivery, reliable notifications, user outcomes |
| **Multi-radio fabric** | Scripted Thread/direct-LoRa fallback, per-attempt authenticated receipts, duplicate suppression | LoRa hardware, LoRaWAN, real failover |
| **NOAA SDR observer** | Decoder-line parsing and bounded mock/replay observations | Origin authentication, field measurements |
| **Spinel Flight Recorder** | Offline HDLC-lite frame parsing, CRC-16/FCS and raw command IDs | Live RCP capture, semantic radio state |
| **Matter adapter** | Pinned SDK seam with mock controller | Commissioned endpoints, verified physical output |
| **Mesh Control** | Read-only TUI, accessible text report, optional measured **harness-monotonic** event replay | Live RF neighbor topology, captured on-air packet timing |
| **Camel exporter** | Sanitized research evidence export | Live alert routing or production Camel service |

> [!NOTE]
> **Reliability is an open research problem.** A previous four-node POSIX simulation intermittently missed a haptic ACK. A missing receipt is *unconfirmed*, not proof that no actuation occurred. We keep the failure visible rather than relaxing timeouts to make a chart green. See [known reliability gaps](docs/threat-model.md#observed-reliability-caveat-2026-10-20).

## Field notes & reproducibility

| Start here | What it contains |
| :--- | :--- |
| [Thread lab](experiments/thread-alert/README.md) | Reproduction and observed limitations |
| [Multi-radio experiment](docs/multiradio-fabric.md) | Attempt challenges, failover and deduplication |
| [SDR ingress](docs/sdr-ingress.md) | Receive-only NOAA/SAME observation pipeline |
| [Spinel Flight Recorder](docs/spinel-flight-recorder.md) | Byte-level parsing, command validation and 15 fixed offline reference vectors |
| [Rizzer offline Spinel adapter](docs/rizzer-spinel-fuzzing.md) | Bounded native fuzzing with a separate JS differential replay; no radio access |
| [Physical radio lab protocol](docs/physical-radio-test-protocol.md) | Proposed test equipment, authorization gates and independent actuation measurements |
| [Mesh Control](docs/mesh-control-tui.md) | TUI controls, plain text, accessibility |
| [Monotonic simulator evidence](docs/monotonic-evidence.md) | One four-node simulated run, 49 observed application events, exact provenance and cautions |
| [Reliability trial collector](docs/reliability-trials.md) | Bounded serial POSIX simulations, strict receipt invariants, failure-inclusive summaries |
| [Matter adapter](src/matter/README.md) | SDK adapter and mock boundary |
| [Alert schema](docs/alert-schema.json) | Machine-readable synthetic message format |
| [Threat model](docs/threat-model.md) | Spoofing, replay, missing receipts and safety limits |

## Independent fuzzing research: Rizzer

**Rizzer the Siamese Polo Shirts** is the source-vector mascot in our README hero, and [Rizzer](https://github.com/mcc0nnell/rizzer) is also the name of the independent Apache-2.0 native coverage-guided fuzzer, originating from the IHB synthetic-fuzzing prototype. It is one character with two distinct roles, not two separate mascots. It retains independent source control, release decisions and evidence. Potential 6lowStick targets include offline Spinel parsing, protocol input validation and synthetic alert-state invariants. **An opt-in, offline native fuzzing + JavaScript differential replay adapter is now implemented**, and there is no claim of a confirmed OpenThread vulnerability, radio transmission, or production-grade containment. See the [Rizzer README](https://github.com/mcc0nnell/rizzer#readme) for its current experimental scope and reproducible tests. Run `npm run fuzz:spinel -- --rizzer /absolute/path/to/rizzer --out evidence/rizzer-spinel-01` after reading the [offline fuzzing guide](docs/rizzer-spinel-fuzzing.md). Rizzer guides native coverage, **not JavaScript coverage**; retained inputs are replayed against the actual JavaScript Spinel recorder.

### Next experiments

1. Run bounded **timestamped simulated Thread trials** with `npm run evidence:reliability -- --trials 3` and [inspect every failure](docs/reliability-trials.md) without weakening the confirmation gate.
2. Cross-check offline Spinel decodes against independent frame specimens before interpreting radio evidence.
3. Conduct authorized, isolated **physical-radio experiments** with provenance and applicable regulatory controls.
4. Evaluate whether text, light, and haptic outputs are actually **perceived and understood** by people—not merely accepted by software.

---

**Safety.** Do not connect this prototype to public warning origination, operational emergency dispatch, or uncommissioned actuators. NOAA/SAME reception is not authenticated; a local gateway HMAC does not authenticate NOAA. [Apache License 2.0](LICENSE).

<sub>Built as an experimental accessibility and low-power networking laboratory. WindAnvil and TalkPipe can support development workflows; neither is required at runtime.</sub>
