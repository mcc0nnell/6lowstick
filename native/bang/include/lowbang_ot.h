// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#pragma once
#include "lowbang_wire.h"
#include <openthread/udp.h>
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// C11 6s-owned OpenThread UDP transport. Received events are UNTRUSTED until
// an application calls bang_receiver_receive() with an explicitly pinned key.
// This transport deliberately has no global socket, ASR, or radio ownership.
typedef void (*lowbang_ot_on_candidate)(void *context,
                                        const bang_event *untrusted_event);

typedef struct { // Must be zero-initialized by the caller.
    otInstance *instance;
    otUdpSocket socket;
    lowbang_ot_on_candidate on_candidate;
    void *context;
    uint32_t malformed_dropped;
    uint32_t valid_candidate_count;
    uint16_t last_binary_payload_bytes;
    bool opened;
} lowbang_ot_endpoint;

otError lowbang_ot_open(lowbang_ot_endpoint *endpoint, otInstance *instance,
                        uint16_t listen_port, lowbang_ot_on_candidate callback,
                        void *context);
void lowbang_ot_close(lowbang_ot_endpoint *endpoint);
otError lowbang_ot_send(lowbang_ot_endpoint *endpoint,
                        const otIp6Address *destination, uint16_t destination_port,
                        const bang_event *signed_event);
#ifdef __cplusplus
}
#endif
