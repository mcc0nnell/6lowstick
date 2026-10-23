# 6lowSpark Rev A bring-up and acceptance protocol

**Status:** proposed verification plan, NOT executed. No hardware has been
built, received, instrumented or tested. Parent: [Rev A specification](6lowspark-rev-a.md).

Every measurement record should include date, operator, test locale,
schematic/firmware SHA, board revision, supply setting, instrument and
calibration info, conditions, attempted runs, failures and raw artifacts.
A simple ACK is never a physical or human delivery result.

## Gate A: permitted, electrically safe bench

- [ ] Selected DK, radio module and display datasheets/revisions pinned.
- [ ] Power path, regulator current limits and common ground verified by
  independent reviewer BEFORE connecting modules.
- [ ] No naked lithium cell; power from a rated, protected bench source.
- [ ] Antenna path termination and RF-operating permission reviewed.
- [ ] An accessible hardware stop/power disconnect works.
- [ ] No confidential IDs/keys copied into capture.
- [ ] Radio TX disabled by default, no real alert integrations.

## Gate B: user interaction, radio disabled

| ID | Procedure | Required recorded observation |
| --- | --- | --- |
| T01 | Power up with phone absent | Display boots, clearly labels LAB/NOT CONNECTED; 30 minutes of manual navigation without phone |
| T02 | Repeated next/back input, including 100 fast alternating presses | All four pages reachable, no stuck state, no transmission request on wire/control interface |
| T03 | Lock device | No contact names, counts, signal codes or location shown; inspect framebuffer or screen captures |
| T04 | Supply expired/unauthorized sample event | It does not appear; missing or stale gauge renders unknown |
| T05 | Observe LCD in sunlight, shade and darkness | Photograph and instrument lux/viewing geometry; no daylight-only product claims if dark legibility fails |
| T06 | Request haptic while logging actuator | Independent accelerometer/measurement confirms or fails measured output; distinguish command, driver state, observed vibration |
| T07 | Pull BLE/app connection | Display and settings remain navigable; presence becomes 'unknown' or expires, never implies remote connectivity |

## Gate C: power and fault injection

| ID | Procedure | Required evidence |
| --- | --- | --- |
| T08 | Sweep load from idle to display/haptic and individual RF tasks | Current vs time trace at system and rail inputs, temperatures, no surprise brownouts |
| T09 | A1 only: simulate falling SOC through reserve and below undervoltage | Phone-charging request inhibited by reserve policy; separate hardware safety path still cuts off even on firmware fault |
| T10 | A1 only: NTC disconnect/overtemperature, power path reversal, USB role changes | Recorded safe stop, no cell charging or output under invalid thermal/role conditions |
| T11 | Restart mid-frame, repeat and expire | No replay/counter rollback that turns old application evidence into current UI proof |
| T12 | Long duration at defined ambient temperatures | Total current, display refresh, charging behavior (A1/B0 separately), and thermal map with pass/fail limits derived from component vendors |

## Gate D: bounded radio experiments (only AFTER authorization)

| ID | Procedure | Evidence threshold |
| --- | --- | --- |
| T13 | Conducted/attenuated 802.15.4 peer run | Separately captured RF frame, validated application receipt and output journal; full trial denominator |
| T14 | SX1262-only direct-LoRa P2P link | Physical link in region-approved parameters, unique replay IDs, duplicate rejection, actual measured TX/RX current and airtime |
| T15 | Deliberate partition, missing ACK and reboot | Sender says 'unconfirmed'; no false 'read by person' or 'physical output verified' |
| T16 | Concurrent BLE presence + Thread link | Packet loss, reconnect delay, and radio scheduling evidence at agreed offered loads |
| T17 | RF coexistence mock-up with phone/magnets and charging reference | Radiated/conducted observations, detuning and temperatures; reject mechanical layout if margins collapse |

## Gate E: product compliance, separate workstream

1. **Battery:** protected supplier-approved cells; BMS/NTC/fuse,
   thermal and fault safety; identify and comply with applicable UL 2056,
   IEC 62133-2 and UN 38.3 obligations.
2. **RF:** FCC Part 15 authorization and host/module integration review,
   antenna changes, collocated transmitters and RF exposure. Region/profile
   lock enforced; vendor regional module != certification of entire product.
3. **Wireless charging:** WPC-certified subsystem or complete independent
   Qi2 certification, FOD, coil alignment and severe RF/thermal duty testing.
4. **USB-C:** valid dual-role negotiation, overcurrent/short/ESD,
   reverse-power isolation and proper connector thermal ratings.
5. **Human factors:** consent-based studies of legibility, tactile cues,
   gloves, unintended activation, notification comprehension and privacy.
6. **Security:** signed firmware, debug lock, unique provisioning,
   revocation, anti-stalking and lost-device threat validation.

**Stop conditions:** uncontrolled heating, unexpected RF emissions, pack
fault, uncertain test permission, contact leakage, unbounded radio
transmit, display fabricating certainty or absent independent observations.

## Evidence status 2026-10-23

| Evidence item | Status |
| --- | --- |
| Simulation display model | Software PR #33 (separate open change at authoring time) |
| This hardware specification | Paper design only |
| A0 purchased/assembled | NOT DONE |
| PCB schematic/EDA | NOT DONE |
| Real BLE/Thread/LoRa RF evidence | NOT DONE |
| Measured current, light, haptics, thermal, human outcomes | NOT DONE |
| Qi2/power bank/certification | NOT DONE |
