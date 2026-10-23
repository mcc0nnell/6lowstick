// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#ifndef LOW_REACTOR_H
#define LOW_REACTOR_H
#include <stdint.h>
#include <stdbool.h>

// A normalized, caller-provided observation. This is NOT an authenticated
// Spinel decoder, OpenThread API binding, RF driver or evidence of device action.
#define LOW_REACTOR_SERVICE_NAME "org.mcc0nnell.6lowreactor.observer"
#define LOW_REACTOR_SERVICE_VERSION "1.0.0"
#define LOW_REACTOR_MAX_SOURCES 16
#define LOW_REACTOR_MAX_AGE_MS 60000U
#define LOW_REACTOR_STALE_MS 30000U

typedef enum {
    LOW_REACTOR_OT_SNAPSHOT = 1,
    LOW_REACTOR_SPINEL_SNAPSHOT = 2,
} low_reactor_kind_t;

typedef struct {
    uint32_t source_id;       // nonzero opaque per-input source assigned by caller
    uint64_t sequence;        // monotonically increasing per source; never wraps
    uint64_t observed_ms;     // monotonic milliseconds from same trusted local clock
    uint32_t channel;         // 802.15.4 channel 11..26
    int32_t rssi_dbm;         // normalized synthetic/observed RSSI -120..0
    uint32_t lqi;             // normalized 0..255; not calibrated between radios
    low_reactor_kind_t kind;
} low_reactor_observation_t;

typedef enum {
    LOW_REACTOR_ACCEPTED = 0,
    LOW_REACTOR_DENIED_INVALID = 1,
    LOW_REACTOR_DENIED_STALE = 2,
    LOW_REACTOR_DENIED_REPLAY = 3,
    LOW_REACTOR_DENIED_CAPACITY = 4
} low_reactor_result_t;

typedef struct {
    bool occupied;
    uint32_t source_id;
    uint64_t sequence;
    uint64_t observed_ms;
    uint32_t channel;
    int32_t rssi_dbm;
    uint32_t lqi;
    low_reactor_kind_t kind;
} low_reactor_source_t;

typedef struct {
    low_reactor_source_t sources[LOW_REACTOR_MAX_SOURCES];
    uint64_t accepted;
    uint64_t denied;
} low_reactor_state_t;

typedef enum {
    LOW_REACTOR_NO_EVIDENCE = 0,
    LOW_REACTOR_NOMINAL_OBSERVATIONS = 1,
    LOW_REACTOR_DEGRADED_OBSERVATIONS = 2,
    LOW_REACTOR_STALE_OBSERVATIONS = 3
} low_reactor_advisory_t;

typedef struct {
    uint32_t sources_known;
    uint32_t sources_fresh;
    uint32_t sources_degraded;
    uint64_t observations_accepted;
    uint64_t observations_denied;
    low_reactor_advisory_t advisory;
    // Explicit proof limits: these are always false, independent of input.
    bool physical_rf_verified;
    bool delivery_verified;
    bool human_received;
} low_reactor_snapshot_t;

void low_reactor_init(low_reactor_state_t *state);
low_reactor_result_t low_reactor_ingest(low_reactor_state_t *state,
    const low_reactor_observation_t *observation, uint64_t now_monotonic_ms);
low_reactor_snapshot_t low_reactor_snapshot(const low_reactor_state_t *state,
    uint64_t now_monotonic_ms);

// Celix service functions are synchronous. The implementation serializes all
// calls internally; no network, shell, actuator or radio-control methods exist.
typedef struct {
    void *handle;
    low_reactor_result_t (*observe)(void *handle,
        const low_reactor_observation_t *observation, uint64_t now_monotonic_ms);
    low_reactor_snapshot_t (*snapshot)(void *handle, uint64_t now_monotonic_ms);
} low_reactor_observer_service_t;
#endif
