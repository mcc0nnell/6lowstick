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

## Composition architecture

6low exposes OpenThread, Celix, 6lowLoop, and 6lowFlare capabilities. WindAnvil Blade is the external composition and validation environment. TalkPipe belongs inside WindAnvil Blade as its internal semantic planning and placement mechanism; do not introduce TalkPipe as a 6low runtime transport or dependency.

Inspect the existing WindAnvil capability manifest, planner, placement, and invocation interfaces before choosing a composition adapter. Keep that integration separate from the 6low CLI binary.

## Blade boundary

WindAnvil Blade vivisection is an evidence and authorization mechanism, not an unconstrained code-generation service. Before a Blade execution, identify the concrete signed capability manifest, signed grant, probe descriptor, and observable receipt stream. Do not manufacture credentials, claim a Blade run without receipts, or grant mutation effects for an observation-only task.

## Exit criteria

A reviewable implementation, deterministic tests, documentation, commit references, and explicit limitations. No live RF or human receipt claims.

## Executable offline composition

Run `6low blade compose --windanvil /absolute/path/to/windanvil` from a clean 6lowStick checkout with a provisioned WindAnvil/Celix/Docker laboratory. This invokes WindAnvil's two authorized Git integrity capabilities against the exact source SHA, verifies their execution contracts, and independently runs the existing offline 6lowLoop and 6lowFlare demos. It reports the OpenThread recorded-output parser as an available component, but does not execute a live OpenThread query or run application code inside a Blade worker. The composition report is a local orchestration result, **not** an authoritative WindAnvil assurance verdict or proof of radio/human delivery. TalkPipe is internal to WindAnvil.

The executable composition also checks a recorded OpenThread `state` sample, validates positive presence/ping/ACK results from 6lowLoop, and checks relay receipts, duplicate suppression, and explicitly absent physical/human delivery in 6lowFlare. Any mismatch aborts the composition. These application assertions run in the local orchestrator, **not** in a WindAnvil Celix worker.
