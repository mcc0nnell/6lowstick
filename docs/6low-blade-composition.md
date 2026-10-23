# 6low CLI / WindAnvil Blade composition brief

Repository: mcc0nnell/6lowstick
Working branch: feat/6low-cli-entrypoint
Scope: research-grade, read-only OpenThread POSIX mesh diagnostics.

## Compose

1. Inspect the existing OpenThread POSIX simulator and evidence parser before adding interfaces.
2. Define a narrow observation-only contract for mesh peers, routes, and node state. Distinguish static fixture, captured simulator output, and live process query.
3. Keep a bounded timeout, output byte limit, fixed command allowlist, strict response parser, and cleanup on shutdown.
4. Prefer offline evidence consumption first. Never spawn an OpenThread process merely to call an ostensibly read-only command without documenting the side effects.
5. Preserve `6low` as the command name; use JSON for machine-readable outputs, stderr for diagnostics, and meaningful exit codes.
6. Add adversarial tests for missing process, truncated output, malformed response, timeout, process exit, and simulated observations incorrectly labeled as RF.
7. Verify with `npm ci`, `npm test`, CLI smoke tests, and GitHub Actions. Keep the existing release safety warnings.

## Blade boundary

WindAnvil Blade vivisection is an evidence and authorization mechanism, not an unconstrained code-generation service. Before a Blade execution, identify the concrete signed capability manifest, signed grant, probe descriptor, and observable receipt stream. Do not manufacture credentials, claim a Blade run without receipts, or grant mutation effects for an observation-only task.

## Exit criteria

A reviewable implementation, deterministic tests, documentation, commit references, and explicit limitations. No live RF or human receipt claims.
