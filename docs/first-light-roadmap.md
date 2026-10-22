# First Light — engineering milestone, not a claim of hardware success

**Goal:** Show that a consented signaling intent can eventually produce a perceivable, *independently measured* physical output, preserving failure evidence at every stage. Until funded, only the source artifacts and offline planner are implemented.

## Milestone gates

1. **Baseline / source candidate.** Recheck tests, site and source-release reproducibility. The `v0.1.0-rc.1` candidate remains untagged until an explicit approval of exact SHA/tag/release notes. No npm publication.
2. **General-purpose software contract.** Typed signal intent, short TTL, admission fixtures, duplicate rejection, no live dispatch. Show negative cases for unconsented presence, expired messages, forged recipients and attempts to assert physical success. The planner is a research seam, not secure communications.
3. **Funding / procurement.** Publish a scoped equipment and staffing need; obtain funding, institutional/lab permissions, compatible hardware BOM quotes and an appropriate RF plan *before* buying or testing physical radios.
4. **Physical First Light bench.** Send authorized *test-only* intent over an actual Thread-enabled development board to a separate output controller. Observe LED or haptic output with independently calibrated instrumentation; timestamp intent, attempted send, app ACK and sensor observation separately. Capture failed trials and denominators.
5. **Alternate transport.** Add a locally authorized point-to-point LoRa pair with region-appropriate RF controls. Fault-inject Thread outages, replay/duplicate cases and receiver power loss. Show true physical fallback with bounded trials before discussing reliability; do not describe this as LoRaWAN or an OpenThread mesh extender.
6. **Opt-in friend finding.** Design a short-lived, revocable nearby-presence protocol with explicit mutual consent, privacy review, no covert location disclosure, and accessible notification modes. Test human perception and comprehension **separately** under consent-based research procedures.

## Exit criteria for the first hardware demo

A recorded independent output sensor measurement paired to a specific test intent; authenticated application receipt separately recorded; provenance for firmware, radio modules, region configuration and test instrumentation; negative/replay/failure runs; reproducible operator instructions; a clear distinction between 'light actually activated' and 'a person saw it.' A green simulation test cannot satisfy this gate.

**Dependency:** Equipment and lab funding. Nothing in the current repository qualifies as a physical first-light demonstration.
