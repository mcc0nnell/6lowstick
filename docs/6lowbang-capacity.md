# 6lowBang native OpenThread bounded queue-pressure comparison

October 23, 2026. Three control/paced pairs in **OpenThread POSIX software simulation** on Butcher, not physical RF.

WindAnvil Blade used the signed, already admitted local talkpipe.run capability to compose a source-hashed 8/16/24 event test plan, then independently verify a control/paced pair. The same source-controlled verifier passed for all three pairs and rejected falsified receipt counts. Blade does **not** operate as a 6s device or radio runtime.

Both scenarios formed fresh two-node Thread networks and used Ed25519-signed binary 6lowBang C/OpenThread events. Initial 8 and 16 stages were unchanged. In the final 24-event stage, **immediate** means one C CLI command queues all 24 before returning; **paced** means 24 separate C CLI commands with 10 ms between them, permitting OT tasklet processing. Both are bounded to 48 total signed attempts. No automatic retries were used.

| Pair | Final 24-event control: queued / no buffers / authenticated | Paced: queued / no buffers / authenticated | Submission window, control / paced |
| --- | --- | --- | --- |
| 1 | 21 / 3 / 21 | 24 / 0 / 24 | 1.5 / 249.2 ms |
| 2 | 21 / 3 / 21 | 24 / 0 / 24 | 2.2 / 245.2 ms |
| 3 | 21 / 3 / 21 | 24 / 0 / 24 | 2.8 / 252.3 ms |

In all three measured pairs, the control rejected three of the final 24 packets for lack of OpenThread buffers. The 10 ms between-command mode queued and authenticated all 24. This demonstrates a **workload-specific scheduling tradeoff**, not a universal 10 ms optimum, sustained throughput capacity or radio reliability.

### Evidence and controls

The source-controlled verifier scripts/blade-capacity-compare.py validates the original 48-event stress evidence with scripts/blade-compose-stress.py before comparing: attempted counts, independent queue and presentation counters, exact sequence ranges, simulation-only claims and pacing metadata. A synthetic overclaimed receiver count was correctly rejected in a negative test.

The detailed raw-evidence SHA-256 digests, source fingerprint, explicit Blade composition hash and observed timing appear in the companion [machine-readable evidence](6lowbang-capacity-evidence.json). The source-pinned Native 6lowBang OpenThread CI now reruns both modes and compares them with the same verifier. Use a reviewed BANG_NATIVE_OT_CLI to run npm run bang:native:ot:matrix and npm run bang:native:ot:pace separately.

### Engineering implications

A burst submitted in a single OpenThread CLI command can temporarily exhaust the simulator message buffers even when the network later delivers everything accepted. Yielding between submissions allows radio processing to drain the queue. This is an **experiment**, not a production-rate-control implementation: no queue-depth telemetry, receiver ACK protocol, memory profiling on constrained devices, physical interference or differentiated loss policy has yet been demonstrated.
