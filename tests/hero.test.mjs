import test from 'node:test';
import assert from 'node:assert/strict';
import {heroDirection,heroFrameIndex} from '../src/hero.js';

test('les dix images de course défilent avant de revenir au départ',()=>{
 const p={walk:0};
 assert.deepEqual(Array.from({length:10},(_,i)=>{p.walk=i*.65;return heroFrameIndex('run',p,0);}),[0,1,2,3,4,5,6,7,8,9]);
 p.walk=6.5;assert.equal(heroFrameIndex('run',p,0),0);
});

test('les images d’impact coïncident avec les instants de combat et de soin',()=>{
 for(const [kind,hit,duration] of [['light',.14,.46],['heavy',.38,.87]]){
  const p={action:{kind,time:hit-.001,duration}};
  assert.equal(heroFrameIndex(kind,p,0),4);
  p.action.time=hit;assert.equal(heroFrameIndex(kind,p,0),5);
  p.action.time=duration;assert.equal(heroFrameIndex(kind,p,0),9);
 }
 const p={action:{kind:'heal',time:.849,duration:1.05}};
 assert.equal(heroFrameIndex('heal',p,0),5);
 p.action.time=.85;assert.equal(heroFrameIndex('heal',p,0),6);
 p.action.time=1.05;assert.equal(heroFrameIndex('heal',p,0),9);
});

test('la blessure et la mort vont jusqu’à leur dernière image',()=>{
 const p={hitReact:.3,hitReactMax:.3};
 assert.equal(heroFrameIndex('hurt',p,0),0);
 p.hitReact=.01;assert.equal(heroFrameIndex('hurt',p,0),9);
 assert.equal(heroFrameIndex('death',p,0,1.5),0);
 assert.equal(heroFrameIndex('death',p,0,0),9);
});

test('les orientations distinguent face, dos et profil retourné',()=>{
 assert.deepEqual(heroDirection(Math.PI/2),{sheet:'front',view:0,flip:false});
 assert.deepEqual(heroDirection(-Math.PI/2),{sheet:'front',view:1,flip:false});
 assert.deepEqual(heroDirection(0),{sheet:'side',view:0,flip:false});
 assert.deepEqual(heroDirection(Math.PI),{sheet:'side',view:0,flip:true});
});
