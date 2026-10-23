# 6lowReactor: native Celix experiment

**Experimental and simulation-only.** This is a small native C port of the
existing `src/fabric` deterministic decision boundary, not a deployed Reactor,
radio firmware, actual failover, peer discovery, or a safety system.

- `s6_reactor`: native policy and HMAC-SHA-256 EA2/R2 receipt verification.
  Refuses non-drill input; tries `thread` then `lora-p2p`, once each, with
  distinct per-attempt 96-bit challenges. Only a verified application R2 receipt
  confirms. Transport success alone cannot.
- `s6_radio_thread`: optional Celix service; **scripted no-receipt** fixture.
- `s6_radio_lora`: optional Celix service; **scripted valid-receipt** fixture.
- `s6_router`: optional Celix consumer; runs one synthetic drill at bundle
  startup and prints the outcomes, using Celix's callback-scoped service access.

The demo services use a **public, fixed test key** that must never be used in
real systems. There is no key provisioning, ciphering, actual radio transport,
durable replay journal, independent device activation, or human receipt.

## Portable native policy test

Requires CMake, a C11 compiler, and OpenSSL development headers:

```sh
cmake -S native/6lowreactor -B /tmp/6lowreactor-build -DS6_WITH_CELIX=OFF
cmake --build /tmp/6lowreactor-build
ctest --test-dir /tmp/6lowreactor-build --output-on-failure
```

The native test covers healthy Thread short-circuit, Thread-down fallback,
lost receipt / duplicate suppression *fixture*, tampered receipt fallback,
both links down, transport exception, HMAC field binding, invalid input,
and nonce reuse. The native contract suite mirrors the synthetic JS scenarios.
An additional Node-driven parity check compares native EA2 and R2 wire bytes,
authentication acceptance, and tamper rejection across 4 alert IDs and 36
receipt combinations. These are deterministic test vectors, **not** differential
fuzzing, radio integration, or an operational security assessment.

## Optional real Celix bundles

Install an Apache Celix 2.4-compatible C SDK and set `Celix_DIR` or
`CMAKE_PREFIX_PATH`, then:

```sh
cmake -S native/6lowreactor -B /tmp/6lowreactor-celix \
  -DS6_WITH_CELIX=ON -DCMAKE_PREFIX_PATH=/path/to/celix/install
cmake --build /tmp/6lowreactor-celix
/tmp/6lowreactor-celix/deploy/s6_reactor_demo/s6_reactor_demo
```

The dedicated [native CI workflow](../../.github/workflows/reactor-native.yml) now
builds a SHA-512-verified Apache Celix 2.4.0 source release, compiles these
bundles on Ubuntu 22.04, and boots the mock container from its deployment
directory. The smoke gate asserts that Thread returns no application receipt
and modeled LoRa provides an authenticated R2 receipt. The container is
terminated after the bounded observation window. The main Node test workflow
still requires no Celix SDK. **Bundle stop/start, service withdrawal, real
radios, and production request concurrency remain unverified.**

The plugin contract deliberately lacks hardware access. Before any migration:
confirm actual Celix build and stop/start behavior; run a JS-vs-C differential
fixture; define bounded request timeouts and concurrency; model missing services;
safely provision per-device keys; implement and test durable duplicate
suppression; measure memory and failover timing; and independently validate RF
and accessible actuators. See [the existing synthetic-fabric protocol](../../docs/multiradio-fabric.md).
