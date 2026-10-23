// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Direct native OpenThread UDP/6LoWPAN transport; NEVER Linux socket sendto.
// Parsed candidate data is deliberately NOT authenticated here.
#include "lowbang_ot.h"
#include <openthread/message.h>
#include <openthread/ip6.h>
#include <string.h>

static void receive_callback(void *handle, otMessage *message,
                             const otMessageInfo *sender) {
    lowbang_ot_endpoint *ep=handle;
    (void)sender;
    if(!ep || !ep->opened || !message) return;
    uint16_t length=otMessageGetLength(message);
    uint16_t offset=otMessageGetOffset(message);
    if(length<offset || (size_t)(length-offset)>BANG_WIRE_MAX ||
       length==offset) {
        ep->malformed_dropped++;
        return;
    }
    uint8_t packet[BANG_WIRE_MAX]={0};
    size_t n=(size_t)(length-offset);
    if(otMessageRead(message,offset,packet,(uint16_t)n)!=(int)n) {
        ep->malformed_dropped++;
        return;
    }
    bang_event candidate={0};
    if(!lowbang_wire_decode(packet,n,&candidate)) {
        ep->malformed_dropped++;
        return;
    }
    ep->last_binary_payload_bytes=(uint16_t)n;
    ep->valid_candidate_count++;
    ep->on_candidate(ep->context,&candidate); // Caller must verify signature.
}
otError lowbang_ot_open(lowbang_ot_endpoint *ep,otInstance *instance,
                       uint16_t port,lowbang_ot_on_candidate callback,
                       void *context) {
    if(!ep || !instance || !callback || port<1024 || ep->opened) return OT_ERROR_INVALID_ARGS;
    memset(ep,0,sizeof *ep);
    ep->instance=instance;
    ep->on_candidate=callback;
    ep->context=context;
    otError err=otUdpOpen(instance,&ep->socket,receive_callback,ep);
    if(err!=OT_ERROR_NONE)return err;
    otSockAddr address={0};
    address.mPort=port;
    err=otUdpBind(instance,&ep->socket,&address,OT_NETIF_THREAD_INTERNAL);
    if(err!=OT_ERROR_NONE) {
        (void)otUdpClose(instance,&ep->socket);
        return err;
    }
    ep->opened=true;
    return OT_ERROR_NONE;
}
void lowbang_ot_close(lowbang_ot_endpoint *ep) {
    if(!ep || !ep->opened)return;
    (void)otUdpClose(ep->instance,&ep->socket);
    ep->opened=false;
}
otError lowbang_ot_send(lowbang_ot_endpoint *ep,const otIp6Address *destination,
                        uint16_t port,const bang_event *frame) {
    if(!ep || !ep->opened || !destination || !frame || port<1024)
        return OT_ERROR_INVALID_ARGS;
    uint8_t bytes[BANG_WIRE_MAX]={0};
    size_t n=0;
    if(!lowbang_wire_encode(frame,bytes,sizeof bytes,&n))
        return OT_ERROR_INVALID_ARGS;
    otMessage* message=otUdpNewMessage(ep->instance,NULL);
    if(!message)return OT_ERROR_NO_BUFS;
    otError err=otMessageAppend(message,bytes,(uint16_t)n);
    if(err==OT_ERROR_NONE) {
        otMessageInfo remote={0};
        remote.mPeerAddr=*destination;
        remote.mPeerPort=port;
        err=otUdpSend(ep->instance,&ep->socket,message,&remote);
    }
    if(err!=OT_ERROR_NONE)otMessageFree(message);
    // When sent successfully, the OpenThread stack owns the message.
    return err;
}
