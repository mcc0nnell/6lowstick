#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${OT_CLI_PATH:?Set OT_CLI_PATH to an absolute ot-cli-ftd binary}"
mkdir -p evidence
node --test test/*.test.mjs experiments/thread-alert/*.test.mjs > evidence/unit-tests.tap
node experiments/thread-alert/lab.mjs > evidence/mesh-run.json
node --input-type=module -e 'import fs from "node:fs"; import {execFileSync} from "node:child_process"; const e=JSON.parse(fs.readFileSync("evidence/mesh-run.json")); const r={schema:"6lowstick.research-evidence.v0",commit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),simulation:true,physicalRadio:false,matterVirtualDevice:false,tests:fs.readFileSync("evidence/unit-tests.tap","utf8").match(/# pass (\d+)/)?.[1]??"unknown",sameAcknowledged:e.sameGateway.delivery.acknowledged,sameMissing:e.sameGateway.delivery.missing,degradedMissing:e.degraded.missing,errors:e.errors}; fs.writeFileSync("evidence/summary.json",JSON.stringify(r,null,2)+"\n")'
printf 'Evidence written under evidence/ (ignored; not committed).\n'
