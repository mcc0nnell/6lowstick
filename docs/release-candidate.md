# v0.1.0-rc.1 release candidate — source-only research baseline

**State: prepared, not tagged, not published.**
**Audience:** reproducibility reviewers, open-source maintainers,
accessibility researchers and prospective laboratory collaborators.
**Never install as a live emergency alerting system.**

## Contract

This first candidate is a **source-only snapshot** of an exploratory
simulation/analysis instrument. It is intentionally `0.x` and
pre-release. It is **not an npm-published module** (`private: true`),
supported service, radio firmware, notification appliance or safety
product. No stable API, data schema, certification or availability
guarantee is offered.

The Mesh Observatory serves **deterministic modeled scenarios**, not
live RF telemetry. NOAA observations cannot authorize dispatch; a
synthetic app ACK never proves device actuation or human perception.
See [architecture](../README.md), [threat model](threat-model.md) and
[controlled hardware protocol](physical-radio-test-protocol.md).

## Qualification gates

| Release gate | Source candidate evidence | Status |
| --- | --- | --- |
| Open source identity | Apache-2.0 LICENSE, matching package and lockfile license | Scripted check |
| Dependency and runtime contract | Node 22+, exact root dependency, lockfile, private npm package | Scripted check |
| Test suite | Node tests including native differential test on Clang++ hosts | CI required |
| Offline reproducibility | Fixed synthetic Spinel fixtures and repeatable deterministic source archive | Scripted check |
| Clean source provenance | Git archive from one committed tree; no ignored local `evidence/`, `dist/`, or `node_modules/` | Scripted check |
| Security boundaries | Explicit research-only warning and security contact policy | Documented |
| Real OpenThread lab | Requires separately compiled `ot-cli-ftd`; previous run identified intermittent haptic ACK gap | **Open research risk** |
| Hardware RF / actuators | No approved 802.15.4 bench or verified physical indicators yet | **Not demonstrated** |
| Accessibility outcomes | No verified user detection or comprehension studies | **Not demonstrated** |
| NOAA origin authenticity | Not provided, and receive-only observations are untrusted | **Not implemented** |
| Distribution approval | No tag or GitHub Release until explicit maintainer approval | **Pending** |

Hardware and human-factor gaps block **operational claims**; they do not
block a rigorously labeled *simulation-only research source snapshot*.

## Validate a checkout

From a clean checkout of the release-candidate commit:

```sh
node --version                       # Node >= 22
npm ci
npm test
npm run release:check
npm run release:source               # source archive, no tag/publish/deploy
(cd dist && sha256sum -c 6lowstick-v0.1.0-rc.1.tar.gz.sha256)
tar -tzf dist/6lowstick-v0.1.0-rc.1.tar.gz | head
cat dist/6lowstick-v0.1.0-rc.1.provenance.json
```

`npm run release:source` refuses dirty worktrees or a package version
different from committed HEAD. The source archive uses `git archive`
and deterministic gzip metadata, excluding local evidence and installed
packages. Rebuilding the same commit on a compatible toolchain should
reproduce the same archive digest. **The extracted archive is also
CI-tested with `npm ci && npm test && npm run release:check` without a
`.git` directory.** The archive can validate metadata but cannot assert
Git-tracked-file status without Git metadata. Checksums certify only byte
integrity, **not the author of the artifact**.

The generated artifacts remain ignored local files until explicitly
approved for distribution. CI also runs the metadata/source-archive
gate without creating tags, releases, npm publications, or deployments.

### Optional evidence with external tooling

Real OpenThread POSIX simulation requires a **separately built** compatible
`ot-cli-ftd`, set using `OT_CLI_PATH`. Record its SHA-256, compiler,
source commit and simulated-radio status. See
[reliability reproduction](reliability-trials.md). The native Rizzer
campaign is opt-in on an authorized local Linux host with a separate
Rizzer checkout. See [Rizzer cross-check](rizzer-spinel-fuzzing.md).

Do not embed ignored local output into a public source archive. Obtain
consent, redact sensitive data and explicitly label any future
separately published research traces.

## Before an actual tag or GitHub Release

1. Review **current** `main` CI and Pages status and verify the
   candidate commit and dependency/audit state.
2. Verify the source archive twice and record matching SHA-256 digests.
3. Reconcile `CHANGELOG.md`, security scope and version if further code
   changes were merged. Revalidate after any update.
4. Decide whether to proceed despite the documented intermittent
   simulator ACK issue (acceptable only for a simulation-labeled
   experimental research snapshot).
5. Obtain explicit maintainer approval for the exact immutable commit,
   tag and release notes. Only then create a tag/GitHub prerelease.
   **No automated workflow in this repository publishes a release.**

## Release notes draft (not published)

**6lowStick v0.1.0-rc.1 — Simulation-first accessibility mesh research.**

A reproducible open-source software laboratory for studying the gap
between *sending* a synthetic notification, *receiving* it at an
application, and actually *perceiving* it. Includes OpenThread POSIX
simulated tests, scripted direct-LoRa fallback, mock modalities, a
read-only observatory/TUI, passive NOAA and Spinel parsers, native
fuzzing adapters, and explicit integrity and trust-boundary evidence.

**Not for real emergency warnings.** No RF delivery, physical
actuation, human understanding, or origin authentication has been
established. A previously observed intermittent simulator ACK gap is
still under investigation. Node 22+, `npm ci && npm test` for the
software laboratory; separately provision `ot-cli-ftd` and Rizzer
only for the optional local experiments. Apache-2.0 source.
