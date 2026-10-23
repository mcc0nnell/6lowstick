# 6low command-line interface

The `6low` command is an experimental local entry point for 6lowStick research. It wraps existing Node.js simulations and the read-only evidence viewer. It is **not** a hardware management or operational alerting tool.

From a checkout with Node.js 22+:

```sh
npm run cli -- help
npm run cli -- status --json
npm run cli -- lab loop
npm run cli -- lab flare
npm run cli -- mesh inspect --input path/to/mesh-run.json
npm run cli -- tui --demo --snapshot
npm run cli -- test
```

Alternatively, run `node bin/6low.mjs` with the same arguments. The package registers the `6low` executable for package-manager installations; it is not published as a package.

## Output contract

`status --json` prints a single JSON object describing **static research capability limitations**, not live node telemetry. Standard output is for command results; errors are written to standard error. Successful commands exit 0, invalid usage exits 2, and runtime failures return nonzero.

`mesh inspect --input FILE` runs the existing offline POSIX evidence reviewer against an explicitly supplied recording; it is not a live mesh query. The reviewer enforces its own input size and schema constraints.\n\n`lab loop` and `lab flare` invoke in-memory demonstrations. `evidence review` invokes the existing synthetic trace reviewer. `tui` passes its options to the existing evidence viewer. `test` runs the repository's canonical `npm test` script.

No command in this initial entry point transmits RF, manages radios, dispatches emergency alerts, confirms human receipt, or discovers real people. Do not interpret simulated receipts as verified hardware or human outcomes.
