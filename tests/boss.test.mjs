import test from 'node:test';
import assert from 'node:assert/strict';
import {bossDirection,bossPose} from '../src/boss.js';

const boss={face:0,dead:false,state:'idle',timer:0,wind:1,recover:1.15,
 attackKind:'sweep',phase:1,hitReact:0};

test('le boss possède quatre vues distinctes',()=>{
 assert.deepEqual([0,Math.PI/2,Math.PI,-Math.PI/2].map(bossDirection),[2,0,3,1]);
});

test('les trois attaques, le déplacement et la mort ont leurs propres séquences',()=>{
 assert.equal(bossPose({...boss,state:'chase'},.35).clip,'move');
 for(const kind of ['sweep','charge','slam']){
  const wind=bossPose({...boss,state:'windup',attackKind:kind,timer:.4},1);
  assert.equal(wind.clip,'windup');
  const attack=bossPose({...boss,state:kind==='charge'?'charge':'recover',attackKind:kind,timer:kind==='charge'?.28:1.0},1);
  assert.equal(attack.clip,kind);
  assert.ok(attack.frame>0);
 }
 const early=bossPose({...boss,dead:true,deathTime:4},4);
 const late=bossPose({...boss,dead:true,deathTime:4},5.2);
 assert.equal(early.clip,'death');assert.equal(early.frame,0);assert.equal(late.frame,9);
});
