const TYPES=['penitent','watcher'];
export const ENEMY_CLIPS={idle:0,chase:1,windup:2,attack:3,recover:4,hit:5,stun:5,death:6};
const clamp01=value=>Math.max(0,Math.min(1,value));

export function enemyPose(e,t){
 if(e.dead){
  const progress=clamp01((t-(e.deathTime??t))/1.15);
  return {clip:'death',frame:Math.min(9,Math.floor(progress*10))};
 }
 if(e.hitReact>0||(e.hitAnimUntil??0)>t){
  const duration=e.hitAnimDuration||.3,progress=clamp01(1-Math.max(0,(e.hitAnimUntil??t)-t)/duration);
  return {clip:'hit',frame:Math.min(9,Math.floor(progress*10))};
 }
 if(e.state==='stun'){
  const duration=e.stunDuration||Math.max(.1,e.timer),progress=clamp01(1-e.timer/duration);
  return {clip:'stun',frame:Math.min(9,Math.floor(Math.min(1,progress/.42)*10))};
 }
 if(e.state==='windup'){
  const duration=e.wind*(e.phase===2?.78:1)+(e.attackKind==='slam'?.25:0),progress=clamp01(1-e.timer/Math.max(.1,duration));
  return {clip:'windup',frame:Math.min(9,Math.floor(progress*10))};
 }
 if(e.state==='recover'){
  const total=e.recover*(e.phase===2?.77:1),elapsed=total-e.timer,attackTime=.30;
  if(elapsed<attackTime)return {clip:'attack',frame:Math.min(9,Math.floor(clamp01(elapsed/attackTime)*10))};
  return {clip:'recover',frame:Math.min(9,Math.floor(clamp01((elapsed-attackTime)/Math.max(.1,total-attackTime))*10))};
 }
 if(e.state==='chase')return {clip:'chase',frame:Math.floor((t*12+(e.id||0)*.7)%10)};
 return {clip:'idle',frame:Math.floor((t*3+(e.id||0)*.9)%10)};
}

export class EnemyAnimator{
 constructor(){
  this.images=Object.fromEntries(TYPES.map(type=>{const image=new Image();image.src=new URL(`../assets/generated/enemies/${type}.png`,import.meta.url).href;return[type,image];}));
  this.frames=new WeakMap();
 }
 frame(image,row,index){
  if(!image.complete||!image.naturalWidth)return null;
  let cache=this.frames.get(image);if(!cache){cache=new Map();this.frames.set(image,cache);}
  const key=row*10+index;if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;
  const sw=image.naturalWidth/10,sh=image.naturalHeight/8;
  c.drawImage(image,index*sw,row*sh,sw,sh,0,0,64,64);
  const pixels=c.getImageData(0,0,64,64),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   if(data[i+3]<105){data[i+3]=0;continue;}
   data[i]=Math.round(data[i]/18)*18;data[i+1]=Math.round(data[i+1]/18)*18;data[i+2]=Math.round(data[i+2]/18)*18;data[i+3]=255;
  }
  c.putImageData(pixels,0,0);cache.set(key,canvas);return canvas;
 }
 draw(c,e,t){
  const image=this.images[e.type];if(!image)return false;
  const {clip,frame}=enemyPose(e,t),sprite=this.frame(image,ENEMY_CLIPS[clip],frame);if(!sprite)return false;
  const height=e.type==='watcher'?67:62,width=e.type==='watcher'?69:64;
  c.save();c.translate(Math.round(e.x),Math.round(e.y));
  if(Math.cos(e.face)<0)c.scale(-1,1);
  c.imageSmoothingEnabled=false;c.drawImage(sprite,-width/2,-height,width,height);c.restore();return true;
 }
}
