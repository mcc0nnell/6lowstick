// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#include "low_reactor.h"
#include <string.h>
#include <limits.h>

void low_reactor_init(low_reactor_state_t *state) {
    if (state != NULL) memset(state, 0, sizeof(*state));
}

static bool observation_valid(const low_reactor_observation_t *o) {
    return o != NULL && o->source_id != 0 && o->sequence != 0 &&
        (o->kind == LOW_REACTOR_OT_SNAPSHOT || o->kind == LOW_REACTOR_SPINEL_SNAPSHOT) &&
        o->channel >= 11 && o->channel <= 26 &&
        o->rssi_dbm >= -120 && o->rssi_dbm <= 0 && o->lqi <= 255;
}

low_reactor_result_t low_reactor_ingest(low_reactor_state_t *s,
    const low_reactor_observation_t *o, uint64_t now) {
    if (s == NULL) return LOW_REACTOR_DENIED_INVALID;
    low_reactor_result_t reject = LOW_REACTOR_ACCEPTED;
    if (!observation_valid(o)) reject = LOW_REACTOR_DENIED_INVALID;
    // All timestamps are in the caller's monotonic clock domain. Future data,
    // including small skew, is rejected; do not silently promote freshness.
    else if (o->observed_ms > now || now - o->observed_ms > LOW_REACTOR_MAX_AGE_MS)
        reject = LOW_REACTOR_DENIED_STALE;
    if (reject != LOW_REACTOR_ACCEPTED) {
        if (s->denied != UINT64_MAX) s->denied++;
        return reject;
    }

    int found = -1, free_slot = -1;
    for (int i = 0; i < LOW_REACTOR_MAX_SOURCES; ++i) {
        if (s->sources[i].occupied && s->sources[i].source_id == o->source_id) {
            found = i; break;
        }
        if (!s->sources[i].occupied && free_slot == -1) free_slot = i;
    }
    if (found >= 0 && (o->sequence <= s->sources[found].sequence ||
                       o->observed_ms < s->sources[found].observed_ms)) {
        reject = LOW_REACTOR_DENIED_REPLAY;
    } else if (found < 0 && free_slot < 0) reject = LOW_REACTOR_DENIED_CAPACITY;
    if (reject != LOW_REACTOR_ACCEPTED) {
        if (s->denied != UINT64_MAX) s->denied++;
        return reject;
    }
    low_reactor_source_t *entry = &s->sources[found >= 0 ? found : free_slot];
    *entry = (low_reactor_source_t) {
        .occupied = true, .source_id = o->source_id, .sequence = o->sequence,
        .observed_ms = o->observed_ms, .channel = o->channel,
        .rssi_dbm = o->rssi_dbm, .lqi = o->lqi, .kind = o->kind
    };
    if (s->accepted != UINT64_MAX) s->accepted++;
    return LOW_REACTOR_ACCEPTED;
}

low_reactor_snapshot_t low_reactor_snapshot(const low_reactor_state_t *s,
    uint64_t now) {
    low_reactor_snapshot_t result = {0};
    if (s == NULL) return result;
    result.observations_accepted = s->accepted;
    result.observations_denied = s->denied;
    for (int i=0; i<LOW_REACTOR_MAX_SOURCES; ++i) {
        const low_reactor_source_t *source = &s->sources[i];
        if (!source->occupied) continue;
        result.sources_known++;
        if (source->observed_ms > now ||
            now - source->observed_ms > LOW_REACTOR_STALE_MS) continue;
        result.sources_fresh++;
        // Qualitative model threshold only, not an RF-derived failure rate.
        if (source->lqi < 60 || source->rssi_dbm < -90) result.sources_degraded++;
    }
    if (result.sources_known == 0) result.advisory = LOW_REACTOR_NO_EVIDENCE;
    else if (result.sources_fresh < result.sources_known)
        result.advisory = LOW_REACTOR_STALE_OBSERVATIONS;
    else if (result.sources_degraded > 0)
        result.advisory = LOW_REACTOR_DEGRADED_OBSERVATIONS;
    else result.advisory = LOW_REACTOR_NOMINAL_OBSERVATIONS;
    return result;
}
