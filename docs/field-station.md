# 6lowStick Field Station — interface and evidence boundaries

The Field Station is the **static, read-only GitHub Pages front door** to
6lowStick research. It brings together experiment playback, the evidence
inspector, raw JSON, accessible text, and research methods in one cohesive
interface. It does not originate notifications or access any radio hardware.

## Visual system

Stratum's restraint is an inspiration, not a brand or code dependency.
6lowStick uses its own research-station visual vocabulary:

- Near-black #0a1011 surfaces and clear low-noise module separators
- Signal green #c4ef79 for *synthetic* confirmed application receipts
- Amber #ffd08a for **unconfirmed** attempts, caveats, and physical gaps
- Cyan #8cddea for navigation and evidence references
- Human-readable text alongside any diagram; not color alone for status
- Deliberate Rizzer placement; mascot is never a claim of successful alerting

Canonical web tokens live in `site/station.css`. The website is intentionally
framework-free, with ECharts optionally enhancing the graphic views.
The source of truth for displayed counts is `site/multiradio.json`, generated
from `experiments/multiradio/drill.mjs` by the Pages workflow.
`station-model.mjs` rejects evidence that claims physical radio verification
or human delivery, or that contains unknown routes/outcomes. Charts are not
used as assertions, nor are temporal values invented from event order.

The text report and table provide full access to ordered events if the
ECharts CDN is unavailable. Controls are keyboard-accessible. Automatic
playback respects reduced-motion preferences and stops when the tab hides.

## Sections

1. Overview: scope, synthetic drill counts, research baseline and safety note
2. Experiments: scripted route graph, stateful replay and selected event
3. Evidence: actual JSON fields, accessible trace and original fixture
4. Methods: deep links to the experimental methodology and threat model

The **haptic** indicator represents a *synthetic receiver journal* in this
fixture. Text and visual modalities are explicitly not exercised. Neither
a successful application receipt nor a synthetic journal activation proves
actuation, perception or comprehension.

## Test and publish

```sh
npm ci
npm test
python3 scripts/field-station-check.py  # deterministic read-only file hashes and safety checks
npm run site:check                   # JS-side read-only inventory and CI gate
```

GitHub Pages deploys only `site/`. Its `assets/rizzer-transparent.webp`
is copied from the canonical repository art so it renders at the Pages path.

### Optional WindAnvil Blade → TalkPipe validation on Butcher

**Blade is a development authority boundary, not a website runtime.**
The existing local Blade socket is UID-bound and mode 0600; the signed
`talkpipe.run` Celix capability is admitted separately. TalkPipe runs a
*read-only* Python audit of this source through an exact SHA-256-bound
ChatterLang pipeline:

```text
INPUT FROM exec[command="python3 /absolute/checkout/scripts/field-station-check.py"] | print
```

For an explicitly authorized checkout, write the pipeline as a single
regular file inside the operator-configured pipeline root (not a symlink)
and run it with:

```sh
TALKPIPE_PIPELINE_ROOT=/operator-configured/pipelines \
  /absolute/path/to/windanvil-blade-integration/tools/talkpipe-mcp.sh run \
  /operator-configured/pipelines/6lowstick-field-station-v1
```

The wrapper computes the pipeline SHA-256 and submits a
`windanvil.blade.talkpipe-exec/v1` envelope. Blade authorizes execution
against the active signed capability grant and writes digest-bound
receipts. TalkPipe's own executable allowlist remains in force.
The returned audit report contains hashes and evidence classification
but no secret data, live-radio telemetry, or user content.

**Limitations:** the read-only audit proves source presence, structure and
synthetic scope, not rendered browser appearance, contrast compliance,
radio reliability, or product security. Local Blade development signing
keys are not a remote production trust root. No live Blade API, TalkPipe
runner, secrets, signing keys, or private receipts ship in the Pages tree.
