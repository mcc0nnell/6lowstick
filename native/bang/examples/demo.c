// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Synthetic caption event demo. No audio, radio, transport, or human receipt.
#include "lowbang.h"
#include <openssl/evp.h>
#include <stdio.h>
#include <string.h>
int main(void) {
 const uint8_t secret[32] = {1}; uint8_t public_key[32]; size_t key_len = sizeof public_key;
 EVP_PKEY *key = EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519, NULL, secret, sizeof secret);
 if (!key || EVP_PKEY_get_raw_public_key(key, public_key, &key_len) != 1) return 1;
 EVP_PKEY_free(key);
 bang_source *s = bang_source_new("main-stage", "en", "abababababababababababababababab", secret);
 bang_receiver *r = bang_receiver_new(); bang_event one, two; bang_delivery result;
 if (!s || !r || bang_receiver_provision(r, "main-stage", public_key) != BANG_OK) return 1;
 bang_receiver_enable(r);
 if (bang_receiver_subscribe(r, "main-stage") != BANG_OK ||
     bang_source_emit(s, BANG_CAPTION, "Welcome to the main stage!", 600000, 15000, &one) != BANG_OK ||
     bang_source_emit(s, BANG_SOUND, "[APPLAUSE]", 600001, 15000, &two) != BANG_OK) return 1;
 if (bang_receiver_receive(r, &two, 600002, &result) != BANG_OK || result.ready_count != 0) return 1;
 puts("Out-of-order signed event held pending #1");
 if (bang_receiver_receive(r, &one, 600003, &result) != BANG_OK || result.ready_count != 2) return 1;
 for (size_t i = 0; i < result.ready_count; i++)
   printf("%s #%llu: %s\n", result.ready[i].channel,
     (unsigned long long)result.ready[i].seq, result.ready[i].text);
 puts("Application admission only. Radio, ASR and human receipt: NOT TESTED");
 bang_receiver_free(r); bang_source_free(s); return 0;
}
