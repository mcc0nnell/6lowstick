// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Registered ONLY as a synthetic, non-hardware service.
#include "s6_reactor.h"
#include <celix_api.h>
#include <string.h>

#ifndef S6_MOCK_ROUTE
#error "S6_MOCK_ROUTE is required"
#endif
#ifndef S6_MOCK_ACK
#error "S6_MOCK_ACK is required"
#endif

typedef struct {
    s6_radio_service_t radio;
    long service_id;
} mock_data_t;

static s6_link_result_t mock_transmit(void *ignored, const char *route,
                                     const char *wire, const char *id,
                                     const char *receiver, const char *nonce,
                                     char response[S6_MAX_WIRE]) {
    (void)ignored;
    if (strcmp(route, S6_MOCK_ROUTE) != 0) return S6_LINK_ERROR;
    unsigned char key[32];
    memset(key, 6, sizeof(key)); // fixed test fixture; never a deployable key
    if (!s6_verify_alert(key, sizeof(key), wire)) return S6_LINK_RESPONSE;
#if S6_MOCK_ACK
    if (!s6_sign_receipt(key, sizeof(key), id, receiver, nonce, response))
        return S6_LINK_ERROR;
#else
    (void)id; (void)receiver; (void)nonce; (void)response;
#endif
    return S6_LINK_RESPONSE;
}
static celix_status_t mock_start(mock_data_t *data, celix_bundle_context_t *ctx) {
    data->radio.handle = data;
    data->radio.transmit = mock_transmit;
    celix_properties_t *props = celix_properties_create();
    if (!props) return CELIX_ENOMEM;
    celix_properties_set(props, S6_RADIO_ROUTE_PROPERTY, S6_MOCK_ROUTE);
    data->service_id = celix_bundleContext_registerService(
        ctx, &data->radio, S6_RADIO_SERVICE, props);
    return data->service_id >= 0 ? CELIX_SUCCESS : CELIX_BUNDLE_EXCEPTION;
}
static celix_status_t mock_stop(mock_data_t *data, celix_bundle_context_t *ctx) {
    if (data->service_id >= 0) celix_bundleContext_unregisterService(ctx, data->service_id);
    return CELIX_SUCCESS;
}
CELIX_GEN_BUNDLE_ACTIVATOR(mock_data_t, mock_start, mock_stop)
