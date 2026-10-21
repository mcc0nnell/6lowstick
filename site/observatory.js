// Static, read-only visualization of synthetic research traces.
const select=document.querySelector('#scenario'), summary=document.querySelector('#summary'),detail=document.querySelector('#detail'),rows=document.querySelector('#attemptRows');
const network=window.echarts?.init(document.querySelector('#network'));
const attempts=window.echarts?.init(document.querySelector('#attempts'));
const safe=(value)=>String(value??'unknown');
let scenarios=[];
function show(index){
 const item=scenarios[index];if(!item)return;
 select.value=String(index);const r=item.receipt;
 summary.replaceChildren();const heading=document.createElement('h3');heading.textContent=item.scenario.replaceAll('_',' ');summary.append(heading);
 const status=document.createElement('p');status.textContent=`Application status: ${r.status}. Confirmed route: ${r.confirmedRoute??'none'}. Human acknowledged: no. Physical radio verified: no.`;summary.append(status);
 detail.textContent=JSON.stringify({scenario:item.scenario,attempts:r.attempts,receiverEvents:item.receiverEvents},null,2);
 rows.replaceChildren();for(const a of r.attempts){const tr=document.createElement('tr');for(const v of [a.step,a.route,a.outcome]){const td=document.createElement('td');td.textContent=safe(v);tr.append(td)}rows.append(tr)}
 if(!network||!attempts)return;
 const nodes=[{id:'gateway',name:'Synthetic gateway',x:80,y:150,symbolSize:68,category:0},{id:'thread',name:'Thread\n(simulated)',x:280,y:65,symbolSize:62,category:1},{id:'lora-p2p',name:'LoRa P2P\n(simulated)',x:280,y:240,symbolSize:62,category:1},{id:'haptic',name:'Haptic\n(simulated)',x:490,y:150,symbolSize:72,category:2}];
 const links=r.attempts.flatMap(a=>[{source:'gateway',target:a.route,lineStyle:{color:a.outcome==='authenticated_app_receipt'?'#68e4be':'#e8ae65',width:4,type:a.outcome==='authenticated_app_receipt'?'solid':'dashed'}},{source:a.route,target:'haptic',lineStyle:{color:a.outcome==='authenticated_app_receipt'?'#68e4be':'#e8ae65',width:3,type:'dashed'}}]);
 network.setOption({backgroundColor:'transparent',tooltip:{trigger:'item',formatter:p=>p.dataType==='edge'?'Logical simulated attempt — see evidence table':safe(p.data.name)},series:[{type:'graph',layout:'none',roam:false,label:{show:true,color:'#f1f8fc',fontSize:12,position:'bottom'},data:nodes,links,categories:[{name:'gateway'},{name:'synthetic transport'},{name:'receiver'}],itemStyle:{color:'#277b94',borderColor:'#91e5d0',borderWidth:2},lineStyle:{curveness:.1},emphasis:{focus:'adjacency'}}]},true);
 attempts.setOption({grid:{left:110,right:24,top:15,bottom:45},xAxis:{type:'value',min:0,max:1,axisLabel:{color:'#dceef7'}},yAxis:{type:'category',data:r.attempts.map(a=>`${a.step}: ${a.route}`),axisLabel:{color:'#dceef7'}},series:[{type:'bar',data:r.attempts.map(a=>({value:1,itemStyle:{color:a.outcome==='authenticated_app_receipt'?'#68e4be':'#e8ae65'}})),barWidth:28,label:{show:true,position:'inside',formatter:p=>r.attempts[p.dataIndex].outcome,color:'#061522'}}]},true);
}
async function init(){try{const res=await fetch('./multiradio.json');if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.json();if(data.schema!=='6lowstick.multiradio-research.v0'||data.physicalRadio!==false||!Array.isArray(data.scenarios))throw Error('Unsupported evidence schema');scenarios=data.scenarios;scenarios.forEach((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=s.scenario.replaceAll('_',' ');select.append(o)});show(0)}catch(e){summary.textContent='Evidence unavailable: '+e.message;detail.textContent='No simulation trace loaded.'}}
select.addEventListener('change',()=>show(Number(select.value)));document.querySelector('#previous').addEventListener('click',()=>show((Number(select.value)-1+scenarios.length)%scenarios.length));document.querySelector('#next').addEventListener('click',()=>show((Number(select.value)+1)%scenarios.length));window.addEventListener('resize',()=>{network?.resize();attempts?.resize()});init();
