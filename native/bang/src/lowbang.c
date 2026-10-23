// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Isolated C11 caption/event protocol: no audio, radio, I/O, dispatch or Celix dependency.
#include "lowbang.h"
#include <openssl/evp.h>
#include <openssl/crypto.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define BANG_MAX_SAFE_INTEGER UINT64_C(9007199254740991)
#define BANG_MAX_TTL_MS 30000u
#define BANG_MAX_HOLD_MS 5000u
#define BANG_FUTURE_SKEW_MS UINT64_C(5000)
#define BANG_MESSAGE_CAP 512
struct bang_source {
 char channel[BANG_MAX_CHANNEL + 1];
 char language[BANG_MAX_LANGUAGE + 1];
 char session[33];
 uint64_t seq;
 EVP_PKEY *key;
};
typedef struct {
 char id[BANG_MAX_CHANNEL + 1];
 EVP_PKEY *key;
 bool subscribed;
} channel_state;
typedef struct {
 bool present;
 uint64_t observed_at;
 bang_event event;
} pending_entry;
typedef struct {
 bool active;
 char channel[BANG_MAX_CHANNEL + 1];
 char session[33];
 uint64_t next;
 uint64_t until;
 pending_entry pending[BANG_WINDOW];
} session_state;
struct bang_receiver {
 bool enabled;
 size_t channel_count;
 channel_state channels[BANG_MAX_CHANNELS];
 session_state sessions[BANG_MAX_SESSIONS];
};
static size_t bounded_strlen(const char *s, size_t max) {
 size_t n = 0; while (n < max && s[n]) n++; return n;
}
static bool ascii_alnum(char c) {
 return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
}
static bool is_channel(const char *s) {
 if (!s) return false;
 size_t n = bounded_strlen(s, BANG_MAX_CHANNEL + 1);
 if (n == 0 || n > BANG_MAX_CHANNEL || s[0] < 'a' || s[0] > 'z') return false;
 for (size_t i = 1; i < n; i++)
  if (!((s[i] >= 'a' && s[i] <= 'z') || (s[i] >= '0' && s[i] <= '9') || s[i] == '-')) return false;
 return true;
}
static bool is_language(const char *s) {
 if (!s) return false;
 size_t n = bounded_strlen(s, BANG_MAX_LANGUAGE + 1), i = 0;
 if (n < 2 || n > BANG_MAX_LANGUAGE) return false;
 while (i < n && s[i] >= 'a' && s[i] <= 'z') i++;
 if (i < 2 || i > 3) return false;
 unsigned parts = 0;
 while (i < n) {
  if (s[i++] != '-' || ++parts > 3) return false;
  size_t start = i;
  while (i < n && ascii_alnum(s[i])) i++;
  if (i - start < 2 || i - start > 8) return false;
 }
 return true;
}
// Session is a fixed 128-bit lowercase hex string.
static bool is_session(const char *s) {
 if (!s || bounded_strlen(s, 33) != 32) return false;
 for (size_t i = 0; i < 32; i++)
  if (!((s[i] >= '0' && s[i] <= '9') || (s[i] >= 'a' && s[i] <= 'f'))) return false;
 return true;
}
// Strict UTF-8, no ASCII control chars, never silently truncate a caption.
static bool valid_utf8_text(const char *s, size_t *len_out) {
 if (!s) return false;
 size_t n = bounded_strlen(s, BANG_MAX_TEXT + 1);
 if (n == 0 || n > BANG_MAX_TEXT) return false;
 bool substantive = false;
 for (size_t i = 0; i < n;) {
  unsigned char c = (unsigned char)s[i];
  if (c < 0x20 || c == 0x7f) return false;
  if (c < 0x80) {
   if (c != ' ' && c != '\t') substantive = true;
   i++; continue;
  }
  size_t remain = n - i;
  unsigned need = c >= 0xc2 && c <= 0xdf ? 2 : c >= 0xe0 && c <= 0xef ? 3 : c >= 0xf0 && c <= 0xf4 ? 4 : 0;
  if (!need || remain < need) return false;
  for (unsigned j = 1; j < need; j++) if (((unsigned char)s[i+j] & 0xc0) != 0x80) return false;
  unsigned char b = (unsigned char)s[i+1];
  if ((c == 0xe0 && b < 0xa0) || (c == 0xed && b >= 0xa0) ||
      (c == 0xf0 && b < 0x90) || (c == 0xf4 && b > 0x8f)) return false;
  substantive = true; i += need;
 }
 if (!substantive) return false;
 *len_out = n;
 return true;
}
// Exact compatibility with JSON.stringify([1,kind,channel,language,session,
// seq,capturedAt,expiresAt,text]) under the 6lowBang:v1: domain separator.
typedef struct { char *data; size_t used, capacity; bool good; } writer;
static void append(writer *w, const char *s, size_t n) {
 if (!w->good || n > w->capacity - w->used) { w->good = false; return; }
 memcpy(w->data + w->used, s, n); w->used += n;
}
static void literal(writer *w, const char *s) { append(w, s, strlen(s)); }
static void number(writer *w, uint64_t n) {
 char buf[32]; int k = snprintf(buf, sizeof(buf), "%" PRIu64, n);
 if (k < 0 || k >= (int)sizeof(buf)) { w->good = false; return; }
 append(w, buf, (size_t)k);
}
static void quoted(writer *w, const char *s) {
 literal(w, "\"");
 for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
  if (*p == '"') literal(w, "\\\"");
  else if (*p == '\\') literal(w, "\\\\");
  else append(w, (const char *)p, 1);
 }
 literal(w, "\"");
}
static bool make_payload(const bang_event *f, char output[BANG_MESSAGE_CAP], size_t *length) {
 writer w = {output, 0, BANG_MESSAGE_CAP, true};
 literal(&w, "6lowBang:v1:[1,");
 quoted(&w, f->kind == BANG_CAPTION ? "caption" : "sound"); literal(&w, ",");
 quoted(&w, f->channel); literal(&w, ",");
 quoted(&w, f->language); literal(&w, ",");
 quoted(&w, f->session); literal(&w, ",");
 number(&w, f->seq); literal(&w, ",");
 number(&w, f->captured_at_ms); literal(&w, ",");
 number(&w, f->expires_at_ms); literal(&w, ",");
 quoted(&w, f->text); literal(&w, "]");
 *length = w.used;
 return w.good;
}
static bool valid_event(const bang_event *f) {
 if (!f || f->v != 1 || (f->kind != BANG_CAPTION && f->kind != BANG_SOUND) ||
     !is_channel(f->channel) || !is_language(f->language) || !is_session(f->session) ||
     f->seq == 0 || f->seq > BANG_MAX_SAFE_INTEGER ||
     f->captured_at_ms > BANG_MAX_SAFE_INTEGER || f->expires_at_ms > BANG_MAX_SAFE_INTEGER ||
     f->expires_at_ms <= f->captured_at_ms ||
     f->expires_at_ms - f->captured_at_ms > BANG_MAX_TTL_MS) return false;
 size_t n = 0;
 return valid_utf8_text(f->text, &n) && f->text_len == n;
}
bang_source *bang_source_new(const char *channel, const char *language,
 const char *session, const uint8_t raw_private_key[32]) {
 if (!is_channel(channel) || !is_language(language) || !is_session(session) || !raw_private_key) return NULL;
 bang_source *s = calloc(1, sizeof(*s));
 if (!s) return NULL;
 s->key = EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519, NULL, raw_private_key, 32);
 if (!s->key) { free(s); return NULL; }
 strcpy(s->channel, channel);
 strcpy(s->language, language);
 strcpy(s->session, session);
 return s;
}
void bang_source_free(bang_source *s) {
 if (!s) return;
 EVP_PKEY_free(s->key); OPENSSL_cleanse(s, sizeof(*s)); free(s);
}
bang_status bang_source_emit(bang_source *s, bang_kind kind, const char *text,
 uint64_t now, uint32_t ttl, bang_event *out) {
 size_t n = 0;
 if (!s || !out || (kind != BANG_CAPTION && kind != BANG_SOUND) ||
     !valid_utf8_text(text, &n) || now > BANG_MAX_SAFE_INTEGER ||
     ttl == 0 || ttl > BANG_MAX_TTL_MS || now > BANG_MAX_SAFE_INTEGER - ttl ||
     s->seq >= BANG_MAX_SAFE_INTEGER) return BANG_INVALID;
 bang_event f = {0}; f.v = 1; f.kind = kind;
 strcpy(f.channel, s->channel); strcpy(f.language, s->language); strcpy(f.session, s->session);
 f.seq = s->seq + 1; f.captured_at_ms = now; f.expires_at_ms = now + ttl;
 memcpy(f.text, text, n + 1); f.text_len = n;
 char payload[BANG_MESSAGE_CAP]; size_t length = 0;
 if (!make_payload(&f, payload, &length)) return BANG_INVALID;
 EVP_MD_CTX *ctx = EVP_MD_CTX_new();
 if (!ctx) return BANG_CRYPTO_ERROR;
 size_t siglen = sizeof(f.signature);
 bool good = EVP_DigestSignInit(ctx, NULL, NULL, NULL, s->key) == 1 &&
  EVP_DigestSign(ctx, f.signature, &siglen, (const unsigned char *)payload, length) == 1 &&
  siglen == sizeof(f.signature);
 EVP_MD_CTX_free(ctx);
 if (!good) return BANG_CRYPTO_ERROR;
 s->seq++; *out = f; return BANG_OK;
}
bang_receiver *bang_receiver_new(void) { return calloc(1, sizeof(bang_receiver)); }
void bang_receiver_free(bang_receiver *r) {
 if (!r) return;
 for (size_t i = 0; i < r->channel_count; i++) EVP_PKEY_free(r->channels[i].key);
 OPENSSL_cleanse(r, sizeof(*r)); free(r);
}
bang_status bang_receiver_provision(bang_receiver *r,
 const char *channel, const uint8_t raw_public_key[32]) {
 if (!r || !is_channel(channel) || !raw_public_key) return BANG_INVALID;
 for (size_t i = 0; i < r->channel_count; i++)
  if (!strcmp(r->channels[i].id, channel)) return BANG_INVALID;
 if (r->channel_count >= BANG_MAX_CHANNELS) return BANG_CAPACITY;
 EVP_PKEY *key = EVP_PKEY_new_raw_public_key(EVP_PKEY_ED25519, NULL, raw_public_key, 32);
 if (!key) return BANG_CRYPTO_ERROR;
 channel_state *c = &r->channels[r->channel_count++];
 strcpy(c->id, channel); c->key = key; return BANG_OK;
}
void bang_receiver_enable(bang_receiver *r) { if (r) r->enabled = true; }
void bang_receiver_disable(bang_receiver *r) {
 if (!r) return;
 r->enabled = false;
 for (size_t i = 0; i < r->channel_count; i++) r->channels[i].subscribed = false;
 memset(r->sessions, 0, sizeof(r->sessions));
}
static channel_state *find_channel(bang_receiver *r, const char *channel) {
 if (!r || !channel) return NULL;
 for (size_t i = 0; i < r->channel_count; i++)
  if (!strcmp(r->channels[i].id, channel)) return &r->channels[i];
 return NULL;
}
bang_status bang_receiver_subscribe(bang_receiver *r, const char *channel) {
 if (!r || !r->enabled) return BANG_DISABLED;
 channel_state *c = find_channel(r, channel);
 if (!c) return BANG_UNAUTHORIZED;
 c->subscribed = true; return BANG_OK;
}
void bang_receiver_unsubscribe(bang_receiver *r, const char *channel) {
 channel_state *c = find_channel(r, channel);
 if (!c) return;
 c->subscribed = false;
 for (size_t i = 0; i < BANG_MAX_SESSIONS; i++)
  if (r->sessions[i].active && !strcmp(r->sessions[i].channel, channel))
   memset(&r->sessions[i], 0, sizeof(r->sessions[i]));
}
static void prune(bang_receiver *r, uint64_t now) {
 for (size_t i = 0; i < BANG_MAX_SESSIONS; i++)
  if (r->sessions[i].active && r->sessions[i].until <= now)
   memset(&r->sessions[i], 0, sizeof(r->sessions[i]));
}
static session_state *find_session(bang_receiver *r, const char *channel, const char *session) {
 for (size_t i = 0; i < BANG_MAX_SESSIONS; i++) {
  session_state *s = &r->sessions[i];
  if (s->active && !strcmp(s->channel, channel) && !strcmp(s->session, session)) return s;
 }
 return NULL;
}
static session_state *new_session(bang_receiver *r, const bang_event *f) {
 for (size_t i = 0; i < BANG_MAX_SESSIONS; i++) {
  session_state *s = &r->sessions[i];
  if (!s->active) {
   memset(s, 0, sizeof(*s)); s->active = true;
   strcpy(s->channel, f->channel); strcpy(s->session, f->session);
   s->next = 1; s->until = f->expires_at_ms; return s;
  }
 }
 return NULL;
}
static void drain(session_state *s, uint64_t now, bang_delivery *out) {
 for (;;) {
  pending_entry *p = NULL;
  for (size_t i = 0; i < BANG_WINDOW; i++)
   if (s->pending[i].present && s->pending[i].event.seq == s->next) { p = &s->pending[i]; break; }
  if (!p) break;
  if (p->event.expires_at_ms > now) out->ready[out->ready_count++] = p->event;
  memset(p, 0, sizeof(*p)); s->next++;
 }
 for (size_t i = 0; i < BANG_WINDOW; i++) if (s->pending[i].present) {
  out->waiting_for = s->next; break;
 }
}
bang_status bang_receiver_receive(bang_receiver *r, const bang_event *f,
 uint64_t now, bang_delivery *out) {
 if (!r || !out || !f) return BANG_INVALID;
 memset(out, 0, sizeof(*out));
 if (!r->enabled) return BANG_DISABLED;
 if (!valid_event(f) || now > BANG_MAX_SAFE_INTEGER) return BANG_INVALID;
 channel_state *channel = find_channel(r, f->channel);
 if (!channel || !channel->subscribed) return BANG_UNAUTHORIZED;
 if (f->expires_at_ms <= now) return BANG_EXPIRED;
 if (f->captured_at_ms > now && f->captured_at_ms - now > BANG_FUTURE_SKEW_MS) return BANG_INVALID;
 char msg[BANG_MESSAGE_CAP]; size_t length = 0;
 if (!make_payload(f, msg, &length)) return BANG_INVALID;
 EVP_MD_CTX *ctx = EVP_MD_CTX_new();
 if (!ctx) return BANG_CRYPTO_ERROR;
 int ok = EVP_DigestVerifyInit(ctx, NULL, NULL, NULL, channel->key);
 if (ok == 1) ok = EVP_DigestVerify(ctx, f->signature, BANG_SIGNATURE_SIZE,
  (const unsigned char *)msg, length);
 EVP_MD_CTX_free(ctx);
 if (ok != 1) return BANG_UNAUTHORIZED;
 prune(r, now);
 session_state *s = find_session(r, f->channel, f->session);
 if (!s) { s = new_session(r, f); if (!s) return BANG_CAPACITY; }
 if (f->seq < s->next) return BANG_REPLAY;
 if (f->seq - s->next >= BANG_WINDOW) return BANG_WINDOW_EXCEEDED;
 pending_entry *empty = NULL;
 for (size_t i = 0; i < BANG_WINDOW; i++) {
  if (s->pending[i].present && s->pending[i].event.seq == f->seq) return BANG_REPLAY;
  if (!s->pending[i].present && !empty) empty = &s->pending[i];
 }
 if (!empty) return BANG_CAPACITY;
 empty->present = true; empty->observed_at = now; empty->event = *f;
 if (f->expires_at_ms > s->until) s->until = f->expires_at_ms;
 out->application_received = true; drain(s, now, out); return BANG_OK;
}
bang_status bang_receiver_flush(bang_receiver *r, const char *channel,
 const char *session, uint64_t now, uint32_t hold, bang_delivery *out) {
 if (!r || !out) return BANG_INVALID;
 memset(out, 0, sizeof(*out));
 if (!r->enabled) return BANG_DISABLED;
 if (!is_channel(channel) || !is_session(session) || now > BANG_MAX_SAFE_INTEGER ||
     hold > BANG_MAX_HOLD_MS) return BANG_INVALID;
 channel_state *c = find_channel(r, channel);
 if (!c || !c->subscribed) return BANG_UNAUTHORIZED;
 prune(r, now);
 session_state *s = find_session(r, channel, session);
 if (!s) return BANG_NOT_READY;
 pending_entry *earliest = NULL;
 for (size_t i = 0; i < BANG_WINDOW; i++) {
  pending_entry *p = &s->pending[i];
  if (p->present && (!earliest || p->event.seq < earliest->event.seq)) earliest = p;
 }
 if (!earliest || earliest->event.seq <= s->next ||
     now < earliest->observed_at || now - earliest->observed_at < hold) return BANG_NOT_READY;
 out->gap_reported = true; out->missing_from = s->next; out->missing_through = earliest->event.seq - 1;
 s->next = earliest->event.seq; drain(s, now, out); return BANG_OK;
}
const char *bang_status_string(bang_status s) {
 switch (s) {
  case BANG_OK: return "ok";
  case BANG_INVALID: return "invalid";
  case BANG_DISABLED: return "disabled";
  case BANG_UNAUTHORIZED: return "unauthorized";
  case BANG_EXPIRED: return "expired";
  case BANG_REPLAY: return "replay";
  case BANG_WINDOW_EXCEEDED: return "window exceeded";
  case BANG_CAPACITY: return "capacity";
  case BANG_CRYPTO_ERROR: return "crypto error";
  case BANG_NOT_READY: return "not ready";
 }
 return "unknown";
}
