#!/usr/bin/env python3
"""Offline reference fixtures for Spinel HDLC-lite. Uses no 6lowStick code.

Normative framing/header limits: openthread/spinel-spec and openthread/openthread
src/lib/spinel/spinel.h; PPP FCS-16 check value for '123456789' = 0x906e.
Fixtures are synthetic byte streams, not captures from a live RCP.
"""
import hashlib
import json
from pathlib import Path

SPECIAL = {0x7e, 0x7d, 0x11, 0x13, 0xf8}


def reference_fcs(payload):
    # Independent Python bitwise reference, not the project's JS CRC function.
    reg = 0xffff
    for octet in payload:
        reg ^= octet
        for _ in range(8):
            reg = (reg >> 1) ^ (0x8408 if reg & 1 else 0)
    return (~reg) & 0xffff


assert reference_fcs(b"123456789") == 0x906e


def encode(payload):
    crc = reference_fcs(payload)
    raw = bytes(payload) + bytes([crc & 255, crc >> 8])
    wire = bytearray([0x7e])
    for b in raw:
        if b in SPECIAL:
            wire.extend((0x7d, b ^ 0x20))
        else:
            wire.append(b)
    wire.append(0x7e)
    return bytes(wire), raw


def specimen(name, wire, expected, raw=None, limit=None):
    expected_frames = []
    for i, f in enumerate(expected):
        frame = dict(index=i, **f)
        if raw is not None and i < len(raw) and raw[i] is not None:
            frame["bytes"] = len(raw[i])
            frame["sha256"] = hashlib.sha256(raw[i]).hexdigest()
        expected_frames.append(frame)
    return {"name": name, "capture_hex": wire.hex(),
            **({"max_frame_bytes": limit} if limit is not None else {}),
            "expected": expected_frames}


def valid(header, command, raw=None, **kw):
    return {"crcVerified": True, "headerValid": True, "header": header,
            "commandDecoded": True, "commandId": command,
            "truncated": False, **kw}


def invalid(header=None, crc=True, trunc=False):
    return {"crcVerified": crc, "headerValid": bool(crc and header is not None and header & 0xc0 == 0x80),
            "header": header if crc else None, "commandDecoded": False,
            "commandId": None, "truncated": trunc}


fixtures = []


def one(name, body, expected):
    wire, raw = encode(body)
    fixtures.append(specimen(name, wire, [expected], [raw]))
    return wire, raw


one("small_command", [0x81, 0x02], valid(0x81, 2))
one("all_hdlc_reserved_values", [0x81, 0x02, 0x7e, 0x7d, 0x11, 0x13, 0xf8],
    valid(0x81, 2))
one("two_byte_command_300", [0x82, 0xac, 0x02], valid(0x82, 300))
one("max_three_byte_command", [0xbf, 0xff, 0xff, 0x7f],
    valid(0xbf, 2097151))
one("invalid_spinel_header", [0x01, 0x02], invalid(0x01))
one("incomplete_packed_command", [0x81, 0x80], invalid(0x81))
one("noncanonical_two_byte_command", [0x81, 0x80, 0x00], invalid(0x81))
one("four_byte_command_not_spinel", [0x81, 0x80, 0x80, 0x80, 0x01], invalid(0x81))
wire, raw = encode([0x81, 0x02])
corrupted = bytearray(wire)
corrupted[2] ^= 1
fixtures.append(specimen("failed_crc", bytes(corrupted), [invalid(crc=False)], [None]))
fixtures.append(specimen("too_short_for_fcs", bytes([0x7e, 0x81, 0x7e]),
    [invalid(crc=False)], [None]))
fixtures.append(specimen("dangling_escape", bytes([0x7e, 0x81, 0x7d, 0x7e]),
    [invalid(crc=False, trunc=True)], [None]))
fixtures.append(specimen("oversized_bounded_frame", bytes([0x7e, 1, 2, 3, 4, 0x7e]),
    [invalid(crc=False, trunc=True)], [None], limit=3))
a, raw_a = encode([0x81, 0x02])
b, raw_b = encode([0x82, 0xac, 0x02])
fixtures.append(specimen("flags_and_two_frames", b"\x7e\x7e" + a + b,
    [valid(0x81, 2), valid(0x82, 300)], [raw_a, raw_b]))
fixtures.append(specimen("unclosed_trailing_data", a + bytes([0x81, 0x02]),
    [valid(0x81, 2)], [raw_a]))
fixtures.append(specimen("pre_flag_noise", bytes([0x81, 0x02]) + a,
    [valid(0x81, 2)], [raw_a]))

target = Path(__file__).resolve().parents[1] / "fixtures/spinel/reference-vectors.json"
target.write_text(json.dumps({"schema": "6lowstick.spinel-reference-vectors.v1",
  "provenance": "Independent offline Python bitwise FCS; synthetic fixtures; Spinel spec",
  "vectors": fixtures}, indent=2) + "\n")
print(f"Wrote {len(fixtures)} offline reference vectors to {target}")
