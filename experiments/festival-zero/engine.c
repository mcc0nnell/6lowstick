// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// C11 synthetic festival crowd/capacity engine: NO physical RF, cryptographic
// receipts, GPS, actual 6lowLoop packets, AI control or emergency dispatch.
// Compiles natively with GCC/Clang and as freestanding wasm32 with Clang.
typedef unsigned int u32;
enum { MAX_PEOPLE=10000, MAX_MINUTES=360, SAMPLE_NODES=120, SAMPLE_FLOWS=24 };
enum { W=1400, H=1000, STEP=15, THREAD_BUDGET=14, LORA_BUDGET=4 };
enum { ROUTE_NONE=0, ROUTE_LOCAL=1, ROUTE_CROSS=2, ROUTE_LORA=3 };
enum { FAIL_CAP=0, FAIL_COVER=1, FAIL_LOSS=2 };
static const int stations[8][2]={{175,210},{525,210},{875,210},{1225,210},
                                  {175,790},{525,790},{875,790},{1225,790}};
static const int relays[2][2]={{310,500},{1090,500}};
typedef struct {
  double x,y,home_x,home_y;
  int friend_id, crew, id;
} Person;
typedef struct {
  int attempted, modeled_delivered, not_delivered, local, cross, lora;
  int capacity, coverage, modeled_loss;
} Counts;
typedef struct { int x,y,id,crew,station; } Node;
typedef struct { int x1,y1,x2,y2,route; } Flow;
static Person people[MAX_PEOPLE];
static int attached[MAX_PEOPLE], pending[MAX_PEOPLE], thread_used[8], lora_used[2];
static Counts totals, minutes_data[MAX_MINUTES], before, after, crew_counts, friend_counts;
static Node sample_nodes[MAX_MINUTES][SAMPLE_NODES];
static Flow sample_flows[MAX_MINUTES][SAMPLE_FLOWS];
static int node_counts[MAX_MINUTES], flow_counts[MAX_MINUTES], outage_frames[MAX_MINUTES];
static int max_thread_slots,max_lora_slots,local_during_outage,reactor_dependent;
static u32 random_state;
static int cached_attendees,cached_minutes,cached_outage,cached_reactor,cached_sample;

