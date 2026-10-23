// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// A real Celix framework smoke test. In-process only; no radio hardware or sockets.
#include "low_reactor.h"
#include <celix_framework_factory.h>
#include <celix_framework.h>
#include <celix_bundle_context.h>
#include <celix_properties.h>
#include <celix_constants.h>
#include <assert.h>
#include <stdio.h>

typedef struct {
    int invoked;
    int accepted;
    int denied;
    low_reactor_snapshot_t snapshot;
} smoke_state_t;

static void use_observer(void *arg, low_reactor_observer_service_t *svc) {
    smoke_state_t *s=arg;
    s->invoked++;
    low_reactor_observation_t good={
      .source_id=7,.sequence=1,.observed_ms=1000,.channel=20,
      .rssi_dbm=-70,.lqi=175,.kind=LOW_REACTOR_OT_SNAPSHOT
    };
    s->accepted=svc->observe(svc->handle,&good,1000);
    s->denied=svc->observe(svc->handle,&good,1000);
    s->snapshot=svc->snapshot(svc->handle,1000);
}

int main(int argc,char **argv) {
    if(argc!=2)return 2;
    celix_properties_t *properties=celix_properties_create();
    if (!properties) return 3;
    celix_properties_setBool(properties,CELIX_FRAMEWORK_CACHE_USE_TMP_DIR,true);
    celix_framework_t *fw=celix_frameworkFactory_createFramework(properties);
    if(!fw)return 3;
    celix_bundle_context_t *ctx=celix_framework_getFrameworkContext(fw);
    long id=celix_bundleContext_installBundle(ctx,argv[1],true);
    if(id<0) {
       fprintf(stderr,"Could not load Celix bundle %s\n",argv[1]);
       celix_frameworkFactory_destroyFramework(fw);
       return 4;
    }
    smoke_state_t state={0};
    bool found=celix_bundleContext_useService(ctx,LOW_REACTOR_SERVICE_NAME,&state,
        (void (*)(void*,void*))use_observer);
    assert(found&&state.invoked==1);
    assert(state.accepted==LOW_REACTOR_ACCEPTED);
    assert(state.denied==LOW_REACTOR_DENIED_REPLAY);
    assert(state.snapshot.sources_known==1);
    assert(state.snapshot.observations_denied==1);
    assert(!state.snapshot.physical_rf_verified);
    assert(!state.snapshot.delivery_verified);
    assert(!state.snapshot.human_received);
    celix_frameworkFactory_destroyFramework(fw);
    puts("6lowReactor Celix bundle registration/callback/shutdown PASS");
    return 0;
}
