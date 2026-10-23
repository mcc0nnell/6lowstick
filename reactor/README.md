# 6lowReactor / Celix observation service

**Status: implemented and locally Celix-tested, read-only normalized-input
prototype. No live OpenThread, Spinel RCP, RF or device-control integration.**

6lowReactor uses Apache Celix to register one synchronous C service,
`org.mcc0nnell.6lowreactor.observer`. It is distinct from the deterministic
6low ZERO festival capacity engine, although both belong to the 6lowStick
platform.

## Responsibilities and limitations

The service's public `observe` method consumes a **caller-provided normalized**
OpenThread/Spinel-like measurement, including an opaque source ID, monotonic
sequence and timestamp, assumed 802.15.4 channel, RSSI and link-quality index.
It validates structure, freshness, source limits, and replay ordering.

The synchronous `snapshot` method returns accepted and denied counts,
current/stale source counts, and a *rule-based advisory classification*:
`NO_EVIDENCE`, `NOMINAL_OBSERVATIONS`, `DEGRADED_OBSERVATIONS`, or
`STALE_OBSERVATIONS`.

Neither method sends a packet, requests a channel change, starts or stops a
radio, actuates a device, dispatches a warning, contacts the internet, or
runs an AI model. There is **no transmit method**. Advisory thresholds are
arbitrary exploratory settings, **not calibrated safety or RF predictions**.

The caller is responsible for authenticating its telemetry provider and
mapping a real OpenThread/Spinel reading to the normalized type. The service
does **not** authenticate source IDs or parse raw Spinel frames. The current
smoke test feeds controlled synthetic measurements through an actual Celix
service registry. Thus the test proves framework lifecycle and method
semantics, not hardware integration or verified RF.

### Boundary

```text
Authorized local instrumentation (not implemented)
    |  authenticated provenance + normalization (not implemented)
    v
6lowReactor Celix observation service (implemented)
    |  validated, replay-filtered, bounded typed observations
    v
read-only snapshot and deterministic advisory (implemented)
    |
    +-- NO dispatch / transmit / RF command / model action
```

## Core C test (no Celix dependency)

```sh
npm run reactor:check
```

## Build and exercise the real Celix bundle

Requires an installed Apache Celix with headers, Celix CMake exports and
shared libraries; on Butcher the local installation was used.

```sh
cmake -S reactor -B /tmp/6lowreactor-celix-build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_PREFIX_PATH=/path/to/celix/install
cmake --build /tmp/6lowreactor-celix-build -j2
# Use the Celix install lib path if it is not registered with the loader:
LD_LIBRARY_PATH=/path/to/celix/install/lib \
  ctest --test-dir /tmp/6lowreactor-celix-build --output-on-failure
```

The CMake bundle, core test, and in-process Celix service smoke test use the
same `low_reactor.h` public ABI. Celix remains an optional deployment
dependency: the rest of 6lowStick can build and run without it. No Celix
installation or runtime is embedded in the source release or site build.

## Next concrete gates

1. Build an explicitly provisioned and authenticated, read-only OpenThread
   telemetry source and normalize it to this C ABI, with bounded read rates.
2. Validate Spinel framing/identity, source trust, reconnect behavior, and
   monotonic timestamps before passing any raw-radio-derived values.
3. Store durable event provenance with defined retention and redaction.
4. Independently measure physical RF against assumptions before using advisory
   thresholds as operational guidance.
5. Only after independent authorization design, consider *separate* typed
   commands in another service. No agent may bypass that boundary.

Citations and starting points: Apache Celix [framework](https://celix.apache.org/)
and the [existing 6lowStick simulated multi-radio research](../docs/multiradio-fabric.md).
