# 6lowStick First Light — Blade composition brief (2026-10-22)

Subject: mcc0nnell/6lowstick at latest verified main. Implement software and documents for First Light v0.2.0 without equipment, RF transmissions, a physical actuator, a human study or external alerts. Funding must precede the hardware bench.

1. Add a pure, versioned, bounded signal-intent data model: presence, request, condition, coordination, warning. Explicit source, target, modality, TTL, purpose and drill-only simulation status. Reject unknown keys, expiration and out-of-scope inputs through a local policy. No hardware commands or operational authority.
2. Write negative Node tests for unknown fields, expiration, malformed data, mismatched policy, tampering and replay. No network calls or changed live adapters. Keep legacy alert-shaped fabric intact.
3. Create a no-hardware First Light experiment protocol with independent physical-output observation requirements, separate application/physical/human evidence levels, repeat-trial denominators and stop conditions. Identify equipment and funding gates.
4. Prepare a 12-month $250k-$300k proposal draft, labeled planning estimates not quotations or awarded funding; include paid engineering time, independent measurement, contingent procurement, milestones, risks and public Apache-2.0 outputs. Do not submit it.
5. Reconcile docs/index/README/changelog and prepare reproducible source-release checks. Respect docs/release-candidate.md: no tag/release without exact-SHA approval. No npm publish.
6. Run npm ci, npm test, npm run site:check, npm run release:check, diff checks and artifact hashing. Run admitted WindAnvil Blade/TalkPipe *read-only* fixture gate and keep receipt. Open a focused PR; merge only after hosted CI passes.

Boundaries: distinguish simulated app ACK from physical output and human perception. Minimal changes; no new dependencies. Report exact commits, test counts, Blade results, merge state, release gate and residual equipment blockers. No invented RF evidence or grant approval.
