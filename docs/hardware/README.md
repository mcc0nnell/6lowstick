# 6lowSpark hardware workstream

The first hardware target is a **standalone, screen-equipped communicator**.
Phone-mounted wireless charging is a *second* system with major electrical,
RF and safety differences.

- [Rev A requirements, electrical architecture, interfaces and energy math](6lowspark-rev-a.md)
- [Candidate bench BOM, supplier links and staged procurement](6lowspark-bom.md)
- [Physical bring-up and acceptance test protocol](6lowspark-verification.md)

All documents are candidate specifications, not validated hardware.
The existing [standalone-display simulation](../6lowspark-display.md)
and [6lowSpark product concept](../6lowspark.md) remain the source of the
current software/evidence boundary.

**Engineering handoff:** pin exact evaluation-board revisions; acquire
schematic/footprint files from OEMs; produce reviewed KiCad schematics and
PCB/netlist in a *separate* PR; do not begin Li-ion or RF experiments until
their respective gates are met. No CAD files, Gerbers or manufactured
hardware are included here.
