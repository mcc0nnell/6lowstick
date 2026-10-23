# 6lowSpark hardware workstream

The first hardware target is a **standalone, screen-equipped communicator**.
Phone-mounted wireless charging is a *second* system with major electrical,
RF and safety differences.

- [Rev A requirements, electrical architecture, interfaces and energy math](6lowspark-rev-a.md)
- [Candidate bench BOM, supplier links and staged procurement](6lowspark-bom.md)
- [Physical bring-up and acceptance test protocol](6lowspark-verification.md)
- [A0 KiCad interposer schematic, source generator, pin map and pre-connection power review](../../hardware/6lowspark/a0/README.md)

All documents are candidate specifications, not validated hardware.
The existing [standalone-display simulation](../6lowspark-display.md)
and [6lowSpark product concept](../6lowspark.md) remain the source of the
current software/evidence boundary.

**Engineering handoff:** pin exact evaluation-board revisions; acquire
schematic/footprint files from OEMs; complete KiCad ERC and an
independent electrical review of the preliminary A0 interposer before
considering any PCB/netlist manufacturing handoff; do not begin Li-ion or RF experiments until
their respective gates are met. A preliminary KiCad schematic is now proposed, but **no PCB layout,
Gerbers or manufactured hardware** is included.
