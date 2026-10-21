// SPDX-License-Identifier: Apache-2.0
// Rizzer's optional, decorative TUI cameo. Never touches evidence or dispatch.
export const RIZZER_POSES = Object.freeze(['smug', 'investigating', 'surprised', 'celebrating', 'caution']);
const faces = Object.freeze({
  smug: ['  -    ^ ', '  \\___/  '],
  investigating: ['  o    o ', '   ____  '],
  surprised: ['  O    O ', '    ()   '],
  celebrating: ['  >    < ', '  \\___/  '],
  caution: ['  !    ! ', '   ~~~~  ']
});
const lines = Object.freeze({
  smug: 'Two collars. Zero trust.',
  investigating: 'Check the bounds. Preserve the evidence.',
  surprised: 'Sanitizer found a candidate. Not a confirmed vulnerability.',
  celebrating: 'A reproducible test! That deserves a collar pop.',
  caution: 'A missing receipt means unconfirmed, not delivered.'
});
const pink = '\x1b[95m';
const lime = '\x1b[92m';
const reset = '\x1b[0m';

export function renderRizzer({pose = 'smug', plain = false, color = false} = {}) {
  if (!RIZZER_POSES.includes(pose)) throw new TypeError('unknown Rizzer pose');
  if (plain) return 'Rizzer (' + pose + '): ' + lines[pose] + '\n';
  const top = [
    '                /\\  /\\',
    '       ________/  \\/  \\__',
    '      /  HOT PINK     __\\',
    '     /    .__________/',
    '    /    /'
  ];
  const [eyes, mouth] = faces[pose];
  const lower = [
    '   /    /  .-----------.',
    '  |    |  /   LIME      \\',
    '  |    | | ' + eyes + ' |',
    '  |    | | ' + mouth + ' |',
    '   \\    \\ \\           /',
    "    \\    '-.---------'",
    "     '--------------'"
  ];
  const head = 'RIZZER // ' + pose.toUpperCase();
  const draw = color ? [
    ...top.map(x => pink + x + reset),
    ...lower.map(x => lime + x + reset)
  ] : [...top, ...lower];
  return draw.join('\n') + '\n' + head + '\n' + lines[pose] +
    '\n\n[m] return to evidence. Read-only mascot cameo.\n';
}

export function shouldAnimateRizzer({requested, isTTY, plain, reducedMotion} = {}) {
  return Boolean(requested && isTTY && !plain && !reducedMotion);
}

export async function playRizzerCameo({
  output = process.stdout, plain = false, reducedMotion = false, animate = false,
  color = true, wait = ms => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  const enabled = shouldAnimateRizzer({
    requested: animate, isTTY: Boolean(output.isTTY), plain, reducedMotion
  });
  const poses = enabled ? ['investigating', 'surprised', 'celebrating', 'smug'] : ['smug'];
  for (const [index, pose] of poses.entries()) {
    if (enabled) output.write('\x1b[H\x1b[2J');
    output.write(renderRizzer({pose, plain, color: color && Boolean(output.isTTY)}) +
      (index === poses.length - 1 ? '' : '\n'));
    if (index < poses.length - 1) await wait(160);
  }
}
