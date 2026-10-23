# A0 power-domain and failure-mode review — pre-connection gate

**Engineering desk review, 2026-10-23; no independent professional/EDA/ERC approval, no measurements.**

The native schematic is a passive wiring harness, not a voltage regulator, battery charging design, Qi2 reference, or MCU carrier. The DK power path is controlled by **Nordic's own DK hardware**, not our schematic. Do not source VDD from an unknown header or alter the DK's supply configuration without the exact official revision drawing.

## Relevant power domains

| Domain | Source in A0 | Consumers | Known/unknown |
|---|---|---|---|
| `HOST_VDD` | Nordic DK P1 *measured and approved* VDD/GND | Adafruit #3502 `VIN`, J4 upstream | **Voltage is not assumed**; DK power mode/revision must be selected and measured. LCD breakout accepts 3–5 V on VIN by its supplier guide; logic compatibility must still be checked |
| `RF_VDD` | `HOST_VDD` only **if** removable J4 shunt installed | Provisional SX1262 carrier and C1/C2 | **Carrier not selected.** WaveShare Core1262 literature specifies 3.3 V for a particular module; could be incompatible with DK's default measured rail |
| `GND` | DK approved signal ground | All peripherals and switches | Common return path/ground impedance, loops, coax shields and test equipment require bench review |
| External USB/bench power | DK approved input only | Nordic DK regulators | **Do not** simultaneously backfeed rails or assume a random bench connection is safe |

## Stop/go failure analysis

| Risk | Severity | Cause | Required mitigation / check before connecting |
|---|---|---|---|
| VDD mismatch between nRF DK and LoRa | **STOP** | DK output voltage/config differs from candidate SX1262 carrier | Freeze exact board revisions; read min/max voltage and VIH/VIL; measure using a DMM and scope. If incompatible, **revise PCB with proper regulator/level translation**, do not short rails |
| Unpowered LoRa backpowered through SPI | **STOP** | J4 removed while SPI/IRQ GPIO drives carrier input protection | Hardware isolation or proof of safe pins in all boot/reboot/fault states; instrument current in J4-open state; J4 alone is **not an RF safety switch** |
| DK power pin driven accidentally | **STOP** | Header 1 wiring misconstrued as a source vs input | Inspect DK connector/wiring photo against revision; inspect rail for reverse current; current limit applied only at approved supply entry |
| LCD's 3V3 output shorted | **STOP** | J2 pin 2 connected to external supply | Leave J2 pin 2 physically insulated/NC. Verify pin numbering against actual Adafruit PCB, not interposer numbering |
| Display inversion not maintained | Display degradation / incorrect operation | J2 EXTMODE strapped to GND without software VCOM inversion | Implement source-documented inversion cadence and power-on/off behavior before prolonged use; scope pins and inspect contrast |
| LoRa RX/TX control polarity wrong | RF fault / uncontrolled load | Module antenna-switch controls differ by carrier | Freeze module revision/schematic and align reset, TXEN/RXEN or DIO2/TCXO control; no test TX before this is resolved |
| Shared SPI contention | Bus contention | Both CS asserted or host drives a radio while unpowered | Independent CS with known inactive startup states, peripheral power handling, logic analyzer assertions |
| Bad switch pull-up | Spurious input | MCU GPIO not configured with pull-up, bounce or pin conflict | Active-low GPIO checks and scope capture; no button mapped to alert dispatch |
| Incorrect capacitor rating/placement | Power transient, heating | 10uF dielectric DC bias loss, shared long jumper leads | Rated parts, very short RF decoupling loop, current/temperature check; carrier may include internal caps |
| Haptic/charging battery function assumed | Misleading result | Pure software display frame confused for actuation | No haptic motor/charger/battery circuit in current schematic; build and instrument separately |

## Concrete approval prerequisites

1. **Choose specific DK PCB revision and valid power source**; record expected and measured host rail and GPIO levels.
2. **Choose exact SX1262 carrier SKU/revision and electrical schematic**; replace `J3` *logical pin ordering* with actual vendor connector/cable map; resolve RF switch, TCXO and input-voltage requirements. No module is pinned yet.
3. **Review physical J1/J2/J3 wiring and assembly**; each KiCad 2.54 mm header is OUR adapter numbering, **not** the mating OEM header numbering. Mark real wires with heat-shrink labels.
4. **Run native KiCad ERC, inspect netlist and mechanical footprints**, report and resolve warnings, and obtain qualified electrical/RF reviewer signoff.
5. **A0 non-radio first:** LCD/button bring-up on isolated, limited bench supply; measure startup current, outputs and bus contention. Do not install J4 radio shunt during this phase.
6. RF bring-up only after authorized region-specific test plan and proper matching/antenna termination.

**Decision: not electrically approved or safe to assemble from this drawing as-is.** The source is intended to force precise pin/power questions early; it must never be mistaken for a released circuit.
