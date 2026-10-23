#!/usr/bin/env python3
# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
"""Read-only deterministic OpenThread queue-pressure composition for 6lowStick."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
paths=[root/'native/bang/openthread/vendor.c',root/'experiments/bang/native-ot-lab.mjs']
plan={"schema":"6lowstick.blade.capacity-plan.v1",
      "control":{"stages":[8,16,24],"final_stage":"immediate"},
      "candidate":{"stages":[8,16,24],"final_stage":"paced_one_event_per_CLI_command","inter_command_delay_ms":10},
      "bounds":{"total_signed_attempts_per_trial":48,"no_hidden_retransmission":True},
      "expectations":["report queued and no-bufs independently from verified delivery",
                      "preserve pinned Ed25519 trust and explicit gap semantics",
                      "same source sequence ranges across control and candidate",
                      "simulate software radio only; no throughput or RF guarantee"],
      "source_hashes":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}
value=json.dumps(plan,sort_keys=True,separators=(',',':'))
plan["sha256"]=hashlib.sha256(value.encode()).hexdigest()
print(json.dumps(plan,sort_keys=True))
