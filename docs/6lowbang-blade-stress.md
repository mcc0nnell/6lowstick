# WindAnvil Blade-composed 6lowBang stress evidence

October 23, 2026. Two OpenThread POSIX software-simulated nodes on Butcher, not physical radio.

WindAnvil Blade composed a deterministic 8/16/24-event test plan from reviewed source digests. The already-admitted signed talkpipe.run capability used a local mode-0600 Unix socket, with the exact pipeline SHA-256 pinned. After native C testing, Blade ran the read-only evidence verifier for trial 1; the same deterministic verifier passed independently for all three.

| Trial | Attempted | Queued | Buffer rejections | Authenticated presented | Assertions |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 48 | 45 | 3 | 45 | 25/25 |
| 2 | 48 | 45 | 3 | 45 | 25/25 |
| 3 | 48 | 45 | 3 | 45 | 25/25 |

Each local 8- and 16-event burst queued and authenticated all its events. At the 24-event stage, OpenThread rejected three events for lack of buffers; 21 were queued and authenticated. This is a concrete local buffer-pressure observation, NOT a statistical RF packet-loss rate, sustained throughput or reliability SLA.

The source-owned read-only verifier scripts/blade-compose-stress.py rejects invalid send budgets, mismatched receipts, duplicated or out-of-range sequences, unsupported RF claims, and missing gap/partition evidence.

Application callback suppression is distinct from the simulated radio partition created with nodeidfilter deny. Neither simulates actual air interference.

To reproduce locally, use a reviewed BANG_NATIVE_OT_CLI extended OpenThread binary and npm run bang:native:ot:matrix. CI executes the matrix and Python verifier without needing Blade. Blade is an optional local development composition and evidence authority, not a device runtime.

The JSON companion records SHA-256 of inputs and per-trial counters. Physical radio, RCP, airtime/power, production key provisioning, encrypted private captions and human receipt remain unverified.
