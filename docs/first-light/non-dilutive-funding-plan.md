# First Light — non-dilutive funding plan

**Draft, October 23, 2026. Not submitted; no awards, sponsorships, quotations, purchases or commitments.**

The existing [First Light funding case](funding-case.md) remains authoritative: a $330,000, 12-month *planning* ask consisting of $150k project lead, $75k embedded/RF engineering, $50k part-time accessibility/operations/grant tracking, $20k hardware, $12k laboratory/calibration, $5k documentation/travel, and $18k contingency. None are vendor quotes or approved indirect-cost categories.

## What the money would establish

A reproducible physical research laboratory that measures **intent → transport attempt → application acknowledgment → independently observed physical output → (only with separately approved research) human detection and understanding**. Software-only simulation is the present evidence. No Thread RF, physical LoRa, reliable warning service or independently measured actuator has been demonstrated. This is not an emergency product.

Merged upstream OpenThread contributions [#13624](https://github.com/openthread/openthread/pull/13624) and [#13759](https://github.com/openthread/openthread/pull/13759), each approved by @jwhui October 23, show technical experience; they do **not** prove the 6lowStick hardware concept, funder endorsement or project eligibility.

## Funder routing (published information verified October 23, 2026)

| Lane | When / possible grant | Eligibility and fit | Next gate |
| --- | --- | --- | --- |
| [Alpha-Omega](https://alpha-omega.dev/grants/how-to-apply/) | Q4 intake October 1–31, 2026 | OSI-licensed open source with material ecosystem **security** impact; new prototype criticality not established | Confirm eligible recipient and security impact, then **official form only**; no application sent |
| [ARDC](https://www.ardc.net/apply/) | January 15, 2027 deadline (next 2027 round) | Open digital communication R&D, open outputs; eligible charity, school, university or government agency; individuals need qualifying fiscal sponsor; companies ineligible directly | Find eligible sponsor, check grant fit and sponsor indirects, prepare RF bench budget |
| [NSF SBIR/STTR 26-510](https://www.nsf.gov/funding/opportunities/small-business-innovation-research-small-business-technology/nsf26-510/solicitation) | Phase I up to **$305k all-in**; full proposal November 4, 2026 or March 4, 2027 **only after invited Project Pitch** | U.S. small business; novel high-risk R&D and commercialization; PI primarily employed (>50%) by applicant during award | Identify real company/PI and technology risk, draft **Project Pitch**, wait for invitation |
| [TEDCO SBIR/STTR match](https://www.tedcomd.com/sbirsttr-matching-funds) | Phase I competitive match of lesser of 25% or **$25k**, after eligible SBIR/STTR award | Maryland small business with qualifying award inside program timing | Conditional downstream route only; do not budget as secured |
| Hardware manufacturers | No verified commitment | Donated development boards, instruments, parts, engineering guidance | Validate compatible bill of materials and request written support |

**Do not turn these into a naïve $330k sum.** Funder eligibility, entity, terms, overhead, grant outputs, ownership and effort-reporting must be evaluated separately. A grant is not a customer order. Donated equipment is not cash salaries.

## Illustrative non-overlapping budget workstreams — *not funder asks*

The following is an accounting **example**, not approved scopes or predicted award amounts. The baseline can be partitioned without duplicate charges:

| Expense | Open-source security | Open radio research | Third source, unidentified | Existing total |
| --- | ---: | ---: | ---: | ---: |
| Project leadership | 70,000 | 60,000 | 20,000 | 150,000 |
| RF / embedded engineering | 20,000 | 50,000 | 5,000 | 75,000 |
| Accessibility, operations and grants | 10,000 | 20,000 | 20,000 | 50,000 |
| Hardware | 0 | 20,000 | 0 | 20,000 |
| Lab, calibration, independent validation | 0 | 10,000 | 2,000 | 12,000 |
| Documentation and travel | 0 | 5,000 | 0 | 5,000 |
| Contingency | 0 | 5,000 | 13,000 | 18,000 |
| **Total** | **100,000** | **170,000** | **60,000** | **330,000** |

All three column headings are hypothetical workstreams, not confirmed funders. A $60k gap remains **unidentified**, and neither AO nor ARDC has agreed to any amount. The contingency and potential fiscal sponsor fee require correct direct-versus-indirect classification. ARDC says ordinary indirect costs may be **up to 20%**, so sponsor overhead or unallowable expenses may require a full rebudget. A **separate alternative** is NSF Phase I (up to $305k) followed by a conditional Maryland match (up to $25k), with a *different compliant project budget*; it is not additive on top of costs already reimbursed elsewhere.

## Acceptance milestones

1. **Pre-award:** applicant entity and sponsor identified; conflict-free eligibility, eligible staffing/PI, license, budget owner, open-output commitment, lab authority, equipment ownership and estimates documented.
2. **Months 1–2:** signed scope, named lab operator, two comparable quotes for major equipment where possible, source/firmware manifests, timestamp and independent-sensor methods.
3. **Months 3–4:** isolated fixture, synthetic inputs only, calibrated independent optical/electrical/mechanical observations; failures counted.
4. **Months 5–6:** First Light: at least one actual physical indicator *independently observed*, not merely an application ACK.
5. **Months 7–9:** authorized controlled 802.15.4 radio trials and bounded fault injection, with all denominators and negative evidence published.
6. **Months 10–12:** LoRa feasibility go/no-go as **separate transport**; public sanitized repeatability package and funder reconciliation. Human studies require separate consent/review.

## Immediate actions, not yet performed

- **This week:** confirm whether the experimental project's security impact genuinely meets Alpha-Omega's critical OSS bar; decide whether to use the [security-specific intake brief](alpha-omega-security-brief.md). Only the official form counts for AO and no form has been sent.
- **Before Jan 15:** identify ARDC-eligible fiscal sponsor or university/nonprofit applicant; check suitability at `giving@ardc.net` only with permission; provide sponsor budget and equipment quotes.
- **After applicant feasibility:** distinguish NSF's company/PI research and commercialization lane from a publicly funded nonprofit lab; prepare a Project Pitch, not a presumptive November proposal.
- **All lanes:** maintain one ledger of time, costs, deliverables, ownership, award obligations, reports, contact dates and responses. Prevent the same expense being charged twice.

## Primary sources

- [Alpha-Omega application cycle and security criteria](https://alpha-omega.dev/grants/how-to-apply/)
- [ARDC eligibility and 2027 dates](https://www.ardc.net/apply/), [ARDC application/indirect cost instructions](https://www.ardc.net/apply/grant-application-instructions/)
- [NSF 26-510 solicitation](https://www.nsf.gov/funding/opportunities/small-business-innovation-research-small-business-technology/nsf26-510/solicitation), [NSF eligibility](https://seedfund.nsf.gov/solicitation-eligibility/), [NSF Project Pitch](https://seedfund.nsf.gov/project-pitch/)
- [TEDCO match conditions](https://www.tedcomd.com/sbirsttr-matching-funds)

Reverify program rules at application time. No program, institution or reviewer has endorsed this document.