void *memset(void *dest, int value, unsigned long n) {
  volatile unsigned char *p=(volatile unsigned char *)dest;
  for(unsigned long i=0;i<n;i++) p[i]=(unsigned char)value;
  return dest;
}
void *memcpy(void *dest, const void *src, unsigned long n) {
  unsigned char *p=(unsigned char *)dest; const unsigned char *q=(const unsigned char *)src;
  for(unsigned long i=0;i<n;i++) p[i]=q[i];
  return dest;
}
static double sqrtd(double a) { return __builtin_sqrt(a); }
static double floord(double a) { return __builtin_floor(a); }
static double distance_xy(double x,double y,double xx,double yy) {
  double dx=x-xx,dy=y-yy;
  return sqrtd(dx*dx+dy*dy);
}
static double clamp(double v,double max) {
  return v<0?0:(v>max?max:v);
}
static u32 next_bits(void) {
  u32 x=random_state;
  x^=x<<13; x^=x>>17; x^=x<<5;
  random_state=x; return x;
}
static double random01(void) { return (double)next_bits()/4294967296.0; }
static int round_js(double x) { return (int)floord(x+0.5); }
static int station_for(const Person *p) {
  int best=-1;double nearest=1.e30;
  for(int i=0;i<8;i++){
    double dist=distance_xy(p->x,p->y,stations[i][0],stations[i][1]);
    if(dist<=245.0 && dist<nearest){best=i;nearest=dist;}
  }
  return best;
}
static int relay_for(const Person *a,const Person *b) {
  for(int i=0;i<2;i++) {
    if(distance_xy(a->x,a->y,relays[i][0],relays[i][1])<=830.0 &&
       distance_xy(b->x,b->y,relays[i][0],relays[i][1])<=830.0) return i;
  }
  return -1;
}
static void zero_counts(Counts *c) {
  c->attempted=0; c->modeled_delivered=0; c->not_delivered=0;
  c->local=0; c->cross=0; c->lora=0; c->capacity=0; c->coverage=0; c->modeled_loss=0;
}
static void mark_attempt(Counts **list) {
  for(int i=0;i<4;i++) list[i]->attempted++;
}
static void mark_result(Counts **list,int route,int failure) {
  for(int i=0;i<4;i++) {
    Counts *c=list[i];
    if(route) {
      c->modeled_delivered++;
      if(route==ROUTE_LOCAL)c->local++;
      else if(route==ROUTE_CROSS)c->cross++;
      else c->lora++;
    } else {
      c->not_delivered++;
      if(failure==FAIL_CAP)c->capacity++;
      else if(failure==FAIL_COVER)c->coverage++;
      else c->modeled_loss++;
    }
  }
}
static void add_flow(int minute,int tick,int source,const Person *a,const Person *b,int route) {
  if((source+tick)%4 || flow_counts[minute]>=SAMPLE_FLOWS)return;
  Flow *f=&sample_flows[minute][flow_counts[minute]++];
  f->x1=round_js(a->x);f->y1=round_js(a->y);
  f->x2=round_js(b->x);f->y2=round_js(b->y);f->route=route;
}
static void process_message(int from,int tick,int minute,int outage,int reactor,int sample) {
  Person *a=&people[from],*b=&people[a->friend_id];
  Counts *list[4]={&totals,&minutes_data[minute],outage?&after:&before,
    a->crew?&crew_counts:&friend_counts};
  mark_attempt(list);
  int sa=attached[from],sb=attached[a->friend_id];
  int route=ROUTE_NONE, failure=FAIL_COVER;
  if(sa>=0 && sb>=0) {
    int local=sa==sb;
    int gateway_ok=!outage||(reactor==0?(sa>=4&&sb>=4):(sa<4&&sb<4));
    if(local||gateway_ok) {
      if(thread_used[sa]<THREAD_BUDGET && thread_used[sb]<THREAD_BUDGET) {
        thread_used[sa]++;
        if(!local)thread_used[sb]++;
        if(random01()<(local?0.98:0.94))route=local?ROUTE_LOCAL:ROUTE_CROSS;
        else failure=FAIL_LOSS;
      }else failure=FAIL_CAP;
    }else reactor_dependent++;
  }
  if(!route) {
    int relay=relay_for(a,b);
    if(relay>=0) {
      if(lora_used[relay]<LORA_BUDGET) {
        lora_used[relay]++;
        if(random01()<0.82)route=ROUTE_LORA;
        else failure=FAIL_LOSS;
      }else failure=FAIL_CAP;
    } else if(failure!=FAIL_CAP && failure!=FAIL_LOSS) failure=FAIL_COVER;
  }
  if(outage&&route==ROUTE_LOCAL)local_during_outage++;
  if(sample)add_flow(minute,tick,from,a,b,route);
  mark_result(list,route,failure);
}
// returns 0 on success; invalid arguments are never coerced
int festival_run(int attendees,int minutes,int seed,int outage_at,int reactor,int sample) {
  if(attendees<2||attendees>MAX_PEOPLE||minutes<1||minutes>MAX_MINUTES||
     seed==0||outage_at>=minutes||outage_at< -1||reactor<0||reactor>1||
     (sample!=0&&sample!=1))return -1;
  cached_attendees=attendees;cached_minutes=minutes;cached_outage=outage_at;
  cached_reactor=reactor;cached_sample=sample;
  random_state=(u32)seed;
  zero_counts(&totals);zero_counts(&before);zero_counts(&after);
  zero_counts(&crew_counts);zero_counts(&friend_counts);
  for(int m=0;m<minutes;m++){
    zero_counts(&minutes_data[m]);node_counts[m]=0;flow_counts[m]=0;outage_frames[m]=0;
  }
  local_during_outage=reactor_dependent=max_thread_slots=max_lora_slots=0;
  int count=0;
  for(int start=0;start<attendees;start+=6) {
    double hx=60+random01()*(W-120),hy=60+random01()*(H-120);
    int size=(attendees-start)<6?(attendees-start):6;
    for(int j=0;j<size;j++) {
      Person *p=&people[count];
      p->x=clamp(hx+(random01()-.5)*95,W);
      p->y=clamp(hy+(random01()-.5)*95,H);
      p->home_x=hx;p->home_y=hy;
      p->friend_id=size==1?start-1:start+(j+1)%size;
      p->crew=count<(attendees*3+99)/100; // ceil(attendees*0.03)
      p->id=count;count++;
    }
  }
  int ticks=minutes*60/STEP;
  for(int tick=0;tick<ticks;tick++) {
    int minute=tick*STEP/60;
    int outage=outage_at!=-1&&minute>=outage_at;
    int towards=tick>=ticks*.25&&tick<ticks*.7;
    for(int i=0;i<attendees;i++) {
      Person *p=&people[i];
      double destx=(towards&&p->id%4!=0)?690:p->home_x;
      double desty=(towards&&p->id%4!=0)?240:p->home_y;
      double dx=destx-p->x,dy=desty-p->y;
      double length=sqrtd(dx*dx+dy*dy);
      if(length==0)length=1;
      double speed=2.5+random01()*4;
      double step=length<speed?length:speed;
      p->x=clamp(p->x+dx/length*step+(random01()-.5)*10,W);
      p->y=clamp(p->y+dy/length*step+(random01()-.5)*10,H);
      attached[i]=station_for(p);
    }
    for(int i=0;i<8;i++)thread_used[i]=0;
    lora_used[0]=lora_used[1]=0;
    int n=0;
    for(int i=0;i<attendees;i++){
      if(random01()<(people[i].crew?.17:.08))pending[n++]=i;
    }
    // Stable crew-first scheduling, matching JS reference ordering.
    for(int pass=1;pass>=0;pass--)
      for(int k=0;k<n;k++)
        if(people[pending[k]].crew==pass)
          process_message(pending[k],tick,minute,outage,reactor,sample);
    for(int i=0;i<8;i++)if(thread_used[i]>max_thread_slots)max_thread_slots=thread_used[i];
    for(int i=0;i<2;i++)if(lora_used[i]>max_lora_slots)max_lora_slots=lora_used[i];
    if(sample&&(tick+1)%(60/STEP)==0){
      outage_frames[minute]=outage;
      int stride=(attendees+SAMPLE_NODES-1)/SAMPLE_NODES;
      for(int i=0;i<attendees;i+=stride) {
        Node *n=&sample_nodes[minute][node_counts[minute]++];
        n->id=i;n->x=round_js(people[i].x);n->y=round_js(people[i].y);
        n->crew=people[i].crew;n->station=station_for(&people[i]);
      }
    }
  }
  return 0;
}
static int field(const Counts *c,int f) {
  switch(f){
    case 0:return c->attempted;
    case 1:return c->modeled_delivered;
    case 2:return c->not_delivered;
    case 3:return c->local;
    case 4:return c->cross;
    case 5:return c->lora;
    case 6:return c->capacity;
    case 7:return c->coverage;
    case 8:return c->modeled_loss;
    default:return -1;
  }
}
int festival_count(int bucket,int idx,int field_id) {
  if(field_id<0||field_id>8)return -1;
  if(bucket==0)return field(&totals,field_id);
  if(bucket==1&&idx>=0&&idx<cached_minutes)return field(&minutes_data[idx],field_id);
  if(bucket==2)return field(&before,field_id);
  if(bucket==3)return field(&after,field_id);
  if(bucket==4)return field(&crew_counts,field_id);
  if(bucket==5)return field(&friend_counts,field_id);
  return -1;
}
int festival_invariant(int which) {
  switch(which) {
    case 0:return max_thread_slots;
    case 1:return max_lora_slots;
    case 2:return local_during_outage;
    case 3:return reactor_dependent;
    default:return -1;
  }
}
int festival_node_count(int minute) {
  return cached_sample&&minute>=0&&minute<cached_minutes?node_counts[minute]:-1;
}
int festival_node_field(int minute,int index,int which) {
  if(!cached_sample||minute<0||minute>=cached_minutes||index<0||index>=node_counts[minute])return -1;
  Node *n=&sample_nodes[minute][index];
  switch(which) {
    case 0:return n->id;case 1:return n->x;case 2:return n->y;
    case 3:return n->crew;case 4:return n->station;default:return -1;
  }
}
int festival_flow_count(int minute) {
  return cached_sample&&minute>=0&&minute<cached_minutes?flow_counts[minute]:-1;
}
int festival_flow_field(int minute,int index,int which) {
  if(!cached_sample||minute<0||minute>=cached_minutes||index<0||index>=flow_counts[minute])return -1;
  Flow *f=&sample_flows[minute][index];
  switch(which) {
    case 0:return f->x1;case 1:return f->y1;case 2:return f->x2;
    case 3:return f->y2;case 4:return f->route;default:return -1;
  }
}
int festival_frame_outage(int minute){
  return cached_sample&&minute>=0&&minute<cached_minutes?outage_frames[minute]:-1;
}
