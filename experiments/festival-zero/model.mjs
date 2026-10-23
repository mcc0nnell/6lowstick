// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Thin C/WASM interface and JSON schema adapter. No traffic simulation in JS.
// Node tests use a local generated WASM binary; Pages loads the same ABI via fetch.
const binaryUrl = new URL('./model.wasm', import.meta.url);
const binary = (typeof process !== 'undefined' && process.versions?.node)
  ? await (await import('node:fs/promises')).readFile(binaryUrl)
  : await (await fetch(binaryUrl)).arrayBuffer();
const {instance} = await WebAssembly.instantiate(binary);
const c = instance.exports;
const names = ['attempted','modeledDelivered','notDeliveredInModel',
  'threadLocal','threadGateway','loraRelay','capacity','coverage','modeledLoss'];
const stations = [[175,210],[525,210],[875,210],[1225,210],
  [175,790],[525,790],[875,790],[1225,790]];
const relays = [[310,500],[1090,500]];
const routeNames = ['unconfirmed','threadLocal','threadGateway','loraRelay'];
function counts(bucket, index = 0) {
  const v = names.map((_,k)=>c.festival_count(bucket,index,k));
  return {
    attempted:v[0],modeledDelivered:v[1],notDeliveredInModel:v[2],
    threadLocal:v[3],threadGateway:v[4],loraRelay:v[5],
    failures:{capacity:v[6],coverage:v[7],modeledLoss:v[8]}
  };
}
function percent(n,d) { return d ? Math.round(n / d * 10000) / 100 : null; }
function integer(n,min,max,name) {
  if(!Number.isSafeInteger(n)||n<min||n>max)
    throw new RangeError(name+' must be an integer between '+min+' and '+max);
}
export function simulateFestival({attendees=250,minutes=45,seed=6,
  reactorOutageAtMinute=null,reactor='north',capturePositions=false}={}) {
  integer(attendees,2,10000,'attendees');
  integer(minutes,1,360,'minutes');
  integer(seed,1,4294967295,'seed');
  if(!['north','south'].includes(reactor))throw new RangeError('reactor must be north or south');
  if(typeof capturePositions!=='boolean')throw new TypeError('capturePositions must be boolean');
  if(reactorOutageAtMinute!==null)
    integer(reactorOutageAtMinute,0,minutes-1,'reactorOutageAtMinute');
  const r=c.festival_run(attendees,minutes,seed|0,
    reactorOutageAtMinute??-1,reactor==='north'?0:1,Number(capturePositions));
  if(r!==0)throw new RangeError('C festival engine rejected parameters');
  const totals=counts(0),timeline=[];
  for(let m=0;m<minutes;m++)timeline.push({minute:m,...counts(1,m)});
  const report={
    schema:'6lowstick.festival-capacity-model.v0',
    simulation:true,physicalRf:false,real6lowLoop:false,realReceipts:false,
    parameters:{
      attendees,minutes,seed,reactorOutageAtMinute,reactor,
      venueMeters:{width:1400,height:1000},stepSeconds:15,
      stationCount:8,stations,stationRadiusMeters:245,
      relayCount:2,relays,relayRadiusMeters:830,
      budgetsPerStep:{threadPerStation:14,loraPerRelay:4},
      syntheticPerAttemptSuccess:{threadLocal:.98,threadGateway:.94,loraRelay:.82}
    },
    totals:{...totals,modeledDeliveryPercent:percent(totals.modeledDelivered,totals.attempted)},
    categories:{crew:counts(4),friends:counts(5)},
    segments:{beforeOutage:counts(2),afterOutage:counts(3)},
    timeline,
    invariants:{
      maxThreadStationSlots:c.festival_invariant(0),
      maxLoRaRelaySlots:c.festival_invariant(1),
      localThreadDuringOutage:c.festival_invariant(2),
      reactorDependentDuringOutage:c.festival_invariant(3)
    }
  };
  if(capturePositions){
    report.frames=[];
    for(let m=0;m<minutes;m++){
      const nodes=[],flows=[];
      for(let j=0;j<c.festival_node_count(m);j++){
        nodes.push({
          id:c.festival_node_field(m,j,0),x:c.festival_node_field(m,j,1),
          y:c.festival_node_field(m,j,2),crew:Boolean(c.festival_node_field(m,j,3)),
          station:c.festival_node_field(m,j,4)
        });
      }
      for(let j=0;j<c.festival_flow_count(m);j++){
        flows.push({
          from:[c.festival_flow_field(m,j,0),c.festival_flow_field(m,j,1)],
          to:[c.festival_flow_field(m,j,2),c.festival_flow_field(m,j,3)],
          route:routeNames[c.festival_flow_field(m,j,4)]
        });
      }
      report.frames.push({minute:m,outage:Boolean(c.festival_frame_outage(m)),flows,nodes});
    }
  }
  report.caveat='Synthetic crowd/capacity model. No path loss, MAC contention, interference, regulated airtime, queueing, signed receipt, physical notification or human detection.';
  return report;
}
