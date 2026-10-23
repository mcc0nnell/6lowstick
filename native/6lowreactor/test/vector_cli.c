// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// CLI probe used ONLY by offline Node/C differential tests.
#include "s6_reactor.h"
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    unsigned char key[32];
    memset(key, 6, sizeof(key)); // Public synthetic fixture, never production.
    if (argc < 3) return 2;
    char wire[S6_MAX_WIRE] = {0};
    bool ok = false;
    if (strcmp(argv[1], "alert") == 0 && argc == 3) {
        ok = s6_sign_alert(key, sizeof(key), argv[2], wire);
    } else if (strcmp(argv[1], "receipt") == 0 && argc == 5) {
        ok = s6_sign_receipt(key, sizeof(key), argv[2], argv[3], argv[4], wire);
    } else if (strcmp(argv[1], "check-alert") == 0 && argc == 3) {
        return s6_verify_alert(key, sizeof(key), argv[2]) ? 0 : 1;
    } else if (strcmp(argv[1], "check-receipt") == 0 && argc == 6) {
        return s6_verify_receipt(key, sizeof(key), argv[2], argv[3],
                                 argv[4], argv[5]) ? 0 : 1;
    } else {
        return 2;
    }
    if (!ok) return 1;
    puts(wire);
    return 0;
}
