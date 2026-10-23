// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// OPT-IN OpenThread POSIX simulated-radio experiment. No RF or actuator.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes, randomInt} from 'node:crypto';
import {existsSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, isAbsolute} from 'node:path';
import {performance} from 'node:perf_hooks';
import {create6lowFlare} from '../../src/flare/core.mjs';
import {createFlareOutputRecorder} from '../../src/flare/output-evidence.mjs';
import {createFlarePosixAdapter, decodeFlareUdp, encodeFlareUdp,
  isFlareUdpPayload, signFlareAppReceipt, awaitFlareAppReceipt} from './posix-transport.mjs';

const bin = process.env.OT_CLI_PATH;
if (!bin || !isAbsolute(bin) || !existsSync(bin)) {
  console.error('OT_CLI_PATH must name an existing absolute ot-cli-ftd binary. No network test run.');
  process.exit(2);
}
const base = Number(process.env.FLARE_POSIX_BASE_ID ?? 22);
const offset = Number(process.env.FLARE_POSIX_PORT_OFFSET ?? randomInt(20, 500));
if (!Number.isInteger(base) || base < 1 || base > 27 ||
    !Number.isInteger(offset) || offset < 1 || offset > 500) {
  console.error('FLARE_POSIX_BASE_ID must be 1..27; PORT_OFFSET must be 1..500');
  process.exit(2);
}
const directory = mkdtempSync(join(tmpdir(), '6lowflare-posix-'));
mkdirSync(join(directory, 'tmp'), {mode: 0o700});
const nodes = [];
const errors = [];
const PORT_FLARE = 61618, PORT_ACK = 61619;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class OtNode {
  constructor(name, id) {
    this.name = name;
    this.received = [];
    this.closed = false;
    this.queue = Promise.resolve();
    this.pending = null;
    this.buffer = '';
    this.onPacket = null;
    this.proc = spawn(bin, [String(id)], {
      cwd: directory, env: {...process.env, PORT_OFFSET: String(offset)},
      stdio: ['pipe', 'pipe', 'pipe']
    });
    this.proc.stdout.on('data', chunk => this.feed(chunk.toString()));
    this.proc.stderr.on('data', chunk => errors.push({node: name, stderr: chunk.toString().slice(0, 256)}));
    this.proc.on('error', error => this.stop(error));
    this.proc.on('exit', () => this.stop(new Error(name + ' exited')));
    this.proc.stdin.on('error', () => {});
  }
  feed(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > 16384) this.buffer = this.buffer.slice(-4096);
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).replace(/\r/g, '').trim().replace(/^>\s*/, '');
      this.buffer = this.buffer.slice(idx + 1);
      const pkt = /^\d+ bytes from \S+ \d+ (.+)$/.exec(line);
      if (pkt && isFlareUdpPayload(pkt[1])) {
        const record = {body: pkt[1], time: performance.now(), node: this.name};
        this.received.push(record);
        if (this.onPacket) Promise.resolve().then(() => this.onPacket(record))
          .catch(error => errors.push({node: this.name, error: error.message}));
        continue;
      }
      const p = this.pending;
      if (!p) continue;
      if (line === 'Done') {
        this.pending = null;
        clearTimeout(p.timer);
        p.resolve(p.lines);
      } else if (/^Error \d+:/.test(line)) {
        this.pending = null;
        clearTimeout(p.timer);
        p.reject(new Error(this.name + ': ' + line + ' [' + p.cmd.split(' ')[0] + ']'));
      } else if (line && line !== p.cmd) p.lines.push(line);
    }
  }
  command(cmd, timeoutMs = 5000) {
    const run = () => new Promise((resolve, reject) => {
      if (this.closed) return reject(new Error(this.name + ' offline'));
      const timer = setTimeout(() => {
        this.pending = null;
        this.stop(new Error(this.name + ' command timeout: ' + cmd.split(' ')[0]));
        reject(new Error(this.name + ' command timeout: ' + cmd.split(' ')[0]));
      }, timeoutMs);
      this.pending = {resolve, reject, timer, cmd, lines: []};
      this.proc.stdin.write(cmd + '\n');
    });
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }
  stop(error = null) {
    this.closed = true;
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timer);
      p.reject(error ?? new Error(this.name + ' stopped'));
    }
    if (this.proc && this.proc.exitCode === null) this.proc.kill('SIGTERM');
  }
}
async function until(predicate, ms, label) {
  const deadline = performance.now() + ms;
  while (performance.now() < deadline) {
    if (await predicate()) return true;
    await sleep(100);
  }
  throw new Error('timeout: ' + label);
}
async function state(node) { return (await node.command('state'))[0]; }
async function attach(node, dataset) {
  await node.command('dataset set active ' + dataset);
  await node.command('ifconfig up');
  await node.command('thread start');
  await until(async () => ['router', 'child'].includes(await state(node)), 30000, node.name + ' joined');
}

