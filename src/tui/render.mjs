// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
import {RECEIVERS, phaseLabel, replayState} from './evidence.mjs';

const ANSI = /\x1b\[[\d;]*m/g;
const palette = {bright:97, dim:90, cyan:96, good:92, warn:93, bad:91};
export const unstyle = s => String(s).replace(ANSI, '');
const color = (s, tone, plain) => plain ? String(s) : '\x1b[' + (palette[tone] || 97) + 'm' + s + '\x1b[0m';
const clip = (s, width) => {
  const text = unstyle(s);
  return text.length <= width ? String(s) + ' '.repeat(width - text.length) :
    text.slice(0, Math.max(0, width - 1)) + '…';
};
const panel = (name, lines, width, plain) => {
  const edge = '─'.repeat(width - 2), title = ' ' + name + ' ';
  return [
    color('┌' + title + edge.slice(title.length) + '┐', 'cyan', plain),
    ...lines.map(s => color('│ ', 'dim', plain) + clip(s, width - 4) + color(' │', 'dim', plain)),
    color('└' + edge + '┘', 'cyan', plain)
  ];
};
const tone = s => ({ack:'good', missing:'warn', reject:'bad', error:'bad', duplicate:'cyan', pending:'cyan'}[s] || 'dim');
const marker = s => ({ack:'✓', missing:'!', reject:'×', error:'×', duplicate:'↺', pending:'·', unknown:'?'}[s] || '○');
const topology = (state, selected, plain) => [
  color('                        ◉  GATEWAY', 'cyan', plain),
  '                       /    |     \\',
  '                      /     |      \\',
  ...RECEIVERS.map(name => {
    const status = state.status[name].state;
    return color((name === selected ? '▶ ' : '  ') + marker(status) + ' ' + name.toUpperCase().padEnd(8) +
      ' [' + status.toUpperCase() + ']', name === selected ? 'bright' : tone(status), plain);
  }),
  '',
  color('Logical recipients, NOT measured RF paths, routing hops or neighbors', 'dim', plain)
];
const inspector = (state, selected) => {
  const r = state.status[selected];
  return [
    selected.toUpperCase() + '    ' + marker(r.state) + ' ' + r.state.toUpperCase(),
    'Receipt latency: ' + (Number.isFinite(r.latency) ? r.latency + ' ms (harness send start)' : 'not recorded'),
    r.detail,
    'Application ACK ≠ physical actuation ≠ human acknowledgment'
  ];
};
const observationRows = (steps, cursor) => steps.slice(Math.max(0, cursor - 6), cursor + 1).map(s =>
  String(s.index + 1).padStart(2, '0') + '  ' + marker(s.kind) + ' ' + s.title);

export function renderScreen({data, steps, cursor, selected = 'strobe', view = 'topology',
                              width = 90, height = 34, plain = false, help = false, playing = false}) {
  const w = Math.max(48, Math.min(112, width - 1 || 89));
  const state = replayState(steps, cursor);
  const progress = steps.length ? Math.round(100 * (state.cursor + 1) / steps.length) : 0;
  const barWidth = Math.max(0, Math.min(22, w - 37));
  const done = Math.round(barWidth * progress / 100);
  const title = '6LOWSTICK  /  MESH CONTROL  /  ' + phaseLabel(state.phase);
  const out = [
    color(clip(title, w), 'bright', plain),
    color(clip('SIMULATED EVIDENCE  •  READ ONLY  •  NOT A LIFE-SAFETY SYSTEM', w), 'warn', plain),
    '',
    color('[' + '█'.repeat(done) + '░'.repeat(barWidth - done) + ']', 'cyan', plain) +
       '  ' + (state.cursor + 1) + '/' + steps.length + '  ' + progress + '%  ' + (playing ? '▶ PLAY' : 'Ⅱ PAUSE'),
    ''
  ];
  if (help) {
    out.push(...panel('KEYBOARD HELP', [
      '←/→ or h/l  previous/next observation',
      'Home/End    beginning/end; r rewinds',
      'Space       play/pause reconstructed phase sequence',
      '↑/↓ or j/k  select receiver',
      '1 / 2 / 3   topology / timeline / provenance',
      '? help      q quit',
      '',
      'Playback is an illustration of ordered lab phases, NOT RF timing.'
    ], w, plain));
  } else if (view === 'timeline') {
    const max = Math.max(4, Math.min(16, height - 13));
    const start = Math.max(0, Math.min(state.cursor - Math.floor(max / 2), steps.length - max));
    out.push(...panel('OBSERVATION TIMELINE / ORDERED LAB PHASES',
      steps.slice(start, start + max).map(s =>
        (s.index === state.cursor ? '▶ ' : '  ') + String(s.index + 1).padStart(2, '0') + '  ' +
        phaseLabel(s.phase).padEnd(19) + ' ' + s.title), w, plain));
  } else if (view === 'evidence') {
    out.push(...panel('PROVENANCE / LIMITATIONS', [
      'Schema: ' + data.schema,
      'Transport: ' + (data.transport || 'not recorded'),
      'Payload: ' + (data.payload || 'not recorded'),
      'Phase: ' + phaseLabel(state.phase),
      'Observation: ' + (state.current?.title || 'before first recorded event'),
      'Diagnostics: ' + (data.errors || []).length + ' entries',
      '',
      'Final JSON gives ordered phases, NOT timestamped packet events.',
      'Application ACK means simulated receipt, not physical/human delivery.',
      'Gateway HMAC does not authenticate NOAA. RF paths unmeasured.',
      'Warning: ' + (data.warning || 'Experimental research only')
    ], w, plain));
  } else {
    out.push(...panel('LOGICAL MESH / APPLICATION DELIVERY', topology(state, selected, plain), w, plain));
    out.push('', ...panel('RECEIVER INSPECTOR', inspector(state, selected), w, plain));
    out.push('', ...panel('OBSERVATION STREAM', observationRows(steps, state.cursor), w, plain));
  }
  const footer = color(clip('1 TOPOLOGY  2 TIMELINE  3 EVIDENCE   ←/→ STEP  SPACE PLAY  ↑/↓ NODE  ? HELP  Q QUIT', w), 'dim', plain);
  if (out.length > height - 2) out.splice(Math.max(1, height - 2));
  out.push('', footer);
  return out.map(s => clip(s, w)).join('\n') + '\n';
}
