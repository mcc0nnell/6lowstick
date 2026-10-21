// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Experimental application-level emergency alert delivery over real simulated OpenThread UDP.
// Synthetic alerts only. No CAP/IPAWS integration or certified life-safety behavior.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {isAbsolute, join as pathJoin} from 'node:path';
import {existsSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {randomBytes, randomInt} from 'node:crypto';
import {signAlert, verifyAlert} from './auth.mjs';
import {ReplayJournal} from './replay.mjs';
import {evaluateSame} from '../../src/nwr/gateway.mjs';
import {reconcileSameHeaders} from '../../src/nwr/repetition.mjs';
import {createTelemetryRecorder} from '../../src/telemetry/monotonic.mjs';

const cli = process.env.OT_CLI_PATH;
const base = Number(process.env.THREAD_ALERT_BASE_ID ?? 10);
if (!cli || !isAbsolute(cli) || !existsSync(cli) ||
    !Number.isInteger(base) || base < 1 || base > 28) {
  console.error('Set OT_CLI_PATH to an absolute ot-cli-ftd binary; base ID must be 1..28');
  process.exit(2);
}
const portOffset = Number(process.env.THREAD_ALERT_PORT_OFFSET ?? randomInt(20, 500));
if (!Number.isInteger(portOffset) || portOffset < 1 || portOffset > 500) {
  console.error('THREAD_ALERT_PORT_OFFSET must be 1..500');
  process.exit(2);
}
// OpenThread simulator flash lives in a relative tmp/ path. Give every run private backing storage.
const simDir = mkdtempSync(pathJoin(tmpdir(), 'tronix-thread-alert-'));
mkdirSync(pathJoin(simDir, 'tmp'), {mode: 0o700});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const alertKey = randomBytes(32); // ephemeral lab-only key; never emitted
const PORT_ALERT = 61616;
const PORT_ACK = 61617;
const events = [];
const errorEvents = [];
const nodes = [];
const trace = createTelemetryRecorder();
let activeSend = null;
const recordWhileActive = (kind, receiver, at) => {
  if (activeSend) trace.record(activeSend.phase, kind, receiver, at);
};

class OtNode {
  constructor(name, id) {
    this.name = name;
    this.id = id;
    this.closed = false;
    this.buffer = '';
    this.pending = null;
    this.queue = Promise.resolve();
    this.received = [];
    this.replayJournal = new ReplayJournal(pathJoin(simDir, `${name}-replay.log`));
    this.activations = [];
    this.onPacket = null;
    this.proc = spawn(cli, [String(id)], {
      cwd: simDir,
      env: {...process.env, PORT_OFFSET: String(portOffset)},
      stdio: ['pipe', 'pipe', 'pipe']
    });
    this.proc.stdout.on('data', chunk => this.feed(chunk.toString()));
    this.proc.stderr.on('data', chunk => {
      errorEvents.push({node: name, stderr: chunk.toString().slice(0, 256)});
    });
    this.proc.on('error', err => this.terminate(err));
    this.proc.on('exit', () => this.terminate(new Error('node exited')));
    this.proc.stdin.on('error', () => {});
  }
  terminate(err) {
    this.closed = true;
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timer);
      p.reject(err);
    }
  }
  feed(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > 16384) this.buffer = this.buffer.slice(-4096);
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).replace(/\r/g, '').trim().replace(/^>\s*/, '');
      this.buffer = this.buffer.slice(idx + 1);
      if (process.env.THREAD_ALERT_DEBUG === '1' && (/bytes from/.test(line) || /^Error \d+:/.test(line))) {
        console.error(this.name + ' CLI: ' + line.slice(0, 180));
      }
      const packet = /^\d+ bytes from \S+ \d+ ((?:EA2\|[A-Za-z0-9_-]+\|[A-Za-z0-9_-]+\|[a-f0-9]{32}|ACK1\|[A-Za-z0-9_-]+\|[A-Za-z0-9_-]+))$/.exec(line);
      if (packet) {
        const item = {node: this.name, body: packet[1], time: performance.now()};
        this.received.push(item);
        if (this.name === 'gateway' && activeSend) {
          const ack = /^ACK1\|([A-Za-z0-9_-]+)\|(strobe|display|haptic)$/.exec(item.body);
          if (ack && ack[1] === activeSend.id && activeSend.targets.has(ack[2]) &&
              item.time >= activeSend.start && !activeSend.seen.has(ack[2])) {
            activeSend.seen.add(ack[2]);
            trace.record(activeSend.phase, 'gateway_ack', ack[2], item.time);
          }
        }
        if (this.onPacket) Promise.resolve().then(() => this.onPacket(item)).catch(err => {
          errorEvents.push({node: this.name, error: err.message});
        });
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
        p.reject(new Error(this.name + ': ' + line + ' [' + p.command.split(' ')[0] + ']'));
      } else if (line && line !== p.command) {
        p.lines.push(line);
      }
    }
  }
  command(command, timeout = 5000) {
    const run = () => new Promise((resolve, reject) => {
      if (this.closed) return reject(new Error(this.name + ' is offline'));
      const timer = setTimeout(() => {
        this.pending = null;
        this.stop();
        reject(new Error(this.name + ' command timeout: ' + command.split(' ')[0]));
      }, timeout);
      this.pending = {resolve, reject, lines: [], timer, command};
      this.proc.stdin.write(command + '\n');
    });
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }
  stop() { if (!this.closed) this.proc.kill('SIGTERM'); this.closed = true; }
}

