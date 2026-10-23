// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#include "s6_reactor.h"
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <stdio.h>
#include <string.h>

static bool valid_name(const char *p) {
    if (!p) return false;
    size_t n = 0;
    for (; p[n]; ++n) {
        if (n >= 32) return false;
        char c = p[n];
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
              (c >= '0' && c <= '9') || c == '-' || c == '_')) return false;
    }
    return n > 0;
}
static bool valid_nonce(const char *p) {
    if (!p || strlen(p) != 24) return false;
    for (size_t i = 0; i < 24; ++i) {
        if (!((p[i] >= '0' && p[i] <= '9') || (p[i] >= 'a' && p[i] <= 'f'))) return false;
    }
    return true;
}
static bool tag(const unsigned char *key, size_t n, const char *body, char hex[33]) {
    if (!key || n == 0 || n > 4096 || !body) return false;
    unsigned char digest[EVP_MAX_MD_SIZE];
    unsigned int size = 0;
    if (!HMAC(EVP_sha256(), key, (int)n, (const unsigned char *)body,
              strlen(body), digest, &size) || size < 16) return false;
    for (int i = 0; i < 16; ++i) snprintf(&hex[2 * i], 3, "%02x", digest[i]);
    hex[32] = '\0';
    OPENSSL_cleanse(digest, sizeof(digest));
    return true;
}
static bool wire_from_body(const unsigned char *key, size_t key_len,
                            const char *body, char out[S6_MAX_WIRE]) {
    char hex[33];
    if (!tag(key, key_len, body, hex)) return false;
    int len = snprintf(out, S6_MAX_WIRE, "%s|%s", body, hex);
    return len > 0 && len < S6_MAX_WIRE;
}
static bool compare_wire(const unsigned char *key, size_t n,
                         const char *body, const char *wire) {
    if (!wire) return false;
    size_t length = strnlen(wire, S6_MAX_WIRE);
    if (length == S6_MAX_WIRE) return false;
    char expected[S6_MAX_WIRE] = {0};
    if (!wire_from_body(key, n, body, expected)) return false;
    size_t wanted = strlen(expected);
    return length == wanted && CRYPTO_memcmp(expected, wire, wanted) == 0;
}
bool s6_random_nonce(void *ignored, char out[25]) {
    (void)ignored;
    if (!out) return false;
    unsigned char bytes[12];
    if (RAND_bytes(bytes, sizeof(bytes)) != 1) return false;
    for (size_t i = 0; i < sizeof(bytes); ++i) snprintf(&out[i * 2], 3, "%02x", bytes[i]);
    out[24] = '\0';
    return true;
}
bool s6_sign_alert(const unsigned char *key, size_t n, const char *id,
                   char out[S6_MAX_WIRE]) {
    if (!valid_name(id) || !out) return false;
    char body[64];
    snprintf(body, sizeof(body), "EA2|%s|NOTIFY", id);
    return wire_from_body(key, n, body, out);
}
bool s6_verify_alert(const unsigned char *key, size_t n, const char *wire) {
    if (!wire || strncmp(wire, "EA2|", 4) != 0) return false;
    const char *begin = wire + 4;
    const char *end = strchr(begin, '|');
    if (!end || (size_t)(end - begin) > 32) return false;
    char id[33];
    size_t size = (size_t)(end - begin);
    memcpy(id, begin, size);
    id[size] = '\0';
    if (!valid_name(id)) return false;
    char body[64];
    snprintf(body, sizeof(body), "EA2|%s|NOTIFY", id);
    return compare_wire(key, n, body, wire);
}
bool s6_sign_receipt(const unsigned char *key, size_t n, const char *id,
                     const char *receiver, const char *nonce, char out[S6_MAX_WIRE]) {
    if (!valid_name(id) || !valid_name(receiver) || !valid_nonce(nonce) || !out) return false;
    char body[128];
    int len = snprintf(body, sizeof(body), "R2|%s|%s|%s", id, receiver, nonce);
    return len > 0 && len < (int)sizeof(body) && wire_from_body(key, n, body, out);
}
bool s6_verify_receipt(const unsigned char *key, size_t n, const char *id,
                       const char *receiver, const char *nonce, const char *wire) {
    if (!valid_name(id) || !valid_name(receiver) || !valid_nonce(nonce)) return false;
    char body[128];
    int len = snprintf(body, sizeof(body), "R2|%s|%s|%s", id, receiver, nonce);
    return len > 0 && len < (int)sizeof(body) && compare_wire(key, n, body, wire);
}
bool s6_deliver(const unsigned char *key, size_t key_len, const char *id,
                const char *receiver, bool drill, s6_nonce_fn nonce, void *nonce_handle,
                s6_dispatch_fn dispatch, void *dispatch_handle, s6_report_t *report) {
    if (!report || !drill || !valid_name(id) || !valid_name(receiver) ||
        !key || key_len == 0 || key_len > 4096 || !nonce || !dispatch) return false;
    char wire[S6_MAX_WIRE];
    if (!s6_sign_alert(key, key_len, id, wire)) return false;
    *report = (s6_report_t){.simulation = true, .status = "unconfirmed"};
    const char *routes[S6_MAX_ATTEMPTS] = {"thread", "lora-p2p"};
    char previous[25] = {0};
    for (int i = 0; i < S6_MAX_ATTEMPTS; ++i) {
        char challenge[25] = {0};
        if (!nonce(nonce_handle, challenge) || !valid_nonce(challenge) ||
            (i > 0 && strcmp(challenge, previous) == 0)) return false;
        memcpy(previous, challenge, sizeof(previous));
        char response[S6_MAX_WIRE] = {0};
        s6_link_result_t link = dispatch(dispatch_handle, routes[i], wire, id,
                                          receiver, challenge, response);
        const char *outcome = "no_authenticated_receipt";
        if (link == S6_LINK_ERROR) {
            outcome = "transport_error";
        } else if (link != S6_LINK_RESPONSE) {
            return false;
        } else if (response[0]) {
            outcome = s6_verify_receipt(key, key_len, id, receiver, challenge, response)
                ? "authenticated_app_receipt" : "invalid_app_receipt";
        }
        report->attempts[report->count++] = (s6_attempt_t){routes[i], outcome};
        if (strcmp(outcome, "authenticated_app_receipt") == 0) {
            report->status = "app_acknowledged";
            report->confirmed_route = routes[i];
            break;
        }
    }
    return true;
}
