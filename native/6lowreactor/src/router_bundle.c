// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Read-only demo result; no shell command can originate alerts from this module.
#include "s6_reactor.h"
#include <celix_api.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    celix_bundle_context_t *ctx;
} router_data_t;
typedef struct {
    const char *route;
    const char *wire;
    const char *id;
    const char *receiver;
    const char *nonce;
    char *response;
    s6_link_result_t result;
} use_data_t;

static void use_radio(void *handle, void *service) {
    use_data_t *u = handle;
    s6_radio_service_t *radio = service;
    if (radio && radio->transmit)
        u->result = radio->transmit(radio->handle, u->route, u->wire,
                                   u->id, u->receiver, u->nonce, u->response);
}
static s6_link_result_t celix_dispatch(void *handle, const char *route,
                                      const char *wire, const char *id,
                                      const char *receiver, const char *nonce,
                                      char response[S6_MAX_WIRE]) {
    router_data_t *data = handle;
    use_data_t user = {route, wire, id, receiver, nonce, response, S6_LINK_RESPONSE};
    char filter[64];
    snprintf(filter, sizeof(filter), "(%s=%s)", S6_RADIO_ROUTE_PROPERTY, route);
    celix_service_use_options_t opts = CELIX_EMPTY_SERVICE_USE_OPTIONS;
    opts.filter.serviceName = S6_RADIO_SERVICE;
    opts.filter.filter = filter;
    opts.callbackHandle = &user;
    opts.use = use_radio;
    // With no registered service, the result is "unconfirmed", not delivered.
    (void)celix_bundleContext_useServiceWithOptions(data->ctx, &opts);
    return user.result;
}
static celix_status_t router_start(router_data_t *data, celix_bundle_context_t *ctx) {
    data->ctx = ctx;
    unsigned char key[32];
    memset(key, 6, sizeof(key)); // synthetic fixture only
    s6_report_t report;
    if (!s6_deliver(key, sizeof(key), "celix_demo", "haptic", true,
                    s6_random_nonce, NULL, celix_dispatch, data, &report))
        return CELIX_BUNDLE_EXCEPTION;
    printf("6lowReactor CELIX simulation: %s (radio=false, human=false)\n", report.status);
    for (int i = 0; i < report.count; ++i)
        printf("  %s: %s\n", report.attempts[i].route, report.attempts[i].outcome);
    return CELIX_SUCCESS;
}
static celix_status_t router_stop(router_data_t *data, celix_bundle_context_t *ctx) {
    (void)data; (void)ctx;
    return CELIX_SUCCESS;
}
CELIX_GEN_BUNDLE_ACTIVATOR(router_data_t, router_start, router_stop)
