import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,update,startAction,hurtPlayer,hurtEnemy,respawn,interact,upgrade,serialize,sanitizeSave,blocked,move,makeEnemy,enterVeille,WORLD,TILE,SHRINE,GATE,TALISMAN,FOG,clearSight} from '../src/core.js';
const advance=(s,seconds,input={})=>{for(let t=0;t<seconds;t+=.02)update(s,input,.02);};
test('les diagonales ne donnent pas de vitesse supplémentaire',()=>{const a=createGame(),b=createGame();a.enemies=[];b.enemies=[];const ax=a.player.x,ay=a.player.y;advance(a,.25,{x:1});advance(b,.25,{x:1,y:1});assert.ok(Math.abs(Math.hypot(a.player.x-ax,a.player.y-ay)-Math.hypot(b.player.x-ax,b.player.y-ay))<.01);});
test('un déplacement rapide ne traverse pas les murs',()=>{const s=createGame();s.player.x=6*TILE;s.player.y=49*TILE;move(s,s.player,-600,0);assert.ok(s.player.x>5*TILE);assert.equal(blocked(s,s.player.x,s.player.y),false);});
test('esquive : coût, invulnérabilité et fin de protection',()=>{const s=createGame();s.enemies=[];assert.equal(startAction(s,'roll',{x:1}),true);assert.equal(s.player.stamina,73);assert.equal(hurtPlayer(s,20),false);advance(s,.5);assert.equal(hurtPlayer(s,20),true);assert.equal(s.player.hp,80);});
test('endurance insuffisante et engagement empêchent les attaques',()=>{const s=createGame();s.player.stamina=20;assert.equal(startAction(s,'light'),false);s.player.stamina=100;assert.equal(startAction(s,'heavy'),true);assert.equal(startAction(s,'roll'),false);});
test('un coup touche une seule fois et dans la direction visée',()=>{const s=createGame();s.player.x=37*TILE;s.player.y=50*TILE;s.player.face=0;const e=makeEnemy('penitent',s.player.x+35,s.player.y,99);e.state='stun';e.timer=3;s.enemies=[e];startAction(s,'light');advance(s,.5);assert.equal(e.hp,38);});
test('un impact suspend brièvement le combat, secoue l’écran et repousse la cible',()=>{const s=createGame();s.player.x=37*TILE;s.player.y=50*TILE;const e=makeEnemy('penitent',s.player.x+42,s.player.y,99);s.enemies=[e];const before=e.x;hurtEnemy(s,e,27);assert.equal(s.hitStop,.038);assert.equal(s.shake,2.25);assert.ok(s.effects.some(f=>f.impact&&!f.heavy));update(s,{},.04);assert.equal(e.x,before);update(s,{},.02);assert.ok(e.x>before);hurtEnemy(s,e,49,true);assert.equal(s.hitStop,.082);assert.equal(s.shake,4.8);assert.ok(s.effects.some(f=>f.impact&&f.heavy));assert.equal(e.state,'stun');});
test('soin retardé, interruptible, et fioles limitées',()=>{const s=createGame();s.enemies=[];s.player.hp=20;startAction(s,'heal');assert.equal(s.player.flasks,2);advance(s,.4);assert.equal(s.player.hp,20);hurtPlayer(s,5);advance(s,1);assert.equal(s.player.hp,15);startAction(s,'heal');advance(s,1.1);assert.equal(s.player.hp,63);});
test('mort, récupération, seconde mort et progression persistante',()=>{const s=createGame();s.player.souls=75;s.progress.shortcut=true;hurtPlayer(s,999);assert.equal(s.drop.amount,75);assert.equal(s.player.souls,0);respawn(s);s.player.x=s.drop.x;s.player.y=s.drop.y+25; // hors du rayon prioritaire du refuge
 s.drop.x=35*TILE;s.drop.y=50*TILE;s.player.x=s.drop.x;s.player.y=s.drop.y;
 interact(s);assert.equal(s.player.souls,75);assert.equal(s.drop,null);s.player.invulnerable=0;hurtPlayer(s,999);respawn(s);s.player.invulnerable=0;hurtPlayer(s,999);assert.equal(s.drop,null);assert.equal(s.progress.shortcut,true);});
