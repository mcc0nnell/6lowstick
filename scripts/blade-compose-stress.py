#!/usr/bin/env python3
# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
"""Read-only WindAnvil Blade composition and evidence verifier for 6lowBang.

This file has no sandbox, shell, network, signing, or execution authority.
Blade's signed talkpipe.run capability can admit a pinned read-only invocation.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROFILES = (8, 16, 24)
SOURCES = (
    ROOT / "native/bang/openthread/vendor.c",
    ROOT / "experiments/bang/native-ot-lab.mjs",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compose() -> dict:
    source = {p.name: sha(p) for p in SOURCES}
    c = SOURCES[0].read_text()
    js = SOURCES[1].read_text()
    assert "lowbang_ot_send" in c and "BANG_BURST queued=" in c
    assert "BANG_OT_STRESS_MATRIX" in js and "nodeidfilter deny" in js
    plan = {
        "schema": "6lowstick.blade.composition.v1",
        "composition": "bounded_native_openthread_burst_matrix",
        "source_digests": source,
        "stages": [{"count": x} for x in PROFILES],
        "requirements": [
            "48 maximum signed attempts, independently counted",
            "queued is not authenticated presentation",
            "noBuffers and otherErrors accounted per stage",
            "no duplicate, out-of-range, or fabricated captions",
            "no automatic retries; no hardware-RF claims",
        ],
        "mode": "read_only",
    }
    canonical = json.dumps(plan, sort_keys=True, separators=(",", ":"))
    plan["plan_sha256"] = hashlib.sha256(canonical.encode()).hexdigest()
    return plan


def verify(path: Path) -> dict:
    path = path.resolve(strict=True)
    if not path.is_file() or path.stat().st_size > 1_048_576:
        raise ValueError("evidence must be a bounded regular JSON file")
    result = json.loads(path.read_text())
    if result.get("schema") != "6lowstick.bang.native-ot-udp.v1":
        raise ValueError("wrong evidence schema")
    if result.get("outcome") != "PASS" or result.get("radioHardware") is not False:
        raise ValueError("missing PASS or simulation-only limitation")
    if result.get("reliableDeliveryClaim") is not False:
        raise ValueError("unsupported reliability claim")
    details = result["resilience"]
    if not details["applicationDrop"]["gapReported"]:
        raise ValueError("missing explicit gap evidence")
    if details["radioPartition"]["deliveredUnderPartition"] != 0:
        raise ValueError("partition delivered a caption")
    stages = [details["burst"], *details["bladeMatrix"]]
    if [s["attempted"] for s in stages] != list(PROFILES):
        raise ValueError("wrong signed burst matrix")
    total = 0
    expected_first = 6
    for s in stages:
        n = s["attempted"]
        queued=s.get("scheduled",s.get("queued"))
        if not isinstance(queued,int) or queued+s["noBuffers"]+s["otherErrors"] != n:
            raise ValueError("unaccounted signed send")
        if s["authenticatedPresented"] > queued:
            raise ValueError("receiver count exceeds queued data")
        seqs = s["deliveredSequences"]
        if len(seqs) != s["authenticatedPresented"]:
            raise ValueError("delivered sequence/count mismatch")
        if seqs != sorted(set(seqs)):
            raise ValueError("duplicate or out-of-order presentation")
        if any(seq < expected_first or seq >= expected_first + n for seq in seqs):
            raise ValueError("out-of-range event")
        if "firstSequence" in s and s["firstSequence"] != expected_first:
            raise ValueError("unexpected source sequence")
        if "lastSequence" in s and s["lastSequence"] != expected_first + n - 1:
            raise ValueError("unexpected source tail")
        expected_first += n
        total += n
    if total != 48:
        raise ValueError("unbounded stress total")
    return {
        "schema": "6lowstick.blade.evidence-verification.v1",
        "verdict": "PASS",
        "source_digests": compose()["source_digests"],
        "input_sha256": sha(path),
        "signed_attempts": total,
        "queued": sum(s.get("scheduled",s.get("queued")) for s in stages),
        "buffer_rejections": sum(s["noBuffers"] for s in stages),
        "other_send_errors": sum(s["otherErrors"] for s in stages),
        "authenticated_presented": sum(s["authenticatedPresented"] for s in stages),
        "radioHardware": False,
        "reliabilityProven": False,
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) == 1:
            answer = compose()
        elif len(sys.argv) == 3 and sys.argv[1] == "--verify":
            answer = verify(Path(sys.argv[2]))
        else:
            raise ValueError("usage: blade-compose-stress.py [--verify evidence.json]")
        print(json.dumps(answer, sort_keys=True))
    except (AssertionError, KeyError, TypeError, ValueError, OSError) as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        sys.exit(1)
