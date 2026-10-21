#!/usr/bin/env bash
# Copyright 2026 Robert McConnell
# SPDX-License-Identifier: Apache-2.0
# Receive-only RTL-SDR experiment; no transmitter and no alert dispatch.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${NWR_FREQ_HZ:?Set NWR_FREQ_HZ to one of the seven NOAA Weather Radio frequencies in Hz}"
case "$NWR_FREQ_HZ" in
  162400000|162425000|162450000|162475000|162500000|162525000|162550000) ;;
  *) printf 'Unsupported NWR frequency: %s\n' "$NWR_FREQ_HZ" >&2; exit 2 ;;
esac
for tool in rtl_fm multimon-ng node; do
  command -v "$tool" >/dev/null || { printf 'Missing dependency: %s\n' "$tool" >&2; exit 127; }
done
# See docs/sdr-ingress.md. Filter decoder diagnostics in the Node observer.
rtl_fm -M fm -f "$NWR_FREQ_HZ" -s 22050 - \
  | multimon-ng -q -a EAS -t raw - \
  | node scripts/observe-nwr.mjs --frequency-hz "$NWR_FREQ_HZ" "$@"
