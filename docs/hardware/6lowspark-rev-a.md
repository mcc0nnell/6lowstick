# 6lowSpark HW-A0 — standalone communicator hardware requirements

**Revision:** HW-A0 / 2026-10-23 · **Status:** design candidate, **not schematic-complete, ordered, built or certified**.  
**Scope:** laboratory prototype first; proposed phone-mounted 5,000 mAh Qi2 power bank is a separate integration phase.  
**Parent decisions:** [6lowSpark concept](../6lowspark.md), [display model](../6lowspark-display.md), [First Light](../first-light/README.md).

## Decision and boundaries

Make an independently powered, screen-equipped local communicator that can
display consented short-lived friend presence and authenticated application
signal states without relying on an iPhone. The 6lowLoop/6lowFlare software
models do not yet implement real transport, Matrix/device credentials, or
physical output. Hardware does not change these claims.

**A0 lab bench:** Nordic nRF52840 DK + 3.3 V SX1262 SPI radio board/module,
Adafruit 3502 Sharp Memory LCD (168x144), two switches and a separately
instrumented haptic output. Start using regulated external power (or a
manufacturer-protected, documented supply via approved interfaces).
**No loose/bare Li-ion cell or home-built charger in A0.** RF remains disabled
until local radio authorization and conducted/attenuated test arrangements
are reviewed.

**A1 integrated engineering PCB (design target only):** nRF52840-class
controller, SX1262-class 915 MHz module, display, haptics, separately
protected 1S Li-ion pack and a reviewed wired charger/5 V boost path.

**B0 product concept only:** magnetic phone mounting, Qi2 transmitter,
USB-C output, secure device provisioning and field-tested product enclosure.
It requires a new power-system and certification review, not a PCB respin
that merely adds a charging coil.

## Top-level functional block diagram

~~~text
                OPTIONAL PHONE (APP)
                       | authenticated BLE
                       v
       +----------------------------------------------------+
       | nRF52840 (firmware, trusted state + UI)             |
       |  BLE / 802.15.4 Thread radio (shared 2.4 GHz PHY)  |
       |  SPI0 -> reflective LCD   GPIO -> 2 buttons         |
       |  I2C  -> DRV2605L haptic, power monitor (future)   |
       |  SPI1 -> SX1262 LoRa module + distinct 915 MHz ant |
       |  debug/UART -> fixture-only evidence capture       |
       +-------------------+--------------------------------+
                           | regulated low-voltage rail
              +------------+--------------+
              | A0 bench: protected 3.3 V |
              | A1: protected 1S pack,    |
              | independent BMS, 3.3 V   |
              | supply, gauge and NTC    |
              +---------------------------+
                  |
         Future B0 ONLY (separately reviewed)
   USB-C role/input/output + charger/boost + certified Qi2 TX
~~~

- BLE and Thread share the nRF52840's 2.4 GHz transceiver; **do not
  assume two simultaneous independent PHYs**. Validate scheduling,
  receive windows, reconnection and channel coexistence.
- LoRa is a separate transceiver and **not an OpenThread long-range link**.
  Its packets use a separately verified application framing/authorization
  scheme, bounded airtime, relay permission and expiry. No automatic
  Matrix-over-LoRa or IP gateway is implied.
- The display is a read-only projection of locally authorized application
  state. Button navigation alone NEVER signs, transmits, changes charge
  protections or claims delivery.

## Electrical targets (to verify)

