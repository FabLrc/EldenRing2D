import {WORLD,ROOMS,TILE,COLS,ROWS,SHRINE,TALISMAN,GATE,FOG,LOOT,clamp,PARRY_WINDOW} from './core.js';
import {Fx} from './fx.js';
import {HeroAnimator} from './hero.js';
const palette={floor:'#293737',line:'#17292c',light:'#445250',gold:'#d1b77d'};
// Ambiance : teinte du grade par zone et obscurité ambiante de la lightmap.
const GRADES={
 refuge:{tint:[1.05,1,.93],sat:1.02,con:1.03,vig:.48,amt:.12},
 cour:{tint:[.95,1,1.07],sat:.98,con:1.05,vig:.46,amt:.15},
 cloitre:{tint:[.93,.99,1.08],sat:.96,con:1.06,vig:.5,amt:.16},
 galerie:{tint:[.96,1,1.05],sat:.97,con:1.05,vig:.47,amt:.14},
 boss:{tint:[1.06,.98,.9],sat:1,con:1.08,vig:.55,amt:.16},
 boss2:{tint:[1.12,.9,.84],sat:1.02,con:1.1,vig:.6,amt:.2},
 crypte:{tint:[.93,1.06,.96],sat:.96,con:1.05,vig:.5,amt:.15},
};
const AMBIENT={
 refuge:[146,140,132],cour:[118,130,145],cloitre:[112,126,142],
 galerie:[110,120,135],boss:[132,118,112],crypte:[112,138,120],
};
// Particules d'ambiance : cendres, poussières, braises montantes et spores.
const PARTICLES={
 refuge:{n:34,dx:1.6,dy:1,c:['#c5d4be24','#dcc98e55']},
 cour:{n:42,dx:2.4,dy:1,c:['#bdcfc422','#d4c89048']},
 cloitre:{n:30,dx:1.2,dy:.5,c:['#a8c4d022','#c0d0d848']},
 galerie:{n:32,dx:1.5,dy:.6,c:['#b4c8c022','#d0c8a048']},
 boss:{n:52,dx:2.2,dy:7,up:1,c:['#e0a86040','#ffd89078']},
 crypte:{n:44,dx:1.4,dy:.9,c:['#90d0a028','#bce8b858']},
};
const hash=(x,y)=>{let h=Math.imul(x+183,374761393)+Math.imul(y+527,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
function ellipse(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function polygon(c,points,col){c.fillStyle=col;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
export class Renderer{
 constructor(canvas){
  // Le canvas visible est réservé à Fx (WebGL, ou 2D en repli) ; la scène est peinte hors écran.
  this.canvas=canvas;this.fx=new Fx(canvas);
  this.scene=document.createElement('canvas');this.c=this.scene.getContext('2d',{alpha:false});
  this.lightCv=document.createElement('canvas');this.lights=this.lightCv.getContext('2d');
  this.lamps=[];this.grade={tint:[1.05,1,.93],sat:1.02,con:1.03,vig:.48,amt:.12};
  this.camera={x:SHRINE.x,y:SHRINE.y};this.zoom=1.45;
  this.scene.width=this.lightCv.width=canvas.width;this.scene.height=this.lightCv.height=canvas.height;
  this.tiles=new Image();this.tiles.src=new URL('../assets/vendor/stealthix/tileset_dungeon.png',import.meta.url).href;
  this.props=new Image();this.props.src=new URL('../assets/generated/environment-props.png',import.meta.url).href;
  this.shrineFire=new Image();this.shrineFire.src=new URL('../assets/generated/shrine-fire.png',import.meta.url).href;
  this.shrineAltar=new Image();this.shrineAltar.src=new URL('../assets/generated/shrine-altar.png',import.meta.url).href;
  this.pixelSprites=new Map();
  this.hero=new HeroAnimator();
  this.terrain=document.createElement('canvas');this.terrain.width=COLS*TILE;this.terrain.height=ROWS*TILE;
  this.drawTerrain();this.tiles.onload=()=>this.drawTerrain();
 }
 resize(){
  const ratio=window.innerWidth/window.innerHeight;
  this.canvas.height=600;this.canvas.width=Math.round(600*ratio);
  this.scene.width=this.lightCv.width=this.canvas.width;
  this.scene.height=this.lightCv.height=this.canvas.height;
  this.c.imageSmoothingEnabled=false;
 }
 drawTerrain(){
  const c=this.terrain.getContext('2d');c.imageSmoothingEnabled=false;rect(c,0,0,this.terrain.width,this.terrain.height,'#111e24');
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   const xx=x*TILE,yy=y*TILE,h=hash(x,y),floor=WORLD.grid[y][x];
   if(floor){
    rect(c,xx,yy,32,32,['#2a3938','#2c3b3a','#2a393b','#2d3c3c','#303e3c'][Math.floor(h*5)]);
    const outdoor=(x<49&&y>38)||(x>67&&y<25);
    if(outdoor&&h>.82)rect(c,xx,yy,32,32,'#293d37');
    // Dalles irrégulières, joints, fissures et mousse déterministes.
    rect(c,xx,yy,32,1,'#192c2e');rect(c,xx,yy,1,32,'#1b2e30');rect(c,xx+2,yy+2,28,1,'#4f5b512b');
    if(h>.55){rect(c,xx+12,yy+1,1,14,'#1b2d2e');rect(c,xx+8,yy+14,6,1,'#1b2d2e');}
    for(let i=0;i<4;i++){const px=hash(x+i*14,y+3)*29,py=hash(x+4,y+i*14)*29;rect(c,xx+px,yy+py,2,1,h>.7?'#6c756233':'#101f2933');}
    if(outdoor&&h>.65)for(let i=0;i<4;i++)rect(c,xx+hash(x+i,y)*28,yy+hash(x,y+i)*28,3,2,'#64725545');
   }else{
    rect(c,xx,yy,32,32,h>.5?'#15252a':'#17282b');
    if(h>.7)for(let i=0;i<7;i++)rect(c,xx+hash(x+i,y)*31,yy+hash(x,y+i)*31,2,4,'#293c36');
   }
  }
  // Murs en trois quarts : dessus, face verticale et ombre portée.
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(!WORLD.grid[y][x]){
   const below=WORLD.grid[y+1][x],above=WORLD.grid[y-1][x],side=WORLD.grid[y][x+1]||WORLD.grid[y][x-1];
   const xx=x*TILE,yy=y*TILE;
   if(below||above||side){
    if(below){rect(c,xx+5,yy+23,34,22,'#09161980');rect(c,xx,yy-8,32,39,'#283739');rect(c,xx,yy-8,32,9,'#58605a');rect(c,xx+1,yy-6,30,3,'#727568');
     for(let k=0;k<3;k++){rect(c,xx,yy+3+k*10,32,1,'#111f25');rect(c,xx+(k%2?9:23),yy+4+k*10,1,9,'#111f25');}
    }else{rect(c,xx,yy,32,32,'#384542');rect(c,xx+2,yy+2,28,2,'#6b736052');rect(c,xx+1,yy+28,30,3,'#1b2c2f');}
   }
  }
  // Sols cérémoniels du refuge et du boss.
  for(const [x,y,r] of [[SHRINE.x,SHRINE.y,105],[17*TILE,16*TILE,195]]){
   c.strokeStyle='#7e806348';c.lineWidth=2;for(const d of [0,7,23]){c.beginPath();c.ellipse(x,y,r-d,(r-d)*.72,0,0,Math.PI*2);c.stroke();}
   for(let i=0;i<12;i++){const a=i*Math.PI/6;rect(c,x+Math.cos(a)*r-2,y+Math.sin(a)*r*.72-2,4,4,'#8b8b6266');}
  }
  // Ancienne allée pavée traversant le refuge.
  for(let y=48;y<57;y++)for(let x=14;x<18;x++){rect(c,x*32+1,y*32+1,30,30,'#48504a');rect(c,x*32+3,y*32+2,26,1,'#737b6266');rect(c,x*32+1,y*32+30,30,1,'#253436');}
  // Débris libres de Stealthix, utilisés sans ressource distante à l’exécution.
  if(this.tiles.complete&&this.tiles.naturalWidth){
   for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++)if(WORLD.grid[y][x]&&hash(x+80,y)>.965){c.globalAlpha=.55;c.drawImage(this.tiles,197,12,23,18,x*32+3,y*32+4,23,18);}
   c.globalAlpha=1;
  }
 }
 pixelDraw(c,image,key,sx,sy,sw,sh,x,y,w,h,pixelHeight,tone=false){
  let sprite=this.pixelSprites.get(key);
  if(!sprite){
   sprite=document.createElement('canvas');sprite.height=pixelHeight;sprite.width=Math.max(1,Math.round(pixelHeight*sw/sh));
   const sc=sprite.getContext('2d',{willReadFrequently:true});sc.imageSmoothingEnabled=false;
   sc.drawImage(image,sx,sy,sw,sh,0,0,sprite.width,sprite.height);
   const pixels=sc.getImageData(0,0,sprite.width,sprite.height),data=pixels.data;
   for(let i=0;i<data.length;i+=4){
    if(data[i+3]<105){data[i+3]=0;continue;}
    if(tone){const l=(data[i]*.25+data[i+1]*.6+data[i+2]*.15)*.88;data[i]=l+(data[i]-l)*.72;data[i+1]=l+(data[i+1]-l)*.72;data[i+2]=l+(data[i+2]-l)*.72;}
    data[i]=Math.round(data[i]/20)*20;data[i+1]=Math.round(data[i+1]/20)*20;data[i+2]=Math.round(data[i+2]/20)*20;data[i+3]=255;
   }
   sc.putImageData(pixels,0,0);this.pixelSprites.set(key,sprite);
  }
  c.drawImage(sprite,x,y,w,h);
 }
 prop(c,name,x,y,height){
  if(!this.props.complete||!this.props.naturalWidth)return;
  const sprites={
   deadTree:[24,28,390,505],pine:[438,28,310,505],tower:[780,0,410,570],pillar:[1228,70,300,500],
   tomb:[82,575,250,420],candelabra:[462,552,245,450],candle:[802,690,326,305],rubble:[1148,690,380,315],
  };
  const [sx,sy,sw,sh]=sprites[name],width=height*sw/sh;
  this.pixelDraw(c,this.props,`prop:${name}`,sx,sy,sw,sh,x-width/2,y-height,width,height,Math.max(22,Math.round(height*.65)),true);
 }
 toWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left)*this.canvas.width/r.width/this.zoom+this.camera.x-this.canvas.width/this.zoom/2,y:(clientY-r.top)*this.canvas.height/r.height/this.zoom+this.camera.y-this.canvas.height/this.zoom/2};}
 light(c,x,y,r,color){
  // Halo peint sur la scène + source enregistrée pour la lightmap multiply.
  this.lamps.push({x,y,r:r*1.15,color,i:.72});
  const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }
 lampColor(color,a){
  const h=color.replace('#','');
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${Math.min(1,a)})`;
 }
 ambient(s,reduced){
  const base=AMBIENT[s.area]||AMBIENT.cour;let[r,g,b]=base;
  if(s.area==='boss'){const boss=s.enemies.find(e=>e.type==='boss');if(boss&&boss.phase===2&&!boss.dead){r=Math.min(255,r*1.18);g*=.82;b*=.78;}}
  if(reduced){r=Math.min(255,r+22);g=Math.min(255,g+22);b=Math.min(255,b+22);}
  return `rgb(${r|0},${g|0},${b|0})`;
 }
 // Lightmap : ambiance de zone puis sources additively, alignée sur la caméra de la scène.
 paintLights(s,t,w,h,reduced,sx,sy){
  const l=this.lights;
  l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation='source-over';l.globalAlpha=1;
  l.fillStyle=this.ambient(s,reduced);l.fillRect(0,0,w,h);
  l.globalCompositeOperation='lighter';
  l.save();l.translate(sx,sy);l.scale(this.zoom,this.zoom);
  for(const m of this.lamps){
   const a=(m.i??.72)*(reduced?1:.92+.08*Math.sin(t*13+m.x*.11));
   const g=l.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r);
   g.addColorStop(0,this.lampColor(m.color,a));
   g.addColorStop(.4,this.lampColor(m.color,a*.45));
   g.addColorStop(1,'rgba(0,0,0,0)');
   l.fillStyle=g;l.fillRect(m.x-m.r,m.y-m.r,m.r*2,m.r*2);
  }
  l.restore();l.globalCompositeOperation='source-over';
 }
 column(c,o,t){
  const{x,y}=o;this.prop(c,'pillar',x,y,112);
  if(o.type==='statue'){rect(c,x-2,y-88,4,3,'#c9b477');}
 }
 tomb(c,o){const{x,y}=o;this.prop(c,'tomb',x,y,64);}
 tree(c,x,y,scale=1,golden=false){
  this.prop(c,golden?'deadTree':Math.abs(x+y)%3===0?'pine':'deadTree',x,y,150*scale);
 }
 fire(c,x,y,t){
  if(!this.shrineFire.complete||!this.shrineFire.naturalWidth)return;
  const frame=Math.floor(t*6)%10,cols=5,sw=this.shrineFire.naturalWidth/cols,sh=this.shrineFire.naturalHeight/2,h=52,w=h*sw/sh;
  this.pixelDraw(c,this.shrineFire,`fire:${frame}`,(frame%cols)*sw,Math.floor(frame/cols)*sh,sw,sh,x-w/2,y-h,w,h,36,false);
 }
 altar(c,x,y){
  if(!this.shrineAltar.complete||!this.shrineAltar.naturalWidth)return;
  const h=94,w=h*this.shrineAltar.naturalWidth/this.shrineAltar.naturalHeight;
  this.pixelDraw(c,this.shrineAltar,'altar',0,0,this.shrineAltar.naturalWidth,this.shrineAltar.naturalHeight,x-w/2,y-h,w,h,60,true);
 }
 shrine(c,t){
  const{x,y}=SHRINE;this.light(c,x,y-22,155,'#d9b86a24');this.light(c,x,y-30,55,'#e6bb6350');
  this.altar(c,x,y+4);
  this.fire(c,x,y-37,t);
  for(let i=0;i<14;i++){const yy=(t*18+i*8)%110;rect(c,x+Math.sin(i*1.8+yy*.03)*25,y-18-yy,1+(i%2),2,i%2?'#d6bb75':'#ffdc9b');}
 }
 knight(c,p,t,type='player'){
  const boss=type==='boss',scale=boss?1.9:1,roll=p.action?.kind==='roll';
  const moving=p.moving||p.state==='chase';const step=moving?Math.sin((p.walk||t*8))*3:0;
  let face=p.action?.face??p.face;const front=Math.sin(face)>-.45;
  c.save();c.translate(Math.round(p.x),Math.round(p.y));
  ellipse(c,1,2,boss?26:14,boss?10:5,'#061217aa');
  if(roll){c.globalAlpha=.7;ellipse(c,-Math.cos(p.action.dir)*13,0,12,5,'#b6c3af22');c.translate(0,-6);c.rotate(p.action.dir+p.action.time*14);c.scale(1,.75);}
  c.scale(scale,scale);
  if(p.hitReact>0){const kick=p.hitReact/Math.max(.01,p.hitReactMax);c.translate(-Math.cos(p.kickAngle)*kick*3,-Math.sin(p.kickAngle)*kick*2);c.scale(1+kick*.13,1-kick*.08);}
  const cloak=type==='player'?'#8b6646':type==='boss'?'#733f3b':type==='bell'?'#787151':'#4b5656';
  const armor=p.flash>0?'#e9d5aa':type==='player'?'#9baba0':type==='boss'?'#7d8477':'#7b8c83';
  const dark=p.flash>0?'#d0b887':'#354448';
  polygon(c,[[-9,-27],[-13,-2],[-4,1],[2,-3],[12,-1],[8,-29]],cloak);
  rect(c,-10,-20,4,17,'#16282d55');rect(c,5,-23,3,20,'#cda67444');
  rect(c,-7,-7+step,5,8,dark);rect(c,3,-7-step,5,8,dark);rect(c,-8,-2+step,6,3,'#788175');rect(c,3,-2-step,6,3,'#788175');
  polygon(c,[[-8,-27],[6,-28],[10,-14],[5,-8],[-7,-10],[-10,-18]],armor);
  rect(c,-6,-25,3,13,'#d5d3b05c');rect(c,3,-25,5,16,dark);rect(c,-8,-12,17,3,'#493d32');rect(c,-1,-12,3,3,'#bc9e61');
  rect(c,-12,-26,7,6,armor);rect(c,6,-25,7,6,armor);rect(c,-13,-19,5,10,dark);rect(c,8,-19,4,9,dark);
  rect(c,-6,-39,12,13,armor);rect(c,-8,-36,16,8,armor);rect(c,4,-38,3,12,dark);rect(c,-6,-39,10,2,'#d8d4ad');
  if(front){rect(c,-6,-32,12,3,'#15252b');rect(c,-1,-34,2,8,'#d1caaa');if(boss){rect(c,-5,-31,3,2,'#fac581');rect(c,3,-31,3,2,'#fac581');}}
  else rect(c,-3,-37,5,10,'#626e66');
  if(type==='player'){rect(c,-3,-44,5,6,'#9f8651');rect(c,-3,-44,2,3,'#d8bb77');}
  if(boss){polygon(c,[[-8,-36],[-14,-47],[-9,-43],[-5,-36]],'#a59f7c');polygon(c,[[7,-36],[13,-48],[13,-40],[9,-35]],'#a59f7c');}
  const attack=p.action&&['light','heavy'].includes(p.action.kind);const wind=p.state==='windup';
  let swordAngle=face;
  if(attack){const a=p.action;swordAngle=a.face-1.4+clamp(a.time/(a.kind==='heavy'?.6:.33),0,1)*2.6;}
  else if(p.action?.kind==='parry')swordAngle=face-2.0;
  else if(wind)swordAngle=face-1.6;
  else if(p.state==='recover'&&p.recover*(p.phase===2?.77:1)-p.timer<.25)swordAngle=face-1.1+(p.recover*(p.phase===2?.77:1)-p.timer)*9;
  else swordAngle=front?1.0:-.7;
  c.save();c.translate(8,-18);c.rotate(swordAngle);
  if(type==='bell'){rect(c,3,-3,8,9,'#bdac73');rect(c,1,5,13,2,'#d0be88');}
  else{const length=type==='watcher'?39:boss?38:27;rect(c,0,-2,length,4,'#bcc6b7');rect(c,6,-2,length-6,1,'#e7e5c6');rect(c,0,-6,3,12,'#b4a06e');rect(c,-8,-1,9,3,'#726047');if(type==='watcher')rect(c,-12,0,length-3,2,'#78694c');}
  c.restore();
  if(boss&&p.phase===1){c.strokeStyle='#a3936c';c.lineWidth=2;for(let i=0;i<5;i++){c.strokeRect(-15-i*3,-14+i*4,4,5);c.strokeRect(13+i*3,-15+i*4,4,5);}}
  c.restore();
 }
 telegraph(c,e,t){
  if(e.state!=='windup'&&e.state!=='charge')return;
  c.save();c.translate(e.x,e.y);c.fillStyle='#cf6e4436';c.strokeStyle='#efb17a99';c.lineWidth=1;
  c.beginPath();
  if(e.attackKind==='slam'){c.arc(0,0,145,0,Math.PI*2);}
  else if(e.attackKind==='charge'){c.rotate(e.face);c.rect(0,-23,170,46);}
  else{const reach=e.type==='bell'?100:e.reach,spread=e.type==='watcher'?.4:1.15;c.moveTo(0,0);c.arc(0,0,reach,e.face-spread,e.face+spread);c.closePath();}
  c.fill();c.stroke();c.restore();
  this.light(c,e.x,e.y-35,22,'#f09c5940');
  rect(c,e.x-2,e.y-(e.type==='boss'?94:49),4,6,'#f4ce90');
 }
 draw(s,dt,title=false,reduced=false){
  const c=this.c,w=this.canvas.width,h=this.canvas.height,t=s.time;
  this.lamps.length=0;
  this.zoom=title?1.05:1.3;
  const target=title?{x:SHRINE.x-90,y:SHRINE.y-38}:{x:s.player.x,y:s.player.y-24};
  if(!title&&s.bossActive){const boss=s.enemies.find(e=>e.type==='boss');target.x+=clamp((boss.x-s.player.x)*.32,-100,100);target.y+=clamp((boss.y-s.player.y)*.32,-90,90);}
  if(title){this.camera.x=target.x;this.camera.y=target.y;}
  else {this.camera.x+=(target.x-this.camera.x)*Math.min(1,dt*7);this.camera.y+=(target.y-this.camera.y)*Math.min(1,dt*7);}
  rect(c,0,0,w,h,'#132127');c.save();
  const shake=reduced?0:Math.pow(s.shake,1.12)*1.1;
  const sx=Math.round(w/2-this.camera.x*this.zoom+Math.sin(t*71)*shake);
  const sy=Math.round(h/2-this.camera.y*this.zoom+Math.cos(t*63)*shake);
  c.translate(sx,sy);c.scale(this.zoom,this.zoom);c.imageSmoothingEnabled=false;
  const left=this.camera.x-w/this.zoom/2,top=this.camera.y-h/this.zoom/2;
  c.drawImage(this.terrain,0,0);
  // Bougies de guidage le long du chemin principal.
  for(const [tx,ty] of [[23,47],[29,47],[48,46],[53,45],[59,26],[52,25],[31,20],[18,30],[69,22]]){
   const x=tx*TILE,y=ty*TILE;this.light(c,x,y-10,65,'#d2a76212');this.prop(c,'candle',x,y,25);
  }
  // Les attaques sont affichées au sol, sous les acteurs.
  for(const e of s.enemies)if(!e.dead)this.telegraph(c,e,t);
  // Sources propres à l’état du monde : aura du pèlerin, brouillard de l’arène, phase 2.
  if(!s.dead)this.lamps.push({x:s.player.x,y:s.player.y-15,r:100,color:'#ffe2b0',i:.5});
  if(s.bossActive){const boss=s.enemies.find(e=>e.type==='boss');if(boss&&!boss.dead){
   this.lamps.push({x:FOG.x+FOG.w/2,y:FOG.y+FOG.h/2,r:85,color:'#e8d9a0',i:.32});
   if(boss.phase===2)this.lamps.push({x:boss.x,y:boss.y-30,r:155,color:'#ff8a50',i:.5+.18*Math.sin(t*6)});
  }}
  const drawables=WORLD.obstacles.map(o=>({y:o.y,draw:()=>{if(o.type==='tomb')this.tomb(c,o);else this.column(c,o,t);}}));
  const trees=[[7,43,1.2,false],[23,43,1.3,true],[22,56,1.1,false],[7,56,.8,false],[30,53,.7,false],[46,40,.8,false],[68,13,.9,false],[79,22,1.1,false],[10,36,1,false],[23,32,1,false],[30,9,.9,false],[4,24,1.2,false],[71,9,1,false]];
  for(const [x,y,k,g]of trees)drawables.push({y:y*TILE,draw:()=>{c.globalAlpha=s.player.y<y*TILE&&Math.abs(s.player.x-x*TILE)<65&&y*TILE-s.player.y<150?.35:1;this.tree(c,x*TILE,y*TILE,k,g);c.globalAlpha=1;}});
  for(const [x,y,h] of [[13,51,54],[27,39,50],[69,18,48],[47,13,58]])drawables.push({y:y*TILE,draw:()=>this.prop(c,'rubble',x*TILE,y*TILE,h)});
  for(const [x,y,h] of [[11,40,58],[67,25,52],[49,16,56]])drawables.push({y:y*TILE,draw:()=>{this.light(c,x*TILE,y*TILE-20,46,'#d2a76212');this.prop(c,'candelabra',x*TILE,y*TILE,h);}});
  drawables.push({y:SHRINE.y,draw:()=>this.shrine(c,t)});
  // Clocher : façade visible à l’extrémité nord de l’arène.
  drawables.push({y:7*TILE,draw:()=>{
   const x=17*TILE,y=7*TILE;this.prop(c,'tower',x,y+8,264);
  }});
  for(const e of s.enemies){
   if(e.dead){ellipse(c,e.x,e.y,15,5,'#171f20');continue;}
   if(Math.abs(e.x-this.camera.x)>w/this.zoom/2+90||Math.abs(e.y-this.camera.y)>h/this.zoom/2+120)continue;
   drawables.push({y:e.y,draw:()=>{this.knight(c,e,t,e.type);if(e.hp<e.maxHp&&e.type!=='boss'){rect(c,e.x-15,e.y-53,30,3,'#15201c');rect(c,e.x-15,e.y-53,30*e.hp/e.maxHp,2,'#b0795a');}}});
  }
  drawables.push({y:s.player.y,draw:()=>{if(!s.dead&&s.player.invulnerable>0&&s.player.action?.kind!=='roll')c.globalAlpha=.65+Math.sin(t*40)*.25;if(!this.hero.draw(c,s.player,t,s.dead,s.deathTimer)){if(s.dead)ellipse(c,s.player.x,s.player.y,18,7,'#6d5844');else this.knight(c,s.player,t);}c.globalAlpha=1;}});
  drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
  // Grille du raccourci, toujours lisible.
  if(!s.progress.shortcut){rect(c,GATE.x,GATE.y-40,GATE.w,5,'#9b956f');rect(c,GATE.x,GATE.y-16,GATE.w,4,'#777b64');for(let x=GATE.x+5;x<GATE.x+GATE.w;x+=13){rect(c,x,GATE.y-44,3,65,'#888c73');rect(c,x+3,GATE.y-40,2,61,'#253b3c');}rect(c,GATE.x+GATE.w/2-5,GATE.y-10,10,10,'#baa367');}
  else{rect(c,GATE.x,GATE.y-38,5,56,'#8c8c70');rect(c,GATE.x+GATE.w-5,GATE.y-38,5,56,'#8c8c70');}
  if(s.bossActive){c.fillStyle='#d7c68c66';c.fillRect(FOG.x,FOG.y,FOG.w,FOG.h);for(let i=0;i<12;i++)rect(c,FOG.x+Math.sin(t*3+i)*8,FOG.y+i*10,14,4,'#efe2ad55');}
  for(let i=0;i<LOOT.length;i++)if(!s.progress.collected.includes(i))this.spark(c,LOOT[i],t,'#d5b77b');
  if(s.drop)this.spark(c,s.drop,t,'#bcdf9b');
  if(!s.progress.talisman){this.light(c,TALISMAN.x,TALISMAN.y-10,60,'#b9d99c25');this.spark(c,TALISMAN,t,'#c8e6b4');}
   const a=s.player.action;if(a&&['light','heavy'].includes(a.kind)){
    const heavy=a.kind==='heavy',hit=heavy?.38:.14;
    if(a.time>hit-.04&&a.time<hit+.18){c.save();c.translate(s.player.x,s.player.y-13);
     // Traînée : trois arcs fantômes derrière la lame en mouvement.
     if(!reduced){const sweep=a.face-1.4+clamp(a.time/(heavy?.6:.33),0,1)*2.6;
      c.strokeStyle=heavy?'#f5dabc':'#dfe8d0';c.lineWidth=heavy?4:2.5;
      for(let k=3;k>=1;k--){const ang=sweep-k*.3;c.globalAlpha=.45/k;c.beginPath();c.arc(0,0,(heavy?68:53)+k*3,ang-.8,ang+.5);c.stroke();}
      c.globalAlpha=1;}
     c.strokeStyle=heavy?'#f5dabca0':'#dfe8d090';c.lineWidth=heavy?5:3;c.beginPath();c.arc(0,0,heavy?68:53,a.face-1.05,a.face+1.05);c.stroke();c.strokeStyle='#fff4ca';c.lineWidth=1;c.beginPath();c.arc(0,0,heavy?73:58,a.face-.7,a.face+.8);c.stroke();c.restore();}
   }
  if(a?.kind==='parry'&&a.time>=PARRY_WINDOW[0]&&a.time<=PARRY_WINDOW[1]){
   c.save();c.translate(s.player.x,s.player.y-13);c.strokeStyle='#f2ead494';c.lineWidth=3;c.beginPath();c.arc(0,0,36,a.face-.95,a.face+.95);c.stroke();c.strokeStyle='#ffffff66';c.lineWidth=1;c.beginPath();c.arc(0,0,40,a.face-.7,a.face+.7);c.stroke();c.restore();
  }
  for(const b of s.projectiles){this.light(c,b.x,b.y,25,'#dda65b44');ellipse(c,b.x,b.y,5,5,'#edbc70');rect(c,b.x-2,b.y-2,3,3,'#fff0ba');}
  for(const f of s.effects){
   const life=clamp(f.life/f.maxLife,0,1);c.globalAlpha=life;
    if(f.impact){
     this.lamps.push({x:f.x,y:f.y,r:50*life+18,color:'#ffe9c0',i:.75*life});
     const expansion=1-life;c.save();c.translate(f.x,f.y);c.rotate(f.angle);
    c.strokeStyle=f.color;c.lineWidth=f.heavy?3:2;
    const rays=f.heavy?9:6,reach=(f.heavy?43:28)*expansion+8;
    for(let i=0;i<rays;i++){c.rotate(Math.PI*2/rays);c.beginPath();c.moveTo(5,0);c.lineTo(reach,0);c.stroke();}
    rect(c,-(f.heavy?5:3),-(f.heavy?5:3),f.heavy?10:6,f.heavy?10:6,'#fff8d3');c.restore();
   }else if(f.ring){c.strokeStyle=f.color;c.lineWidth=4;c.beginPath();c.arc(f.x,f.y,f.radius*(1-life),0,Math.PI*2);c.stroke();}
   else rect(c,f.x,f.y,f.size,f.size,f.color);
  }c.globalAlpha=1;
   // Particules d’ambiance par zone ; désactivées en mouvement réduit.
   if(!reduced){
    const P=PARTICLES[s.area]||PARTICLES.cour,vw=w/this.zoom,vh=h/this.zoom,wrap=(v,n)=>((v%n)+n)%n;
    for(let i=0;i<P.n;i++){
     const x=left+wrap(hash(i,94)*vw+t*P.dx*(2+i%3),vw);
     const y=P.up?top+wrap(hash(i,45)*vh-t*P.dy*(.5+hash(i,7)),vh):top+wrap(hash(i,45)*vh+t*(i%2?1:-1)*P.dy,vh);
     rect(c,x,y,1+(i%3===0),1,i%4?P.c[0]:P.c[1]);
    }
   }
   c.restore();
   const fog=c.createLinearGradient(0,0,0,h);fog.addColorStop(0,'#8ba49d0a');fog.addColorStop(.5,'#a5bca006');fog.addColorStop(1,'#03131d32');c.fillStyle=fog;c.fillRect(0,0,w,h);
   // Lightmap alignée sur la caméra, grade de zone interpolé, puis post-traitement WebGL.
   this.paintLights(s,t,w,h,reduced,sx,sy);
   const boss=s.enemies.find(e=>e.type==='boss');
   const tgt=GRADES[s.area]||GRADES.refuge;
   const gradeTarget=s.area==='boss'&&boss&&!boss.dead&&boss.phase===2?GRADES.boss2:tgt;
   const k=Math.min(1,dt*2.5);
   this.grade.tint=this.grade.tint.map((v,i)=>v+(gradeTarget.tint[i]-v)*k);
   for(const key of ['sat','con','vig','amt'])this.grade[key]+=(gradeTarget[key]-this.grade[key])*k;
   const red=reduced?0:clamp(s.player.flash*1.65,0,.33);
   const white=reduced?0:clamp(s.hitStop*2.5,0,.28);
   const flashAmt=Math.max(red,white);
   const g=this.grade;
   this.fx.present(this.scene,this.lightCv,{
    tint:g.tint,amt:g.amt,sat:g.sat,con:g.con,vig:g.vig,
    grain:reduced?0:.045,bloom:reduced?.3:.55,
    flashCol:white>=red?[1,1,1]:[1,.4,.3],flashAmt,
    aber:reduced?0:.0008+flashAmt*.015,time:t,
   });
  }
 spark(c,p,t,color){const y=p.y-8+Math.sin(t*3+p.x)*3;this.light(c,p.x,y,24,color+'22');polygon(c,[[p.x,y-7],[p.x+4,y],[p.x,y+7],[p.x-4,y]],color);}
 drawMap(canvas,s){
  const c=canvas.getContext('2d'),scale=6.1,ox=33,oy=15;rect(c,0,0,canvas.width,canvas.height,'#142125');
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(WORLD.grid[y][x])rect(c,ox+x*scale,oy+y*scale,scale,scale,'#43534f');
  c.textAlign='center';c.font='10px Georgia';
  const labels={refuge:'LE REFUGE',cour:'LA COUR',cloitre:'LE CLOÎTRE',galerie:'LES SERMENTS',boss:'LE CLOCHER',crypte:'LE JARDIN'};
  for(const r of ROOMS){c.fillStyle='#c3c5af';c.fillText(labels[r.id],ox+(r.x+r.w/2)*scale,oy+(r.y+r.h/2)*scale);}
  if(!s.progress.shortcut)rect(c,ox+GATE.x/TILE*scale,oy+GATE.y/TILE*scale,4*scale,3,'#d79060');
  const marker=(p,color,r=3)=>ellipse(c,ox+p.x/TILE*scale,oy+p.y/TILE*scale,r,r,color);
  marker(SHRINE,'#dfbd73',4);if(!s.progress.talisman)marker(TALISMAN,'#bad7a0',3);if(s.drop)marker(s.drop,'#afd575',3);marker({x:17*TILE,y:14*TILE},s.progress.bossDefeated?'#556e59':'#bb705a',4);marker(s.player,'#f7ecd2',4);
 }
}
