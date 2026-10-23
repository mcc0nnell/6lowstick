# 6lowSpark — power when you need it, signal when it matters

**Status: proposed hardware concept.** 6lowSpark is the magnetic battery-and-radio accessory in the **6lowStick** project, not a renamed software repository, finished product, or available emergency service. 6lowLoop remains the proposed friend-finding experience; the existing alert/failover implementations remain software-only experiments.

## Why a battery?

A power outage and a communications outage often arrive together. A battery pack is already useful on an ordinary day, so people have a reason to keep it charged and close. 6lowSpark explores whether that carried power can also support **short, consent-based local messages and independently operating relay nodes** when conventional networks are inaccessible.

**Product thesis:** carry power every day; have another way to signal when local infrastructure disappears.

This is a research direction, not a claim of guaranteed off-grid reach, emergency coverage, reliable delivery or a replacement for 911.

## Conceptual device and interface

| Component | Proposed design target | What is actually demonstrated |
| --- | --- | --- |
| Phone attachment | Magnetic alignment; MagSafe-compatible form factor target | No mechanical or magnet testing |
| Battery | Approximately 5,000 mAh, managed by an independent power controller | No battery, BMS, cell qualification, endurance or charging measurements |
| Charging | Qi2 wireless charging and USB-C, with 15 W a *candidate* design target | No Qi2 certification, electrical design, thermal test or iPhone compatibility validation |
| Phone data/control | Bluetooth LE to iOS app, with explicit user permission | No BLE hardware integration, iOS app or suspended/background operation results |
| Long-range path | Regional-compliant LoRa point-to-point radios with application-level forwarding | Scripted `lora-p2p` only; no physical LoRa or implemented LoRa mesh |
| Local-network option | Dedicated 802.15.4 / Thread-capable radio where useful | OpenThread POSIX *simulated radio* only; direct iPhone Thread API access is unproven |
| Human interface | Light, haptics, state-of-charge indication and an opt-in physical signal button | Synthetic receiver journals only; no actual physical output |
| Independent operation | Radio controller and guarded battery reserve when phone is absent/depleted | Not implemented; power and thermal budgets unmeasured |

A magnetic charging coil transfers **power**, not arbitrary app data. The proposed reliable app-to-pack path is BLE; **do not assume the iPhone grants arbitrary access to its Thread radio**, and do not make iOS Thread interoperability a prerequisite for a first prototype.

A pack mounted flush against a phone creates real constraints for LoRa antenna clearance, detuning by the phone/charging coil, RF coexistence, magnets, hand/body absorption, charging heat, thickness and battery safety. Do not pick a final antenna, enclosure, charging rate or transmit power before RF and thermal characterization.

## Intended messaging architecture (not implemented)

```text
iPhone app -- BLE --> 6lowSpark A [battery + radio + relay policy]
                            |
                   LoRa application message
                            |
             6lowSpark relay B (optional, opted in)
                            |
                   LoRa application message
                            |
            6lowSpark C -- BLE --> recipient's phone

Optional local Thread endpoints are a separate, gated transport.
The magnetic wireless charger is a power subsystem, not a data link.
```

- **Short messages, not internet access:** start with bounded presence/coordination/ping/signal messages. Payload size, airtime, retries, loss, range, power drain and latency must be measured on a legal physical link.
- **Multi-hop is a protocol decision:** LoRa modulation alone has no automatic mesh. A proposed relay protocol requires opt-in forwarding, route/discovery strategy, TTL/hop limits, deduplication, persistent queue bounds, anti-replay protection and expiration. Design for loops, duplicates, missing receipts and partitions.
- **No automatic Thread-to-LoRa IP bridging:** local Thread/802.15.4 and LoRa remain distinct links; moving a 6lowStick application message across them takes a deliberate, validated gateway/relay translation. Matrix identity, encrypted rooms and federation cannot be assumed offline.
- **Delivery is not perception:** distinguish attempted RF transmit, link receipt, application ACK, physical light/vibration and human detection/comprehension. The [multi-radio lab](multiradio-fabric.md) currently proves only modeled application behavior.
- **Privacy/consent:** relay, friend discovery, presence, location sharing and the physical signal button must be explicitly configured. Avoid exposing contact identifiers or location in plain radio broadcasts; design verified pairing, revocation, key rotation, content confidentiality and abuse controls before field use.
- **Offline does not mean unregulated:** use the right frequency plan, approvals and operating limits for each market. US 902–928 MHz is a candidate regional band, not a worldwide hardware setting or license to transmit at any power/duty cycle.

## Proposed battery-reserve behavior

A **communications reserve** would end phone charging at a configurable battery threshold so the controller could continue receiving, storing and forwarding authorized messages for a separately specified period. This is a design goal only: validate BMS protections, user-visible reserve state, battery degradation, sleep/wake energy, unexpected discharge, fault isolation and attached/detached safety. Never imply an untested number of emergency operating hours.

When a phone is absent, a hardware button might initiate a previously paired, bounded and authorized signal, with accessible confirmation. It must not be hardwired to issue public emergency warnings or imply dispatch to first responders.

## Milestones and evidence gates

1. **Document and simulate:** describe BLE message boundary, radio envelope size, address/key lifecycle, expiry/deduplication, relay opt-in, failure states and battery-controller state machine. Extend deterministic tests without weakening the existing separate software evidence lanes.
2. **Bench two physical LoRa nodes:** with authorized regional hardware and independent instruments, measure packet loss, link budget, airtime, current draw, bounded application receipts and no-receipt outcomes. This is not yet a mesh.
3. **Bench three LoRa nodes:** demonstrate a configured multi-hop relay with expiration, duplicate/loss handling, relay refusal, partitions and independently captured traffic; publish trial denominators and limitations.
4. **Prototype iPhone BLE:** verify foreground pairing, disconnection/reconnect, iOS background behavior, accessible UI and end-to-end app ACKs. Investigate Thread compatibility only through supported Apple accessory APIs; do not assume raw 802.15.4 access.
5. **Integrate power safely:** measure charging efficiency, thermal rise, coexistence/interference, antenna degradation while attached, and reserved-energy endurance; engage qualified electrical/product-safety and Qi2 certification expertise before charging a phone with a custom pack.
6. **Validate signaling:** instrument light/haptics/text separately, study authorized recipients' detection and comprehension, document failure cases and conduct RF/safety/privacy/regulatory review before any field pilot.

**Stop conditions:** uncertain RF authority, unqualified lithium-cell charging, unmanaged thermal excursions, unexpected transmission/actuation, untrusted alert origination, or missing independent outcome evidence.

## Relationship to the rest of 6lowStick

- [6lowLoop](6lowloop.md) defines the opt-in friend-finding experience and planned Matrix identity boundary.
- [Multi-radio fabric](multiradio-fabric.md) is the current **scripted** Thread/direct-LoRa transport research, not 6lowSpark firmware.
- [First Light](first-light/README.md) describes the funded, independently measured physical-output milestone.
- [Physical-radio test protocol](physical-radio-test-protocol.md) defines conditions for controlled hardware experiments.
- [Threat model](threat-model.md) documents sender/receiver and human-delivery evidence limitations.

**No hardware, procurement, iOS integration, 802.15.4 on-air test, LoRa multi-hop field link, Qi2 certification or human notification result is represented by this document.**
