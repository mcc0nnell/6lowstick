// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
#include "low_reactor.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>

static low_reactor_observation_t sample(unsigned source, uint64_t sequence,
    uint64_t observed, int rssi, int lqi) {
    return (low_reactor_observation_t){
      .source_id=source, .sequence=sequence, .observed_ms=observed,
      .rssi_dbm=rssi, .lqi=(unsigned)lqi, .channel=20,
      .kind=LOW_REACTOR_SPINEL_SNAPSHOT};
}

int main(void) {
    low_reactor_state_t s;
    memset(&s,0xdd,sizeof(s));
    low_reactor_init(&s);
    low_reactor_snapshot_t empty=low_reactor_snapshot(&s,1000);
    assert(empty.advisory==LOW_REACTOR_NO_EVIDENCE);
    assert(!empty.physical_rf_verified&&!empty.delivery_verified&&!empty.human_received);

    low_reactor_observation_t p=sample(1,1,1000,-45,240);
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_ACCEPTED);
    assert(low_reactor_snapshot(&s,1000).advisory==LOW_REACTOR_NOMINAL_OBSERVATIONS);
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_DENIED_REPLAY);
    p.sequence=2;p.observed_ms=999;
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_DENIED_REPLAY);
    p.observed_ms=1001;
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_DENIED_STALE);
    p.observed_ms=1000;p.sequence=0;
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_DENIED_INVALID);
    p.sequence=2;p.lqi=10;
    assert(low_reactor_ingest(&s,&p,1000)==LOW_REACTOR_ACCEPTED);
    assert(low_reactor_snapshot(&s,1000).advisory==LOW_REACTOR_DEGRADED_OBSERVATIONS);
    low_reactor_snapshot_t stale=low_reactor_snapshot(&s,32000);
    assert(stale.sources_fresh==0&&stale.advisory==LOW_REACTOR_STALE_OBSERVATIONS);
    assert(low_reactor_ingest(&s,NULL,1000)==LOW_REACTOR_DENIED_INVALID);
    assert(low_reactor_ingest(NULL,&p,1000)==LOW_REACTOR_DENIED_INVALID);
    for(unsigned id=2;id<=LOW_REACTOR_MAX_SOURCES;id++){
        low_reactor_observation_t n=sample(id,1,1000,-60,250);
        assert(low_reactor_ingest(&s,&n,1000)==LOW_REACTOR_ACCEPTED);
    }
    low_reactor_observation_t overflow=sample(LOW_REACTOR_MAX_SOURCES+1,1,1000,-60,250);
    assert(low_reactor_ingest(&s,&overflow,1000)==LOW_REACTOR_DENIED_CAPACITY);
    low_reactor_snapshot_t view=low_reactor_snapshot(&s,1000);
    assert(view.sources_known==LOW_REACTOR_MAX_SOURCES);
    assert(view.sources_degraded==1);
    assert(view.observations_accepted==LOW_REACTOR_MAX_SOURCES+1);
    assert(view.observations_denied==6);
    assert(!view.physical_rf_verified&&!view.delivery_verified&&!view.human_received);
    printf("6lowReactor observer core PASS: accepted=%llu denied=%llu source_slots=%u\n",
      (unsigned long long)view.observations_accepted,
      (unsigned long long)view.observations_denied,view.sources_known);
    return 0;
}
