// Toutes les planches ont 5 colonnes et 4 rangées : 10 images pour chacune
// des deux orientations contenues dans une planche.
const CLIPS=['idle','run','backpedal','light','heavy','roll','heal','parry','hurt','death'];
const FILES=Object.fromEntries(CLIPS.map(name=>[name,{
 front:new URL(`../assets/generated/pilgrim/${name}-front-back.webp`,import.meta.url).href,
 side:new URL(`../assets/generated/pilgrim/${name}-side.webp`,import.meta.url).href,
}]));

const clamp01=value=>Math.max(0,Math.min(1,value));
export function heroFrameIndex(kind,p,t,deathTimer=0){
 if(kind==='idle')return Math.floor((t%1.6)/1.6*10);
 if(kind==='run'||kind==='backpedal'){
  const step=Math.floor(p.walk/.65+1e-8)%10;
  return kind==='backpedal'?(10-step)%10:step;
 }
 if(kind==='hurt')return Math.min(9,Math.floor(clamp01(1-p.hitReact/(p.hitReactMax||.3))*10));
 if(kind==='death')return Math.min(9,Math.floor(clamp01(1-deathTimer/1.5)*10));
 const a=p.action;if(!a)return 0;
 if(kind==='heal'){
  const times=[0,.12,.25,.38,.52,.67,.85,.93,1,1.04];
  let index=0;while(index<9&&a.time>=times[index+1])index++;
  return index;
 }
 const hit={light:.14,heavy:.38}[kind];
 if(hit){
  // L'image d'impact correspond exactement à l'instant où la simulation
  // applique les dégâts ou le soin, puis cinq images montrent la récupération.
  if(a.time<hit)return Math.min(4,Math.floor(clamp01(a.time/hit)*5));
  return 5+Math.min(4,Math.floor(clamp01((a.time-hit)/(a.duration-hit))*5));
 }
 return Math.min(9,Math.floor(clamp01(a.time/a.duration)*10));
}

export function heroDirection(face){
 const sector=(Math.round(face/(Math.PI/4))+8)%8;
 if(sector===2)return {sheet:'front',view:0,flip:false};
 if([5,6,7].includes(sector))return {sheet:'front',view:1,flip:false};
 if(sector===1)return {sheet:'side',view:1,flip:false};
 if(sector===3)return {sheet:'side',view:1,flip:true};
 return {sheet:'side',view:0,flip:sector===4};
}