test('la grille ne s’ouvre que depuis le côté clocher',()=>{const s=createGame();s.player.x=GATE.x+GATE.w/2;s.player.y=GATE.y+40;interact(s);assert.equal(s.progress.shortcut,false);s.player.y=GATE.y-30;interact(s);assert.equal(s.progress.shortcut,true);});
test('talisman et améliorations sont sauvegardés sans double collecte',()=>{const s=createGame();s.player.x=TALISMAN.x;s.player.y=TALISMAN.y;interact(s);assert.equal(s.progress.talisman,true);s.player.souls=100;assert.equal(upgrade(s,'vigor'),true);assert.equal(s.player.maxHp,120);assert.equal(s.player.souls,60);const loaded=createGame(serialize(s));assert.equal(loaded.player.maxHp,120);assert.equal(loaded.progress.talisman,true);assert.equal(loaded.player.souls,60);});
test('sauvegarde malformée : valeurs invalides ignorées ou bornées',()=>{assert.equal(sanitizeSave({version:2}),null);const s=createGame({version:1,vigor:Infinity,souls:-80,healing:99,drop:{x:NaN,y:1},collected:['x',1]});assert.equal(s.player.maxHp,100);assert.equal(s.player.souls,0);assert.equal(s.progress.healing,3);assert.equal(s.drop,null);});
test('boss : deuxième phase, victoire et absence après rechargement',()=>{const s=createGame();const boss=s.enemies.find(e=>e.type==='boss');s.player.x=17*TILE;s.player.y=20*TILE;advance(s,.02);assert.equal(s.bossActive,true);hurtEnemy(s,boss,340);advance(s,.4);assert.equal(boss.phase,2);hurtEnemy(s,boss,999);assert.equal(s.progress.bossDefeated,true);assert.equal(s.bossActive,false);assert.equal(createGame(serialize(s)).enemies.find(e=>e.type==='boss').dead,true);});
test('toutes les zones clés sont accessibles sans ouvrir le raccourci',()=>{const s=createGame();const start=[Math.floor(s.player.x/TILE),Math.floor(s.player.y/TILE)];const seen=new Set([start.join(',')]),queue=[start];for(let k=0;k<queue.length;k++){const[x,y]=queue[k];for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&!blocked(s,nx*TILE+16,ny*TILE+16,10)){seen.add(key);queue.push([nx,ny]);}}}for(const[x,y]of [[35,49],[60,43],[44,25],[17,20],[75,15],[17,32]])assert.ok(seen.has(x+','+y),`inaccessible : ${x},${y}`);});
test('un ennemi derrière une paroi ne voit pas le pèlerin',()=>{const s=createGame();assert.equal(clearSight(s,{x:24*TILE,y:40*TILE},{x:30*TILE,y:40*TILE}),false);});
test('la veille : monde durci, fiole de plus, cycle sauvegardé',()=>{
 const s=createGame({version:1,cycle:1,souls:50,vigor:3});
 assert.equal(s.player.flasks,4);
 const e=s.enemies.find(x=>x.type==='penitent');
 assert.equal(e.maxHp,91);assert.equal(e.damage,27);
 const boss=s.enemies.find(x=>x.type==='boss');
 assert.equal(boss.maxHp,910);assert.equal(boss.damage,39);
 interact(s);assert.equal(s.player.flasks,4);
 const loaded=createGame(serialize(s));
 assert.equal(loaded.progress.cycle,1);assert.equal(loaded.player.flasks,4);assert.equal(loaded.player.maxHp,160);
 assert.equal(sanitizeSave({version:1,cycle:9}).cycle,3);
 assert.equal(sanitizeSave({version:1}).cycle,0);
});
test('la veille s’ouvre après la victoire et relève le serment du cycle',()=>{
 const s=createGame();
 assert.equal(enterVeille(s),false);
 const boss=s.enemies.find(x=>x.type==='boss');s.player.x=17*TILE;s.player.y=20*TILE;s.bossActive=true;
 hurtEnemy(s,boss,999);
 assert.equal(s.progress.bossDefeated,true);
 assert.equal(enterVeille(s),true);
 assert.equal(s.progress.cycle,1);assert.equal(s.progress.bossDefeated,false);
 assert.equal(s.enemies.find(x=>x.type==='boss').dead,false);
 assert.equal(s.enemies.find(x=>x.type==='boss').maxHp,910); // durci, re-vivable
 s.player.x=17*TILE;s.player.y=20*TILE;s.player.invulnerable=0;advance(s,.06); // le hitstop du coup fatal pass
 assert.equal(s.bossActive,true);
 hurtEnemy(s,s.enemies.find(x=>x.type==='boss'),910); // le cycle 2 peut être achevé
 assert.equal(s.progress.bossDefeated,true);
});
test('la parade est purement défensive : aucun dégât pendant le geste',()=>{
 const s=createGame();s.player.x=37*TILE;s.player.y=50*TILE;s.player.face=0;
 const e=makeEnemy('penitent',s.player.x+40,s.player.y,99);e.face=Math.PI;e.state='windup';e.timer=2;s.enemies=[e];
 assert.equal(startAction(s,'parry'),true);
 advance(s,.7); // toute la durée du geste, sans riposte
 assert.equal(e.hp,65);assert.equal(e.flash,0);assert.equal(s.hitStop,0);
 assert.equal(s.player.hp,s.player.maxHp);assert.equal(s.player.action,null);
});
test('la parade renverse un assaillant de front et la riposte est fatale',()=>{
 const s=createGame();s.player.x=37*TILE;s.player.y=50*TILE;s.player.face=0;
 const e=makeEnemy('penitent',s.player.x+40,s.player.y,99);e.face=Math.PI;e.state='windup';e.timer=2;s.enemies=[e];
 assert.equal(startAction(s,'parry'),true);
 advance(s,.1);assert.equal(hurtPlayer(s,19,e),'parry');
 assert.equal(s.player.hp,s.player.maxHp);assert.equal(e.state,'stun');assert.ok(e.parried);
 assert.equal(startAction(s,'light',{x:1}),true);advance(s,.4);
 assert.equal(e.dead,true);assert.equal(s.player.souls,14);assert.equal(s.kills,1);
});
test('la parade rate hors de la fenêtre, et ne couvre ni projectile ni charge',()=>{
 const s=createGame();s.player.x=37*TILE;s.player.y=50*TILE;
 const e=makeEnemy('penitent',s.player.x+40,s.player.y,99);e.face=Math.PI;s.enemies=[e];
 startAction(s,'parry');advance(s,.45);
 assert.equal(hurtPlayer(s,19,e),true);assert.equal(s.player.hp,81);
 s.player.invulnerable=0;
 startAction(s,'parry');advance(s,.1);
 assert.equal(hurtPlayer(s,17,{x:s.player.x+30,y:s.player.y},false),true);assert.equal(s.player.hp,64);
 assert.equal(e.parried||false,false);
});
test('l’action pressée pendant un geste part à la fin du geste',()=>{
 const s=createGame();s.enemies=[];
 assert.equal(startAction(s,'light'),true);
 assert.equal(startAction(s,'roll',{x:1}),false);
 assert.equal(s.player.buffer.kind,'roll');
 advance(s,.5);
 assert.equal(s.player.action.kind,'roll');assert.equal(s.player.buffer,null);
});
test('la roulade interrompt la récupération d’une attaque, après le coup',()=>{
 const s=createGame();s.enemies=[];
 startAction(s,'light');advance(s,.31);
 assert.equal(startAction(s,'roll',{x:-1}),true);
 assert.equal(s.player.action.kind,'roll');
 startAction(s,'heavy');advance(s,.2);
 assert.equal(startAction(s,'roll'),false); // trop tôt : avant le coup porté
});
