#!/usr/bin/env python3
# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
"""Read-only paired OpenThread POSIX capacity comparison.

Does not run simulators, modify source, confer RF assurance, or infer an SLO.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERIFIER = ROOT / "scripts/blade-compose-stress.py"


def read_record(path: Path, expected_mode: str) -> dict:
    path = path.resolve(strict=True)
    if not path.is_file() or path.stat().st_size > 1_048_576:
        raise ValueError("evidence file missing or unbounded")
    raw = path.read_bytes()
    value = json.loads(raw)
    if value.get("schema") != "6lowstick.bang.native-ot-udp.v1":
        raise ValueError("unknown evidence")
    if value.get("outcome") != "PASS" or value.get("radioHardware") is not False:
        raise ValueError("not a passing software-only simulation")
    if value.get("reliableDeliveryClaim") is not False:
        raise ValueError("unsupported reliability assertion")
    proc = subprocess.run(
        [sys.executable, str(VERIFIER), "--verify", str(path)],
        text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise ValueError("underlying Blade verifier refused evidence: " +
                         proc.stderr.strip())
    existing = json.loads(proc.stdout)
    stages = value["resilience"]["bladeMatrix"]
    if len(stages) != 2 or stages[0]["attempted"] != 16 or stages[1]["attempted"] != 24:
        raise ValueError("unexpected stage shape")
    final = stages[1]
    mode = final.get("sendMode")
    if mode != expected_mode:
        raise ValueError(f"expected {expected_mode} but got {mode}")
    if not isinstance(final.get("submissionWindowMs"), (int, float)) or \
       not 0 <= final["submissionWindowMs"] <= 120000:
        raise ValueError("missing or unsafe submission duration")
    if expected_mode == "paced_10ms" and len(value.get("checks", [])) != 26:
        raise ValueError("paced test missing independent single-send assertion")
    if expected_mode == "immediate" and len(value.get("checks", [])) != 25:
        raise ValueError("control test assertion count mismatch")
    return {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "mode": mode,
        "attempted": final["attempted"],
        "queued": final["queued"],
        "noBuffers": final["noBuffers"],
        "otherErrors": final["otherErrors"],
        "authenticatedPresented": final["authenticatedPresented"],
        "submissionWindowMs": final["submissionWindowMs"],
        "verifiedSignedAttemptsAcrossStages": existing["signed_attempts"],
        "checksPassed": len(value["checks"]),
    }


def compare(control: Path, paced: Path) -> dict:
    a = read_record(control, "immediate")
    b = read_record(paced, "paced_10ms")
    if a["attempted"] != b["attempted"] or a["attempted"] != 24:
        raise ValueError("comparison is not same-sized 24-event final burst")
    return {
        "schema": "6lowstick.bang.capacity-comparison.v1",
        "verdict": "PASS",
        "simulation": True,
        "control": a,
        "paced": b,
        "difference": {
            "queued": b["queued"] - a["queued"],
            "noBuffers": b["noBuffers"] - a["noBuffers"],
            "authenticatedPresented": b["authenticatedPresented"] - a["authenticatedPresented"],
        },
        "limitations": [
            "separate fresh POSIX simulations, not physical RF",
            "not synchronized, repeated large-sample or statistically paired",
            "CLI scheduling and application receipt do not prove human caption presentation",
            "paced design is not an automatic retransmission algorithm",
            "no bandwidth, energy, loss or latency SLO inferred",
        ],
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("usage: blade-capacity-compare.py control.json paced.json")
        print(json.dumps(compare(Path(sys.argv[1]), Path(sys.argv[2])), sort_keys=True))
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print("BLOCKED: " + str(exc), file=sys.stderr)
        raise SystemExit(1)
