// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#include "lowbang.h"
#include <openssl/evp.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#define CHECK(x) do { if (!(x)) { fprintf(stderr, "%s:%d: failed: %s\n", __FILE__, __LINE__, #x); return 1; } } while (0)
#define EQ(x, y) CHECK((x) == (y))
#define SESSION "abababababababababababababababab"
#define NOW 600000u
static uint8_t seed[32] = {1}, key[32], bad_seed[32] = {2};
static int setup(void) {
 EVP_PKEY *priv = EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519, NULL, seed, sizeof seed);
 CHECK(priv); size_t n = sizeof key;
 int ok = EVP_PKEY_get_raw_public_key(priv, key, &n);
 EVP_PKEY_free(priv); CHECK(ok == 1 && n == sizeof key); return 0;
}
static bang_source *source(void) { return bang_source_new("stage-a", "en", SESSION, seed); }
static bang_receiver *receiver(bool enable) {
 bang_receiver *r = bang_receiver_new();
 if (!r || bang_receiver_provision(r, "stage-a", key) != BANG_OK) return NULL;
 if (enable) { bang_receiver_enable(r); if (bang_receiver_subscribe(r, "stage-a") != BANG_OK) return NULL; }
 return r;
}
static int off_by_default(void) {
 bang_source *s = source(); bang_receiver *r = receiver(false); CHECK(s && r);
 bang_event f; bang_delivery d;
 EQ(bang_source_emit(s, BANG_CAPTION, "Welcome", NOW, 15000, &f), BANG_OK);
 EQ(bang_receiver_subscribe(r, "stage-a"), BANG_DISABLED);
 EQ(bang_receiver_receive(r, &f, NOW, &d), BANG_DISABLED);
 bang_receiver_enable(r);
 EQ(bang_receiver_receive(r, &f, NOW, &d), BANG_UNAUTHORIZED);
 EQ(bang_receiver_subscribe(r, "stage-a"), BANG_OK);
 EQ(bang_receiver_receive(r, &f, NOW, &d), BANG_OK);
 CHECK(d.application_received && d.ready_count == 1 && d.waiting_for == 0);
 EQ(bang_receiver_receive(r, &f, NOW + 1, &d), BANG_REPLAY);
 bang_receiver_disable(r);
 EQ(bang_receiver_receive(r, &f, NOW + 2, &d), BANG_DISABLED);
 bang_receiver_free(r); bang_source_free(s); return 0;
}
static int signed_ordering(void) {
 bang_source *s = source(); bang_receiver *r = receiver(true); CHECK(s && r);
 bang_event a,b; bang_delivery d;
 EQ(bang_source_emit(s, BANG_CAPTION, "Gates open", NOW, 15000, &a), BANG_OK);
 EQ(bang_source_emit(s, BANG_SOUND, "[APPLAUSE]", NOW + 1, 15000, &b), BANG_OK);
 EQ(bang_receiver_receive(r, &b, NOW + 2, &d), BANG_OK);
 CHECK(d.application_received && d.ready_count == 0 && d.waiting_for == 1);
 EQ(bang_receiver_receive(r, &a, NOW + 3, &d), BANG_OK);
 EQ(d.ready_count, 2);
 CHECK(d.ready[0].kind == BANG_CAPTION && d.ready[0].seq == 1);
 CHECK(d.ready[1].kind == BANG_SOUND && !strcmp(d.ready[1].text, "[APPLAUSE]"));
 CHECK(!d.gap_reported && d.waiting_for == 0);
 EQ(bang_receiver_receive(r, &b, NOW + 4, &d), BANG_REPLAY);
 bang_receiver_free(r); bang_source_free(s); return 0;
}
static int tamper_and_forgery(void) {
 bang_source *s = source(); bang_receiver *r = receiver(true);
 bang_source *fake = bang_source_new("stage-a", "en", SESSION, bad_seed);
 CHECK(s && r && fake);
 bang_event f, forged, mutant; bang_delivery d;
 EQ(bang_source_emit(s, BANG_CAPTION, "Hello", NOW, 15000, &f), BANG_OK);
 EQ(bang_source_emit(fake, BANG_CAPTION, "Fake", NOW, 15000, &forged), BANG_OK);
 EQ(bang_receiver_receive(r, &forged, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; strcpy(mutant.text, "Hallo"); mutant.text_len = 5;
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; mutant.seq++;
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; mutant.kind = BANG_SOUND;
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; strcpy(mutant.channel, "stage-b");
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; mutant.signature[0] ^= 1;
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_UNAUTHORIZED);
 mutant = f; mutant.text[1] = '\n';
 EQ(bang_receiver_receive(r, &mutant, NOW, &d), BANG_INVALID);
 EQ(bang_receiver_receive(r, &f, NOW, &d), BANG_OK);
 bang_receiver_free(r); bang_source_free(s); bang_source_free(fake); return 0;
}
static int bounds_and_clock(void) {
 bang_source *s = source(); bang_receiver *r = receiver(true); CHECK(s && r);
 bang_event f, x; bang_delivery d;
 EQ(bang_source_emit(s, BANG_CAPTION, "Hi", NOW, 1000, &f), BANG_OK);
 EQ(bang_receiver_receive(r, &f, NOW - 5001, &d), BANG_INVALID);
 EQ(bang_receiver_receive(r, &f, NOW + 1000, &d), BANG_EXPIRED);
 EQ(bang_receiver_receive(r, &f, NOW + 1, &d), BANG_OK);
 EQ(bang_source_emit(s, BANG_CAPTION, "Hello", NOW, 0, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "Hello", NOW, 30001, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "", NOW, 1, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "  ", NOW, 1, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "line\nbreak", NOW, 1, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "\xff", NOW, 1, &x), BANG_INVALID);
 char large[99]; memset(large, 'a', sizeof large - 1); large[98] = 0;
 EQ(bang_source_emit(s, BANG_CAPTION, large, NOW, 1, &x), BANG_INVALID);
 EQ(bang_source_emit(s, BANG_CAPTION, "He said \"go\\now\" •", NOW + 2, 1000, &x), BANG_OK);
 EQ(bang_receiver_receive(r, &x, NOW + 3, &d), BANG_OK);
 EQ(d.ready_count, 1);
 bang_receiver_free(r); bang_source_free(s); return 0;
}
static int loss_and_flush(void) {
 bang_source *s = source(); bang_receiver *r = receiver(true); CHECK(s && r);
 bang_event a,b; bang_delivery d;
 EQ(bang_source_emit(s, BANG_CAPTION, "not delivered", NOW, 15000, &a), BANG_OK);
 EQ(bang_source_emit(s, BANG_CAPTION, "received", NOW + 10, 15000, &b), BANG_OK);
 EQ(bang_receiver_receive(r, &b, NOW + 20, &d), BANG_OK);
 EQ(bang_receiver_flush(r, "stage-a", SESSION, NOW + 269, 250, &d), BANG_NOT_READY);
 EQ(bang_receiver_flush(r, "stage-a", SESSION, NOW + 270, 250, &d), BANG_OK);
 CHECK(d.gap_reported && d.missing_from == 1 && d.missing_through == 1);
 CHECK(d.ready_count == 1 && d.ready[0].seq == 2);
 EQ(bang_receiver_receive(r, &a, NOW + 271, &d), BANG_REPLAY);
 EQ(bang_receiver_receive(r, &b, NOW + 271, &d), BANG_REPLAY);
 bang_receiver_free(r); bang_source_free(s); return 0;
}
static int rejoin_and_window(void) {
 bang_source *s = source(); bang_receiver *r = receiver(true); CHECK(s && r);
 bang_event e; bang_delivery d;
 for (size_t i = 0; i < BANG_WINDOW; i++)
  EQ(bang_source_emit(s, BANG_CAPTION, "frame", NOW, 15000, &e), BANG_OK);
 EQ(bang_receiver_receive(r, &e, NOW + 1, &d), BANG_OK);
 CHECK(d.ready_count == 0 && d.waiting_for == 1);
 EQ(bang_source_emit(s, BANG_CAPTION, "out of window", NOW, 15000, &e), BANG_OK);
 EQ(bang_receiver_receive(r, &e, NOW + 1, &d), BANG_WINDOW_EXCEEDED);
 bang_receiver_unsubscribe(r, "stage-a");
 EQ(bang_receiver_receive(r, &e, NOW + 2, &d), BANG_UNAUTHORIZED);
 EQ(bang_receiver_subscribe(r, "stage-a"), BANG_OK);
 EQ(bang_receiver_receive(r, &e, NOW + 2, &d), BANG_WINDOW_EXCEEDED);
 bang_receiver_free(r); bang_source_free(s); return 0;
}
static int javascript_signature_vectors(void) {
 // Node 22 JS reference: same raw Ed25519 seed, signed canonical payload.
 static const char *expected[] = {
  "0a9d856697d4d71dde241881c375cf906e72bac9030c712077c29b3932319d00f85edad54be0e5f6afcbb8c9abd73f505e8b5f97f635c343020d6954861d800c",
  "edab39380702bec783f3e62b97a75db456b485061d9c5eeb66679a436ae476561893b61eb93048c3c63d2e2cae8fa2534586087627dedf5c1ff4ea4e94ffc50d"
 };
 bang_source *s = source(); CHECK(s);
 const char *strings[] = {"Hello", "He said \"go\\now\" •"};
 for (size_t i = 0; i < 2; i++) {
  bang_event f;
  EQ(bang_source_emit(s, BANG_CAPTION, strings[i], NOW, 15000, &f), BANG_OK);
  for (size_t j = 0; j < BANG_SIGNATURE_SIZE; j++) {
   char hex[3]; snprintf(hex, sizeof hex, "%02x", (unsigned)f.signature[j]);
   CHECK(hex[0] == expected[i][j * 2] && hex[1] == expected[i][j * 2 + 1]);
  }
 }
 bang_source_free(s); return 0;
}
static int lifecycle_and_provision(void) {
 bang_receiver *r = bang_receiver_new(); CHECK(r);
 EQ(bang_receiver_provision(r, "STAGE A", key), BANG_INVALID);
 EQ(bang_receiver_provision(r, "stage-a", key), BANG_OK);
 EQ(bang_receiver_provision(r, "stage-a", key), BANG_INVALID);
 bang_receiver_enable(r);
 EQ(bang_receiver_subscribe(r, "other"), BANG_UNAUTHORIZED);
 EQ(bang_receiver_subscribe(r, "stage-a"), BANG_OK);
 bang_delivery d;
 EQ(bang_receiver_flush(r, "stage-a", SESSION, NOW, 250, &d), BANG_NOT_READY);
 EQ(bang_receiver_flush(r, "stage-a", SESSION, NOW, 5001, &d), BANG_INVALID);
 CHECK(!bang_source_new("STAGE", "en", SESSION, seed));
 CHECK(!bang_source_new("stage-a", "EN", SESSION, seed));
 CHECK(!bang_source_new("stage-a", "en", "invalid", seed));
 bang_receiver_free(r); return 0;
}
int main(void) {
 CHECK(setup() == 0);
 struct { const char *name; int (*fn)(void); } cases[] = {
  {"off-by-default", off_by_default}, {"signed-ordering", signed_ordering},
  {"tamper-and-forgery", tamper_and_forgery}, {"bounds-and-clock", bounds_and_clock},
  {"loss-and-flush", loss_and_flush}, {"rejoin-and-window", rejoin_and_window},
  {"lifecycle-and-provision", lifecycle_and_provision},
  {"javascript-signature-vectors", javascript_signature_vectors}
 };
 for (size_t i = 0; i < sizeof cases / sizeof cases[0]; i++) {
  if (cases[i].fn()) { fprintf(stderr, "FAIL: %s\n", cases[i].name); return 1; }
  printf("PASS: %s\n", cases[i].name);
 }
 puts("8 C protocol test groups passed (software model only)");
 return 0;
}
