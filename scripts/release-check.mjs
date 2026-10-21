// SPDX-License-Identifier: Apache-2.0
// Release-candidate metadata gate. Never tags, deploys, or publishes software.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

export function validateReleaseMetadata(pkg, lock) {
  const errors = [];
  if (!/^0\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-rc\.(?:0|[1-9]\d*)$/.test(pkg.version ?? ''))
    errors.push('release version must be an experimental 0.x.y-rc.N');
  if (pkg.license !== 'Apache-2.0' || lock.packages?.['']?.license !== 'Apache-2.0')
    errors.push('package and lockfile root license must be Apache-2.0');
  if (pkg.name !== '6lowstick' || pkg.name !== lock.name)
    errors.push('package and lockfile names must match');
  if (pkg.version !== lock.version || pkg.version !== lock.packages?.['']?.version)
    errors.push('package and lockfile versions must match');
  if (pkg.private !== true) errors.push('npm publication must be disabled (private: true)');
  if (pkg.main && !existsSync(resolve(root, pkg.main)))
    errors.push('declared package entrypoint does not exist');
  if (pkg.engines?.node !== '>=22') errors.push('Node engine must require Node 22+');
  const dependencies = pkg.dependencies ?? {};
  for (const [name, version] of Object.entries(dependencies))
    if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(version))
      errors.push('non-exact dependency version for ' + name);
  if (JSON.stringify(dependencies) !== JSON.stringify(lock.packages?.['']?.dependencies ?? {}))
    errors.push('root dependency manifest does not match lockfile');
  return errors;
}

export function checkReleaseTree() {
  const errors = validateReleaseMetadata(read('package.json'), read('package-lock.json'));
  for (const path of [
    'README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md',
    'docs/release-candidate.md', 'docs/physical-radio-test-protocol.md',
    'docs/rizzer-spinel-fuzzing.md', 'docs/threat-model.md',
    'fixtures/spinel/reference-vectors.json', 'site/index.html'
  ]) if (!existsSync(resolve(root, path))) errors.push('missing release file: ' + path);
  const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8');
  for (const path of ['evidence/', 'dist/', 'node_modules/'])
    if (!ignore.split(/\r?\n/).some(line => line.trim() === path))
      errors.push('generated path not ignored: ' + path);
  const files = execFileSync('git', ['ls-files', '-z'], {
    cwd: root, encoding: 'utf8', timeout: 5000}).split('\0').filter(Boolean);
  for (const file of files)
    if (/^(?:evidence|dist|node_modules)\//.test(file))
      errors.push('generated/host-specific file tracked by git: ' + file);
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkReleaseTree();
  if (problems.length) {
    console.error(problems.map(x => 'RELEASE GATE FAILED: ' + x).join('\n'));
    process.exitCode = 1;
  } else {
    const pkg = read('package.json');
    console.log(JSON.stringify({status:'metadata_ok', version:pkg.version,
      source_only:true, operational_alerting:false, npm_publishable:false,
      checked_files:true, tracked_local_evidence:false}));
  }
}
