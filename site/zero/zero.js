// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Standalone, browser-local replay. No telemetry, Matrix, RF or network write path.
import {simulateFestival} from './model.mjs';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const canvas = $('venue');
const ctx = canvas.getContext('2d');
const state = {crowd:250, minute:0, reactor:null, outageAt:null,
  reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  playing:false, timer:null, report:null};
const fmt = n => Number(n).toLocaleString('en-US');
const rate = c => c.attempted ? Math.round(10000*c.modeledDelivered/c.attempted)/100 : 0;

function stop() {
  if (state.timer !== null) window.clearInterval(state.timer);
  state.timer = null; state.playing = false; $('play').textContent = '▶ PLAY REPLAY';
}
function compute() {
  stop();
  state.report = simulateFestival({
    attendees:state.crowd,minutes:45,seed:6,capturePositions:true,
    reactor:state.reactor || 'north',reactorOutageAtMinute:state.reactor ? state.outageAt : null
  });
  render();
}
function setCrowd(value) {
  state.crowd = Number(value); state.minute = 0;
  state.reactor = null; state.outageAt = null;
  compute();
}
function fault(reactor) {
  if (state.reactor === reactor) { state.reactor = null; state.outageAt = null; }
  else { state.reactor = reactor; state.outageAt = state.minute; }
  compute();
}
function minuteTo(value) {
  state.minute = Math.max(0,Math.min(44,Number(value)));
  render();
}
function advance() {
  if (state.minute >= 44) { stop(); return; }
  state.minute++;render();
}
function playback() {
  if (state.playing) {stop();return;}
  if (state.minute === 44) state.minute=0;
  if (state.reduced) {advance();return;}
  state.playing=true; $('play').textContent='Ⅱ PAUSE REPLAY';
  state.timer=window.setInterval(advance,460);
  render();
}
function draw() {
  if (!ctx) return;
  const width=1400,height=1000, p=state.report.parameters;
  const frame=state.report.frames[state.minute];
  const outage=frame.outage;
  ctx.clearRect(0,0,width,height);
  const fill=ctx.createLinearGradient(0,0,0,height);
  fill.addColorStop(0,'#102b30');fill.addColorStop(1,'#0b1724');
  ctx.fillStyle=fill;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#36556044';ctx.lineWidth=1;
  for(let x=0;x<=width;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=0;y<=height;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  ctx.fillStyle='#1a3137';
  ctx.fillRect(40,640,1320,310);
  ctx.strokeStyle='#294750';ctx.lineWidth=3;
  ctx.setLineDash([8,12]);ctx.strokeRect(40,640,1320,310);ctx.setLineDash([]);
  ctx.font='bold 22px ui-monospace,monospace';ctx.fillStyle='#99c2bb';ctx.fillText('CAMP / SOUTH FIELD',65,685);
  // All coverage is an assumed Euclidean circle. No measured RF contours.
  p.stations.forEach(([x,y],i)=>{
    ctx.beginPath();ctx.arc(x,y,p.stationRadiusMeters,0,Math.PI*2);
    ctx.fillStyle='rgba(64,211,202,.055)';ctx.fill();
    ctx.strokeStyle='#4eb4b55f';ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#70e6de';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c5eced';ctx.font='bold 20px ui-monospace,monospace';
    ctx.fillText('T'+(i+1),x+18,y-13);
  });
  p.relays.forEach(([x,y],i)=>{
    // Relay reach rings are geometric assumptions, not actual range predictions.
    ctx.beginPath();ctx.arc(x,y,p.relayRadiusMeters,0,Math.PI*2);
    ctx.strokeStyle='#ffba6928';ctx.lineWidth=2;ctx.setLineDash([15,20]);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(x,y,16,0,Math.PI*2);ctx.fillStyle='#ffb679';ctx.fill();
    ctx.fillStyle='#ffe0ae';ctx.font='bold 20px ui-monospace,monospace';ctx.fillText('L'+(i+1),x+23,y+7);
  });
  // Reactors are application gateways; local Thread stations retain modeled service.
  const reactors=[{name:'N',x:700,y:105,down:outage&&state.reactor==='north'},
    {name:'S',x:700,y:886,down:outage&&state.reactor==='south'}];
  reactors.forEach(r=>{
    ctx.strokeStyle=r.down?'#f38580b0':'#b8f65c66';ctx.lineWidth=3;
    ctx.setLineDash(r.down?[4,12]:[8,10]);
    const indices=r.name==='N'?[0,1,2,3]:[4,5,6,7];
    for(const i of indices){
      ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(p.stations[i][0],p.stations[i][1]);ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle=r.down?'#812d3d':'#2b513e';ctx.fillRect(r.x-36,r.y-28,72,54);
    ctx.strokeStyle=r.down?'#f38580':'#b8f65c';ctx.strokeRect(r.x-36,r.y-28,72,54);
    ctx.fillStyle=r.down?'#fbd0cc':'#d8ff9f';ctx.font='bold 21px ui-monospace,monospace';ctx.textAlign='center';
    ctx.fillText('R-'+r.name,r.x,r.y+7);ctx.textAlign='left';
  });
  // Stage zone is a destination chosen by the synthetic movement function.
  ctx.beginPath();ctx.roundRect(590,187,200,75,14);ctx.fillStyle='#364142';ctx.fill();
  ctx.strokeStyle='#b8f65c';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#d2fa91';ctx.textAlign='center';ctx.font='bold 28px ui-monospace,monospace';
  ctx.fillText('STAGE',690,233);ctx.textAlign='left';
  // Model-observed route decisions, sampled and bounded. NOT actual RF packets.
  frame.flows.forEach(f=>{
    const colors={threadLocal:'#75e8dfbb',threadGateway:'#b8f65cae',
      loraRelay:'#ffb679b5',unconfirmed:'#f3858099'};
    const [sx,sy]=f.from,[tx,ty]=f.to;
    ctx.beginPath();ctx.moveTo(sx,sy);
    ctx.quadraticCurveTo((sx+tx)/2,(sy+ty)/2-24,tx,ty);
    ctx.strokeStyle=colors[f.route];ctx.lineWidth=f.route==='unconfirmed'?3:2;
    ctx.setLineDash(f.route==='unconfirmed'?[8,7]:[]);ctx.stroke();ctx.setLineDash([]);
  });
  // Attachment hints for a sparse sample; NOT packet traces.
  frame.nodes.filter((_,i)=>i%4===0).forEach(n=>{
    if(n.station<0)return;
    const s=p.stations[n.station];ctx.strokeStyle='#71e5da26';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(s[0],s[1]);ctx.stroke();
  });
  frame.nodes.forEach(n=>{
    ctx.beginPath();ctx.arc(n.x,n.y,n.crew?8:6,0,Math.PI*2);
    ctx.fillStyle=n.crew?'#e9baff':n.station>=0?'#bbf975':'#889aa0';ctx.fill();
  });
  // Highlight the isolated Reactor only once the simulated failure starts.
  if(outage) {
    ctx.strokeStyle='#f38580';ctx.lineWidth=4;ctx.strokeRect(12,12,width-24,height-24);
    ctx.fillStyle='#f38580';ctx.font='bold 23px ui-monospace,monospace';
    ctx.fillText('MODELED REACTOR OUTAGE',28,47);
  }
}
function trend() {
  const svg=$('trend');svg.replaceChildren();
  const data=state.report.timeline.map(rate);
  const point=(i,percentage)=>[14+i*292/44,105-percentage*.92];
  const path=data.map((v,i)=>{const [x,y]=point(i,v);return (i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);}).join(' ');
  const el=(tag,attrs)=>{const e=document.createElementNS(NS,tag);
    for(const [key,val] of Object.entries(attrs)) e.setAttribute(key,String(val));
    return e;};
  for(const y of [25,50,75,100])svg.append(el('line',{x1:14,x2:306,y1:105-y*.92,y2:105-y*.92,stroke:'#4a6b72','stroke-dasharray':'3 6'}));
  svg.append(el('path',{d:path,stroke:'#b8f65c','stroke-width':2,fill:'none'}));
  const [x,y]=point(state.minute,data[state.minute]);
  svg.append(el('line',{x1:x,x2:x,y1:10,y2:109,stroke:'#fbb77f','stroke-dasharray':'3 5'}));
  svg.append(el('circle',{cx:x,cy:y,r:5,fill:'#fbb77f',stroke:'#081319','stroke-width':2}));
  const zero=el('text',{x:14,y:119,fill:'#9eb9be','font-size':10});
  zero.textContent='0';svg.append(zero);
  const end=el('text',{x:306,y:119,fill:'#9eb9be','font-size':10,'text-anchor':'end'});
  end.textContent='45 MIN';svg.append(end);
}
function advisory(c) {
  const missed=c.failures.capacity;
  if(state.reactor && state.minute>=state.outageAt) {
    $('advisoryTitle').textContent='Gateway partition introduced';
    $('advisory').textContent='Modeled '+state.reactor+' Reactor forwarding is off from minute '+
      (state.outageAt+1)+'. Same-station Thread remains available. Compare local and fallback counts; test alternate placement before drawing conclusions.';
  } else if(c.attempted>0 && missed/c.attempted>.2) {
    $('advisoryTitle').textContent='Capacity is the dominant limit';
    $('advisory').textContent=fmt(missed)+' attempts exceeded synthetic capacity this minute. Next bounded experiment: vary per-station slots or reduce friend-ping frequency. No radio instruction was sent.';
  } else {
    $('advisoryTitle').textContent='Baseline under observation';
    $('advisory').textContent='Current minute shows '+fmt(c.attempted)+' synthetic message attempts. Explore stage crowding, increase attendee count, or isolate a Reactor to compare modeled changes.';
  }
}
function render() {
  const c=state.report.timeline[state.minute], outage=state.report.frames[state.minute].outage;
  $('minute').value=String(state.minute);
  $('minuteLabel').textContent=String(state.minute+1).padStart(2,'0')+' / 45';
  $('delivered').textContent=rate(c).toFixed(1)+'%';
  $('attempted').textContent=fmt(c.attempted);
  $('capacity').textContent=fmt(c.failures.capacity);
  $('fallback').textContent=fmt(c.loraRelay);
  $('local').textContent=fmt(c.threadLocal);
  $('cross').textContent=fmt(c.threadGateway);
  $('lora').textContent=fmt(c.loraRelay);
  $('missing').textContent=fmt(c.notDeliveredInModel);
  $('northState').textContent=outage&&state.reactor==='north'?'ISOLATED':'ONLINE';
  $('southState').textContent=outage&&state.reactor==='south'?'ISOLATED':'ONLINE';
  $('northState').classList.toggle('down',outage&&state.reactor==='north');
  $('southState').classList.toggle('down',outage&&state.reactor==='south');
  $('incident').textContent=outage?'Modeled '+state.reactor+' Reactor cannot forward inter-station traffic. Local stations still operate.':
    state.reactor?'Reactor fault scheduled at minute '+(state.outageAt+1)+'.':'Both modeled Reactors can forward cross-station traffic.';
  $('north').setAttribute('aria-pressed',String(state.reactor==='north'));
  $('south').setAttribute('aria-pressed',String(state.reactor==='south'));
  $('restore').disabled=state.reactor===null;
  $('status').textContent='Minute '+(state.minute+1)+' of 45 · '+fmt(c.attempted)+' attempted · '+
    fmt(c.modeledDelivered)+' modeled delivered · '+fmt(c.notDeliveredInModel)+' not delivered in model.';
  $('evidenceRows').replaceChildren();
  for(const [label,value] of [
    ['Local Thread model outcomes',c.threadLocal],
    ['Cross-station Thread model outcomes',c.threadGateway],
    ['LoRa relay model outcomes',c.loraRelay],
    ['Coverage exclusions',c.failures.coverage],
    ['Capacity exclusions',c.failures.capacity],
    ['Synthetic random losses',c.failures.modeledLoss],
    ['Displayed sampled positions',state.report.frames[state.minute].nodes.length]
  ]) {
    const tr=document.createElement('tr');
    const name=document.createElement('td');name.textContent=label;
    const number=document.createElement('td');number.textContent=fmt(value);
    tr.append(name,number);$('evidenceRows').append(tr);
  }
  $('back').disabled=state.minute===0;
  $('forward').disabled=state.minute===44;
  advisory(c);draw();trend();
}
function download() {
  const blob=new Blob([JSON.stringify(state.report,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='6low-zero-'+state.crowd+'-'+(state.reactor||'baseline')+'-seed6.json';
  document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('crowd').addEventListener('change',e=>setCrowd(e.target.value));
$('north').addEventListener('click',()=>fault('north'));
$('south').addEventListener('click',()=>fault('south'));
$('restore').addEventListener('click',()=>{state.reactor=null;state.outageAt=null;compute();});
$('minute').addEventListener('input',e=>{stop();minuteTo(e.target.value);});
$('back').addEventListener('click',()=>{stop();minuteTo(state.minute-1);});
$('forward').addEventListener('click',()=>{stop();minuteTo(state.minute+1);});
$('play').addEventListener('click',playback);
$('reduced').addEventListener('change',e=>{state.reduced=e.target.checked;if(state.reduced)stop();});
$('download').addEventListener('click',download);
$('reduced').checked=state.reduced;
compute();
