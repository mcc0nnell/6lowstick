// 6lowStick Field Station: read-only interpretation of committed research JSON.
// No radio, actuator, messaging, protocol dispatch, or external write APIs.
import { validateResearchFixture, stationSummary, eventsFor, labelFor, descriptionFor } from './station-model.mjs';

const $ = id => document.getElementById(id);
const graph = window.echarts?.init($('network')) ?? null;
const timeline = window.echarts?.init($('timeline')) ?? null;
let scenarios = [];
let scenarioIndex = 0;
let eventIndex = 0;
let playing = false;
let timer = null;
const pretty = labelFor;
const palette = { signal: '#c4ef79', cyan: '#8cddea', amber: '#ffd08a', text: '#edf6f2', muted: '#a0b4b5' };

const reduced = () => $('motion').checked || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop() {
  playing = false;
  clearTimeout(timer);
  timer = null;
  $('play').textContent = 'Play sequence';
}

function displayGraph(events) {
  if (!graph) return;
  const nodes = [
    { id: 'gateway', name: 'GATEWAY', x: 65, y: 160, symbolSize: 66 },
    { id: 'thread', name: 'THREAD\nSIMULATED', x: 255, y: 70, symbolSize: 72 },
    { id: 'lora-p2p', name: 'DIRECT LoRa\nSIMULATED', x: 255, y: 250, symbolSize: 78 },
    { id: 'haptic', name: 'HAPTIC\nSYNTHETIC', x: 475, y: 160, symbolSize: 78 },
  ];
  const links = [];
  for (const event of events.slice(0, eventIndex + 1).filter(e => e.type === 'attempt')) {
    const confirmed = event.outcome === 'authenticated_app_receipt';
    const lineStyle = {
      color: confirmed ? palette.signal : palette.amber,
      width: confirmed ? 3 : 2,
      type: confirmed ? 'solid' : 'dashed',
      opacity: .95,
    };
    links.push({ source: 'gateway', target: event.route, lineStyle });
    links.push({ source: event.route, target: 'haptic', lineStyle: { ...lineStyle, opacity: .4 } });
  }
  graph.setOption({
    animation: !reduced(),
    tooltip: { formatter: p => p.dataType === 'edge'
      ? 'Scripted application attempt; no on-air measurement'
      : p.name + ' (simulation)' },
    series: [{
      type: 'graph', layout: 'none', roam: false, data: nodes, links,
      label: { show: true, position: 'bottom', color: palette.text, fontWeight: 700, fontSize: 11 },
      itemStyle: { color: '#1d3935', borderColor: palette.signal, borderWidth: 2 },
      emphasis: { focus: 'adjacency' }, lineStyle: { curveness: .08 },
    }],
  }, true);
}

function displayTimeline(events) {
  if (!timeline) return;
  timeline.setOption({
    animation: !reduced(),
    grid: { left: 105, right: 20, top: 16, bottom: 18 },
    xAxis: { type: 'value', min: 0, max: 1, show: false },
    yAxis: {
      type: 'category', inverse: true, data: events.map((e, i) => `${i + 1} · ${e.route}`),
      axisLabel: { color: palette.muted, fontSize: 10 },
    },
    series: [{
      type: 'bar', barWidth: 16,
      data: events.map((event, i) => ({
        value: 1, itemStyle: {
          color: i === eventIndex
            ? palette.signal
            : i < eventIndex
              ? '#537f6b'
              : '#294145',
        },
      })),
    }],
  }, true);
}

