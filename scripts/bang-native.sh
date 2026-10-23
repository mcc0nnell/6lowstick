#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Build in a temporary directory to preserve the source-release gate.
set -euo pipefail
cd "$(dirname "$0")/.."
build="$(mktemp -d)"
trap 'rm -rf "$build"' EXIT
cmake -S native/bang -B "$build" -DCMAKE_BUILD_TYPE=Debug
cmake --build "$build" --parallel
ctest --test-dir "$build" --output-on-failure
if [[ "$#" -ge 1 && "$1" == "--demo" ]]; then
  "$build/lowbang-demo"
fi
