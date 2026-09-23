const CLIPS={idle:0,move:1,windup:2,sweep:3,charge:4,slam:5,hit:6,death:7};
const FX={sweep:0,charge:1,slam:2};
const clamp01=n=>Math.max(0,Math.min(1,n));

export function bossDirection(angle){
 const x=Math.cos(angle),y=Math.sin(angle);
 if(Math.abs(y)>Math.abs(x))return y>0?0:1; // south, north
 return x>0?2:3; // east, west
}

export function bossPose(boss,t){
 const direction=bossDirection(boss.face);
 if(boss.dead)return {direction,clip:'death',frame:Math.min(9,Math.floor(clamp01((t-(boss.deathTime??t))/1.15)*10))};
 if(boss.hitReact>0||(boss.hitAnimUntil??0)>t){
  const duration=boss.hitAnimDuration||.3;
  return {direction,clip:'hit',frame:Math.min(9,Math.floor(clamp01(1-Math.max(0,(boss.hitAnimUntil??t)-t)/duration)*10))};
 }
 if(boss.state==='stun')return {direction,clip:'hit',frame:Math.floor(t*8)%10};
 if(boss.state==='windup'){
  const duration=boss.wind*(boss.phase===2?.78:1)+(boss.attackKind==='slam'?.25:0);
  return {direction,clip:'windup',frame:Math.min(9,Math.floor(clamp01(1-boss.timer/Math.max(.1,duration))*10))};
 }
 if(boss.state==='charge')return {direction,clip:'charge',frame:Math.min(9,Math.floor(clamp01(1-boss.timer/.55)*10))};
 if(boss.state==='recover'){
  const total=boss.attackKind==='charge'?1.3:boss.recover*(boss.phase===2?.77:1);
  const elapsed=Math.max(0,total-boss.timer);
  if(elapsed<.42)return {direction,clip:boss.attackKind,frame:Math.min(9,Math.floor(clamp01(elapsed/.42)*10))};
  return {direction,clip:'idle',frame:Math.floor(t*3)%10};
 }
 if(boss.state==='chase')return {direction,clip:'move',frame:Math.floor(t*10)%10};
 return {direction,clip:'idle',frame:Math.floor(t*3)%10};
}

export class BossAnimator{
 constructor(){
  this.sheet=new Image();this.sheet.src=new URL('../assets/generated/boss/warden.webp',import.meta.url).href;
  this.fx=new Image();this.fx.src=new URL('../assets/generated/boss/warden-fx.webp',import.meta.url).href;
 }
 draw(c,boss,t){
  if(!this.sheet.complete||!this.sheet.naturalWidth)return false;
  const {direction,clip,frame}=bossPose(boss,t);
  const row=CLIPS[clip]*4+direction;
  c.save();c.translate(Math.round(boss.x),Math.round(boss.y));
  c.imageSmoothingEnabled=false;
  if(!boss.dead){
   c.fillStyle='#061217bb';c.beginPath();c.ellipse(0,2,27,9,0,0,Math.PI*2);c.fill();
   if(boss.phase===2){c.fillStyle='#e2743030';c.beginPath();c.ellipse(0,-44,36,44,0,0,Math.PI*2);c.fill();}
  }
  c.drawImage(this.sheet,frame*144,row*112,144,112,-72,-108,144,112);
  if(boss.flash>0&&!boss.dead){c.globalAlpha=Math.min(.48,boss.flash*1.8);c.fillStyle='#ffe2a5';c.fillRect(-17,-81,35,5);}
  c.restore();return true;
 }
 drawAttackFx(c,boss,t,reduced=false){
  if(boss.dead||!this.fx.complete||!this.fx.naturalWidth||reduced)return;
  let kind,progress;
  if(boss.state==='charge'){
   kind='charge';progress=clamp01(1-boss.timer/.55);
  }else if(boss.state==='recover'){
   const total=boss.attackKind==='charge'?1.3:boss.recover*(boss.phase===2?.77:1);
   const elapsed=total-boss.timer;
   if(elapsed<0||elapsed>.43)return;
   kind=boss.attackKind;progress=clamp01(elapsed/.43);
  }else return;
  if(!(kind in FX))return;
  const frame=Math.min(9,Math.floor(progress*10));
  c.save();c.translate(Math.round(boss.x),Math.round(boss.y));
  if(kind!=='slam')c.rotate(boss.face);
  c.globalAlpha=(boss.phase===2?.95:.76)*(1-progress*.48);
  c.imageSmoothingEnabled=false;
  const size=kind==='slam'?290:kind==='sweep'?230:200;
  c.drawImage(this.fx,frame*160,FX[kind]*160,160,160,-size/2,-size/2,size,size);
  c.restore();
 }
}
