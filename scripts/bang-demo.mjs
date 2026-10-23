// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Fully synthetic text: nothing records sound or sends packets.
import {generateKeyPairSync} from 'node:crypto';
import {create6lowBangSource, create6lowBangReceiver} from '../src/bang/core.mjs';
const {privateKey, publicKey} = generateKeyPairSync('ed25519');
const source = create6lowBangSource({channel: 'main-stage', privateKey});
const attendee = create6lowBangReceiver({channels: [{id: 'main-stage', publicKey}]});
attendee.enable();
attendee.subscribe('main-stage');
const now = Date.now();
const first = source.emit('caption', 'Welcome to the main stage!', {now});
const second = source.emit('sound', '[APPLAUSE]', {now: now + 1});
const delayed = attendee.receive(second, {now: now + 2});
console.log('Out-of-order caption held:', delayed.ready.length === 0);
const result = attendee.receive(first, {now: now + 3});
for (const caption of result.ready) console.log(caption.channel + ' #' + caption.seq + ': ' + caption.text);
console.log('Radio, transcription, and human receipt: NOT TESTED');
