import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ReplayJournal} from './replay.mjs';
test('replay protection survives receiver journal reinitialization', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alert-replay-test-'));
  try {
    const path = join(dir, 'receiver.log');
    const first = new ReplayJournal(path);
    assert.equal(first.accept('drill001'), true);
    assert.equal(first.accept('drill001'), false);
    const restarted = new ReplayJournal(path);
    assert.equal(restarted.accept('drill001'), false);
    assert.equal(restarted.accept('drill002'), true);
    assert.equal(readFileSync(path, 'utf8'), 'drill001\ndrill002\n');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
test('invalid IDs fail closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alert-replay-test-'));
  try { assert.throws(() => new ReplayJournal(join(dir, 'x')).accept('../bad')); }
  finally { rmSync(dir, {recursive: true, force: true}); }
});