let output;
try {
  const gateway = new OtNode('gateway', base);
  const sam = new OtNode('sam', base + 1);
  const bob = new OtNode('bob', base + 2);
  nodes.push(gateway, sam, bob);
  await gateway.command('dataset init new');
  await gateway.command('dataset commit active');
  await gateway.command('ifconfig up');
  await gateway.command('thread start');
  await until(async () => await state(gateway) === 'leader', 30000, 'leader elected');
  const dataset = (await gateway.command('dataset active -x'))[0];
  assert.match(dataset, /^[0-9a-f]{40,512}$/i);
  await attach(sam, dataset);
  await attach(bob, dataset);
  for (const node of nodes) {
    node.address = (await node.command('ipaddr rloc'))[0];
    assert.match(node.address, /^[a-f0-9:]+$/i);
    await node.command('udp open');
    await node.command('udp bind :: ' + (node === gateway ? PORT_ACK : PORT_FLARE));
  }

  // The three nodes have prearranged shared group credentials, not Matrix identity.
  const key = randomBytes(32);
  const audience = {id: 'camp', key, codes: ['here']};
  const aliceModel = create6lowFlare({audiences: [audience], enabled: true});
  const samModel = create6lowFlare({audiences: [audience], enabled: true, relayEnabled: true});
  const bobModel = create6lowFlare({audiences: [audience], enabled: true,
    modalities: ['light', 'haptic']});
  const recorder = createFlareOutputRecorder();
  const now = Date.now();
  const frame = aliceModel.flare('camp', 'here', {now, hops: 1, ttlMs: 60000});
  const counters = {samAccepted: 0, bobAccepted: 0, forwards: 0, duplicatesRejected: 0};
  sam.onPacket = async p => {
    const wire = decodeFlareUdp(p.body);
    if (!wire) return;
    const rx = samModel.receive(wire, {now: Date.now()});
    if (!rx) { counters.duplicatesRejected++; return; }
    counters.samAccepted++;
    await sam.command('udp send ' + gateway.address + ' ' + PORT_ACK + ' ' +
      signFlareAppReceipt({key, node: 'sam', nonce: rx.nonce}));
    if (rx.forward) {
      counters.forwards++;
      await sam.command('udp send ' + bob.address + ' ' + PORT_FLARE + ' ' +
        encodeFlareUdp(rx.forward));
    }
  };
  bob.onPacket = async p => {
    const wire = decodeFlareUdp(p.body);
    if (!wire) return;
    const rx = bobModel.receive(wire, {now: Date.now()});
    if (!rx) { counters.duplicatesRejected++; return; }
    counters.bobAccepted++;
    // Output evidence is a separate script-controlled fixture, not a
    // photometer, accelerometer, physical motor or screen reader.
    assert.equal(recorder.request(rx, {at: Date.now()}), true);
    assert.equal(recorder.observeFixture({nonce: rx.nonce, modality: 'light', at: Date.now()}), true);
    // Deliberately no haptic sensor event: missing != failed actuator.
    await bob.command('udp send ' + gateway.address + ' ' + PORT_ACK + ' ' +
      signFlareAppReceipt({key, node: 'bob', nonce: rx.nonce}));
  };
  const toSam = createFlarePosixAdapter({sender: gateway, targetAddress: sam.address,
    port: PORT_FLARE, key, receiptFrom: 'sam', waitMs: 4000});
  // A forwarded Bob ACK can arrive BEFORE Sam's acknowledgement check ends.
  // Match from the original send time; never resend to force a new ACK.
  const firstAttemptAt = performance.now();
  const samReceipt = await toSam.transmit(frame);
  assert.equal(samReceipt.applicationReceipt, true, 'Sam app ACK missing');
  const bobReceipt = await awaitFlareAppReceipt({sender: gateway,
    key, node: 'bob', nonce: frame.nonce, since: firstAttemptAt, waitMs: 4000});
  assert.equal(bobReceipt.applicationReceipt, true, 'Bob app ACK missing');
  // Deliberately replay the same authorized frame: receiver may see UDP
  // traffic again, but must not record another application activation.
  await gateway.command('udp send ' + sam.address + ' ' + PORT_FLARE + ' ' +
    encodeFlareUdp(frame));
  await sleep(300);
  assert.equal(counters.samAccepted, 1);
  assert.equal(counters.bobAccepted, 1);
  assert.equal(counters.forwards, 1);
  assert.ok(counters.duplicatesRejected >= 1);
  assert.deepEqual(recorder.evidence()[0].absentFixtureObservations, ['haptic']);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  output = {schema: '6lowstick.flare-posix-research.v0', simulatedRadio: true,
    physicalRadio: false, nodes: ['gateway', 'sam', 'bob'],
    transport: 'OpenThread POSIX simulated-radio IPv6 UDP',
    signalCode: 'here', hopBudget: [frame.hopsRemaining, 0],
    samApplicationReceipt: samReceipt.applicationReceipt,
    bobApplicationReceipt: bobReceipt.applicationReceipt,
    acceptedByApplication: {sam: counters.samAccepted, bob: counters.bobAccepted},
    relays: counters.forwards, duplicatesRejected: counters.duplicatesRejected,
    outputEvidence: recorder.evidence(),
    physicalOutputVerified: false, humanDetectionVerified: false,
    limitations: 'Shared-key receipts do not establish individual device identity. Synthetic fixture did not actuate a light/haptic device or measure human response.'};
} catch (err) {
  console.error('6lowFlare POSIX lab failed:', err.stack ?? err.message);
  if (errors.length) console.error('OpenThread CLI errors:', JSON.stringify(errors));
  process.exitCode = 1;
} finally {
  for (const node of nodes) node.stop();
  await sleep(100);
  rmSync(directory, {recursive: true, force: true});
}
if (output) console.log(JSON.stringify(output, null, 2));
