// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Offline DOM-contract smoke: tests JS event wiring, NOT browser pixels or a radio.
import assert from 'node:assert/strict';
const ids=new Map();
const listeners=new Map();
const methods=['beginPath','clearRect','fill','fillRect','stroke','strokeRect','arc',
  'moveTo','lineTo','quadraticCurveTo','setLineDash','fillText','roundRect'];
const context={createLinearGradient:()=>({addColorStop(){}})};
for(const method of methods)context[method]=()=>{};
function node(id='anonymous') {
  const el={
    id,textContent:'',value:'',checked:false,disabled:false,children:[],
    classList:{toggle(){}},
    setAttribute(k,v){this[k]=v;},
    addEventListener(kind,fn){listeners.set(id+':'+kind,fn);},
    replaceChildren(...children){this.children=children;},
    append(...children){this.children.push(...children);},
    remove(){},
    getContext(){return context;}
  };
  return el;
}
globalThis.document={
  getElementById(id){if(!ids.has(id))ids.set(id,node(id));return ids.get(id);},
  createElement(tag){return node(tag);},
  createElementNS(ns,tag){return node(tag);},
  body:node('body')
};
globalThis.window={
  matchMedia:()=>({matches:false}),
  setInterval:()=>42,clearInterval:()=>{},
  setTimeout:()=>42
};
await import('../site/zero/zero.js');
const $=id=>document.getElementById(id);
function fire(id,kind,value) {
  const handler=listeners.get(id+':'+kind);
  assert.ok(handler,'Missing handler for '+id+':'+kind);
  handler({target:{value,checked:value}});
}
assert.match($('status').textContent,/Minute 1 of 45/);
assert.equal($('north')['aria-pressed'],'false');
fire('minute','input',23);
fire('north','click');
assert.equal($('north')['aria-pressed'],'true');
assert.equal($('northState').textContent,'ISOLATED');
assert.match($('status').textContent,/Minute 24 of 45/);
fire('south','click');
assert.equal($('south')['aria-pressed'],'true');
assert.equal($('southState').textContent,'ISOLATED');
fire('restore','click');
assert.equal($('northState').textContent,'ONLINE');
assert.equal($('southState').textContent,'ONLINE');
fire('crowd','change','2000');
assert.match($('minuteLabel').textContent,/01 \/ 45/);
assert.ok($('trend').children.length>0);
assert.ok($('evidenceRows').children.length>0);
fire('play','click');
assert.match($('play').textContent,/PAUSE/);
fire('play','click');
assert.match($('play').textContent,/PLAY/);
console.log(JSON.stringify({status:'PASS',kind:'mocked-DOM-event-smoke',
  browserPixelsVerified:false,radioVerified:false}));
