// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Synthetic capacity and mobility model. No radios, real 6lowLoop, or receipts.
const W = 1400, H = 1000, STEP = 15;
const THREAD_RADIUS = 245, RELAY_RADIUS = 830;
const THREAD_BUDGET = 14, RELAY_BUDGET = 4; // Assumptions, NOT RF measurements.
const STATIONS = [[175,210],[525,210],[875,210],[1225,210],
  [175,790],[525,790],[875,790],[1225,790]];
const RELAYS = [[310,500],[1090,500]];

const d = (p, q) => Math.hypot(p.x - q[0], p.y - q[1]);
const clamp = (v, max) => Math.max(0, Math.min(max, v));
function rng(seed) {
  let x = seed >>> 0;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}
function assertInt(v, low, high, field) {
  if (!Number.isSafeInteger(v) || v < low || v > high)
    throw new RangeError(field + ' must be an integer in [' + low + ', ' + high + ']');
}
function createPeople(count, random) {
  const people = [];
  for (let start = 0; start < count; start += 6) {
    const home = [60 + random() * (W - 120), 60 + random() * (H - 120)];
    const size = Math.min(6, count - start);
    for (let i = 0; i < size; i++) people.push({
      x: clamp(home[0] + (random() - .5) * 95, W),
      y: clamp(home[1] + (random() - .5) * 95, H),
      home, friend: size === 1 ? start - 1 : start + (i + 1) % size,
      crew: start + i < Math.ceil(count * .03), id: start + i
    });
  }
  return people;
}
function move(people, random, tick, nTicks) {
  const towardStage = tick >= nTicks * .25 && tick < nTicks * .7;
  for (const p of people) {
    const dest = towardStage && p.id % 4 !== 0 ? [690,240] : p.home;
    const dx = dest[0] - p.x, dy = dest[1] - p.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = 2.5 + random() * 4;
    p.x = clamp(p.x + dx / length * Math.min(length, speed) + (random() - .5) * 10, W);
    p.y = clamp(p.y + dy / length * Math.min(length, speed) + (random() - .5) * 10, H);
  }
}
function station(p) {
  let best = -1, distance = Infinity;
  for (let i = 0; i < STATIONS.length; i++) {
    const candidate = d(p, STATIONS[i]);
    if (candidate <= THREAD_RADIUS && candidate < distance) { best = i; distance = candidate; }
  }
  return best;
}
function relayFor(a, b) {
  return RELAYS.findIndex(relay => d(a, relay) <= RELAY_RADIUS && d(b, relay) <= RELAY_RADIUS);
}
function counters() {
  return {attempted:0, modeledDelivered:0, notDeliveredInModel:0,
    threadLocal:0, threadGateway:0, loraRelay:0,
    failures:{capacity:0, coverage:0, modeledLoss:0}};
}
function attempt(counts) { for (const c of counts) c.attempted++; }
function result(counts, route, failure) {
  for (const c of counts) {
    if (route) { c.modeledDelivered++; c[route]++; }
    else { c.notDeliveredInModel++; c.failures[failure]++; }
  }
}
const percent = (n, d) => d ? Math.round(10000 * n / d) / 100 : null;

