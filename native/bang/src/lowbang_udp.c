// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#define _POSIX_C_SOURCE 200809L
#include "lowbang_udp.h"
#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <poll.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

struct lowbang_udp {int fd; uint16_t local_port;};
lowbang_udp* lowbang_udp_open_loopback(uint16_t port) {
    if(port && port<1024)return NULL;
    int fd=socket(AF_INET6, SOCK_DGRAM,0);
    if(fd<0)return NULL;
    int on=1;
    if(setsockopt(fd,IPPROTO_IPV6,IPV6_V6ONLY,&on,sizeof on)!=0) {
        close(fd);return NULL;
    }
    struct sockaddr_in6 address={0};
    address.sin6_family=AF_INET6;
    address.sin6_addr=in6addr_loopback;
    address.sin6_port=htons(port);
    if(bind(fd,(const struct sockaddr*)&address,sizeof address)!=0) {
        close(fd);return NULL;
    }
    socklen_t n=sizeof address;
    if(getsockname(fd,(struct sockaddr*)&address,&n)!=0 ||
       n!=sizeof address || address.sin6_family!=AF_INET6 ||
       !IN6_IS_ADDR_LOOPBACK(&address.sin6_addr)) {
        close(fd);return NULL;
    }
    lowbang_udp* s=calloc(1,sizeof(*s));
    if(!s){close(fd);return NULL;}
    s->fd=fd;
    s->local_port=ntohs(address.sin6_port);
    return s;
}
void lowbang_udp_close(lowbang_udp* s) {
    if(!s)return;
    if(s->fd>=0)close(s->fd);
    memset(s,0,sizeof *s);
    free(s);
}
uint16_t lowbang_udp_local_port(const lowbang_udp* s) {
    return s?s->local_port:0;
}
bang_status lowbang_udp_send_loopback(lowbang_udp* s,uint16_t target,
                                     const bang_event* event) {
    if(!s||s->fd<0||target<1024||!event)return BANG_INVALID;
    uint8_t wire[BANG_WIRE_MAX]={0};
    size_t length=0;
    if(!lowbang_wire_encode(event,wire,sizeof wire,&length))return BANG_INVALID;
    struct sockaddr_in6 remote={0};
    remote.sin6_family=AF_INET6;
    remote.sin6_addr=in6addr_loopback;
    remote.sin6_port=htons(target);
    ssize_t sent=sendto(s->fd,wire,length,0,(const struct sockaddr*)&remote,sizeof remote);
    return sent==(ssize_t)length?BANG_OK:BANG_INVALID;
}
bang_status lowbang_udp_recv_untrusted(lowbang_udp* s,uint32_t timeout,bang_event* frame) {
    if(!s||s->fd<0||!frame||timeout>LOWBANG_UDP_MAX_WAIT_MS)return BANG_INVALID;
    struct pollfd p={.fd=s->fd,.events=POLLIN};
    int state=poll(&p,1,(int)timeout);
    if(state==0)return BANG_NOT_READY;
    if(state<0 || (p.revents&(POLLERR|POLLHUP|POLLNVAL)) || !(p.revents&POLLIN))
       return BANG_INVALID;
    uint8_t wire[BANG_WIRE_MAX]={0};
    struct sockaddr_in6 sender={0};
    socklen_t n=sizeof sender;
    ssize_t size=recvfrom(s->fd,wire,sizeof wire,MSG_TRUNC,
                          (struct sockaddr*)&sender,&n);
    if(size<=0||size>(ssize_t)sizeof wire)return BANG_INVALID;
    if(n!=sizeof sender || sender.sin6_family!=AF_INET6 ||
       !IN6_IS_ADDR_LOOPBACK(&sender.sin6_addr))return BANG_UNAUTHORIZED;
    bang_event decoded={0};
    if(!lowbang_wire_decode(wire,(size_t)size,&decoded))return BANG_INVALID;
    *frame=decoded;
    return BANG_OK;
}
