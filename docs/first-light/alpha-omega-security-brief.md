# Alpha-Omega security intake brief — not submitted

**Draft October 23, 2026.** Q4 submission window October 1–31, 2026; Alpha-Omega accepts applications **through its official form**, not informal emails or this repository. [Published process](https://alpha-omega.dev/grants/how-to-apply/).

**Potential eligible project:** Apache-2.0-licensed open 6lowStick research. **Fit risk: high.** It is experimental, not established critical infrastructure. We should not imply that upstream OpenThread maintainers sponsor the grant or that Alpha-Omega will fund the consumer hardware roadmap.

**Problem.** Low-power software can conflate an authenticated application receipt with proof of physical actuation or human detection. The existing synthetic protocol separates these states but requires systematic security evaluation of origin identity, replay, expiry, relay limits and misleading PASS evidence.

**Proposed security-only scope (for funder co-design):**
1. Public threat model and abuse-case taxonomy for intent, replay, authorization, cross-origin fragments, receiver state and evidence provenance.
2. Negative, reproducible tests for wrong-origin/expired/duplicate messages, claimed physical outcomes without independent measurement, and fail-closed behavior.
3. Pinning and sanitized evidence publication; optional upstream patches only if a maintainer approves their technical scope.
4. Public monthly security progress and baseline/midpoint/final report aligned with AO's stated reporting model.

**Proof today.** Existing POSIX simulated-radio and deterministic test evidence; merged OpenThread [fragment-source fix](https://github.com/openthread/openthread/pull/13624) and [multi-PAN RCP CI coverage](https://github.com/openthread/openthread/pull/13759). Neither establishes physical on-air reliability or any funding commitment.

**Not requested through AO:** commercial festival rollout, phone accessory manufacturing, paid user acquisition, unproven RF availability, or blanket safety certifications.

**Pre-submission gates:** named legal recipient, OSI license verified, security-criticality argument beyond one project, exact deliverables/test baselines, allowable staffing costs, no dual reimbursement. The $100k security slice of [the planning allocation](non-dilutive-funding-plan.md) is merely illustrative, **not a published cap or commitment**.

**Status:** no form prepared in AO's system, no application submitted, no meetings or funding agreed.