/** Seeded crowd traffic generator, not 802.15.4 / LoRa physical simulation. */
export function simulateFestival({attendees = 250, minutes = 45, seed = 6,
  reactorOutageAtMinute = null} = {}) {
  assertInt(attendees, 2, 10000, 'attendees');
  assertInt(minutes, 1, 360, 'minutes');
  assertInt(seed, 1, 0xffffffff, 'seed');
  if (reactorOutageAtMinute !== null)
    assertInt(reactorOutageAtMinute, 0, minutes - 1, 'reactorOutageAtMinute');
  const random = rng(seed), people = createPeople(attendees, random);
  const ticks = minutes * 60 / STEP;
  const totals = counters();
  const segments = {beforeOutage:counters(), afterOutage:counters()};
  const categories = {crew:counters(), friends:counters()};
  const timeline = Array.from({length:minutes}, (_, minute) => ({minute, ...counters()}));
  const invariants = {maxThreadStationSlots:0, maxLoRaRelaySlots:0,
    localThreadDuringOutage:0, reactorDependentDuringOutage:0};
  for (let tick = 0; tick < ticks; tick++) {
    const minuteNumber = Math.floor(tick * STEP / 60);
    const outage = reactorOutageAtMinute !== null && minuteNumber >= reactorOutageAtMinute;
    const group = outage ? segments.afterOutage : segments.beforeOutage;
    const minute = timeline[minuteNumber];
    move(people, random, tick, ticks);
    const attached = people.map(station);
    const threadSlots = STATIONS.map(() => 0), relaySlots = RELAYS.map(() => 0);
    const pending = [];
    for (const p of people) if (random() < (p.crew ? .17 : .08))
      pending.push({source:p.id, target:p.friend, category:p.crew ? 'crew' : 'friends'});
    // Deterministic crew-first scheduler. No life-safety prioritization claim.
    pending.sort((a,b) => Number(b.category === 'crew') - Number(a.category === 'crew'));
    for (const msg of pending) {
      const counts = [totals, minute, group, categories[msg.category]];
      attempt(counts);
      const a = people[msg.source], b = people[msg.target];
      const sa = attached[msg.source], sb = attached[msg.target];
      let route = null, failure = 'coverage';
      if (sa >= 0 && sb >= 0) {
        const local = sa === sb, gatewayAvailable = !outage || (sa >= 4 && sb >= 4);
        if (local || gatewayAvailable) {
          if (threadSlots[sa] < THREAD_BUDGET && threadSlots[sb] < THREAD_BUDGET) {
            threadSlots[sa]++;
            if (!local) threadSlots[sb]++;
            if (random() < (local ? .98 : .94))
              route = local ? 'threadLocal' : 'threadGateway';
            else failure = 'modeledLoss';
          } else failure = 'capacity';
        } else invariants.reactorDependentDuringOutage++;
      }
      if (!route) {
        const relay = relayFor(a,b);
        if (relay >= 0) {
          if (relaySlots[relay] < RELAY_BUDGET) {
            relaySlots[relay]++;
            if (random() < .82) route = 'loraRelay';
            else failure = 'modeledLoss';
          } else failure = 'capacity';
        } else if (failure !== 'capacity' && failure !== 'modeledLoss') failure = 'coverage';
      }
      if (outage && route === 'threadLocal') invariants.localThreadDuringOutage++;
      result(counts, route, failure);
    }
    invariants.maxThreadStationSlots = Math.max(invariants.maxThreadStationSlots, ...threadSlots);
    invariants.maxLoRaRelaySlots = Math.max(invariants.maxLoRaRelaySlots, ...relaySlots);
  }
  return {
    schema:'6lowstick.festival-capacity-model.v0',
    simulation:true, physicalRf:false, real6lowLoop:false, realReceipts:false,
    parameters:{attendees, minutes, seed, reactorOutageAtMinute,
      venueMeters:{width:W,height:H}, stepSeconds:STEP,
      stationCount:STATIONS.length, stationRadiusMeters:THREAD_RADIUS,
      relayCount:RELAYS.length, relayRadiusMeters:RELAY_RADIUS,
      budgetsPerStep:{threadPerStation:THREAD_BUDGET,loraPerRelay:RELAY_BUDGET},
      syntheticPerAttemptSuccess:{threadLocal:.98,threadGateway:.94,loraRelay:.82}},
    totals:{...totals,modeledDeliveryPercent:percent(totals.modeledDelivered,totals.attempted)},
    categories,segments,timeline,invariants,
    caveat:'Synthetic crowd/capacity model. No path loss, MAC contention, interference, regulated airtime, queueing, signed receipt, physical notification or human detection.'
  };
}
