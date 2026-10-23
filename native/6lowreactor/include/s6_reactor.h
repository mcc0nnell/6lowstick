// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#ifndef S6_REACTOR_H
#define S6_REACTOR_H
#include <stdbool.h>
#include <stddef.h>

#define S6_RADIO_SERVICE "s6.lab.radio.v0"
#define S6_RADIO_ROUTE_PROPERTY "s6.route"
#define S6_MAX_WIRE 160
#define S6_MAX_ATTEMPTS 2

// Laboratory-only interface. Never attach real radios, dispatch, or actuators.
// The response may be empty; a successful transport is NOT an application ACK.
typedef enum { S6_LINK_RESPONSE = 0, S6_LINK_ERROR = 1 } s6_link_result_t;
typedef s6_link_result_t (*s6_dispatch_fn)(void *handle, const char *route,
    const char *wire, const char *id, const char *receiver, const char *nonce,
    char response[S6_MAX_WIRE]);
typedef bool (*s6_nonce_fn)(void *handle, char nonce[25]);

typedef struct {
    void *handle;
    s6_dispatch_fn transmit;
} s6_radio_service_t;

typedef struct {
    const char *route;
    const char *outcome;
} s6_attempt_t;

typedef struct {
    int count;
    s6_attempt_t attempts[S6_MAX_ATTEMPTS];
    const char *status;            // "app_acknowledged" or "unconfirmed"
    const char *confirmed_route;   // NULL when unconfirmed
    bool simulation;
    bool physical_radio_verified;
    bool human_acknowledged;
} s6_report_t;

bool s6_random_nonce(void *handle, char out[25]);
bool s6_sign_alert(const unsigned char *key, size_t key_len,
    const char *id, char out[S6_MAX_WIRE]);
bool s6_verify_alert(const unsigned char *key, size_t key_len, const char *wire);
bool s6_sign_receipt(const unsigned char *key, size_t key_len,
    const char *id, const char *receiver, const char *nonce, char out[S6_MAX_WIRE]);
bool s6_verify_receipt(const unsigned char *key, size_t key_len,
    const char *id, const char *receiver, const char *nonce, const char *wire);

// Fails closed on invalid input/nonces. Preserves JS fabric v0 route and receipt
// semantics; only a drill may dispatch. No encryption or durable replay journal.
bool s6_deliver(const unsigned char *key, size_t key_len, const char *id,
    const char *receiver, bool drill, s6_nonce_fn nonce, void *nonce_handle,
    s6_dispatch_fn dispatch, void *dispatch_handle, s6_report_t *report);
#endif
