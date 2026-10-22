#!/usr/bin/env python3
"""Read-only First Light source inventory for an admitted Blade/TalkPipe runner.

Checks specified sources and declared nonclaims; it does not inspect RF, trust
execution, attest GitHub CI, certify privacy or run any device operation.
"""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sources = [
    'docs/first-light-composition-prompt.md',
    'docs/first-light-roadmap.md',
    'docs/signal-intent-v0.md',
    'docs/funding/first-light-laboratory.md',
    'docs/funding/first-light-equipment-needs.md',
    'src/signals/intent.mjs',
    'src/signals/offline-planner.mjs',
    'scripts/first-light-demo.mjs',
    'test/signal-intent.test.mjs',
    'test/offline-signal-planner.test.mjs',
]
records = []
for relative in sources:
    p = root / relative
    if p.is_symlink() or not p.is_file() or p.stat().st_size > 200000:
        raise SystemExit(f'missing, symlink, or oversized source: {relative}')
    payload = p.read_bytes()
    records.append({'source': relative, 'bytes': len(payload),
                    'sha256': hashlib.sha256(payload).hexdigest()})

prompt = (root / sources[0]).read_text()
protocol = (root / sources[2]).read_text()
funding = (root / sources[3]).read_text()
planner = (root / 'src/signals/offline-planner.mjs').read_text()
example = (root / 'scripts/first-light-demo.mjs').read_text()
if not all(term in prompt for term in ['WindAnvil Blade', 'No hardware orders', 'funding', 'mutual opt-in']):
    raise SystemExit('composition prompt incomplete')
if not all(term in protocol for term in ['No', 'presence', '60 seconds', 'not']):
    raise SystemExit('protocol evidence limits missing')
if not all(term in planner for term in ['transport_attempted: false', 'physical_output_verified: false', 'presence_opt_in']):
    raise SystemExit('offline planner missing negative outcomes')
if not all(term in example for term in ['check_in', 'createOfflineSignalPlanner']):
    raise SystemExit('demo does not exercise local planner')
amounts = [int(x.replace(',', '')) for x in re.findall(r'\| \*{0,2}\$([\d,]+)\*{0,2} \|', funding)]
if amounts != [126000,55000,25000,15000,16000,12000,8000,18000,275000]:
    raise SystemExit('funding budget rows missing or wrong')
if sum(amounts[:-1]) != amounts[-1]:
    raise SystemExit('funding arithmetic inconsistent')
print(json.dumps({'schema':'6lowstick.first-light.blade-source-inventory.v1',
    'source_files':len(records), 'files':records,
    'illustrative_request_usd':275000,
    'hardware_purchased':False, 'transport_attempted':False,
    'physical_output_verified':False, 'human_outcomes_verified':False,
    'mutable_effects':False}, sort_keys=True))