async function until(predicate, timeout = 30000, label = 'condition') {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (await predicate()) return true;
    await sleep(100);
  }
  if (label === 'optional') return false;
  throw new Error('Timed out waiting for ' + label);
}
async function state(node) { return (await node.command('state'))[0]; }
async function join(node, dataset) {
  await node.command('dataset set active ' + dataset);
  await node.command('ifconfig up');
  await node.command('thread start');
  await until(async () => ['child', 'router'].includes(await state(node)), 30000, node.name + ' attach');
}
async function sendAlert(sender, targets, alertId, overrideWire = null, phase = 'baseline') {
  const t0 = performance.now();
  trace.record(phase, 'phase_start', null, t0);
  activeSend = {phase, id: alertId, targets: new Set(targets.map(n => n.name)), start: t0, seen: new Set()};
  const failures = [];
  for (const target of targets) {
    trace.record(phase, 'send_attempt', target.name);
    try {
      await sender.command('udp send ' + target.address + ' ' + PORT_ALERT + ' ' + (overrideWire ?? signAlert(alertKey, alertId)));
    } catch (e) {
      failures.push({target: target.name, error: e.message});
      trace.record(phase, 'send_error', target.name);
    }
  }
  await until(() => targets.every(n => sender.received.some(e => e.time >= t0 && e.body === 'ACK1|' + alertId + '|' + n.name)),
              2500, 'optional');
  const acked = targets.filter(n => sender.received.some(e => e.time >= t0 && e.body === 'ACK1|' + alertId + '|' + n.name));
  const latency = Object.fromEntries(acked.map(n => {
    const ack = sender.received.find(e => e.time >= t0 && e.body === 'ACK1|' + alertId + '|' + n.name);
    return [n.name, Math.round(ack.time - t0)];
  }));
  for (const name of targets.filter(x => !acked.includes(x)).map(x => x.name))
    trace.record(phase, 'missing', name);
  activeSend = null;
  return {id: alertId, requested: targets.map(x => x.name), acknowledged: acked.map(x => x.name),
          missing: targets.filter(x => !acked.includes(x)).map(x => x.name),
          ack_latency_ms: latency, send_errors: failures};
}

