# Changelog

6lowStick is an experimental, Apache-2.0 research repository.
This changelog records research interfaces and test evidence, **not**
certified accessible emergency notification capabilities.

## [Unreleased]

### 6lowFlare (simulation-only)
- Introduce an opt-in, authenticated, short-lived group signaling and bounded relay model with an explicit relay toggle, replay protection, offline demo and negative tests. No radio transmission, Matrix client, public broadcast or physical/human notification evidence.
### 6lowSpark product concept (documentation only)
- Introduce **6lowSpark** as a proposed magnetic battery pack and LoRa-capable messaging/relay accessory within 6lowStick. Add conceptual architecture, proposed interfaces, safety boundaries, and an evidence-driven bench plan; **no hardware, firmware, wireless charging, or physical RF validation**.
- Keep iPhone access via Bluetooth LE as the intended first integration path, with Thread accessory compatibility as an open research gate—not a supported feature.

### Funding plan revision
- Expand the 12-month specialist allocation from $20k to $50k for part-time accessibility coordination, project logistics, and grant tracking; revise the illustrative request to $330k without cutting technical or equipment lines. No award, hire, procurement or submission.

### Documentation
- Rewrite the README and Field Station explanation around the delivery-versus-perception research question, with a guided documentation index and a clear reader path from claims to reproducible evidence and limitations.
- Add editorial navigation tests for section order, safety language and local documentation links.

### Changed
- Redesign Mesh Observatory as the Field Station: dedicated experiments, evidence and methods navigation, responsive design tokens, independent text/JSON inspection, and documented synthetic-only state indicators.
- Add a read-only deterministic `site:check` for fixture/view consistency and SHA-256 input provenance, executable under WindAnvil Blade/TalkPipe without granting browser execution authority.

### First Light preparation (no hardware)
- Add simulation-only, scoped `6lowstick.signal-intent.v0` validation and local admission; no device or network action path.
- Document funding gates, independent physical-output measurement, and an initially $300k planning case (subsequently revised to $330k); no grant submitted or equipment purchased.
- Preserve the exact Blade-admitted composition prompt and untagged source release approval boundary.

### Planned
- Instrumented, explicitly authorized 802.15.4 hardware tests and
  passive Spinel capture through an existing RCP host-driver boundary
- Independently sensed text, light, and haptic output measurements
- Investigation of intermittent POSIX simulated-radio application ACK gaps
- Consent-based evaluation of notification perception and comprehension

## 0.1.0-rc.1 — prepared, untagged release candidate

**Status:** source-only research release candidate; not published.

### Included
- Synthetic OpenThread POSIX alert research with local application HMAC
  and replay controls; externally built `ot-cli-ftd` is optional
- Scripted Thread/direct-LoRa application model plus OpenThread POSIX
  simulated-UDP receipt/failover exercise (LoRa still scripted), with
  authenticated per-attempt receipts and explicit unconfirmed outcomes
- Receive-only NOAA/SAME decoder-line research and passive offline
  Spinel HDLC-lite/FCS integrity recorder
- Fifteen synthetic independent Spinel reference vectors and offline
  Rizzer native fuzzing with partial corpus replay against JavaScript
- Pinned `@matter/main` adapter seam with simulated endpoint behavior
- Read-only Mesh Control terminal interface, JSON evidence output,
  ECharts-based Mesh Observatory and sanitized Apache Camel export
- Reproducible local evidence scripts and software-only safety boundaries
- Versioned source-archive generation with SHA-256, commit provenance,
  matching Apache-2.0 metadata and explicit release checks

### Verified limitations
- A **previous intermittent haptic ACK gap** in an otherwise healthy
  four-node POSIX simulation remains unresolved; ten later serial
  simulated trials behaved as expected. Neither result estimates
  physical RF or human notification reliability.
- Simulated direct-LoRa routing is not LoRa or LoRaWAN hardware support.
- Offline Spinel frame checks do not authenticate frame origin or verify
  RF transmission; Rizzer coverage is native C++, not JavaScript.
- No commissioned Matter hardware, real haptic/light/display actuation,
  live NOAA authentication, field RF measurements, or human studies.
- The prototype must not dispatch operational alerts or be used for life
  safety. The source archive is **not** an npm package or a signed binary.

See [candidate validation and release policy](docs/release-candidate.md)
and [threat model](docs/threat-model.md).
