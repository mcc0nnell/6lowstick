#!/usr/bin/env python3
"""Read-only Field Station inspection. Intended for admitted Blade TalkPipe runner.

No subprocess execution, network use, or filesystem mutations.
"""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = (
    "site/index.html",
    "site/station.css",
    "site/observatory.js",
    "site/station-model.mjs",
    "site/multiradio.json",
    "site/assets/rizzer-transparent.webp",
)


class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicates = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if "id" in fields:
            if fields["id"] in self.ids:
                self.duplicates.append(fields["id"])
            self.ids.add(fields["id"])
        if tag == "a":
            self.links.append(fields.get("href", ""))


def main():
    files = []
    for name in SOURCES:
        raw = (ROOT / name).read_bytes()
        files.append({
            "source": name,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
        })
    fixture = json.loads((ROOT / "site/multiradio.json").read_text())
    assert fixture["schema"] == "6lowstick.multiradio-research.v0"
    assert fixture["physicalRadio"] is False
    assert fixture["humanDelivery"] is False
    scenarios = fixture["scenarios"]
    assert scenarios and len(scenarios) <= 100
    allowed_routes = {"thread", "lora-p2p"}
    for scenario in scenarios:
        receipt = scenario["receipt"]
        assert receipt["simulation"] is True
        assert receipt["physicalRadioVerified"] is False
        assert receipt["humanAcknowledged"] is False
        for attempt in receipt["attempts"]:
            assert attempt["route"] in allowed_routes
    html = (ROOT / "site/index.html").read_text()
    markup = Inspect()
    markup.feed(html)
    assert not markup.duplicates, f"duplicate HTML ids: {markup.duplicates}"
    for landmark in ("main", "station", "experiments", "evidence", "method",
                     "textReport", "rows", "scenarioMetric", "routeMetric"):
        assert landmark in markup.ids, f"missing landmark {landmark}"
    assert "#main" in markup.links
    assert "No physical radio or human receipt verified." in html
    print(json.dumps({
        "schema": "6lowstick.field-station.blade-check.v1",
        "source_files": len(files),
        "synthetic_scenarios": len(scenarios),
        "scripted_routes": len({a["route"] for s in scenarios for a in s["receipt"]["attempts"]}),
        "physical_radio_verified": False,
        "human_perception_verified": False,
        "mutable_effects": False,
        "files": files,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