| ID | Requirement | A0 implementation / acceptance |
| --- | --- | --- |
| HW-001 | Independently usable without phone | Operate the A0 UI on regulated power with BLE disconnected; timed 30-minute display/navigation observation |
| HW-002 | Single host MCU with BLE and 802.15.4 capability | nRF52840 DK PCA10056; 64 MHz Cortex-M4F; 1 MB flash, 256 KB RAM; Thread and BLE tested separately, then scheduled together |
| HW-003 | A second independently configured LoRa radio | SX1262 915 MHz **module/board** with tested SPI, BUSY/DIO1/NRST, TCXO/control and matching antenna; first RF bench has no over-air claims |
| HW-004 | Daylight-readable display | Adafruit #3502, 168 x 144 monochrome reflective Memory LCD on SPI; A0 maps existing 128x128 design inside available pixels; 3,024-byte 1-bit framebuffer |
| HW-005 | At least two distinct tactile controls | GPIO buttons with defined debounce, hardware reset separate from normal keys, screen focus and clear confirm/cancel; no button may originate real alerts |
| HW-006 | Accessible feedback | Haptic motor candidate + TI DRV2605L driver on I2C; optionally frontlight with independent current limiter; **measure** actual vibration/light separately |
| HW-007 | Pack data cannot be fabricated by display | A1 fuel gauge candidate MAX17048 via I2C; display 'unknown' on stale/missing readings; no invented state-of-charge |
| HW-008 | Protected low-voltage power | A0 regulated isolated lab supply; A1 protected 1S pack, charger, independent protection FET path, NTC, fusing, regulated logic rail |
| HW-009 | Conservative phone charging | B0 USB-C + Qi2 **deferred**; A0/A1 must not connect arbitrary Qi transmitter or advertise Qi2 |
| HW-010 | Security & consent | Explicit local unlock; no alias, identity, location or signal content on locked screen; per-contact consent/revocation; transmit and relay default OFF |
| HW-011 | Debugging, provenance | SWD and timestamped UART logging on fixture only; log electrical events, radio attempts, validated app receipts and measured output as separate records |
| HW-012 | Power reserve | Proposed 20% SOC communications reserve policy inhibits PHONE charging, NOT hardware protection; pack temperature/under-voltage overrides policy; A1 must prove reserve logic separately |
| HW-013 | Limits on role claims | No SOS/911/public alerting, guaranteed range, human-delivery assurance or certified reliability; clearly label demos as research |
| HW-014 | Safety interlocks | Watchdog, physical stop/power removal, bounded TX queues, fault state, thermal stops, protected pack; no RF before authorized test |
| HW-015 | RF shutdown | A0 'airplane' is **firmware policy only**: because nRF MCU and 2.4 GHz RF are one SoC, it is NOT a certified hardware kill switch; B0 requires an independently validated RF inhibit design |

**Signal ownership, provisional (final GPIO/pin table blocked on module revisions):**

| Net / bus | Owner | Required interface |
| --- | --- | --- |
| LCD_SPI_SCK / MOSI / CS / DISP / VCOM | nRF host | SPI 3 V logic, display-specific VCOM timing/drive; panel does not have an RX data path |
| LORA_SPI_SCK / MOSI / MISO / NSS | nRF host | SPI to separately powered SX1262 board; verify 3.3 V IO |
| LORA_BUSY / DIO1 / NRST | SX1262 | GPIO interrupt/control, startup/TCXO timing per module data |
| BTN_NEXT / BTN_BACK | Two independent switches | Debounce, ESD and pull-up scheme; a hold on both is NOT automatically an emergency signal |
| HAPTIC_I2C_SCL / SDA | nRF host | DRV2605L + optional MAX17048 + charger interface only after bus-voltage check |
| PACK_NTC / PACK_PRESENT / FAULT | Battery-protection domain | Faults override requested display or transmit operations |
| SWD / UART_CAPTURE | Engineering fixture | Labeled non-consumer pads; no credentials in telemetry |

No GPIO assignments, antenna trace dimensions, matching network or charger
reference schematic are approved by this document. They need pinned board
revisions, EDA review, RF layout and power-domain checks.

## Power and energy feasibility (illustrative, NOT endurance data)

- Target pack: protected **1S nominal 3.7 V, 5,000 mAh ≈ 18.5 Wh**. No cell,
  capacity at load, regulator efficiency or protection FET is yet selected.
- Proposed 20% SOC communications reserve represents **~3.7 Wh nominal
  cell energy**, not delivered energy. Aging, temperature, cutoff and loss
  reduce useful energy; gauge SOC is an estimate, not energy in Wh.
- Example **5 V, 1 A USB output** requires 5 W. At **assumed** 85%
  efficiency and 3.7 V nominal cell voltage, cell draw is ~1.59 A; this is
  a calculation, NOT a measured charger or operating point.
- Example **15 W Qi2 delivered output** at the same assumed 85% total
  efficiency would require ~17.65 W/~4.77 A from the cell, **before**
  other system loads and without accounting for input-to-phone charge
  efficiency. This is why B0 Qi2 demands cell/coil thermal and FET review.
- Early budget allocations **to measure, not datasheet facts**:
  asleep/airplane goal <2 mW for final custom board (NOT dev kit);
  interface idle goal <30 mW; LoRa RX goal <80 mW incl. host;
  haptic/Tx/frontlight instantaneous loads must be logged separately.
  Reject any endurance forecast until per-mode current and duty-cycle
  have been logged at at least three SOC/temperature points.
