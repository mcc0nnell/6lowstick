// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Local, synthetic fixture: generates signed events and independently verifies
// received OpenThread CLI hex-line payloads with the real C11 lib6lowBang.
#include "lowbang_wire.h"
#include <openssl/evp.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define SESSION "abababababababababababababababab"
static const uint8_t fixture_secret[32]={1}; // NEVER production credentials.
static uint64_t now_ms(void) {
    struct timespec ts={0};
    if(clock_gettime(CLOCK_REALTIME,&ts)!=0) return 0;
    return (uint64_t)ts.tv_sec*1000 + (uint64_t)ts.tv_nsec/1000000;
}
static void print_hex(const char *tag,const uint8_t *bytes,size_t n) {
    printf("%s=",tag);
    for(size_t i=0;i<n;i++)printf("%02x",bytes[i]);
    puts("");
}
static int from_hex(const char *text,uint8_t *out,size_t *count) {
    if(!text) return 0;
    size_t n=strlen(text);
    if(n==0 || n&1 || n>BANG_WIRE_MAX*2)return 0;
    for(size_t i=0;i<n/2;i++){
        int digits[2]={-1,-1};
        for(int j=0;j<2;j++){
            char c=text[2*i+j];
            if(c>='0'&&c<='9')digits[j]=c-'0';
            else if(c>='a'&&c<='f')digits[j]=c-'a'+10;
        }
        if(digits[0]<0||digits[1]<0)return 0;
        out[i]=(uint8_t)(digits[0]*16+digits[1]);
    }
    *count=n/2;return 1;
}
static int make_publisher_key(uint8_t output[32]) {
    EVP_PKEY *key=EVP_PKEY_new_raw_private_key(EVP_PKEY_ED25519,NULL,
        fixture_secret,sizeof fixture_secret);
    if(!key)return 0;
    size_t n=32;
    int ok=EVP_PKEY_get_raw_public_key(key,output,&n)==1 && n==32;
    EVP_PKEY_free(key);
    return ok;
}
static int emit(void) {
    bang_source *source=bang_source_new("main-stage","en",SESSION,fixture_secret);
    if(!source)return 1;
    bang_event first={0},second={0};
    uint64_t now=now_ms();
    int ok=now &&
        bang_source_emit(source,BANG_CAPTION,"Gates open",now,15000,&first)==BANG_OK &&
        bang_source_emit(source,BANG_SOUND,"[APPLAUSE]",now+1,15000,&second)==BANG_OK;
    if(ok) {
        uint8_t a[BANG_WIRE_MAX],b[BANG_WIRE_MAX];
        size_t na=0,nb=0;
        ok=lowbang_wire_encode(&first,a,sizeof a,&na) &&
           lowbang_wire_encode(&second,b,sizeof b,&nb);
        if(ok) {
            print_hex("FRAME1",a,na);
            print_hex("FRAME2",b,nb);
            printf("WIRE_BYTES=%zu,%zu\n",na,nb);
        }
    }
    bang_source_free(source);return ok?0:1;
}
// A receiver must pin its publisher key and opt in before admission.
// Two native receivers verify the same forwarded events independently.
static bang_receiver* configured_receiver(const uint8_t pub[32]) {
    bang_receiver* rx=bang_receiver_new();
    if(!rx)return NULL;
    if(bang_receiver_provision(rx,"main-stage",pub)!=BANG_OK) {
        bang_receiver_free(rx);return NULL;
    }
    bang_receiver_enable(rx);
    if(bang_receiver_subscribe(rx,"main-stage")!=BANG_OK) {
        bang_receiver_free(rx);return NULL;
    }
    return rx;
}
static int verify_on_receiver(const char* arrived2,const char* arrived1) {
    uint8_t raw2[BANG_WIRE_MAX],raw1[BANG_WIRE_MAX];
    size_t n2=0,n1=0;bang_event f2={0},f1={0};
    if(!from_hex(arrived2,raw2,&n2)||!from_hex(arrived1,raw1,&n1)||
       !lowbang_wire_decode(raw2,n2,&f2)||
       !lowbang_wire_decode(raw1,n1,&f1))return 1;
    uint8_t pub[32]={0};
    if(!make_publisher_key(pub))return 1;
    bang_receiver* a=configured_receiver(pub);
    bang_receiver* b=configured_receiver(pub);
    if(!a||!b) {bang_receiver_free(a);bang_receiver_free(b);return 1;}
    int ok=1;
    for(int i=0;i<2;i++) {
        bang_receiver* rx=i==0?a:b;
        bang_delivery ordered={0};
        ok=bang_receiver_receive(rx,&f2,now_ms(),&ordered)==BANG_OK &&
            ordered.ready_count==0 && ordered.waiting_for==1;
        if(ok)ok=bang_receiver_receive(rx,&f1,now_ms(),&ordered)==BANG_OK &&
                 ordered.ready_count==2 && ordered.waiting_for==0 &&
                 ordered.ready[0].seq==1 && ordered.ready[1].seq==2 &&
                 strcmp(ordered.ready[0].text,"Gates open")==0 &&
                 strcmp(ordered.ready[1].text,"[APPLAUSE]")==0;
        if(ok)ok=bang_receiver_receive(rx,&f1,now_ms(),&ordered)==BANG_REPLAY;
        if(ok) {
            bang_event tampered=f2;tampered.text[0]='X';
            ok=bang_receiver_receive(rx,&tampered,now_ms(),&ordered)==BANG_UNAUTHORIZED;
        }
        if(!ok)break;
    }
    bang_receiver_free(a);bang_receiver_free(b);
    if(ok)puts("PASS: two 6lowBang C receivers authenticated, reordered and rejected replays/forgeries over simulated Thread UDP");
    return ok?0:1;
}
static int verify_gap(const char* arrived2) {
    uint8_t raw[BANG_WIRE_MAX];
    size_t n=0;bang_event frame={0};
    if(!from_hex(arrived2,raw,&n)||!lowbang_wire_decode(raw,n,&frame))return 1;
    uint8_t pub[32]={0};
    if(!make_publisher_key(pub))return 1;
    bang_receiver* rx=configured_receiver(pub);
    if(!rx)return 1;
    bang_delivery admission={0};
    uint64_t observed=now_ms();
    int ok=bang_receiver_receive(rx,&frame,observed,&admission)==BANG_OK &&
           admission.ready_count==0 && admission.waiting_for==1;
    if(ok) {
        ok=bang_receiver_flush(rx,"main-stage",SESSION,observed+250,250,&admission)==BANG_OK &&
           admission.gap_reported && admission.missing_from==1 && admission.missing_through==1 && admission.ready_count==1 && strcmp(admission.ready[0].text,"[APPLAUSE]")==0;
    }
    bang_receiver_free(rx);
    if(ok)puts("PASS: missing signed sequence explicitly reported; no invented words");
    return ok?0:1;
}
static int selftest(void) {
    bang_source *s=bang_source_new("main-stage","en",SESSION,fixture_secret);
    if(!s)return 1;
    bang_event f={0},decoded={0};uint8_t wire[BANG_WIRE_MAX];
    size_t n=0;int ok=bang_source_emit(s,BANG_CAPTION,"Test",600000,15000,&f)==BANG_OK &&
        lowbang_wire_encode(&f,wire,sizeof wire,&n) &&
        lowbang_wire_decode(wire,n,&decoded) &&
        decoded.seq==f.seq && decoded.text_len==f.text_len &&
        !memcmp(decoded.signature,f.signature,64);
    if(ok)ok=!lowbang_wire_decode(wire,n-1,&decoded);
    if(ok) {wire[0]^=1;ok=!lowbang_wire_decode(wire,n,&decoded);}
    bang_source_free(s);
    if(ok)puts("PASS: bounded C wire codec encode/decode/truncation and magic checks");
    return ok?0:1;
}
int main(int argc,char **argv) {
    if(argc==2 && !strcmp(argv[1],"emit"))return emit();
    if(argc==4 && !strcmp(argv[1],"verify"))return verify_on_receiver(argv[2],argv[3]);
    if(argc==3 && !strcmp(argv[1],"verify-gap"))return verify_gap(argv[2]);
    if(argc==2 && !strcmp(argv[1],"selftest"))return selftest();
    fputs("Usage: bang-thread-codec {emit|selftest|verify RECEIVED2 RECEIVED1}\n",stderr);
    return 2;
}
