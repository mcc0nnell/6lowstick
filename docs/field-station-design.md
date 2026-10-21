# Field Station design system — research evidence first

The 6lowStick Field Station is the **GitHub Pages** home for the experimental
6lowStick software research project. It is intentionally not a device control
plane or a live emergency-alert service. Reference: `site/index.html`,
`site/station.css`, `site/observatory.js`, and `site/station-model.mjs`.

## Product hierarchy

Stratum-inspired discipline, not Stratum branding: one coherent system of
typography, tokens, navigation, status and evidence between information layers.
The *identity and subject matter* are different: field instrumentation,
communications research, and the 6lowStick Rizzer mascot.

- **Overview:** scope and limitations before any experiment. Metrics are read
  from the bundled JSON fixture, never invented or tied to RF hardware.
- **Experiments:** interactive chart of a single deterministic synthetic trace,
  with previous/next controls and optional playback.
- **Evidence:** an independent structured text table, inspectable selected raw
  event, and a plain-text report. All essential data remains available if
  ECharts fails to load.
- **Methods:** direct source links to the recorder, multi-radio simulation,
  physical bench protocol and threat model.

## Visual vocabulary

Tokens are defined in **one** source: `site/station.css`.
- Surfaces: `--bg`, `--panel`, `--panel-hi`, `--border`.
- Readable text: `--text`, `--muted`. The faint tone is for low-priority
  chrome only.
- Signal green `--signal`: focus on selected *synthetic* evidence or a
  validated *application* receipt, never verified human receipt.
- Amber `--amber`: missing receipt, caveat, unverified or unknown.
- Cyan `--cyan`: links and navigational destinations.

Color never carries outcome semantics alone. Text labels, arrows, line styles,
table cells and status explanations remain available. Icons are decorative
unless accompanied by accessible text.

## Safety, accessibility and behavior

The browser loads `./multiradio.json` only and never writes to a remote
endpoint, local device, radio, actuator or dispatch service. The JSON parser
requires the software-only evidence schema and rejects positive radio/human
verification claims. Events are **logical sequence order**; no wall clock,
packet timestamp, topology discovery, actual LoRa transmit or verified
stimulation is implied.

The page uses semantic landmarks, a skip link, visible focus, keyboard controls,
a full table equivalent to the graphics, a nonvisual report, explicit unconfirmed
states and responsive layout. A reduced-motion toggle and operating-system
preference disable automatic sequence playback.

ECharts remains pinned at the existing `5.6.0` browser CDN version. If it is
unavailable, the fixture still renders in the DOM table and report.

The visual layer is allowed to change independently of the evidence schema;
no authority is derived from a successful chart render.

## Verification and TalkPipe through Blade

```bash
npm ci
npm test
npm run site:check
npm run release:check
```

The `site:check` script is a **read-only deterministic** evidence audit:
verifies that the view, controls, source assets, scope labels, fixture and model
agree and produces SHA-256s of its exact local inputs. A successful receipt
proves **only those checks**.

An authorized operator may run `python3 scripts/field-station-check.py`
through a ChatterLang pipeline admitted as `talkpipe.run` by **WindAnvil
Blade**, following Blade's locally pinned runner, signed grant, pipeline root,
digest check, and read-only evidence receipt. TalkPipe does not admit `node`
as an exec command, so Node-based `site:check` runs in CI separately. Neither the TalkPipe transport
nor Blade is a 6lowStick browser runtime dependency, and no new agent authority
is granted in this repo.

## Publication

The Pages workflow runs `npm ci && npm test && npm run site:check` and then
exports the deterministic multi-radio fixture before upload. No physical bench
results or user testing is implied by a successful Pages deployment.