- nRF52840 DK USB/debug hardware draws more than a custom integrated board;
  never use its total current to declare a product idle-power pass.

## Packaging and physical input targets (non-CAD envelope)

| Item | Engineering target / unresolved gate |
| --- | --- |
| Shell | 65-70 mm wide × 95-110 mm tall × 15-24 mm thick **study envelope**, NOT drawing or committed dimensions |
| Placement | Display faces away from phone; two distinguishable edge buttons, tactile identification; accessible orientation marks |
| Battery | Protected 1S ~5000 mAh pouch or suitable assembly; actual pack envelope comes from cell vendor's approved drawing |
| Antennas | Independent 2.4 GHz and sub-GHz RF chains, module-recommended matching; antenna keepouts next to battery, coil, magnets, hand, case and phone must be determined by RF simulation and measurements |
| Charging face | Magnetic attachment and Qi2 power transmitter are **B0 only**; WPC certification and RF exposure/EMC obligations not inherited from a module |
| Legibility | Daylight reflective; night access needs explicit illumination plan; no color-only semantics, adequate contrast, haptic equivalents |
| Durability | Drops, splash, sweat, sunscreen, button sealing and pocket wear **unqualified**; no IP rating proposed |
| Mechanical drawing | CAD stack-up and tolerance chain are open deliverables; verify safety spacing, no battery compression and phone-camera clearance |

## Firmware boundary and update posture

- Zephyr/nRF Connect SDK for MCU development; OpenThread with controlled
  firmware build; SX1262 driver behind explicit transport interface.
- A0 demo permissions are local fixtures; they are **not verified Matrix
  identities**. Never silently fall back from Matrix E2EE to unencrypted
  app packets. Offline pairing, lost-device revocation, replay protection
  across reboot and anti-stalking controls are unresolved product gates.
- Before a field pilot: signed firmware update policy with rollback defense,
  debug lock lifecycle, boot integrity evidence, per-device provisioning,
  radio-region configuration lock, secure key storage decision and tamper
  assessment. nRF software cryptography alone is not proof of an independent
  hardware security boundary.
- A0 bench UART is read-only proof capture. Never place raw secrets,
  contact lists or precise location in RF diagnostic logs.
- Treat app ACK, screen pixels, independently measured physical output,
  participant perception and comprehension as different records.

## First physical build order

1. **A0 no-radio UI:** nRF52840 DK + LCD + buttons, powered by rated supply;
   prove 30 minutes of locked/unlocked navigation with no TX.
2. **A0 haptic:** isolated driver, actual actuator, accelerometer/scope
   instrumentation; measure action separate from application receipt.
3. **A0 regional RF bench:** authorized attenuated/cabled 802.15.4 first,
   then SX1262 point-to-point separately, including RF isolation.
4. **A1 power-board review:** selected cell and protected assembly, charging
   /OTG tradeoff, fuel gauge, thermal cutoff, board schematic and PCB review
   BEFORE any lithium circuit is connected.
5. **B0 phone-power feasibility:** purchased certified reference device or
   evaluation subsystem, RF detuning and 15 W thermal analysis, USB-C role
   arbitration and independent certification plan.

**Reject unsafe shortcuts:** bare unprotected cells, improvising Qi2 coils,
using battery charger IC alone as cell protection, uncontrolled RF,
treating display rendering as human receipt, or claiming simulated radio
tests prove real coverage.

## Engineering references (verified candidate pages, not endorsements)

- Nordic nRF52840: https://www.nordicsemi.com/products/nrf52840
- Nordic DK: https://docs.nordicsemi.com/r/bundle/ug_nrf52840_dk/page/ug/dk/intro.html
- Semtech SX1262 class: https://www.semtech.com/products/wireless-rf/lora-connect
- Adafruit Sharp Memory LCD #3502: https://www.adafruit.com/product/3502
- TI DRV2605L: https://www.ti.com/product/DRV2605L
- TI BQ25895 charger + boost **candidate**, not protection: https://www.ti.com/product/BQ25895
- TI BQ2970 protection: https://www.ti.com/product/BQ2970
- Analog Devices MAX17048 fuel gauge: https://www.analog.com/en/products/max17048.html
- WPC Qi2 rules/certification: https://www.wirelesspowerconsortium.com/knowledge-base/testing-and-certification/qi-certification-process/
- FCC module integration guidance: https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=44637&switch=P
- UL 2056 power bank standard: https://www.ul.com/news/setting-standard-ul-introduces-first-dedicated-safety-standard-ul-2056-power-bank-industry
