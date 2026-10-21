#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Reproducible *source-only* archive. Does not create/push tags, publish, or deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/release-check.mjs
if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Refusing release archive from dirty git worktree\n' >&2
  exit 1
fi
version="$(node -p 'require("./package.json").version')"
committed_version="$(git show HEAD:package.json | node -p 'JSON.parse(require("fs").readFileSync(0,"utf8")).version')"
if [[ "$version" != "$committed_version" ]]; then
  printf 'Refusing archive: worktree and HEAD package versions differ\n' >&2
  exit 1
fi
name="6lowstick-v${version}"
mkdir -p dist
archive="dist/${name}.tar.gz"
# Git archive ensures no local evidence, node_modules, or build output enters the tarball.
# gzip -n suppresses non-reproducible name and timestamp metadata.
git archive --format=tar --prefix="${name}/" HEAD | gzip -n -9 > "${archive}.tmp"
mv "${archive}.tmp" "${archive}"
(cd dist && sha256sum "${name}.tar.gz" > "${name}.tar.gz.sha256")
# Refuse to distribute if the archive gains local evidence or a generated tree.
if tar -tzf "$archive" | grep -E "^(${name})/(evidence|node_modules|dist)/" >/dev/null; then
  echo 'Refusing archive containing non-source local artifacts' >&2
  exit 1
fi
(cd dist && sha256sum -c "${name}.tar.gz.sha256")
node --input-type=module - "$archive" "${name}" <<'JS'
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const archive = process.argv[2];
const name = process.argv[3];
const sha = createHash('sha256').update(readFileSync(archive)).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const manifest = {
  schema: '6lowstick.source-release-provenance.v1',
  project: '6lowstick',
  version: name.slice('6lowstick-v'.length),
  source_commit: commit,
  source_archive: name + '.tar.gz',
  source_archive_sha256: sha,
  software_only: true,
  radio_hardware_tested: false,
  public_alert_dispatch: false,
  npm_package_published: false
};
writeFileSync(resolve('dist', name + '.provenance.json'),
  JSON.stringify(manifest, null, 2) + '\n');
console.log('Source bundle: ' + archive);
console.log('Commit: ' + commit);
console.log('SHA-256: ' + sha);
JS