let finalEvidence;
try {
  const gateway = new OtNode('gateway', base);
  const strobe = new OtNode('strobe', base + 1);
  const display = new OtNode('display', base + 2);
  const haptic = new OtNode('haptic', base + 3);
  nodes.push(gateway, strobe, display, haptic);
  await gateway.command('dataset init new');
  await gateway.command('dataset commit active');
  await gateway.command('ifconfig up');
  await gateway.command('thread start');
  await until(async () => await state(gateway) === 'leader', 30000, 'gateway leader');
  const dataset = (await gateway.command('dataset active -x'))[0];
  assert.match(dataset, /^[a-f0-9]{40,512}$/i);
  for (const node of [strobe, display, haptic]) await join(node, dataset);
  for (const node of nodes) {
    node.address = (await node.command('ipaddr rloc'))[0];
    assert.match(node.address, /^[0-9a-f:]+$/i);
    await node.command('udp open');
    await node.command('udp bind :: ' + (node === gateway ? PORT_ACK : PORT_ALERT));
  }
  // A role transition does not guarantee IPv6 route convergence immediately.
  await sleep(2000);
  if (process.env.THREAD_ALERT_DEBUG === '1') {
    for (const n of nodes) {
      console.error('NETWORK ' + n.name + ' ' + JSON.stringify({
        state: await state(n), address: n.address,
        leaderdata: await n.command('leaderdata'),
        routerTable: n === gateway ? await n.command('router table') : undefined,
        childTable: n === gateway ? await n.command('child table') : undefined,
        mode: await n.command('mode')
      }));
    }
    await gateway.command('ping ' + strobe.address + ' 2');
    await sleep(1200);
  }
  for (const node of [strobe, display, haptic]) {
    node.onPacket = async item => {
      const alert = verifyAlert(alertKey, item.body);
      if (!alert) {
        recordWhileActive('auth_reject', node.name, item.time);
        events.push({node: node.name, event: 'rejected_auth'});
        return;
      }
      recordWhileActive('receiver_accept', node.name, item.time);
      if (node.replayJournal.accept(alert.id)) {
        node.activations.push(alert.id);
        recordWhileActive('activation_recorded', node.name);
        events.push({node: node.name, event: 'activated', alert_id: alert.id});
      } else {
        recordWhileActive('duplicate', node.name);
        events.push({node: node.name, event: 'duplicate_suppressed', alert_id: alert.id});
      }
      await node.command('udp send ' + gateway.address + ' ' + PORT_ACK +
                         ' ACK1|' + alert.id + '|' + node.name);
    };
  }
  const targets = [strobe, display, haptic];
  const baseline = await sendAlert(gateway, targets, 'drill001');
  if (process.env.THREAD_ALERT_DEBUG === '1' && baseline.acknowledged.length !== 3) {
    console.error('BASELINE_FAIL ' + JSON.stringify(baseline));
    for (const n of nodes) {
      console.error('COUNTERS ' + n.name + ' ' + JSON.stringify({
        ip: await n.command('counters ip'), mac: await n.command('counters mac')
      }));
    }
  }
  assert.equal(baseline.acknowledged.length, 3, 'healthy simulated nodes must all ACK');
  const forged = signAlert(alertKey, 'forged001').replace('forged001', 'forged002');
  const rejected = await sendAlert(gateway, [strobe], 'forged002', forged, 'rejected');
  assert.deepEqual(rejected.acknowledged, [], 'forged alert must not be acknowledged');
  assert.deepEqual(strobe.activations, ['drill001'], 'forged alert must not activate');
  assert.ok(events.some(e => e.node === 'strobe' && e.event === 'rejected_auth'),
            'receiver must record authentication rejection');
  // Reopen the persisted journal to simulate application restart before replay.
  strobe.replayJournal = new ReplayJournal(pathJoin(simDir, 'strobe-replay.log'));
  const replay = await sendAlert(gateway, [strobe], 'drill001', null, 'replay');
  assert.deepEqual(strobe.activations, ['drill001'], 'duplicate alert must not reactivate');
  assert.deepEqual(replay.acknowledged, ['strobe'], 'duplicate still receives ACK');
  // Offline synthetic SAME -> geographic/time policy -> signed EA2 -> real simulated Thread UDP.
  const same = 'ZCZC-WXR-TOR-024510-+0030-2941830-KLWX-';
  const gatewayPolicy = {areas: ['024510'], key: alertKey, year: 2026,
    now: new Date('2026-10-21T18:45:00Z')};
  const policyRejected = evaluateSame(same, {...gatewayPolicy, areas: ['036001']});
  assert.equal(policyRejected.accepted, false, 'out-of-area SAME must be rejected');
  trace.record('same', 'policy_reject');
  const repeated = reconcileSameHeaders([same, same]);
  assert.equal(repeated.accepted, true, 'synthetic SAME repetition gate must agree');
  const policyAlert = evaluateSame(repeated.header, gatewayPolicy);
  assert.equal(policyAlert.accepted, true, 'synthetic SAME must pass policy');
  trace.record('same', 'policy_accept');
  const sameDelivery = await sendAlert(gateway, targets, policyAlert.id, policyAlert.wire, 'same');
  assert.deepEqual(sameDelivery.missing, [], 'all nodes must ACK the SAME-derived alert');
  assert.ok(targets.every(n => n.activations.includes(policyAlert.id)),
            'all nodes must activate for authenticated SAME-derived synthetic alert');
  haptic.stop();
  trace.record('degraded', 'receiver_offline', 'haptic');
  await sleep(300);
  const degraded = await sendAlert(gateway, targets, 'drill002', null, 'degraded');
  assert.deepEqual(degraded.missing, ['haptic'], 'lost node must not be marked delivered');
  assert.equal(degraded.acknowledged.length, 2, 'remaining nodes must ACK');
  finalEvidence = {
    schema: 'tronix.thread-alert-lab.v1',
    transport: 'OpenThread ot-cli-ftd UDP POSIX simulation (no physical radio)',
    payload: 'synthetic HMAC-authenticated EA2 alert and ACK1 receipt; not CAP',
    baseline, rejected, replay, sameGateway: {policyRejected, policyAlert: {id: policyAlert.id, event: policyAlert.event, areaCodes: policyAlert.areaCodes}, delivery: sameDelivery}, degraded, activations: Object.fromEntries(targets.map(n => [n.name, n.activations])),
    events, errors: errorEvents,
    timing: trace.snapshot(),
    warning: 'ACK means simulator application receipt, not human acknowledgement or certified alerting'
  };
  console.log(JSON.stringify(finalEvidence, null, 2));
} catch (e) {
  console.error('THREAD_ALERT_LAB_FAILED: ' + e.stack);
  process.exitCode = 1;
} finally {
  for (const node of nodes) node.stop();
  await sleep(150);
  for (const node of nodes) if (node.proc.exitCode === null) node.proc.kill('SIGKILL');
  await sleep(100);
  rmSync(simDir, {recursive: true, force: true});
}
