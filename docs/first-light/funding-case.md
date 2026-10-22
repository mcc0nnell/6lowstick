# 6lowStick — 12-month First Light laboratory funding case

**Draft only · October 2026 · not submitted · no funds committed.** Proposed ask: **$300,000 for one year**, with a smaller $250,000 phased option. These figures are *planning allocations*, not vendor quotes, salary-market studies, approved grant categories, a cost estimate from a sponsor, or commitments by any institution. Equipment quantities and prices require quotations after a funding path is selected.

## Research proposition

6lowStick investigates an unusually important gap: a message can be sent, an application can acknowledge it, a device can activate, and a person can still fail to detect or understand a signal. It begins with an open, deterministic software lab for multiple physical-signal purposes—not only emergencies. The next step is a measured, controlled physical demonstration with separately recorded application, radio, actuator and human stages.

**Deliverable:** an Apache-2.0 research reference implementation and public, reproducible *sanitized* evidence; a documented experimental signal-intent contract; repeatable test fixtures; and laboratory methods for people to independently verify claims. No emergency service, certified device, radio reliability guarantee, human-outcome claim, or sponsor endorsement is promised.

## Requested 12-month budget (planning allowances)

| Use | $300k baseline | Why it is needed |
| --- | ---: | --- |
| Paid project lead / architecture and engineering time, fully loaded allowance | $150,000 | Protocol stewardship, tests, technical writing, maintainership and evidence quality |
| RF / firmware / embedded engineering contract support | $75,000 | Thread and separately scoped LoRa bench setup, source/pinning, reproducible tests |
| Accessibility measurement and participant-method specialist support | $20,000 | Independent sensing design; opt-in human-study protocol, not unapproved recruitment |
| Hardware and lab equipment allowance | $20,000 | Thread nodes, potential LoRa pair, isolated power, indicators, haptics, sniffers, scope/logic capture, attenuators |
| Lab operations, calibration and independent validation | $12,000 | Instrument calibration, protective fixtures, compatibility checks and test space |
| Documentation, travel and public demonstration allowance | $5,000 | Reproducibility reviews, conference/community demonstration if approved |
| Contingency / replacement devices | $18,000 | Failed components, acquisition changes, unexpected bench needs |
| **Total** | **$300,000** | **Planning target, not a quoted price** |

A **$250,000 option** would reduce engineering coverage and defer direct-LoRa hardware and human-participant work. It should not compromise independent physical sensing, laboratory authorization or personnel compensation. A sponsor's overhead, benefits, equipment ownership and indirect-cost rules must be calculated before any real proposal.

## Equipment gates (no purchases authorized)

- Controlled Thread bench: multiple compatible certified 802.15.4 boards/RCPs, corresponding host interfaces, matching pinned OpenThread firmware/source, and a passive sniffer.
- First physical outputs: low-voltage LED, current/optical sensor, haptic test actuator with independent accelerometer or other independently recorded physical measurement, and an accessible text display where feasible.
- Instrumentation and containment: oscilloscope/logic analyzer, instrumented power and timestamps, shielded or attenuated environment as required, and a hardware stop.
- Later alternate transport: a **separately authorized** direct-LoRa peer pair, antennas/attenuation matched to local permissions; this is not LoRaWAN and does not extend OpenThread's RF mesh.

For each candidate device obtain compatible radio/firmware details, shipping lead time, permission to operate, calibration/provenance plan, two comparable vendor quotes where practical and replacement availability. The [controlled bench protocol](../physical-radio-test-protocol.md) defines the stricter experimental gates.

## Milestones and acceptance evidence

| Period | Output | Acceptance gate |
| --- | --- | --- |
| Months 1–2 | Funded staff plan, hardware BOM, protocol v0 review | Named operator, authorization, written scope and procurable quotes |
| Months 3–4 | Isolated bench, independent sensing, known synthetic fixtures | Device manifests and sensor calibration; no unobserved actuation called success |
| Months 5–6 | First Light: one physical indicator and an independently observed activation | Per-trial raw evidence, failures included, no missing denominators |
| Months 7–9 | Thread hardware experiments and bounded fault injection | Captured RF/app/output stages with provenance, negative cases, independent clocks |
| Months 10–12 | Separate LoRa feasibility decision; repeatability package and public results | Published limitations, source/fixture hashes and reproducible methods |

Human testing requires separate review and consent; success at the bench never grants that permission. Hard stop: RF authorization uncertain, uncontrolled output, live alert ingress, unclear data custody, or unverified safety.

## Funding and governance

Candidate routes include open-source security sustainability, accessible technology R&D, philanthropic infrastructure research, applied radio/lab partnerships, donated surplus equipment, or a research contract. No particular funder is claimed as eligible or committed. Seek support for **paid development**, not equipment alone. Define ownership of purchased equipment, independent review, deliverable license, conflicts and any employment/contract restrictions before submission. Keep the research open and maintain strict boundaries around operational warning systems.

**Short ask:** Fund a 12-month, $300,000 open-source laboratory to make low-power signals measurable, so that an application ACK is never confused with the light, vibration, or human understanding it was intended to produce. The first independently verified physical demonstration is contingent on funding and authorized hardware.
