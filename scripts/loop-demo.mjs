// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Deliberately offline local simulation: neither Matrix nor a radio is invoked.
import {create6lowLoop} from '../src/loop/core.mjs';

const key = Buffer.alloc(32, 0x42);
const alice = create6lowLoop({friends: [{id: '@bob:example.org', key}], enabled: true});
const bob = create6lowLoop({friends: [{id: '@alice:example.org', key}], enabled: true});
const now = 200000;
const presence = alice.announce('@bob:example.org', {now});
const incoming = bob.receive(presence, {now: now + 1});
const ping = bob.ping('@alice:example.org', {now: now + 2});
const accepted = alice.receive(ping, {now: now + 3});
const ack = alice.acknowledge('@bob:example.org', ping.nonce, {now: now + 4});
const result = bob.receive(ack, {now: now + 5});

console.log('6lowLoop / software-only friend-finding protocol model');
console.log('Alice presence accepted by Bob:', incoming?.kind === 'presence');
console.log('Bob ping accepted by Alice:', accepted?.kind === 'ping');
console.log('Alice application ACK accepted by Bob:', result?.kind === 'ack');
console.log('Nearby (Bob\'s local model):', JSON.stringify(bob.friendsNearby({now: now + 5})));
console.log('Matrix account IDs are LOCAL labels only; no Matrix SDK, homeserver, RF, GPS or human reachability was tested.');
