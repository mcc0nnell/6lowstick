// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#pragma once
#include "lowbang_wire.h"
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
// Linux/POSIX loopback research backend; a separate OpenThread radio adapter
// must supply a real Thread UDP endpoint. Not an RF transport.
#define LOWBANG_UDP_MAX_WAIT_MS 1500u
typedef struct lowbang_udp lowbang_udp;
lowbang_udp* lowbang_udp_open_loopback(uint16_t local_port);
void lowbang_udp_close(lowbang_udp* socket);
uint16_t lowbang_udp_local_port(const lowbang_udp* socket);
bang_status lowbang_udp_send_loopback(lowbang_udp* socket, uint16_t target_port,
                                       const bang_event* signed_event);
// IMPORTANT: Received event is UNTRUSTED until bang_receiver_receive() or
// an equivalent pinned-key 6lowBang receiver checks its signature and expiry.
bang_status lowbang_udp_recv_untrusted(lowbang_udp* socket,uint32_t timeout_ms,
                                       bang_event* candidate);
#ifdef __cplusplus
}
#endif
