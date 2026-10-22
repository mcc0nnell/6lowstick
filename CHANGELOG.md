# Changelog

6lowStick is an experimental, Apache-2.0 research repository.
This changelog records research interfaces and test evidence, **not**
certified accessible emergency notification capabilities.

## [Unreleased]

### First Light planning (software-only)
- Add fail-closed offline typed signal-intent planner with short-lived, local-fixture-only friend presence and check-in, eight negative/positive tests, and a deterministic demo. No dispatch, secure pairing or radio operation.
- Document the physical First Light milestones, required instrumentation, unfunded equipment list, consent/privacy gates, and illustrative $275,000 annual funding proposal.
- Include a composition brief and a read-only WindAnvil Blade/TalkPipe source audit. This is an inventory, not physical assurance.

### Documentation
- Rewrite the README and Field Station explanation around the delivery-versus-perception research question, with a guided documentation index and a clear reader path from claims to reproducible evidence and limitations.
- Add editorial navigation tests for section order, safety language and local documentation links.

### Changed
- Redesign Mesh Observatory as the Field Station: dedicated experiments, evidence and methods navigation, responsive design tokens, independent text/JSON inspection, and documented synthetic-only state indicators.
- Add a read-only deterministic `site:check` for fixture/view consistency and SHA-256 input provenance, executable under WindAnvil Blade/TalkPipe without granting browser execution authority.

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
