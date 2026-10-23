#!/usr/bin/env bash
# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
# Opt-in native OpenThread C UDP trial. No RF hardware.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "$(printenv BANG_NATIVE_OT_CLI || true)" ]]; then
    [[ "$BANG_NATIVE_OT_CLI" = /* && -x "$BANG_NATIVE_OT_CLI" ]] || {
        echo "BANG_NATIVE_OT_CLI must be an absolute executable" >&2
        exit 2
    }
    exec node experiments/bang/native-ot-lab.mjs
fi
if [[ -z "$(printenv OT_SOURCE || true)" ||
      -z "$(printenv OT_EXPECTED_REV || true)" ]]; then
    echo "Set OT_SOURCE and its pinned OT_EXPECTED_REV to build a native trial" >&2
    exit 2
fi
[[ "$OT_SOURCE" = /* && -f "$OT_SOURCE/CMakeLists.txt" ]] || {
    echo "OT_SOURCE must be an absolute OpenThread checkout" >&2
    exit 2
}
[[ "$OT_EXPECTED_REV" =~ ^[0-9a-f]{40}$ ]] || {
    echo "OT_EXPECTED_REV must be a full 40-character SHA" >&2
    exit 2
}
actual="$(git -C "$OT_SOURCE" rev-parse HEAD)"
[[ "$actual" == "$OT_EXPECTED_REV" ]] || {
    echo "OpenThread revision mismatch: $actual" >&2
    exit 2
}
[[ -z "$(git -C "$OT_SOURCE" status --porcelain)" ]] || {
    echo "OpenThread checkout is dirty" >&2
    exit 2
}
build="$(mktemp -d)"
trap 'rm -rf -- "$build"' EXIT
cmake -S "$OT_SOURCE" -B "$build" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DOT_PLATFORM=simulation -DOT_FTD=ON -DOT_RCP=ON -DOT_MTD=OFF \
    -DOT_APP_CLI=ON -DOT_BUILD_EXECUTABLES=ON -DOT_BUILD_GTEST=OFF \
    -DOT_CLI_VENDOR_EXTENSION="$(pwd)/native/bang/openthread/vendor-extension.cmake"
cmake --build "$build" --target ot-cli-ftd --parallel 2
BANG_NATIVE_OT_CLI="$build/examples/apps/cli/ot-cli-ftd" \
  node experiments/bang/native-ot-lab.mjs
