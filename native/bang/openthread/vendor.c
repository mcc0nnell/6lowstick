// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Test-only OpenThread CLI extension: fixed signing seed, fixed synthetic captions.
#define _POSIX_C_SOURCE 200809L
#include "lowbang_ot.h"
#include <openthread/cli.h>
#include <openthread/instance.h>
#include <openthread/ip6.h>
#include <openssl/evp.h>
#include <inttypes.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define PORT 61634
#define SESSION "abababababababababababababababab"
static const uint8_t test_seed[32]={1};
static struct {
    lowbang_ot_endpoint endpoint;
    bang_receiver* receiver;
    bang_source* source;
    bang_event frame[2];
    bool prepared;
    uint32_t delivered,rejected;
} state;
static uint64_t now_ms(void) {
    struct timespec t={0};
    if(clock_gettime(CLOCK_REALTIME,&t)!=0)return 0;
    return (uint64_t)t.tv_sec*1000+(uint64_t)t.tv_nsec/1000000;
}
static int pubkey(uint8_t out[32]) {
    EVP_PKEY* key=EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519,NULL,test_seed,sizeof test_seed);
    if(!key)return 0;
    size_t n=32;
    int success=EVP_PKEY_get_raw_public_key(key,out,&n)==1 && n==32;
    EVP_PKEY_free(key);
    return success;
}
static const char* status_label(bang_status s) {
    if(s==BANG_REPLAY)return "replay";
    if(s==BANG_UNAUTHORIZED)return "unauthorized";
    if(s==BANG_EXPIRED)return "expired";
    return "invalid";
}
static void incoming(void* context,const bang_event* frame) {
    (void)context;
    if(!state.receiver)return;
    bang_delivery result={0};
    bang_status status=bang_receiver_receive(state.receiver,frame,now_ms(),&result);
    if(status!=BANG_OK) {
        state.rejected++;
        otCliOutputFormat("BANG_REJECT %s\r\n",status_label(status));
        return;
    }
    if(result.waiting_for)
        otCliOutputFormat("BANG_HELD %" PRIu64 "\r\n",result.waiting_for);
    for(size_t i=0;i<result.ready_count;i++) {
        const bang_event* event=&result.ready[i];
        state.delivered++;
        otCliOutputFormat("BANG_DELIVER %" PRIu64 " %s\r\n",event->seq,event->text);
    }
}
static otError bang_open(void* context,uint8_t argc,char* argv[]) {
    (void)context;(void)argv;
    if(argc || state.endpoint.opened)return OT_ERROR_INVALID_STATE;
    otInstance* instance=otInstanceGetSingle();
    if(!instance)return OT_ERROR_INVALID_STATE;
    uint8_t pub[32]={0};
    if(!pubkey(pub))return OT_ERROR_FAILED;
    state.receiver=bang_receiver_new();
    if(!state.receiver)return OT_ERROR_NO_BUFS;
    bang_status status=bang_receiver_provision(state.receiver,"main-stage",pub);
    if(status==BANG_OK) {
        bang_receiver_enable(state.receiver);
        status=bang_receiver_subscribe(state.receiver,"main-stage");
    }
    if(status!=BANG_OK) {
        bang_receiver_free(state.receiver);state.receiver=NULL;
        return OT_ERROR_SECURITY;
    }
    otError error=lowbang_ot_open(&state.endpoint,instance,PORT,incoming,NULL);
    if(error!=OT_ERROR_NONE) {
        bang_receiver_free(state.receiver);state.receiver=NULL;
        return error;
    }
    otCliOutputFormat("BANG_READY %u\r\n",(unsigned)PORT);
    return OT_ERROR_NONE;
}
static otError bang_send(void* context,uint8_t argc,char* argv[]) {
    (void)context;
    if(argc!=2 || !state.endpoint.opened)return OT_ERROR_INVALID_ARGS;
    otIp6Address destination={0};
    if(otIp6AddressFromString(argv[0],&destination)!=OT_ERROR_NONE)
        return OT_ERROR_INVALID_ARGS;
    const char* choice=argv[1];
    if(strcmp(choice,"1") && strcmp(choice,"2") && strcmp(choice,"tamper"))
        return OT_ERROR_INVALID_ARGS;
    if(!state.prepared) {
        state.source=bang_source_new("main-stage","en",SESSION,test_seed);
        if(!state.source)return OT_ERROR_NO_BUFS;
        uint64_t now=now_ms();
        if(!now ||
           bang_source_emit(state.source,BANG_CAPTION,"Gates open",now,25000,&state.frame[0])!=BANG_OK ||
           bang_source_emit(state.source,BANG_SOUND,"[APPLAUSE]",now+1,25000,&state.frame[1])!=BANG_OK)
            return OT_ERROR_FAILED;
        state.prepared=true;
    }
    bang_event frame=strcmp(choice,"2")==0?state.frame[1]:state.frame[0];
    if(!strcmp(choice,"tamper"))frame.text[0]='X';
    otError error=lowbang_ot_send(&state.endpoint,&destination,PORT,&frame);
    if(error==OT_ERROR_NONE)otCliOutputFormat("BANG_SENT %s\r\n",choice);
    return error;
}
static otError bang_stats(void* context,uint8_t argc,char* argv[]) {
    (void)context;(void)argv;
    if(argc || !state.endpoint.opened)return OT_ERROR_INVALID_ARGS;
    otCliOutputFormat("BANG_STATS delivered=%u rejected=%u malformed=%u candidates=%u binary_bytes=%u\r\n",
      (unsigned)state.delivered,(unsigned)state.rejected,
      (unsigned)state.endpoint.malformed_dropped,
      (unsigned)state.endpoint.valid_candidate_count,
      (unsigned)state.endpoint.last_binary_payload_bytes);
    return OT_ERROR_NONE;
}
static const otCliCommand commands[]={
    {"bangopen",bang_open},
    {"bangsend",bang_send},
    {"bangstats",bang_stats},
};
void otCliVendorSetUserCommands(void) {
    (void)otCliSetUserCommands(commands,(uint8_t)(sizeof commands/sizeof commands[0]),NULL);
}
