# Rizzer × Spinel — offline native fuzzing and JavaScript differential replay

**Status: local, opt-in security research tooling.** No radio authority, no
access to RCP serial devices, no networked alert dispatch, no human delivery.
Rizzer remains a **separate Apache-2.0 repository**; 6lowStick never vendors
its engine or assumes its clone exists during production/runtime operation.

## Why two paths?

[Rizzer](https://github.com/mcc0nnell/rizzer) runs Clang instrumented
**native C/C++** targets with trace-pc-guard coverage, ASan and UBSan.
The actual 6lowStick Spinel Flight Recorder is **JavaScript**. Native code
coverage is **not** JavaScript code coverage.

This integration uses a small, reviewable native HDLC-lite command-parser
reference target, `experiments/spinel-rizzer/native_harness.cc`, to drive
Rizzer's native instrumented engine. The harness has no socket, UART, GPIO,
radio or alert interface. It accepts at most 4 KiB of synthetic bytes,
bounds each frame to 2 KiB, checks CRC-16/FCS, Spinel header validity,
canonical 21-bit command encoding and structural safety invariants.

A **separate differential replay** compiles the *same native parser* in
standalone mode, reads the campaign's seed and coverage-retained inputs
and any crash candidates, and compares its frame metadata against
`src/spinel/recorder.mjs`, the actual JavaScript implementation. The
comparison covers frame count, unescaped size, truncated state, CRC result,
header validity and value, command validity and ID. Mismatches make the
adapter exit nonzero and are retained as candidate engineering evidence,
**not** established security vulnerabilities.

**Limit:** Rizzer only retains initial seeds, coverage-growing inputs and
failure candidates, not every trial mutation. Therefore differential
replay is **not comprehensive** over the native engine's attempted cases.
A native parser and JS parser can share logical mistakes. Neither this
adapter nor the independent reference fixtures verifies live OpenThread RCP
behavior or conformance to every possible Spinel property.

## Reproduce on an authorized Linux development host

Requirements: Linux, Node 22+, Python 3.11+, Clang/Clang++ with sanitizer
runtimes; a trusted local checkout of the standalone Rizzer repository.

```sh
npm ci
npm test
npm run fuzz:spinel -- \
  --rizzer /absolute/path/to/rizzer \
  --out evidence/rizzer-spinel-example-01 \
  --runs 192 --seconds 45 --seed 17
```

`--out` must be a **new directory inside `evidence/`**, which is
Git-ignored. The wrapper accepts 1–256 native cases, 5–60 seconds of
native campaign time, and explicit nonzero 32-bit seeds. It does not invoke
Rizzer during normal `npm test` or the Pages build. Rizzer is called using
argument arrays, not shell interpolation. The wrapper never accepts a
target source path or privileged device path from the command line.

- `evidence.json`: independent Rizzer native campaign status, sanitizer
  logs, compiler hashes, corpus information and native engine evidence.
- `retained/` and `findings/`: coverage candidates and any failure inputs.
- `differential-evidence.json`: 6lowStick replay summary, hashes, native
  source/runtime commits, scope limits, comparison outcomes and any
  divergence by input digest.
- `native-spinel-oracle`: *locally compiled, unprivileged* comparator
  binary; it only reads a named regular file.

**A successful campaign means only** no fault in the selected native
harness cases and no differential mismatches across its retained corpus.
The native harness is *not* the real 6lowStick JS parser. If findings
occur, review, reproduce and minimize the candidate in an isolated
authorized environment before interpreting impact. Fork state isolation
and ASan do **not** constitute a secure sandbox for untrusted native code.

## Automated verification

`test/spinel-rizzer.test.mjs` compiles the native parser with Clang++
when available and compares fixed independent Spinel reference fixtures
plus corrupted/truncated variants against the JS recorder. If Clang++ is
missing the native test explicitly **skips** rather than inventing a pass.

No external Rizzer clone is required by CI: the native review target and
differential comparator remain reproducible in this repository. The
separate Rizzer runtime trial is performed on a trusted, authorized host.

## First local runtime evidence (Butcher, October 21, 2026)

The original local campaign used Rizzer source commit
`79cd5772ea29922a83579c09de9cc5c764b3affc` (clean Rizzer tree),
native harness SHA-256
`6c1bd8729810effde3dcc1e7d0485cc8774ab5429928a4871f231d5f842397d2`,
seed 17, 192 requested/executed tests and a 45-second campaign budget.
Rizzer reported **0 native fault candidates**, 104 coverage guards,
53 seen edges and 3 mutation-derived retained samples. Differential
replay checked **18** inputs (15 fixed seeds + 3 retained samples):
**0 mismatches** against the actual JavaScript Spinel recorder.

The initial campaign used base 6lowStick commit `d22e198` **with
uncommitted adapter code**; the local report correctly marks
`source_dirty:true`. The result is **local, ignored evidence**, not
published raw fuzzer traces and not yet a pinned clean-tree release
claim. Repeat from a clean commit if the result is used as supporting
evidence in a grant or reproducibility report. The candidate count of
zero does not establish security or absence of parser defects.
