# NSF SBIR Phase I — commercialization Project Pitch outline

**Draft only, October 23, 2026. Not submitted, no Project Pitch invitation, no award.**

The [current NSF 26-510 solicitation](https://www.nsf.gov/funding/opportunities/small-business-innovation-research-small-business-technology/nsf26-510/solicitation) lists Phase I **up to $305,000 including all costs**, supporting R&D for **6–18 months**. Published *full-proposal* deadlines include **November 4, 2026** and **March 4, 2027**, but a [Project Pitch and official invitation](https://seedfund.nsf.gov/project-pitch/) come first. November is not a realistic full-proposal target absent an existing invitation.

## One-sentence technical hypothesis

A low-power signaling device can measure and cryptographically bind distinct outcomes—authorized sender intent, radio delivery evidence, application acknowledgment and independent sensor-measured physical output—so that missing physical proof cannot be misreported as successful notification, despite bounded radio faults and battery constraints.

**Important:** novelty is a *hypothesis to investigate*, not an established invention or solved technical problem. Existing 6lowStick evidence is software-only and does not demonstrate on-air delivery, hardware operation, embedded energy performance, physical detection or customer adoption.

## Draft pitch components (not applicant statements)

**1. Technical innovation** — Test whether hardware-integrated independent output sensing and tamper-evident, fail-closed evidence can provide a new low-power correctness contract compared with ordinary ACK-only receivers. Clearly compare existing Thread/Matter, BLE, LoRa/Meshtastic and notification devices. Do not imply Thread runs over LoRa, or that an iPhone exposes arbitrary Thread connectivity.

**2. Objectives and technical risk** — (a) build isolated Thread RF and independent optical/vibration/text measurement test fixtures; (b) prove/disprove event attribution across different clocks and unreliable links; (c) bound false-positive physical-success assertions under replay, dropped ACKs and outages; (d) evaluate energy cost and separate LoRa feasibility. Predefine denominator, acceptable uncertainty, abort conditions, exact hardware/firmware and independent lab instrumentation.

**3. Market opportunity** — Proposed first market is opt-in festival/group friend-finding and short-range coordination that people continue using afterward. Initial hypotheses need real customer interviews, permitted venue pilots, pricing tests, bill-of-materials quotations, distribution and support economics. No sales, orders, letters of intent or safety-certified devices are claimed.

**4. Company and team** — Identify actual applicant, cap table, U.S. ownership/control, PI, RF/firmware team, research and commercialization leads; do not invent team members. Technical credibility includes merged [OpenThread #13624](https://github.com/openthread/openthread/pull/13624) and [#13759](https://github.com/openthread/openthread/pull/13759). They are not commercial traction or grant endorsement.

The [NSF guidance](https://seedfund.nsf.gov/apply/project-pitch/) describes limits including 3,500 characters for the innovation and 1,750 each for market/team sections; confirm the live form requirements when authorized to apply.

## Eligibility gates before any external application

- Eligible US small business with fewer than 500 employees and generally at least 51% eligible U.S. citizen/permanent-resident ownership/control, with R&D performed domestically.
- Principal Investigator primarily employed **more than 50% by applicant during award** (NSF says outside employment over 19.6 hours per week conflicts with this), though not necessarily at submission. Identify a realistic PI and staffing plan.
- At least **two-thirds of Phase I SBIR budget allocated to the company**; STTR uses different mandatory research-institution allocations. Do not assume an ARDC fiscal sponsor is an STTR partner.
- Company registrations (SAM, Research.gov, SBA Company Registry) required before *full proposal*, not Project Pitch.
- Build a separate eligible **≤$305k all-in** budget; do **not** copy the existing $330k grant case or bill overlapping activities to Alpha-Omega/ARDC.
- TEDCO Maryland SBIR/STTR match of up to $25k Phase I is a separate **conditional, competitive post-award program**; never pre-book it as secured cash.
- Demonstrate material technical uncertainty *and* commercialization potential; mere integration of established chips and protocols may not qualify.

**Next research task:** produce a prior-art matrix and 10–20 structured customer-discovery interviews before choosing a final technical innovation and translating these prompts into a real NSF pitch.

Official sources: [NSF eligibility](https://seedfund.nsf.gov/solicitation-eligibility/), [NSF Phase I solicitation](https://www.nsf.gov/funding/opportunities/small-business-innovation-research-small-business-technology/nsf26-510/solicitation), [Project Pitch guide](https://seedfund.nsf.gov/apply/project-pitch/), [TEDCO matching fund](https://www.tedcomd.com/sbirsttr-matching-funds).
