// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Celix implementation for a read-only, caller-fed observation service.
// No autonomous radio polling, hardware, dispatch, commands or AI execution.
#include "low_reactor.h"
#include <celix_bundle_activator.h>
#include <pthread.h>
#include <stdlib.h>

typedef struct {
    low_reactor_state_t model;
    pthread_mutex_t mutex;
    low_reactor_observer_service_t service;
    long service_id;
    bool mutex_initialized;
} low_reactor_activator_t;

static low_reactor_result_t observe(void *handle,
    const low_reactor_observation_t *observation, uint64_t now) {
    low_reactor_activator_t *a = handle;
    if (a == NULL) return LOW_REACTOR_DENIED_INVALID;
    pthread_mutex_lock(&a->mutex);
    low_reactor_result_t result = low_reactor_ingest(&a->model, observation, now);
    pthread_mutex_unlock(&a->mutex);
    return result;
}

static low_reactor_snapshot_t snapshot(void *handle, uint64_t now) {
    low_reactor_activator_t *a = handle;
    if (a == NULL) return (low_reactor_snapshot_t){0};
    pthread_mutex_lock(&a->mutex);
    low_reactor_snapshot_t result = low_reactor_snapshot(&a->model, now);
    pthread_mutex_unlock(&a->mutex);
    return result;
}

static celix_status_t start(low_reactor_activator_t *a, celix_bundle_context_t *ctx) {
    a->service_id = -1L;
    if (pthread_mutex_init(&a->mutex, NULL) != 0) return CELIX_BUNDLE_EXCEPTION;
    a->mutex_initialized = true;
    low_reactor_init(&a->model);
    a->service = (low_reactor_observer_service_t){
        .handle = a, .observe = observe, .snapshot = snapshot
    };
    a->service_id = celix_bundleContext_registerService(ctx, &a->service,
        LOW_REACTOR_SERVICE_NAME, NULL);
    if (a->service_id < 0) {
        pthread_mutex_destroy(&a->mutex);
        a->mutex_initialized = false;
        return CELIX_BUNDLE_EXCEPTION;
    }
    return CELIX_SUCCESS;
}

static celix_status_t stop(low_reactor_activator_t *a, celix_bundle_context_t *ctx) {
    if (a->service_id >= 0) {
        celix_bundleContext_unregisterService(ctx, a->service_id);
        a->service_id = -1L;
    }
    if (a->mutex_initialized) {
        pthread_mutex_destroy(&a->mutex);
        a->mutex_initialized = false;
    }
    return CELIX_SUCCESS;
}

CELIX_GEN_BUNDLE_ACTIVATOR(low_reactor_activator_t, start, stop)
