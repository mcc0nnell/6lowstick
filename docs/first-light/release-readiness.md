# Release handoff — no tag created

The experimental source candidate `v0.1.0-rc.1` remains **prepared and untagged** until the maintainer confirms an exact immutable commit SHA and approves the final release notes. This work adds a forward-looking First Light interface and documentation; it does **not** silently relabel the current package `v0.2.0`, publish to npm, deploy firmware, or promise live signaling.

Before release: verify current `main` hosted tests and Pages; run `npm ci && npm test && npm run release:check && npm run site:check` from a clean tree; build the deterministic archive twice from the same committed SHA via `npm run release:source` and compare SHA-256; extract without `.git` and re-run tests and gates. Confirm current changelog, security scope, and dependency audit; document the unresolved intermittent simulated application ACK behavior.

**Approval gate:** A maintainer must explicitly approve **tag `v0.1.0-rc.1`, the exact full commit SHA, and the simulation-only notes** in [`docs/release-candidate.md`](../release-candidate.md) before creating a tag or GitHub prerelease. This is a repository rule, not a tooling limitation. The proposed next development milestone is `v0.2.0 — First Light`, but **no physical First Light evidence exists**.
