# 6lowSpark A0 bench BOM and A1/B0 candidate parts

**Dated:** 2026-10-23 · **Procurement status:** no orders placed. Product links
are engineering references; availability, local RF variants, prices and
authorized distributor stock must be rechecked before purchasing.

## A0: bring-up kit — buy only after lab operator and RF authorization

| Qty | Part / source | Role | Purchase/compatibility gate |
| ---: | --- | --- | --- |
| 1 | **Nordic nRF52840 DK** (PCA10056) | 64 MHz BLE + IEEE 802.15.4 MCU, SWD/UART/power measurement | Verify revision, pin breakout and nRF Connect SDK support; [Nordic DK](https://docs.nordicsemi.com/r/bundle/ug_nrf52840_dk/page/ug/dk/intro.html) |
| 1 | **Sharp Memory LCD breakout** [Adafruit #3502](https://www.adafruit.com/product/3502), **168×144**, 3/5V-compatible breakout | Outward-facing daylight UI. 1-bit 3,024 B buffer | **Not** 128×128 panel. Adafruit source listed $24.95 at research date, not a fixed quotation. No backlight |
| 1 | **SX1262 915 MHz SPI evaluation/module** e.g. [Semtech regional SX1262 DVK](https://www.semtech.com/products/wireless-rf/lora-connect) | Direct LoRa P2P separately from Thread | Do not substitute UART LoRaWAN-only firmware; capture exact GPIO, TCXO, antenna, voltage and country |
| 1 | Rated **3.3 V regulated lab supply** with current limit / suitable verified board power | Power MCU and radio board according to each DK/module's requirements | No direct bare battery. Confirm backfeed paths, module regulator ratings and common ground |
| 2 | Debounced momentary tactile switches + ESD parts | Next/back interaction | Different shapes for tactile recognition; avoid send as default |
| 1 | [TI DRV2605L](https://www.ti.com/product/DRV2605L) breakout or evaluation board + matched LRA or ERM | Haptic notification bench | Motor voltage/current and driver waveform library license review; isolate during initial LCD build |
| 1 | Small logic analyzer or scope + test leads | SPI/I2C/BUSY/IRQ checks | Instrument grounds and current limits reviewed |
| 1 | Independent optical measurement and/or accelerometer fixture | Prove actual light/haptic output vs requested actuation | No human-receipt equivalence |
| 1 | RF attenuator/shielded fixture and approved antenna/cable set | Authorized conducted/attenuated radio trials | No over-air testing until plan, channel and compliance review |
| 1 | 3D printed inert enclosure/mock battery volume | Screen, buttons, magnetic placement feasibility | No magnets around an energized lithium pack until structural/RF review |

A0 intentionally does not order battery cells, a Qi2 transmitter, MagSafe
magnets or standalone power-bank electronics.

## A1 integrated PCB candidate selection (engineering only)

| Function | Candidate | Evidence / disposition |
| --- | --- | --- |
| MCU | nRF52840 class | Thread/BLE capability, final module vs bare IC unresolved |
| LoRa | SX1262 module | 915 MHz NA hardware **candidate**. Requires source-controlled board layout, RF test and approval |
| Display | 168×144 Sharp Memory LCD A0 / final ≥128×128 TBD | A0 breakout is 40×39×4.6 mm PCB; final screen may differ |
| Haptic | DRV2605L + sized LRA | I2C; not a guarantee user felt it |
| Fuel gauge | [MAX17048](https://www.analog.com/en/products/max17048.html) | 1-cell I2C state-of-charge estimate; temperature/model validation required |
| Charger + OTG boost | [BQ25895](https://www.ti.com/product/BQ25895) | 1S power-path charger with 5 V-class boost; NOT a complete 15W phone power bank, not USB-C dual-role controller, not independent cell protection |
| Independent cell protection | Protected qualified pack; [BQ2970](https://www.ti.com/product/BQ2970) class as design-review example | External FETs, over/undervoltage, overcurrent, short protections, correct fuse/NTC required |
| 3.3 V rail | Qualified buck/LDO candidate TBD | Must support combined RF TX peak + haptic and guarantee brownout handling |
| USB-C role arbitration | USB-C source/sink controller TBD | Avoid contradictory Rp/Rd, reverse current and incorrect cable assumptions |
| 1S battery | Supplier-qualified ~5,000 mAh pack TBD | Mechanical drawing, charge limits, NTC, transport reports and protection evidence required |
| Security device | Optional discrete secure element TBD | Threat-model first: device identity, anti-cloning, secure boot/rollback, provisioning |
| Phone output | **Deferred to B0** | A1 should not advertise 5V source or Qi2 capability until complete power-system verification |
| Qi2 wireless power | **Deferred to B0** | Certified transmitter reference, thermal and antenna interference/phone compatibility tests needed |

## Budget buckets (NOT vendor quotes)

- **A0 electronics:** research/dev-kit purchases, display, switches,
  haptic, regional LoRa board and tools. Get current distributor quotes.
- **A0 laboratory:** separate RF attenuation, current logger/scope and
  output measurements. Rent/share instrumentation where possible.
- **A1 custom board:** electrical engineering, schematic/layout,
  fabrication, protected-cell selection, board bring-up and destructive
  battery safety review.
- **B0 commercialization:** enclosure tooling, Qi2 membership/certification,
  FCC/EMC/RF exposure, battery/power bank standards (UL 2056,
  IEC 62133-2 and UN 38.3 applicability), insurance, reliability testing.

No total prototype cost or vendor availability is asserted without quotes.
If we need one physical RF milestone before the power bank, prioritize
two compatible Thread boards and an independent optical/haptic recorder.
