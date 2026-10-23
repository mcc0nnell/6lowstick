# 6lowSpark HW-A0 — KiCad laboratory interposer

**Status: native KiCad source, generated/pin-map linted, not electrically approved.** This is a wire-harness/interposer schematic for Nordic nRF52840 DK, Adafruit #3502 LCD and a *still-unselected SX1262 carrier*. It is **not** a drop-in module PCB, released layout, battery charger, final RF design, or permission to transmit.

- Open `6lowSpark_A0_Interposer.kicad_sch` in **KiCad 9**. Source is self-contained with custom symbols embedded; no custom global symbol library is required. Re-run KiCad ERC in an installed KiCad environment and record the report before procurement. **KiCad CLI and ERC were not available to the authoring environment.**
- Run `python3 check.py` to verify deterministic generation, pin map, syntax balance, net names and design guardrails. It **does not** parse or electrically validate KiCad nets or replace ERC.
- The headers J1-J3 are **our proposed 2.54 mm interposer/wire terminals**, *not* the physical connector numbers/footprints of the Nordic, Adafruit, or SX1262 carrier. Match each to the supplier's **exact PCB revision** before wiring. Final mechanically correct shield/header placement, footprints, routing and Gerbers are not provided.

## Concrete DK GPIO selection

| DK Arduino pad / GPIO | A0 application net | Comment |
|---|---|---|
| D13 / P1.15 | `SPI_SCK` | common SPI clock |
| D11 / P1.13 | `SPI_MOSI` | common MOSI |
| D12 / P1.14 | `SPI_MISO` | SX1262 only; LCD has no MISO |
| D10 / P1.12 | `LCD_CS` | independent LCD select |
| D9 / P1.11 | `RF_NSS` | independent LoRa select |
| D8 / P1.10 | `RF_NRST` | LoRa reset; default inactive output not a hardware safety interlock |
| D7 / P1.08 | `RF_DIO1` | LoRa IRQ |
| D6 / P1.07 | `RF_BUSY` | LoRa status; confirm DK solder-bridge configuration |
| D5 / P1.06 | `LCD_DISP` | LCD DISP control |
| D4 / P1.05 | `BTN_NEXT` | active-low switch to GND; MCU internal pull-up required |
| D3 / P1.04 | `BTN_BACK` | active-low switch to GND; MCU internal pull-up required |
| D2 / P1.03 | `RF_TXEN` | RF-switch mode **module-dependent; no radio until verified** |
| D1 / P1.02 | `RF_RXEN` | RF-switch mode **module-dependent; no radio until verified** |

`pinmap.json` is canonical for header numbering; schematic is generated. Nordic's Arduino D0..D13 map to P1.01..P1.15 with gaps, **not** P0.xx. Do not reallocate P0.17/P0.19–P0.23 (on-board QSPI), P0.05–P0.08 (interface UART), or P0.11–P0.16/P0.24–P0.25 (DK buttons/LEDs) without dedicated review.

## External connector definitions

**J1** is a labelled **laboratory wiring harness**, not a 1:1 nRF52840-DK header footprint. Pin 1 must be connected to the **DK power pin measured and approved for this actual board revision**; pins 2 and 16 are GND; signals follow `pinmap.json`.

**J2** enumerates the Adafruit #3502 breakout signal names: 1 VIN; **2 `3V3` output left unconnected**; 3 GND; 4 CLK; 5 MOSI/DI; 6 CS; **7 EXTCOMIN left unconnected**; 8 DISP; 9 EXTMODE to GND. The chosen software-driven VCOM inversion mode requires the firmware to issue compliant polarity toggling; it is not a free-running LCD. J2's proposed 1x09 harness footprint does *not* claim the actual Adafruit header pitch/arrangement is verified.

**J3** is the provisional 11-wire SX1262 adapter: supply, GND, SPI, NSS, reset, BUSY, DIO1, TXEN and RXEN. **No supplier SX1262 module physical pad numbers are assumed.** Not all carrier boards expose both TXEN and RXEN; DIO2 may control the RF switch, and TCXO control may use DIO3. Until a precise 915 MHz carrier, BOM revision, mating connector, matching/TCXO/RF-switch circuit, and documented voltage range are selected, **do not wire or transmit**.

