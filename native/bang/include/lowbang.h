// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#ifndef LOWBANG_H
#define LOWBANG_H
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
#define BANG_MAX_TEXT 96
#define BANG_MAX_CHANNEL 32
#define BANG_MAX_LANGUAGE 30
#define BANG_WINDOW 32
#define BANG_MAX_CHANNELS 16
#define BANG_MAX_SESSIONS 32
#define BANG_SIGNATURE_SIZE 64
// Canonical JSON signing model, NOT an on-air codec.
typedef enum { BANG_CAPTION = 1, BANG_SOUND = 2 } bang_kind;
typedef enum {
 BANG_OK = 0, BANG_INVALID, BANG_DISABLED, BANG_UNAUTHORIZED, BANG_EXPIRED,
 BANG_REPLAY, BANG_WINDOW_EXCEEDED, BANG_CAPACITY, BANG_CRYPTO_ERROR, BANG_NOT_READY
} bang_status;
typedef struct {
 uint8_t v;
 bang_kind kind;
 char channel[BANG_MAX_CHANNEL + 1];
 char language[BANG_MAX_LANGUAGE + 1];
 char session[33];
 uint64_t seq, captured_at_ms, expires_at_ms;
 char text[BANG_MAX_TEXT + 1];
 size_t text_len;
 uint8_t signature[BANG_SIGNATURE_SIZE];
} bang_event;
typedef struct bang_source bang_source;
typedef struct bang_receiver bang_receiver;
typedef struct {
 bool application_received, gap_reported;
 uint64_t missing_from, missing_through, waiting_for;
 size_t ready_count;
 bang_event ready[BANG_WINDOW];
} bang_delivery;
// Raw Ed25519 32-byte private seed, out-of-band provisioning.
// Session must be a unique 128-bit lowercase-hex identifier, starting at seq=1.
bang_source *bang_source_new(const char *channel, const char *language,
 const char *session, const uint8_t raw_private_key[32]);
void bang_source_free(bang_source *source);
bang_status bang_source_emit(bang_source *source, bang_kind kind,
 const char *text, uint64_t captured_at_ms, uint32_t ttl_ms, bang_event *out);
bang_receiver *bang_receiver_new(void);
void bang_receiver_free(bang_receiver *receiver);
bang_status bang_receiver_provision(bang_receiver *receiver,
 const char *channel, const uint8_t raw_public_key[32]);
void bang_receiver_enable(bang_receiver *receiver);
void bang_receiver_disable(bang_receiver *receiver);
bang_status bang_receiver_subscribe(bang_receiver *receiver, const char *channel);
void bang_receiver_unsubscribe(bang_receiver *receiver, const char *channel);
bang_status bang_receiver_receive(bang_receiver *receiver,
 const bang_event *event, uint64_t now_ms, bang_delivery *out);
// Caller schedules jitter timeout; missing text is reported, never invented.
bang_status bang_receiver_flush(bang_receiver *receiver,
 const char *channel, const char *session, uint64_t now_ms,
 uint32_t hold_ms, bang_delivery *out);
const char *bang_status_string(bang_status status);
#ifdef __cplusplus
}
#endif
#endif
