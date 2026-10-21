// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {RIZZER_POSES, renderRizzer, playRizzerCameo, shouldAnimateRizzer} from '../src/tui/rizzer.mjs';

test('mascot cameo has five deterministic expressions and plain text accessibility', () => {
  assert.equal(RIZZER_POSES.length, 5);
  for (const pose of RIZZER_POSES) {
    const normal = renderRizzer({pose});
    assert.match(normal, /RIZZER \/\//);
    assert.match(normal, /HOT PINK/);
    assert.match(normal, /LIME/);
    assert.doesNotMatch(normal, /\x1b/);
    const plain = renderRizzer({pose, plain:true, color:true});
    assert.match(plain, new RegExp('Rizzer \\(' + pose + '\\)'));
    assert.equal(plain.split('\n').length, 2);
    assert.doesNotMatch(plain, /\x1b/);
    assert.equal(normal, renderRizzer({pose}));
  }
  assert.throws(() => renderRizzer({pose:'../../shell'}), /unknown/);
});

test('animation only occurs by explicit opt-in on live terminal', () => {
  assert.equal(shouldAnimateRizzer({requested:true,isTTY:false,plain:false,reducedMotion:false}),false);
  assert.equal(shouldAnimateRizzer({requested:true,isTTY:true,plain:true,reducedMotion:false}),false);
  assert.equal(shouldAnimateRizzer({requested:true,isTTY:true,plain:false,reducedMotion:true}),false);
  assert.equal(shouldAnimateRizzer({requested:false,isTTY:true,plain:false,reducedMotion:false}),false);
  assert.equal(shouldAnimateRizzer({requested:true,isTTY:true,plain:false,reducedMotion:false}),true);
});

test('animated cameo has bounded four frames; static fallback never waits', async () => {
  const frames = [];
  const delays = [];
  await playRizzerCameo({output:{isTTY:true,write(x){frames.push(x);}},animate:true,
    color:false,wait:async ms=>{delays.push(ms);}});
  assert.equal(delays.length,3);
  assert.deepEqual(delays,[160,160,160]);
  assert.equal(frames.join('').match(/RIZZER \/\//g)?.length,4);
  assert.equal(frames.join('').match(/\x1b\[H\x1b\[2J/g)?.length,4);
  const fallback = [];
  await playRizzerCameo({output:{isTTY:false,write(x){fallback.push(x);}},animate:true,
    color:false,wait:async ()=>assert.fail('must not wait')});
  assert.equal(fallback.join('').match(/RIZZER \/\//g)?.length,1);
  assert.doesNotMatch(fallback.join(''), /\x1b/);
});

test('mesh TUI mascot CLI works without evidence and keeps reports isolated', () => {
  const cli = new URL('../src/tui/cli.mjs',import.meta.url).pathname;
  const view=execFileSync(process.execPath,[cli,'--mascot','--plain'],{encoding:'utf8'});
  assert.match(view,/Rizzer \(smug\): Two collars/);
  assert.doesNotMatch(view,/NOT measured RF paths|MISSING/);
  const piped=execFileSync(process.execPath,[cli,'--mascot','--animate'],{encoding:'utf8'});
  assert.match(piped,/Rizzer \(smug\): Two collars/);
  assert.doesNotMatch(piped,/\x1b/);
  const invalid=spawnSync(process.execPath,[cli,'--mascot','--report'],{encoding:'utf8'});
  assert.equal(invalid.status,2);
  assert.equal(invalid.stdout,'');
  assert.match(invalid.stderr,/Usage/);
});
