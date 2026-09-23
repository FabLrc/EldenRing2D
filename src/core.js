// Simulation indépendante du navigateur : positions en pixels, temps en secondes.
export const TILE=32, COLS=84, ROWS=64;
export const ROOMS=[
 {id:'refuge',name:'Le dernier refuge',x:5,y:38,w:21,h:20},
 {id:'cour',name:'La cour des pénitents',x:28,y:39,w:20,h:17},
 {id:'cloitre',name:'Le cloître silencieux',x:51,y:28,w:19,h:26},
 {id:'galerie',name:'La galerie des serments',x:33,y:13,w:20,h:17},
 {id:'boss',name:'Le clocher des cendres',x:7,y:5,w:21,h:23},
 {id:'crypte',name:'Le jardin des oubliés',x:68,y:10,w:13,h:15},
];
export const SHRINE={x:15*TILE,y:46*TILE};
export const TALISMAN={x:76*TILE,y:15*TILE};
export const GATE={x:15*TILE,y:33*TILE,w:4*TILE,h:22};
export const FOG={x:28*TILE,y:18*TILE,w:20,h:4*TILE};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function buildWorld(){
 const grid=Array.from({length:ROWS},()=>Array(COLS).fill(0));
 const carve=(x,y,w,h)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=1;};
 ROOMS.forEach(r=>carve(r.x,r.y,r.w,r.h));
 [[24,45,7,5],[46,44,7,5],[57,24,5,8],[49,23,11,5],[26,18,9,4],[15,26,4,14],[65,19,6,13]].forEach(r=>carve(...r));
 const obstacles=[];
 // Colonnes disposées aux bords des passages pour conserver des arènes lisibles.
 for(const r of ROOMS){
  if(r.id==='crypte')continue;
  for(const px of [r.x+2,r.x+r.w-3]) for(const py of [r.y+3,r.y+r.h-4])
   obstacles.push({x:px*TILE+16,y:py*TILE+16,r:16,type:r.id==='refuge'?'statue':'column'});
 }
 [{x:38,y:46},{x:61,y:39},{x:41,y:20}].forEach(p=>obstacles.push({x:p.x*TILE,y:p.y*TILE,r:19,type:'tomb'}));
 return {grid,obstacles};
}
export const WORLD=buildWorld();
export function sanitizeSave(raw){
 if(!raw||raw.version!==1)return null;
 const int=(n,max)=>Number.isFinite(n)?clamp(Math.floor(n),0,max):0; const drop=raw.drop&&Number.isFinite(raw.drop.x)&&Number.isFinite(raw.drop.y)&&raw.drop.x>=0&&raw.drop.y>=0&&raw.drop.x<COLS*TILE&&raw.drop.y<ROWS*TILE?{x:raw.drop.x,y:raw.drop.y,amount:int(raw.drop.amount,99999)}:null;
 return {version:1,souls:int(raw.souls,99999),vigor:int(raw.vigor,3),healing:int(raw.healing,3),talisman:raw.talisman===true,shortcut:raw.shortcut===true,bossDefeated:raw.bossDefeated===true,drop,deaths:int(raw.deaths,99999),cycle:int(raw.cycle,3),collected:Array.isArray(raw.collected)?raw.collected.filter(x=>Number.isInteger(x)&&x>=0&&x<5):[]};
}
export function serialize(s){return {version:1,...s.progress,souls:s.player.souls,drop:s.drop};}
const ENEMY_TYPES={penitent:{hp:65,speed:48,reach:58,damage:19,wind:.85,recover:1.15,reward:14},watcher:{hp:88,speed:42,reach:100,damage:23,wind:.95,recover:1.1,reward:20},bell:{hp:55,speed:25,reach:240,damage:17,wind:1.15,recover:1.7,reward:18},boss:{hp:650,speed:45,reach:100,damage:28,wind:1.0,recover:1.15,reward:180}};
export function makeEnemy(type,x,y,id){const t=ENEMY_TYPES[type];return {...t,type,x,y,homeX:x,homeY:y,id,maxHp:t.hp,r:type==='boss'?23:12,face:Math.PI/2,state:'idle',timer:0,flash:0,hitReact:0,hitReactMax:0,kickX:0,kickY:0,kickAngle:0,phase:1,cycle:0,dead:false,attackKind:'sweep'};}
export function spawnEnemies(cycle=0){
 // La veille durcit le monde : PV et dégâts ×1,4 par cycle, le reste inchangé.
 const m=Math.pow(1.4,cycle);
 return [
  ['penitent',35,49],['penitent',43,44],['watcher',44,51],
  ['penitent',57,48],['watcher',62,37],['bell',65,32],
  ['watcher',44,25],['penitent',38,20],['bell',48,17],
  ['penitent',73,20],['watcher',77,14],['boss',17,14]
  ].map(([t,x,y],i)=>{const e=makeEnemy(t,x*TILE,y*TILE,i);if(m>1){e.hp=e.maxHp=Math.round(e.hp*m);e.damage=Math.round(e.damage*m);}return e;});
}
export function createGame(save){
 const v=sanitizeSave(save)||{souls:0,vigor:0,healing:0,talisman:false,shortcut:false,bossDefeated:false,drop:null,deaths:0,cycle:0,collected:[]};
 const progress={vigor:v.vigor,healing:v.healing,talisman:v.talisman,shortcut:v.shortcut,bossDefeated:v.bossDefeated,deaths:v.deaths,cycle:v.cycle,collected:v.collected};
 const p={x:SHRINE.x,y:SHRINE.y+62,r:10,face:-Math.PI/2,moveFace:-Math.PI/2,hp:100+v.vigor*20,maxHp:100+v.vigor*20,stamina:100,souls:v.souls,flasks:3+v.cycle,action:null,invulnerable:0,regenDelay:0,flash:0,hitReact:0,hitReactMax:.3,kickAngle:0,walk:0,moving:false,stepIdx:0};
 const s={player:p,progress,enemies:spawnEnemies(v.cycle),drop:v.drop,effects:[],projectiles:[],events:[],time:0,dead:false,deathTimer:0,bossActive:false,shake:0,hitStop:0,slow:0,punch:0,hurtDir:0,hurtDirTimer:0,introTimer:0,victoryTimer:0,whiteFlash:0,flare:0,area:'refuge',visits:new Set(['refuge']),kills:0};
 if(v.bossDefeated)s.enemies.find(e=>e.type==='boss').dead=true;
 return s;
}
export function blocked(s,x,y,r=10){
 for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]])if(!WORLD.grid[Math.floor((y+dy)/TILE)]?.[Math.floor((x+dx)/TILE)])return true;
 if(!s.progress.shortcut&&x+r>GATE.x&&x-r<GATE.x+GATE.w&&y+r>GATE.y&&y-r<GATE.y+GATE.h)return true;
 if(s.bossActive&&x+r>FOG.x&&x-r<FOG.x+FOG.w&&y+r>FOG.y&&y-r<FOG.y+FOG.h)return true;
 return WORLD.obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+r);
}
export function move(s,p,dx,dy){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));
 for(let i=0;i<n;i++){if(!blocked(s,p.x+dx/n,p.y,p.r))p.x+=dx/n;if(!blocked(s,p.x,p.y+dy/n,p.r))p.y+=dy/n;}
}
export function clearSight(s,a,b){const d=distance(a,b);for(let t=16;t<d;t+=16){let f=t/d;if(blocked(s,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,2))return false;}return true;}
export function emit(s,type,data={}){s.events.push({type,...data});}
export function burst(s,x,y,color,n=10){for(let i=0;i<n;i++){const a=i/n*Math.PI*2+s.time;const speed=20+(i*23%70);s.effects.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-25,life:.4+(i%4)*.15,maxLife:1,color,size:2+(i%2)});}}
// Poussière de sol : rase le sol, retombe aussitôt.
function dust(s,x,y,n=5){for(let i=0;i<n;i++){const a=(i/n-.5)*2.4,speed=16+(i*19%30);s.effects.push({x,y:y-2,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.3-4,life:.26+(i%3)*.07,maxLife:.4,color:'#9a927c',size:2+(i%2)});}}
// Punch caméra : léger zoom avant, décroissant.
function punch(s,amount=1){s.punch=Math.max(s.punch||0,amount);}
export const PARRY_WINDOW=[.06,.32];
export function startAction(s,kind,input={}){
  const p=s.player;if(s.dead||s.introTimer>0||s.victoryTimer>0)return false;
 if(p.action){
  const a=p.action;
  // Une roulade peut interrompre la récupération d'une attaque, après le coup.
  if(kind==='roll'&&['light','heavy'].includes(a.kind)&&a.time>={light:.3,heavy:.62}[a.kind])p.action=null;
  else{p.buffer={kind,input};return false;}
 }
 const cost={light:23,heavy:39,roll:27,heal:0,parry:14}[kind];
 if(cost===undefined||p.stamina<cost){emit(s,'toast',{text:'Reprenez votre souffle.'});return false;}
 if(kind==='heal'&&(p.flasks===0||p.hp===p.maxHp)){emit(s,'toast',{text:p.flasks?'Votre santé est déjà pleine.':'Vos fioles sont vides.'});return false;}
 p.stamina-=cost;p.regenDelay=.7;
 const duration={light:.46,heavy:.87,roll:.42,heal:1.05,parry:.55}[kind];
 const len=Math.hypot(input.x||0,input.y||0);
 const dir=len?Math.atan2(input.y,input.x):p.face;
 p.action={kind,time:0,duration,face:p.face,dir,hits:new Set(),done:false};
 if(kind==='roll'){p.invulnerable=.32;emit(s,'sound',{name:'cloth1'});dust(s,p.x,p.y+2,6);}
 if(kind==='light'||kind==='heavy')emit(s,'sound',{name:kind==='light'?'knifeSlice':'knifeSlice2'});
 if(kind==='roll'||kind==='parry')emit(s,'sound',{name:'cloth1'});
 if(kind==='heal')p.flasks--;
 return true;
}
export function hurtPlayer(s,amount,source,parryable=true){
 const p=s.player;if(s.dead||p.invulnerable>0)return false;
 // Parade : au début du geste, un coup armé est renvoyé et l'assaillant renversé.
 if(parryable&&source&&!source.dead&&p.action?.kind==='parry'&&p.action.time>=PARRY_WINDOW[0]&&p.action.time<=PARRY_WINDOW[1]){
  source.state='stun';source.timer=source.type==='boss'?1.3:1.7;source.parried=true;source.flash=.22;
  p.action=null;p.stamina=clamp(p.stamina+10,0,100);
  s.hitStop=Math.max(s.hitStop,.11);s.shake=Math.max(s.shake,5);
  burst(s,source.x,source.y-14,'#ffe3a4',20);burst(s,p.x,p.y-10,'#d8c27e',8);
  s.effects.push({impact:true,heavy:true,x:(p.x+source.x)/2,y:(p.y+source.y)/2-14,angle:Math.atan2(source.y-p.y,source.x-p.x),life:.2,maxLife:.2,color:'#fff3cf'});
  emit(s,'sound',{name:'metalPot1'});
  return 'parry';
 }
 p.hp=Math.max(0,p.hp-amount);p.invulnerable=.7;p.flash=.2;p.hitReact=p.hitReactMax=.3;p.kickAngle=source?Math.atan2(p.y-source.y,p.x-source.x):p.face+Math.PI;p.action=null;p.buffer=null;s.shake=4;
 if(source){s.hurtDir=Math.atan2(source.y-p.y,source.x-p.x);s.hurtDirTimer=.55;}
 burst(s,p.x,p.y-12,'#b46b50');emit(s,'sound',{name:'metalPot1'});
 if(source){const a=Math.atan2(p.y-source.y,p.x-source.x);move(s,p,Math.cos(a)*12,Math.sin(a)*12);}
 if(p.hp<=0){s.dead=true;s.deathTimer=1.5;s.slow=.85;s.progress.deaths++;s.drop=p.souls?{x:p.x,y:p.y,amount:p.souls}:null;p.souls=0;emit(s,'save');}
 return true;
}
export function hurtEnemy(s,e,amount,heavy=false,crit=false){
 if(e.dead)return;
 const dx=e.x-s.player.x,dy=e.y-s.player.y;
 const hitAngle=Math.atan2(dy,dx);
 e.hp=Math.max(0,e.hp-amount);e.flash=heavy||crit?.26:.16;
 e.hitReact=(heavy||crit)?.18:.10;e.hitReactMax=e.hitReact;e.kickAngle=hitAngle;
 e.kickX=Math.cos(hitAngle)*(heavy||crit?360:190);e.kickY=Math.sin(hitAngle)*(heavy||crit?360:190);
 burst(s,e.x,e.y-12,heavy||crit?'#ffe0a0':'#f7ebc9',heavy||crit?22:13);
 s.effects.push({impact:true,heavy:heavy||crit,x:e.x,y:e.y-15,angle:hitAngle,life:(heavy||crit)?.22:.14,maxLife:(heavy||crit)?.22:.14,color:heavy||crit?'#fff3cf':'#fff8e2'});
 s.hitStop=Math.max(s.hitStop,crit?.1:heavy?.082:.038);s.shake=Math.max(s.shake,crit?5.4:heavy?4.8:2.25);
 if(crit){punch(s,1);s.slow=Math.max(s.slow,.25);
  s.effects.push({popup:true,x:e.x,y:e.y-34,text:Math.round(amount),life:.85,maxLife:.85,color:'#ffe3a4'});
  s.effects.push({popup:true,x:e.x,y:e.y-18,text:'RIPOSTE',life:.95,maxLife:.95,color:'#d8c27e',small:true});}
 if(heavy&&e.type!=='boss'&&e.state!=='stun'){e.state='stun';e.timer=.65;}
 if(e.hp<=0){e.dead=true;s.player.souls+=e.reward;s.kills++;
  // Mise à mort : un gel court puis un ralenti de suivi.
  s.hitStop=Math.max(s.hitStop,.07);s.slow=Math.max(s.slow,.22);
  emit(s,'sound',{name:'handleCoins'});burst(s,e.x,e.y-10,'#d5b97b',18);
  if(e.type==='boss'){
   s.bossActive=false;s.progress.bossDefeated=true;s.projectiles=[];
   s.slow=Math.max(s.slow,.8);s.whiteFlash=.35;punch(s,1.4);s.victoryTimer=1.3;
   emit(s,'bossDeath');
  }
  emit(s,'save');
 }
}
export const LOOT=[{x:39*TILE,y:52*TILE,amount:18},{x:55*TILE,y:32*TILE,amount:22},{x:48*TILE,y:15*TILE,amount:25},{x:73*TILE,y:12*TILE,amount:30},{x:9*TILE,y:40*TILE,amount:12}];
export const SUBTITLES={
 refuge:'la flamme se souvient de vos pas',
 cour:'les pénitents attendent, patiemment',
 cloitre:'les pierres se souviennent des pas',
 galerie:'ce qui est juré ne se répète jamais',
 boss:'le bronze s’est tu depuis des siècles',
 crypte:'le jardin pousse pour les oubliés',
};
export const INSCRIPTIONS=[
 {x:9*TILE,y:43*TILE,text:'Sous la pierre, un visage sans nom. Il attendait la cloche. Il attend encore.'},
 {x:38*TILE,y:47*TILE,text:'Un pénitent dort ici. Sa faute n’est pas gravée — elle ne l’a jamais quitté.'},
 {x:56*TILE,y:33*TILE,text:'Les pierres se souviennent de tous les pas. Les vôtres, bientôt, parmi les autres.'},
 {x:45*TILE,y:19*TILE,text:'Que celui qui jure revienne muet. La galerie garde les secrets — elle les garde tous.'},
 {x:17*TILE,y:13*TILE,text:'Le bronze s’est tu le jour où le gardien a pris sa place. Plus rien ne sonne. Plus rien ne passe.'},
 {x:72*TILE,y:19*TILE,text:'Aux oubliés, sans fleurs ni noms. Le jardin pousse quand même.'},
];
export function nearby(s){
 const p=s.player;
 if(distance(p,SHRINE)<72)return {kind:'shrine',label:'Se reposer au refuge'};
 if(!s.progress.shortcut&&distance(p,{x:GATE.x+GATE.w/2,y:GATE.y})<76)return {kind:p.y<GATE.y?'gate':'locked',label:p.y<GATE.y?'Ouvrir le raccourci':'La grille s’ouvre de l’autre côté'};
 if(s.drop&&distance(p,s.drop)<48)return {kind:'drop',label:'Récupérer '+s.drop.amount+' fragments'};
 if(!s.progress.talisman&&distance(p,TALISMAN)<52)return {kind:'talisman',label:'Recueillir le talisman du souffle'};
 for(let i=0;i<LOOT.length;i++)if(!s.progress.collected.includes(i)&&distance(p,LOOT[i])<40)return {kind:'loot',id:i,label:'Recueillir des fragments'};
 for(let i=0;i<INSCRIPTIONS.length;i++)if(distance(p,INSCRIPTIONS[i])<44)return {kind:'inscription',id:i,label:'Lire l’inscription'};
 return null;
}
export function interact(s){
 if(s.dead||s.player.action)return;
 const item=nearby(s);if(!item)return;
 if(item.kind==='shrine'){rest(s);emit(s,'shrine');}
 if(item.kind==='locked')emit(s,'toast',{text:'Rejoignez le clocher pour ouvrir cette grille.'});
 if(item.kind==='gate'){s.progress.shortcut=true;emit(s,'toast',{text:'Raccourci ouvert — le refuge est tout proche.'});emit(s,'sound',{name:'doorOpen_1'});emit(s,'save');}
 if(item.kind==='drop'){s.player.souls+=s.drop.amount;s.drop=null;emit(s,'toast',{text:'Ici reposaient vos fragments. Ils vous sont rendus.'});emit(s,'sound',{name:'handleCoins'});emit(s,'save');}
 if(item.kind==='inscription')emit(s,'inscription',{text:INSCRIPTIONS[item.id].text,note:s.drop?'Vos fragments perdus dorment quelque part dans les cendres.':''});
 if(item.kind==='talisman'){s.progress.talisman=true;emit(s,'toast',{text:'Talisman du souffle — l’endurance revient plus vite.'});burst(s,TALISMAN.x,TALISMAN.y,'#b8daa0',28);emit(s,'sound',{name:'handleCoins'});emit(s,'save');}
 if(item.kind==='loot'){s.player.souls+=LOOT[item.id].amount;s.progress.collected.push(item.id);emit(s,'sound',{name:'handleCoins'});emit(s,'toast',{text:'+'+LOOT[item.id].amount+' fragments'});emit(s,'save');}
}
export function rest(s){
 const p=s.player;p.hp=p.maxHp;p.stamina=100;p.flasks=3+s.progress.cycle;p.action=null;p.buffer=null;p.hitReact=0;p.invulnerable=1;
 s.enemies=spawnEnemies(s.progress.cycle);if(s.progress.bossDefeated)s.enemies.find(e=>e.type==='boss').dead=true;
 s.projectiles=[];s.bossActive=false;s.hitStop=0;s.slow=0;s.punch=0;s.hurtDirTimer=0;s.whiteFlash=0;s.introTimer=0;s.victoryTimer=0;s.flare=1;emit(s,'save');
}
export function respawn(s){s.dead=false;s.player.x=SHRINE.x;s.player.y=SHRINE.y+62;s.area='refuge';rest(s);emit(s,'save');}
// La veille : après une victoire, tout est conservé, le monde se relève durci.
export function enterVeille(s){
 if(!s.progress.bossDefeated||s.progress.cycle>=3)return false;
 s.progress.cycle++;s.progress.bossDefeated=false;respawn(s);return true;
}
export function upgrade(s,kind){
 if(!['vigor','healing'].includes(kind)||s.progress[kind]>=3)return false;
 const cost=(kind==='vigor'?40:35)+s.progress[kind]*30;
 if(s.player.souls<cost)return false;
 s.player.souls-=cost;s.progress[kind]++;
 s.player.maxHp=100+s.progress.vigor*20;s.player.hp=s.player.maxHp;emit(s,'save');return true;
}
function attackEnemy(s,e){
 const p=s.player;const d=distance(e,p);const a=Math.atan2(p.y-e.y,p.x-e.x);
 if(e.type==='bell'){
  s.projectiles.push({x:e.x,y:e.y-8,vx:Math.cos(e.face)*155,vy:Math.sin(e.face)*155,life:3,damage:e.damage,r:5});
 }else if(e.type==='boss'&&e.attackKind==='slam'){
  if(d<145&&clearSight(s,e,p))hurtPlayer(s,e.damage+5,e,false);
  s.effects.push({x:e.x,y:e.y,ring:true,radius:145,life:.5,maxLife:.5,color:'#e6b573'});s.shake=6;punch(s,1);
 }else if(d<e.reach+12&&Math.abs(angleDiff(a,e.face))<(e.type==='watcher'?.48:1.15)&&clearSight(s,e,p)){
  if(hurtPlayer(s,e.damage,e)!=='parry')emit(s,'enemyStrike',{enemy:e});
 }else emit(s,'enemyStrike',{enemy:e});
 if(!e.parried){e.state='recover';e.timer=e.recover*(e.phase===2?.77:1);}
}
function updateEnemy(s,e,dt){
 if(e.dead)return;e.flash=Math.max(0,e.flash-dt);
 if(e.hitReact>0){
  e.hitReact=Math.max(0,e.hitReact-dt);
  move(s,e,e.kickX*dt,e.kickY*dt);
  const damping=Math.pow(.02,dt);e.kickX*=damping;e.kickY*=damping;
  return;
 }
 e.timer-=dt;
 const p=s.player;let d=distance(e,p),a=Math.atan2(p.y-e.y,p.x-e.x);
  if(e.type==='boss'){
   if(!s.bossActive)return;
   // L'entrée en arène est une mise en scène : le gardien attend la fin du bandeau.
   if(s.introTimer>0)return;
    if(e.hp<=e.maxHp*.5&&e.phase===1){e.phase=2;e.state='stun';e.timer=1.5;e.speed=65;
     burst(s,e.x,e.y-30,'#e5ac61',40);burst(s,e.x-18,e.y-28,'#a5694a',14);burst(s,e.x+18,e.y-28,'#c9a45c',14);
     s.slow=Math.max(s.slow,.5);s.whiteFlash=.22;punch(s,1.1);
     emit(s,'bossPhase');emit(s,'toast',{text:'Les chaînes se brisent. Le gardien se souvient.'});}
  }
 if(e.state==='stun'){if(e.timer<=0){e.state='idle';e.parried=false;}return;}
 if(e.state==='windup'){
  if(e.timer>.3)e.face+=angleDiff(a,e.face)*Math.min(1,dt*2);
  if(e.timer<=0){if(e.attackKind==='charge'&&e.type==='boss'){e.state='charge';e.timer=.55;}else attackEnemy(s,e);}
  return;
 }
 if(e.state==='charge'){
  move(s,e,Math.cos(e.face)*270*dt,Math.sin(e.face)*270*dt);
   if(distance(e,p)<e.r+p.r+12)hurtPlayer(s,e.damage,e,false);
  if(e.timer<=0){e.state='recover';e.timer=1.3;}return;
 }
 if(e.state==='recover'){if(e.timer<=0)e.state='idle';return;}
 const aggro=e.type==='boss'?1200:245;
 if(d<aggro&&clearSight(s,e,p)){
  e.face=a;
  if(d<e.reach-5){e.state='windup';e.attackKind=e.type==='boss'?['sweep','charge','slam'][e.cycle++%3]:'sweep';e.timer=e.wind*(e.phase===2?.78:1);if(e.attackKind==='slam')e.timer+=.25;}
  else {e.state='chase';move(s,e,Math.cos(a)*e.speed*dt,Math.sin(a)*e.speed*dt);}
 }else {e.state='idle';const dh=Math.hypot(e.x-e.homeX,e.y-e.homeY);if(dh>5)move(s,e,(e.homeX-e.x)/dh*e.speed*.6*dt,(e.homeY-e.y)/dh*e.speed*.6*dt);}
 // Une légère séparation évite que plusieurs ennemis se superposent.
 for(const other of s.enemies){if(other===e||other.dead)continue;const od=distance(e,other),min=e.r+other.r+3;if(od>0&&od<min)move(s,e,(e.x-other.x)/od*dt*20,(e.y-other.y)/od*dt*20);}
}
export function update(s,input,dt){
 dt=clamp(dt,0,.04);
 const wall=dt;
 // Ralenti (mise à mort, chute) puis gel d'impact : le temps visuel ralentit, le temps réel non.
 if(s.slow>0)s.slow=Math.max(0,s.slow-wall);
 const vdt=wall*(s.hitStop>0?.18:s.slow>0?(s.dead?.28:.35):1);
 s.time+=vdt;s.shake=Math.max(0,s.shake-vdt*15);s.punch=Math.max(0,s.punch-vdt*8);
 for(const f of s.effects){f.life-=vdt;if(!f.ring&&!f.impact&&!f.popup){f.x+=f.vx*vdt;f.y+=f.vy*vdt;f.vy+=50*vdt;}}
 s.effects=s.effects.filter(f=>f.life>0);
 if(s.hurtDirTimer>0)s.hurtDirTimer=Math.max(0,s.hurtDirTimer-wall);
 if(s.introTimer>0)s.introTimer=Math.max(0,s.introTimer-wall);
 if(s.whiteFlash>0)s.whiteFlash=Math.max(0,s.whiteFlash-wall*1.6);
 if(s.flare>0)s.flare=Math.max(0,s.flare-wall*2);
 if(s.victoryTimer>0){s.victoryTimer-=wall;if(s.victoryTimer<=0){s.victoryTimer=0;if(!s.dead)emit(s,'victory');}}
 if(s.hitStop>0){s.hitStop=Math.max(0,s.hitStop-wall);return;}
 if(s.dead){s.deathTimer-=wall;if(s.deathTimer<=0&&!s.deathShown){s.deathShown=true;emit(s,'death');}return;}
 s.deathShown=false;
 dt=vdt;
  const p=s.player;p.invulnerable=Math.max(0,p.invulnerable-dt);p.flash=Math.max(0,p.flash-dt);p.hitReact=Math.max(0,p.hitReact-dt);p.regenDelay-=dt;
 let mx=input.x||0,my=input.y||0,len=Math.hypot(mx,my);if(len>1){mx/=len;my/=len;}
 if(!p.action&&Number.isFinite(input.angle))p.face=input.angle;
 if(!p.action&&p.regenDelay<=0)p.stamina=clamp(p.stamina+dt*(s.progress.talisman?39:28),0,100);
 p.moving=false;
  if(p.action){const a=p.action;a.time+=dt;
   if(a.kind==='roll'){move(s,p,Math.cos(a.dir)*300*dt,Math.sin(a.dir)*300*dt);p.moving=true;}
   else if(a.kind==='heal'){if(a.time>=.85&&!a.done){a.done=true;p.hp=Math.min(p.maxHp,p.hp+48+s.progress.healing*14);burst(s,p.x,p.y-15,'#e5ca7c',20);emit(s,'sound',{name:'bookOpen'});}}
   else if(['light','heavy'].includes(a.kind)){const heavy=a.kind==='heavy';const hitTime=heavy?.38:.14;
    if(a.time>=hitTime&&a.time<hitTime+.15){
     const reach=heavy?81:66;
     for(const e of s.enemies){if(e.dead||a.hits.has(e.id))continue;const ang=Math.atan2(e.y-p.y,e.x-p.x);if(distance(p,e)<reach+e.r&&Math.abs(angleDiff(ang,a.face))<(heavy?1.1:1.25)&&clearSight(s,p,e)){a.hits.add(e.id);const crit=e.parried;e.parried=false;hurtEnemy(s,e,(heavy?49:27)*(crit?2.6:1),heavy,crit);}}
    }
   }
   if(a.time>=a.duration){p.action=null;if(p.buffer){const b=p.buffer;p.buffer=null;startAction(s,b.kind,b.input);}}
  }else if(len>.08){p.moveFace=Math.atan2(my,mx);move(s,p,mx*118*dt,my*118*dt);p.walk+=dt*10;p.moving=true;
   const step=Math.floor(p.walk/Math.PI);if(step!==p.stepIdx){p.stepIdx=step;dust(s,p.x,p.y+2,3);}}
 const room=ROOMS.find(r=>p.x>=r.x*TILE&&p.x<(r.x+r.w)*TILE&&p.y>=r.y*TILE&&p.y<(r.y+r.h)*TILE);
 if(room&&room.id!==s.area){s.area=room.id;s.visits.add(room.id);emit(s,'area',{room});}
 if(room?.id==='boss'&&!s.progress.bossDefeated&&!s.bossActive&&p.x<FOG.x-30&&p.y<26*TILE){s.bossActive=true;s.introTimer=2.2;emit(s,'bossIntro');}
 // Une chute dans l’arène ne doit pas laisser les attaques en cours continuer.
 for(const e of s.enemies){if(s.dead)break;updateEnemy(s,e,dt);}
  for(const b of s.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(blocked(s,b.x,b.y,b.r))b.life=0;if(distance(b,p)<p.r+b.r){hurtPlayer(s,b.damage,b,false);b.life=0;}}
 s.projectiles=s.projectiles.filter(b=>b.life>0);
}
