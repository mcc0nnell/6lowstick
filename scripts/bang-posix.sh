#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Explicit opt-in simulated-radio test; NEVER executes without OT_CLI_PATH.
set -eo pipefail
cd "$(dirname "$0")/.."
if [[ -z "$OT_CLI_PATH" || ! -x "$OT_CLI_PATH" ]]; then
  echo "OT_CLI_PATH must be an absolute executable OpenThread POSIX CLI" >&2
  exit 2
fi
case "$OT_CLI_PATH" in /*) ;; *) echo "OT_CLI_PATH must be absolute" >&2; exit 2 ;; esac
build="$(mktemp -d)"
trap 'rm -rf -- "$build"' EXIT
cmake -S native/bang -B "$build" -DCMAKE_BUILD_TYPE=Debug > /dev/null
cmake --build "$build" --target lowbang-posix-codec -j2 > /dev/null
"$build/lowbang-posix-codec" selftest
BANG_THREAD_CODEC="$build/lowbang-posix-codec" node experiments/bang/posix-lab.mjs
