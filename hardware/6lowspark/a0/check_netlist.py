#!/usr/bin/env python3
"""Verify actual native KiCad XML netlist pin membership, not just text labels.

This is not independent electrical safety, voltage compatibility or vendor pad validation.
"""
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET
import json
import sys

ROOT = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit("usage: python3 check_netlist.py <KiCad-exported-kicadxml-file>")
pinmap = json.loads((ROOT / "pinmap.json").read_text())
expected = defaultdict(set)
for ref, pads in pinmap.items():
    for i, item in enumerate(pads, start=1):
        if item["net"] != "NC":
            expected[item["net"]].add((ref, str(i)))
expected["BTN_NEXT"].add(("SW1", "1"))
expected["BTN_BACK"].add(("SW2", "1"))
expected["GND"].update([("SW1", "2"), ("SW2", "2"), ("C1", "2"), ("C2", "2")])
expected["RF_VDD"].update([("C1", "1"), ("C2", "1")])
observed = defaultdict(set)
tree = ET.parse(sys.argv[1])
for net in tree.findall(".//nets/net"):
    name = net.get("name", "")
    nodes = {(n.get("ref"), n.get("pin")) for n in net.findall("node")}
    if name.startswith("unconnected-"):
        assert len(nodes) == 1 and nodes.pop() in {("J2", "2"), ("J2", "7")}, (name, nodes)
        continue
    assert name.startswith("/"), name
    observed[name[1:]].update(nodes)
assert dict(observed) == dict(expected), {
    "unexpected": {n: list(v - expected.get(n, set())) for n, v in observed.items() if v - expected.get(n, set())},
    "missing": {n: list(v - observed.get(n, set())) for n, v in expected.items() if v - observed.get(n, set())},
}
print(f"NATIVE KICAD NETLIST PASS: {len(observed)} named nets and "
      f"{sum(map(len, observed.values()))} assigned symbol pins")