function draw() {
  const scenario = scenarios[scenarioIndex];
  if (!scenario) return;
  const events = eventsFor(scenario);
  const event = events[eventIndex];
  $('scenario').value = String(scenarioIndex);
  $('stepCount').textContent = `EVENT ${eventIndex + 1} / ${events.length}`;
  $('eventType').textContent = event.type === 'attempt' ? 'TRANSPORT ATTEMPT' : 'RECEIVER JOURNAL';
  $('eventTitle').textContent = labelFor(event.outcome);
  $('eventDescription').textContent = descriptionFor(event);
  $('raw').textContent = JSON.stringify(event, null, 2);
  $('liveStatus').textContent = `${pretty(scenario.scenario)} · ${pretty(scenario.receipt.status)} · RF unverified`;
  $('prev').disabled = eventIndex === 0;
  $('next').disabled = eventIndex === events.length - 1;

  for (const id of ['visual', 'text', 'haptic']) $(id).classList.remove('active');
  const syntheticActivation = events.slice(0, eventIndex + 1)
    .some(e => e.type === 'receiver' && e.outcome === 'synthetic_activation');
  if (syntheticActivation) $('haptic').classList.add('active');
  $('haptic').querySelector('small').textContent =
    syntheticActivation ? 'Synthetic activation in journal' : 'Not yet recorded';

  $('rows').replaceChildren();
  events.forEach((e, i) => {
    const row = document.createElement('tr');
    if (i === eventIndex) row.setAttribute('aria-current', 'true');
    for (const val of [
      i + 1,
      pretty(e.route),
      labelFor(e.outcome),
      i === eventIndex ? 'Current' : '—',
    ]) {
      const td = document.createElement('td');
      td.textContent = String(val);
      row.append(td);
    }
    $('rows').append(row);
  });

  $('textReport').textContent =
    `Scenario: ${pretty(scenario.scenario)}\n` +
    `Fixture: deterministic software simulation\n` +
    `Physical radio verified: NO\nHuman perception verified: NO\n` +
    `Confirmed application route: ${scenario.receipt.confirmedRoute ?? 'none'}\n` +
    `Receiver: ${scenario.receipt.receiver} (synthetic)\n\n` +
    events.map((e, i) => `${i + 1}. ${e.type}: ${e.route} — ${labelFor(e.outcome)}${i === eventIndex ? ' [CURRENT]' : ''}`).join('\n') +
    `\n\nSelected: ${descriptionFor(event)}`;
  displayGraph(events);
  displayTimeline(events);
}

function next() {
  if (eventIndex < eventsFor(scenarios[scenarioIndex]).length - 1) {
    eventIndex++;
    draw();
    return true;
  }
  return false;
}

function tick() {
  if (!playing) return;
  if (!next()) { stop(); return; }
  timer = setTimeout(tick, 1100);
}

$('scenario').addEventListener('change', () => {
  stop();
  scenarioIndex = Number($('scenario').value);
  eventIndex = 0;
  draw();
});
$('prev').addEventListener('click', () => {
  stop();
  eventIndex = Math.max(0, eventIndex - 1);
  draw();
});
$('next').addEventListener('click', () => {
  stop();
  next();
});
$('play').addEventListener('click', () => {
  if (playing) { stop(); return; }
  if (reduced()) {
    stop();
    $('liveStatus').textContent = 'Autoplay unavailable in reduced-motion mode; use Next.';
    return;
  }
  if (eventIndex === eventsFor(scenarios[scenarioIndex]).length - 1) eventIndex = 0;
  playing = true;
  $('play').textContent = 'Pause sequence';
  draw();
  timer = setTimeout(tick, 1100);
});
$('motion').addEventListener('change', () => { if (reduced()) stop(); draw(); });
window.addEventListener('resize', () => { graph?.resize(); timeline?.resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

(async () => {
  try {
    const response = await fetch('./multiradio.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const fixture = validateResearchFixture(await response.json());
    scenarios = fixture.scenarios;
    const summary = stationSummary(fixture);
    $('scenarioMetric').textContent = String(summary.scenarios).padStart(2, '0');
    $('routeMetric').textContent = String(summary.modeledRoutes).padStart(2, '0');
    scenarios.forEach((scenario, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = pretty(scenario.scenario);
      $('scenario').append(option);
    });
    draw();
  } catch (err) {
    stop();
    $('liveStatus').textContent = 'Research fixture unavailable';
    $('eventTitle').textContent = 'Unable to load evidence';
    $('eventDescription').textContent = err.message;
    $('textReport').textContent = `Cannot load the synthetic fixture: ${err.message}\nInspect ./multiradio.json or the repository tests.`;
  }
})();
