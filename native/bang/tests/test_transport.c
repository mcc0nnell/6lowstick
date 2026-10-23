// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Two separate processes exercise 6s-owned bounded binary UDP. Loopback only.
#include "lowbang_udp.h"
#include <openssl/evp.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#define CHECK(x) do {if(!(x)){fprintf(stderr,"FAIL line %d: %s\n",__LINE__,#x);return 1;}}while(0)
#define SESSION "abababababababababababababababab"
#define NOW UINT64_C(600000)
static const uint8_t seed[32]={1}, forged_seed[32]={2};
static int raw_send(uint16_t dest,const uint8_t* bytes,size_t size) {
    int fd=socket(AF_INET6,SOCK_DGRAM,0);
    if(fd<0)return 0;
    struct sockaddr_in6 dst={0};
    dst.sin6_family=AF_INET6;
    dst.sin6_addr=in6addr_loopback;
    dst.sin6_port=htons(dest);
    ssize_t sent=sendto(fd,bytes,size,0,(const struct sockaddr*)&dst,sizeof dst);
    close(fd);
    return sent==(ssize_t)size;
}
static int child(uint16_t destination) {
    bang_source* source=bang_source_new("main-stage","en",SESSION,seed);
    bang_source* imposter=bang_source_new("main-stage","en",SESSION,forged_seed);
    lowbang_udp* tx=lowbang_udp_open_loopback(0);
    CHECK(source&&imposter&&tx);
    bang_event a={0},b={0},fake={0};
    CHECK(bang_source_emit(source,BANG_CAPTION,"Gates open",NOW,15000,&a)==BANG_OK);
    CHECK(bang_source_emit(source,BANG_SOUND,"[APPLAUSE]",NOW+1,15000,&b)==BANG_OK);
    CHECK(bang_source_emit(imposter,BANG_CAPTION,"Imposter",NOW+2,15000,&fake)==BANG_OK);
    CHECK(lowbang_udp_send_loopback(tx,destination,&b)==BANG_OK);
    CHECK(lowbang_udp_send_loopback(tx,destination,&a)==BANG_OK);
    CHECK(lowbang_udp_send_loopback(tx,destination,&a)==BANG_OK);
    CHECK(lowbang_udp_send_loopback(tx,destination,&fake)==BANG_OK);
    uint8_t bad[BANG_WIRE_HEADER]={0},large[BANG_WIRE_MAX+1]={0};
    CHECK(raw_send(destination,bad,sizeof bad));
    CHECK(raw_send(destination,large,sizeof large));
    lowbang_udp_close(tx);
    bang_source_free(imposter);
    bang_source_free(source);
    return 0;
}
static int test_cross_process(void) {
    lowbang_udp* rx=lowbang_udp_open_loopback(0);
    CHECK(rx);
    uint16_t port=lowbang_udp_local_port(rx);
    CHECK(port>=1024);
    uint8_t pub[32]={0};
    EVP_PKEY* key=EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519,NULL,seed,sizeof seed);
    CHECK(key);
    size_t length=sizeof pub;
    CHECK(EVP_PKEY_get_raw_public_key(key,pub,&length)==1 && length==sizeof pub);
    EVP_PKEY_free(key);
    bang_receiver* receiver=bang_receiver_new();
    CHECK(receiver);
    CHECK(bang_receiver_provision(receiver,"main-stage",pub)==BANG_OK);
    bang_receiver_enable(receiver);
    CHECK(bang_receiver_subscribe(receiver,"main-stage")==BANG_OK);
    CHECK(lowbang_udp_recv_untrusted(rx,0,NULL)==BANG_INVALID);
    CHECK(lowbang_udp_recv_untrusted(rx,1501,(bang_event[1]){{0}})==BANG_INVALID);
    CHECK(lowbang_udp_send_loopback(rx,1023,NULL)==BANG_INVALID);
    pid_t pid=fork();
    CHECK(pid>=0);
    if(pid==0) {
        int result=child(port);
        _exit(result);
    }
    bang_status statuses[]={BANG_OK,BANG_OK,BANG_REPLAY,BANG_UNAUTHORIZED,
                            BANG_INVALID,BANG_INVALID};
    size_t delivered=0;
    for(size_t i=0;i<6;i++) {
        bang_event f={0};
        bang_status result=lowbang_udp_recv_untrusted(rx,1500,&f);
        if(i<4) {
            CHECK(result==BANG_OK);
            bang_delivery output={0};
            bang_status admitted=bang_receiver_receive(receiver,&f,NOW+10,&output);
            CHECK(admitted==statuses[i]);
            if(i==0)CHECK(output.ready_count==0 && output.waiting_for==1);
            if(i==1) {
                CHECK(output.ready_count==2);
                CHECK(output.ready[0].seq==1 && output.ready[1].seq==2);
                CHECK(strcmp(output.ready[0].text,"Gates open")==0);
                CHECK(strcmp(output.ready[1].text,"[APPLAUSE]")==0);
                delivered+=output.ready_count;
            }
        } else CHECK(result==statuses[i]);
    }
    int status=0;
    CHECK(waitpid(pid,&status,0)==pid);
    CHECK(WIFEXITED(status) && WEXITSTATUS(status)==0);
    CHECK(delivered==2);
    CHECK(lowbang_udp_recv_untrusted(rx,0,(bang_event[1]){{0}})==BANG_NOT_READY);
    lowbang_udp_close(rx);
    bang_receiver_free(receiver);
    puts("PASS: 6s C binary UDP: two processes, 2 signed events reordered, replay/forgery/oversized/malformed rejected");
    return 0;
}
static int test_wire(void) {
    bang_source* source=bang_source_new("main-stage","en",SESSION,seed);
    CHECK(source);
    bang_event f={0},decoded={0};
    CHECK(bang_source_emit(source,BANG_CAPTION,"Hello",NOW,15000,&f)==BANG_OK);
    uint8_t wire[BANG_WIRE_MAX]={0};
    size_t n=0;
    CHECK(lowbang_wire_encode(&f,wire,sizeof wire,&n));
    CHECK(n>BANG_WIRE_HEADER && n<=BANG_WIRE_MAX);
    CHECK(lowbang_wire_decode(wire,n,&decoded) && decoded.text_len==5);
    CHECK(memcmp(decoded.signature,f.signature,64)==0);
    CHECK(!lowbang_wire_decode(wire,n-1,&decoded));
    wire[0]^=1;CHECK(!lowbang_wire_decode(wire,n,&decoded));
    bang_source_free(source);
    puts("PASS: 6s-owned C bounded signed packet codec");
    return 0;
}
int main(void) {
    CHECK(test_wire()==0);
    CHECK(test_cross_process()==0);
    return 0;
}
