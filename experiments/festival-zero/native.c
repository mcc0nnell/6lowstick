// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Standalone native C CLI. No radio, network, or hardware effects.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <limits.h>
extern int festival_run(int,int,int,int,int,int);
extern int festival_count(int,int,int);
extern int festival_invariant(int);
static int fail(const char *msg) {
  fprintf(stderr,"6low ZERO C engine: %s\n",msg); return 2;
}
static int parse(const char *text,int *out) {
  char *end;long v;
  errno=0;v=strtol(text,&end,10);
  if(errno||end==text||*end||v<INT_MIN||v>INT_MAX)return 0;
  *out=(int)v;return 1;
}
static void print_counts(int bucket,int index) {
  const char *labels[]={"attempted","modeledDelivered","notDeliveredInModel",
    "threadLocal","threadGateway","loraRelay"};
  putchar('{');
  for(int f=0;f<6;f++) {
    if(f)putchar(',');
    printf("\"%s\":%d",labels[f],festival_count(bucket,index,f));
  }
  printf(",\"failures\":{\"capacity\":%d,\"coverage\":%d,\"modeledLoss\":%d}}",
    festival_count(bucket,index,6),festival_count(bucket,index,7),
    festival_count(bucket,index,8));
}
int main(int argc,char **argv) {
  int attendees=250,minutes=45,seed=6,outage=-1,reactor=0,json=0;
  for(int i=1;i<argc;i++){
    if(!strcmp(argv[i],"--json")){json=1;continue;}
    if(!strcmp(argv[i],"--help")) {
      puts("6low ZERO C simulation --attendees N --minutes N --seed N --outage-minute N --reactor north|south [--json]");
      puts("Synthetic capacity experiment only. No physical radio or human receipt.");
      return 0;
    }
    if(i+1>=argc)return fail("missing option argument");
    char *key=argv[i],*val=argv[++i];
    if(!strcmp(key,"--attendees")) {if(!parse(val,&attendees))return fail("invalid attendees");}
    else if(!strcmp(key,"--minutes")) {if(!parse(val,&minutes))return fail("invalid minutes");}
    else if(!strcmp(key,"--seed")) {if(!parse(val,&seed))return fail("invalid seed");}
    else if(!strcmp(key,"--outage-minute")) {if(!parse(val,&outage))return fail("invalid outage");}
    else if(!strcmp(key,"--reactor")) {
      if(!strcmp(val,"north"))reactor=0;
      else if(!strcmp(val,"south"))reactor=1;
      else return fail("invalid reactor");
    } else return fail("unknown option");
  }
  if(festival_run(attendees,minutes,seed,outage,reactor,0))return fail("invalid simulation parameters");
  int attempts=festival_count(0,0,0),ok=festival_count(0,0,1);
  if(!json){
    printf("6low ZERO / C11 NATIVE / SYNTHETIC ONLY\n");
    printf("Attendees %d, duration %d min, seed %d, %s Reactor outage at minute %d\n",
      attendees,minutes,seed,reactor?"south":"north",outage);
    printf("Modeled attempts %d, delivered %d (%.2f%%), not delivered %d\n",
      attempts,ok,attempts?100.0*ok/attempts:0.0,festival_count(0,0,2));
    printf("Local Thread %d, cross-station Thread %d, LoRa relay %d\n",
      festival_count(0,0,3),festival_count(0,0,4),festival_count(0,0,5));
    return 0;
  }
  printf("{\"schema\":\"6lowstick.festival-capacity-model.v0\",");
  printf("\"simulation\":true,\"physicalRf\":false,\"realReceipts\":false,");
  printf("\"parameters\":{\"attendees\":%d,\"minutes\":%d,\"seed\":%d,",
    attendees,minutes,seed);
  if(outage<0)printf("\"reactorOutageAtMinute\":null,");
  else printf("\"reactorOutageAtMinute\":%d,",outage);
  printf("\"reactor\":\"%s\"},",reactor?"south":"north");
  printf("\"totals\":");print_counts(0,0);
  printf(",\"categories\":{\"crew\":");print_counts(4,0);
  printf(",\"friends\":");print_counts(5,0);printf("},");
  printf("\"segments\":{\"beforeOutage\":");print_counts(2,0);
  printf(",\"afterOutage\":");print_counts(3,0);printf("},");
  printf("\"invariants\":{\"maxThreadStationSlots\":%d,\"maxLoRaRelaySlots\":%d,",
    festival_invariant(0),festival_invariant(1));
  printf("\"localThreadDuringOutage\":%d,\"reactorDependentDuringOutage\":%d},",
    festival_invariant(2),festival_invariant(3));
  printf("\"timeline\":[");
  for(int m=0;m<minutes;m++){
    if(m)putchar(',');
    printf("{\"minute\":%d,",m);
    // Reuse counter printer without nesting an object.
    printf("\"counts\":");print_counts(1,m);putchar('}');
  }
  puts("]}");
  return 0;
}
