# 6lowBang native C/OpenThread resilience evidence

October 23, 2026 — four fresh, two-node simulated OpenThread POSIX trials, not hardware radio.

| Trial | Checks | Explicit gap | Radio partition | Burst scheduled / authenticated presented |
| --- | --- | --- | --- | --- |
| 1 | 20/20 | 3–3; released 4 | No 5 while filtered; recovered after clearing | 8 / 8 |
| 2 | 20/20 | 3–3; released 4 | No 5 while filtered; recovered after clearing | 8 / 8 |
| 3 | 20/20 | 3–3; released 4 | No 5 while filtered; recovered after clearing | 8 / 8 |
| 4 | 20/20 | 3–3; released 4 | No 5 while filtered; recovered after clearing | 8 / 8 |

Each run used a fresh private simulated flash directory and a randomized virtual-radio offset.

**Application loss**: a test-only hook discarded signed sequence 3 after UDP decoding but before receiver verification. This was NOT RF packet loss. Signed 4 waited; the explicitly called 250-ms hold timeout reported BANG_GAP 3-3 and released 4 without inventing text.

**Radio partition**: OpenThread nodeidfilter deny excluded peers in both directions. One signed 5 was submitted during the partition; zero application deliveries were observed during a measured 1.1-second isolation window. After clearing filters, retransmitting the original signed 5 restored verified presentation. This is not physical RF evidence.

**Bounded burst**: the C publisher attempted eight separately signed events (sequences 6–13). Each was reported as scheduled. The receiver separately authenticated and presented eight in each recorded trial. Queueing and presenting in four local runs does not prove sustainable throughput or a statistically meaningful delivery rate.

Native OpenThread C APIs transport the binary payloads; no CLI ASCII-hex data path is used. Payloads exceed the single 127-byte IEEE 802.15.4 PHY frame size, so underlying fragmentation remains relevant.

The [JSON evidence](6lowbang-resilience-evidence.json) preserves per-trial counters and short local process observations. No human receipt, ASR performance, private-caption encryption, real RF reliability or life-safety certification is claimed.