**J4** is an **unpopulated removable jumper** in series with the radio-module power. Remove by default. This is a lab enable link, **not** a hardware RF kill switch, due to back-powering through SPI/ESD paths. Park all RF GPIOs safely; verify no phantom power/current before plugging the radio. C1 (100 nF) and C2 (10 µF) are proposed rail capacitors; actual RF carrier might already contain suitable decoupling. Inspect power sequencing, temperature and current limits.

**SW1/SW2** are independent active-low tactile switches. Pull-ups are firmware-configured on the nRF; hardware debounce and ESD design remain A1 review gates. Their provisional KiCad 6 mm through-hole footprints need matching to exact purchased switch.

## Power and security gates

1. **No battery, Qi2, charger, USB-C output, or phone power in A0.** Use only a properly regulated, limited lab supply or DK approved power mode; never back-feed DK supply pins.
2. Nordic DK I/O rail level can depend on board configuration. **Measure and document `HOST_VDD`, logic highs, supply source, DK configuration, and the exact SX1262 carrier's legal VDD before connecting.** Do not assume '3.3 V' from a generic header label. A level translator or separate regulator may be required. If voltage ranges differ, **stop** and revise the schematic.
3. SPI peripherals need independent chip-select discipline, power sequencing, and no MCU-drive into unpowered radio. J4 shunt **does not** guarantee isolation.
4. LCD data, app receipt, physical display state, user noticing and understanding are separate evidence stages. None of the existing simulation can be promoted to field reliability claims.
5. Bench RF only under authorized tested frequency/configuration, with suitable attenuated/terminated path. No public warning/911/safety dispatch.

## Review gates before claiming hardware readiness

- [ ] Supplier revision-locked official DK, LCD and **exact LoRa carrier** schematics inspected; physical pin-to-net harness signoff.
- [ ] Input and output voltage domain table; measured power rails and no unintended current/back-power paths.
- [ ] KiCad 9 **ERC report** attached and findings dispositioned (custom passive symbols intentionally cannot catch every wrong power connection).
- [ ] 3D/2D mechanical fit; test cable assembly and labeling. Actual connector mating and orientation confirmed.
- [ ] Electrical/thermal/ESD/RF safety design review by responsible hardware engineer.
- [ ] BOM part numbers, supplier revisions, voltage limits, capacitor ratings and actual switch mechanical footprints selected.
- [ ] Independent instrumented physical LED/haptic output and authorized radio tests under [Rev A verification plan](../../../docs/hardware/6lowspark-verification.md).

Sources: [Nordic DK connectors](https://docs.nordicsemi.com/r/bundle/ug_nrf52840_dk/page/ug/dk/connector_if.html) · [Nordic/Zephyr Arduino GPIO map](https://github.com/nrfconnect/sdk-zephyr/blob/main/boards/nordic/nrf52840dk/nrf52840dk_nrf52840.dts) · [Adafruit #3502 breakout](https://www.adafruit.com/product/3502) · [Adafruit wiring](https://learn.adafruit.com/adafruit-sharp-memory-display-breakout/wiring) · [Waveshare SX1262 carrier behavior](https://www.waveshare.com/wiki/Core1262-868M) · [KiCad schematic format](https://dev-docs.kicad.org/en/file-formats/sexpr-schematic/).

## Native KiCad validation

The source generator also writes a checked-in local `6lowSpark.kicad_sym`, `sym-lib-table` and matching `6lowSpark_A0_Interposer.kicad_pro`. The project file is necessary for KiCad 9 to load the project symbol table in CLI mode. The minimal `{}` project is intentional and is not an electrically certified design.

Native ERC and SVG exports run under the isolated KiCad 9 container CI job. Independently verify voltages, carrier pad assignment, and RF power isolation before any physical connection; passive interposer-pin symbols cannot enforce these properties.

The KiCad workflow also exports a native XML netlist and runs `check_netlist.py` to verify all 16 named nets and connector pin memberships against the model. Passing it does not validate power-level compatibility or the unchosen SX1262 carrier.
