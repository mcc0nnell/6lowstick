#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Deterministic software-only First Light plan; does not dispatch or illuminate.
import {createOfflineSignalPlanner} from '../src/signals/offline-planner.mjs';
const now = 2_000_000;
const planner = createOfflineSignalPlanner({
  grants: [{sender:'demo_sender', recipient:'demo_friend', kinds:['check_in','presence'],
    expires_ms:now + 5000, presence_opt_in:true}], now:() => now,
});
const plan = planner.plan({schema:'6lowstick.offline-fixture-intent.v0', signal_id:'demo001',
  sender:'demo_sender', recipient:'demo_friend', kind:'check_in',
  created_ms:now - 100, expires_ms:now + 1000});
console.log(JSON.stringify(plan, null, 2));
