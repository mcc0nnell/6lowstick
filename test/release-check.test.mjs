// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReleaseMetadata, checkReleaseTree} from '../scripts/release-check.mjs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
const clone = value => structuredClone(value);

test('source release candidate metadata agrees with committed source policy', () => {
  assert.deepEqual(validateReleaseMetadata(pkg, lock), []);
  assert.deepEqual(checkReleaseTree(), []);
});

test('reject 1.0/stable version, accidental publication and missing entry point', () => {
  const version = clone(pkg); version.version = '1.0.0';
  assert.match(validateReleaseMetadata(version, lock).join(' '), /experimental/);
  const published = clone(pkg); published.private = false;
  assert.match(validateReleaseMetadata(published, lock).join(' '), /publication/);
  const entry = clone(pkg); entry.main = 'nonexistent-release-entrypoint.js';
  assert.match(validateReleaseMetadata(entry, lock).join(' '), /entrypoint/);
});

test('reject inconsistent lockfile license/version and non-exact dependencies', () => {
  const incorrect = clone(lock); incorrect.packages[''].license = 'ISC';
  incorrect.packages[''].version = '0.9.9';
  const errors = validateReleaseMetadata(pkg, incorrect).join(' ');
  assert.match(errors, /Apache-2.0/);
  assert.match(errors, /versions must match/);
  const deps = clone(pkg); deps.dependencies['@matter/main'] = '^0.18.0';
  assert.match(validateReleaseMetadata(deps, lock).join(' '), /non-exact/);
});
