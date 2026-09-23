import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_CLIPS,enemyPose} from '../src/enemy.js';

test('la mort utilise la dernière rangée utile et l’étourdissement réutilise la blessure',()=>{
 assert.equal(ENEMY_CLIPS.death,6);
 assert.equal(ENEMY_CLIPS.stun,ENEMY_CLIPS.hit);
 assert.deepEqual(enemyPose({dead:true,deathTime:2},2),{clip:'death',frame:0});
 assert.deepEqual(enemyPose({dead:true,deathTime:2},3.15),{clip:'death',frame:9});
});