export class HeroAnimator{
 constructor(){
  this.frames=new WeakMap();this.layouts=new WeakMap();
  this.pending=[];this.warming=false;
  this.images=Object.fromEntries(CLIPS.map(name=>[name,Object.fromEntries(
   Object.entries(FILES[name]).map(([view,url])=>{const image=new Image();image.onload=()=>this.enqueue(image);image.src=url;return [view,image];})
  )]));
 }
 enqueue(image){
  this.pending.push(image);
  if(this.warming)return;
  this.warming=true;
  const step=()=>{
   const next=this.pending.shift();
   if(!next){this.warming=false;return;}
   next.decode().then(()=>{this.frame(next,0,0);this.frame(next,1,0);}).catch(()=>{}).finally(()=>{
    if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:1000});
    else setTimeout(step,0);
   });
  };
  if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:1000});
  else setTimeout(step,0);
 }
 layout(image){
  let layout=this.layouts.get(image);if(layout)return layout;
  // Les images générées n'ont pas toutes des gouttières parfaitement égales.
  // On repère les espaces transparents entre les rangées avant de découper.
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(image.naturalWidth/4);canvas.height=Math.ceil(image.naturalHeight/4);
  const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=false;context.drawImage(image,0,0,canvas.width,canvas.height);
  const data=context.getImageData(0,0,canvas.width,canvas.height).data;
  const count=new Uint16Array(canvas.height),width=canvas.width,height=canvas.height;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>105)count[y]++;
  const cuts=[0];
  for(let i=1;i<4;i++){
   const expected=Math.round(height*i/4),range=Math.round(height*.1);
   const begin=Math.max(cuts.at(-1)+5,expected-range),end=Math.min(height-5,expected+range);
   let best=-1,bestLength=0,run=-1;
   for(let y=begin;y<=end+1;y++){
    if(y<=end&&count[y]<Math.max(3,width*.018)){if(run<0)run=y;}
    else if(run>=0){const length=y-run,mid=run+length/2;if(length>bestLength||length===bestLength&&Math.abs(mid-expected)<Math.abs(best-expected)){best=Math.round(mid);bestLength=length;}run=-1;}
   }
   if(best<0){best=begin;for(let y=begin+1;y<=end;y++)if(count[y]<count[best])best=y;}
   cuts.push(best);
  }
  cuts.push(height);
  const bottoms=[];
  for(let row=0;row<4;row++){
   let bottom=cuts[row+1]-1;
   while(bottom>cuts[row]&&count[bottom]<Math.max(3,width*.018))bottom--;
   bottoms.push(bottom);
  }
  const factor=image.naturalHeight/height;
  layout={cuts:cuts.map(y=>y*factor),bottoms:bottoms.map(y=>y*factor)};
  this.layouts.set(image,layout);return layout;
 }
 frame(image,view,index){
  if(!image.complete||!image.naturalWidth)return null;
  let cache=this.frames.get(image);
  if(!cache){cache=new Map();this.frames.set(image,cache);}
  const key=view*10+index;if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const {cuts,bottoms}=this.layout(image),row=view*2+Math.floor(index/5);
  const width=image.naturalWidth/5,sourceY=cuts[row],sourceH=cuts[row+1]-sourceY;
  const scale=64/width,destY=64-(bottoms[row]-sourceY)*scale;
  context.drawImage(image,index%5*width,sourceY,width,sourceH,0,destY,64,sourceH*scale);
  const pixels=context.getImageData(0,0,64,64),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   if(data[i+3]<105){data[i+3]=0;continue;}
   data[i]=Math.min(255,Math.round(data[i]/12)*12);
   data[i+1]=Math.min(255,Math.round(data[i+1]/12)*12);
   data[i+2]=Math.min(255,Math.round(data[i+2]/12)*12);
   data[i+3]=255;
  }
  // Un bout de botte ou de lame d'une cellule voisine peut déborder dans la
  // gouttière. Les îlots minuscules isolés ne font pas partie de la pose.
  const seen=new Uint8Array(64*64),islands=[];
  for(let p=0;p<seen.length;p++){
   if(seen[p]||!data[p*4+3])continue;
   const island=[],stack=[p];seen[p]=1;
   while(stack.length){
    const pixel=stack.pop();island.push(pixel);
    const x=pixel%64,y=Math.floor(pixel/64);
    for(const next of [x>0?pixel-1:-1,x<63?pixel+1:-1,y>0?pixel-64:-1,y<63?pixel+64:-1]){
     if(next>=0&&!seen[next]&&data[next*4+3]){seen[next]=1;stack.push(next);}
    }
   }
   islands.push(island);
  }
  const largest=Math.max(0,...islands.map(island=>island.length));
  for(const island of islands)if(island.length<largest*.2)for(const pixel of island)data[pixel*4+3]=0;
  context.putImageData(pixels,0,0);cache.set(key,canvas);return canvas;
 }
 draw(c,p,t,dead=false,deathTimer=0){
  let kind='idle';
  if(dead)kind='death';
  else if(p.action)kind=p.action.kind;
  else if(p.hitReact>0)kind='hurt';
  else if(p.moving)kind=Math.cos((p.moveFace??p.face)-p.face)<-.45?'backpedal':'run';
  const face=p.action?.kind==='roll'?p.action.dir:p.action?.face??p.face;
  const direction=heroDirection(face),index=heroFrameIndex(kind,p,t,deathTimer);
  const sprite=this.frame(this.images[kind][direction.sheet],direction.view,index);
  if(!sprite)return false;
  const width=['light','heavy'].includes(kind)?78:68;
  c.save();c.translate(Math.round(p.x),Math.round(p.y));
  c.fillStyle='#061217aa';c.beginPath();c.ellipse(0,2,15,5,0,0,Math.PI*2);c.fill();
  if(direction.flip)c.scale(-1,1);
  c.imageSmoothingEnabled=false;c.drawImage(sprite,-width/2,-65,width,68);
  c.restore();return true;
 }
}
