# 6lowStick — 12-month First Light laboratory funding case

**Draft only · October 2026 · not submitted · no funds committed.** Revised proposed ask: **$330,000 for one year**, reflecting a $50,000 part-time accessibility, project operations and grants role (formerly $20,000). A $300,000 or $250,000 cap would require a separately re-scoped and costed plan, not an implicit cut to measurement, staffing, or laboratory controls. These figures are *planning allocations*, not vendor quotes, salary-market studies, approved grant categories, a cost estimate from a sponsor, or commitments by any institution. Equipment quantities and prices require quotations after a funding path is selected.

## Research proposition

6lowStick investigates an unusually important gap: a message can be sent, an application can acknowledge it, a device can activate, and a person can still fail to detect or understand a signal. It begins with an open, deterministic software lab for multiple physical-signal purposes—not only emergencies. The next step is a measured, controlled physical demonstration with separately recorded application, radio, actuator and human stages.

**Deliverable:** an Apache-2.0 research reference implementation and public, reproducible *sanitized* evidence; a documented experimental signal-intent contract; repeatable test fixtures; and laboratory methods for people to independently verify claims. No emergency service, certified device, radio reliability guarantee, human-outcome claim, or sponsor endorsement is promised.

## Requested 12-month budget (planning allowances)

| Use | $330k revised baseline | Why it is needed |
| --- | ---: | --- |
| Paid project lead / architecture and engineering time, fully loaded allowance | $150,000 | Protocol stewardship, tests, technical writing, maintainership and evidence quality |
| RF / firmware / embedded engineering contract support | $75,000 | Thread and separately scoped LoRa bench setup, source/pinning, reproducible tests |
| Part-time Accessibility, Project Operations & Grants Specialist (12 months) | $50,000 | Accessible test and participant-method coordination; procurement and project logistics; grant pipeline, deadlines, documentation and reporting tracking |
| Hardware and lab equipment allowance | $20,000 | Thread nodes, potential LoRa pair, isolated power, indicators, haptics, sniffers, scope/logic capture, attenuators |
| Lab operations, calibration and independent validation | $12,000 | Instrument calibration, protective fixtures, compatibility checks and test space |
| Documentation, travel and public demonstration allowance | $5,000 | Reproducibility reviews, conference/community demonstration if approved |
| Contingency / replacement devices | $18,000 | Failed components, acquisition changes, unexpected bench needs |
| **Total** | **$330,000** | **Revised planning target; not a quoted price** |

**Budget reconciliation:** The prior baseline was $300,000 with $20,000 for specialist support. Expanding that allocation to $50,000 adds $30,000; all other lines are unchanged, making the revised baseline **$330,000**. A $300,000 cap would need $30,000 in explicitly identified phase or scope reductions; a $250,000 option would require a much larger revised work plan. Neither alternative is presently a fully costed proposal. Do not quietly reduce independent sensing, laboratory authorization, or reasonable staffing compensation to meet an arbitrary ceiling. A sponsor's overhead, benefits, equipment ownership and indirect-cost rules must be calculated before any real proposal.

## Part-time specialist remit and accountability

The $50,000 line is an **illustrative 12-month part-time project allocation**, not a quoted salary, a specific hourly rate, or an approved position. The specialist works across accessibility research, program coordination, and grant administration support:

- **Accessibility and research coordination:** advise on visual, haptic and text signals; organize accessible test plans, independent-output measurement documentation, interpreting/participation logistics, and consent-based participant methods if separately authorized. This is not permission to recruit participants or run a human-subject study.
- **Project operations:** maintain the experiment calendar, equipment quote and purchasing *requests*, supplier lead-time tracker, review meetings, dependencies, milestone owners, open risks, and action items. The specialist coordinates acquisition documentation but has no standalone purchasing authority.
- **Grant pipeline and tracking:** maintain a funder/eligibility matrix and deadline calendar; coordinate proposal attachments and accessibility requirements; track submissions **only after authorized submission**, funding decisions, milestones, deliverables, reporting dates, supporting receipts and closeout records. Support progress narratives and spending reconciliation with the project lead or fiscal sponsor.

**Accountability:** A shared milestone register, regularly updated grant calendar, dated equipment-and-lab readiness tracker, and written accessibility/research logistics plans are proposed work products. The project lead retains technical acceptance and any authorized fiscal sponsor or grant officer retains financial signoff and award-compliance authority. This planning line does not imply an award, employee engagement, organizational grant eligibility or the ability to submit on another party's behalf.

## Equipment gates (no purchases authorized)

- Controlled Thread bench: multiple compatible certified 802.15.4 boards/RCPs, corresponding host interfaces, matching pinned OpenThread firmware/source, and a passive sniffer.
- First physical outputs: low-voltage LED, current/optical sensor, haptic test actuator with independent accelerometer or other independently recorded physical measurement, and an accessible text display where feasible.
- Instrumentation and containment: oscilloscope/logic analyzer, instrumented power and timestamps, shielded or attenuated environment as required, and a hardware stop.
- Later alternate transport: a **separately authorized** direct-LoRa peer pair, antennas/attenuation matched to local permissions; this is not LoRaWAN and does not extend OpenThread's RF mesh.

For each candidate device obtain compatible radio/firmware details, shipping lead time, permission to operate, calibration/provenance plan, two comparable vendor quotes where practical and replacement availability. The [controlled bench protocol](../physical-radio-test-protocol.md) defines the stricter experimental gates.

## Milestones and acceptance evidence

| Period | Output | Acceptance gate |
| --- | --- | --- |
| Months 1–2 | Funded staff and specialist operations plan, initial grant calendar, hardware BOM, protocol v0 review | Named operator, milestone owners, procurement schedule, authorization, written scope and procurable quotes |
| Months 3–4 | Isolated bench, independent sensing, known synthetic fixtures | Device manifests and sensor calibration; no unobserved actuation called success |
| Months 5–6 | First Light: one physical indicator and an independently observed activation | Per-trial raw evidence, failures included, no missing denominators |
| Months 7–9 | Thread hardware experiments and bounded fault injection | Captured RF/app/output stages with provenance, negative cases, independent clocks |
| Months 10–12 | Separate LoRa feasibility decision; repeatability package, grant-reporting reconciliation and public results | Published limitations, source/fixture hashes, agreed funder reporting and reproducible methods |

Human testing requires separate review and consent; success at the bench never grants that permission. Hard stop: RF authorization uncertain, uncontrolled output, live alert ingress, unclear data custody, or unverified safety.

## Funding and governance

Candidate routes include open-source security sustainability, accessible technology R&D, philanthropic infrastructure research, applied radio/lab partnerships, donated surplus equipment, or a research contract. No particular funder is claimed as eligible or committed. Seek support for **paid development**, not equipment alone. Define ownership of purchased equipment, independent review, deliverable license, conflicts and any employment/contract restrictions before submission. Keep the research open and maintain strict boundaries around operational warning systems.

**Short ask:** Fund a 12-month, $330,000 open-source laboratory to make low-power signals measurable, so that an application ACK is never confused with the light, vibration, or human understanding it was intended to produce. The first independently verified physical demonstration is contingent on funding and authorized hardware.
