// Post-traitement WebGL : lumière (multiply), bloom, grade, grain, vignette, flash.
// Scène et lightmap restent peintes en Canvas 2D puis téléversées comme textures.
const VERT=`attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
const COMPOSITE_FS=`precision mediump float;varying vec2 vUv;uniform sampler2D uScene,uLights;
void main(){gl_FragColor=vec4(texture2D(uScene,vUv).rgb*texture2D(uLights,vUv).rgb,1.);}`;
const BRIGHT_FS=`precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform float uThresh;
void main(){vec3 c=texture2D(uTex,vUv).rgb;float l=dot(c,vec3(.299,.587,.114));
gl_FragColor=vec4(c*smoothstep(uThresh,uThresh+.25,l),1.);}`;
const BLUR_FS=`precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform vec2 uDir;
void main(){vec3 s=texture2D(uTex,vUv).rgb*.227027;
s+=texture2D(uTex,vUv+uDir*1.3846).rgb*.316216;
s+=texture2D(uTex,vUv-uDir*1.3846).rgb*.316216;
s+=texture2D(uTex,vUv+uDir*3.2308).rgb*.070270;
s+=texture2D(uTex,vUv-uDir*3.2308).rgb*.070270;
gl_FragColor=vec4(s,1.);}`;
const PRESENT_FS=`precision mediump float;varying vec2 vUv;
uniform sampler2D uScene,uBloom;
uniform vec3 uTint,uFlashCol;
uniform float uAmt,uSat,uCon,uVig,uGrain,uTime,uBloomStr,uFlashAmt,uAber;
void main(){
 vec2 d=(vUv-.5)*uAber;
 vec3 col=vec3(texture2D(uScene,vUv+d).r,texture2D(uScene,vUv).g,texture2D(uScene,vUv-d).b);
 col+=texture2D(uBloom,vUv).rgb*uBloomStr;
 col=mix(col,col*uTint,uAmt);
 col=(col-.5)*uCon+.5;
 float g=dot(col,vec3(.299,.587,.114));
 col=mix(vec3(g),col,uSat);
 col*=mix(1.,1.-smoothstep(.2,.95,length(vUv-.5)*1.15),uVig);
 float n=fract(sin(dot(vUv+vec2(uTime,fract(uTime*3.7)),vec2(12.9898,78.233)))*43758.5453);
 col+=(n-.5)*uGrain;
 col=mix(col,uFlashCol,uFlashAmt);
 gl_FragColor=vec4(col,1.);
}`;
function compile(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'shader');
 return sh;
}
function program(gl,fs){
 const p=gl.createProgram();
 gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VERT));
 gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));
 gl.bindAttribLocation(p,0,'aPos');
 gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'link');
 return p;
}
function uniforms(gl,p,names){const o={};for(const n of names)o[n]=gl.getUniformLocation(p,n);return o;}
function target(gl,w,h){
 const tex=gl.createTexture();
 gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const fb=gl.createFramebuffer();
 gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 return {tex,fb,w,h};
}
function destroy(gl,t){if(!t)return;gl.deleteFramebuffer(t.fb);gl.deleteTexture(t.tex);}
function upload(gl,tex,canvas){
 gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function bind(gl,unit,tex){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);}
export class Fx{
 constructor(canvas){
  this.canvas=canvas;this.ok=false;this.w=0;this.h=0;
  const opts={alpha:false,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:false};
  let gl=null;
  try{gl=canvas.getContext('webgl',opts)||canvas.getContext('experimental-webgl',opts);}catch{}
  if(!gl){this.ctx=canvas.getContext('2d');return;}
  this.gl=gl;
  this.pComp=program(gl,COMPOSITE_FS);this.uComp=uniforms(gl,this.pComp,['uScene','uLights']);
  this.pBright=program(gl,BRIGHT_FS);this.uBright=uniforms(gl,this.pBright,['uTex','uThresh']);
  this.pBlur=program(gl,BLUR_FS);this.uBlur=uniforms(gl,this.pBlur,['uTex','uDir']);
  this.pPresent=program(gl,PRESENT_FS);
  this.uPresent=uniforms(gl,this.pPresent,['uScene','uBloom','uTint','uFlashCol','uAmt','uSat','uCon','uVig','uGrain','uTime','uBloomStr','uFlashAmt','uAber']);
  this.quad=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.sceneTex=gl.createTexture();this.lightTex=gl.createTexture();
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  this.ok=true;
 }
 resize(w,h){
  if(!this.ok||w<1||h<1||w===this.w&&h===this.h)return;
  const gl=this.gl;
  destroy(gl,this.full);destroy(gl,this.halfA);destroy(gl,this.halfB);
  const hw=Math.max(1,w>>1),hh=Math.max(1,h>>1);
  this.full=target(gl,w,h);this.halfA=target(gl,hw,hh);this.halfB=target(gl,hw,hh);
  this.w=w;this.h=h;
 }
 present(scene,lights,o){
  if(!this.ok){this.fallback(scene,lights,o);return;}
  const gl=this.gl,w=this.canvas.width,h=this.canvas.height;
  this.resize(w,h);
  if(!this.full)return;
  upload(gl,this.sceneTex,scene);upload(gl,this.lightTex,lights);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  // Scène × lightmap.
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.full.fb);
  gl.viewport(0,0,this.full.w,this.full.h);
  gl.useProgram(this.pComp);
  bind(gl,0,this.sceneTex);bind(gl,1,this.lightTex);
  gl.uniform1i(this.uComp.uScene,0);gl.uniform1i(this.uComp.uLights,1);
  gl.drawArrays(gl.TRIANGLES,0,6);
  // Bloom : seuil + flou séparable en demi-résolution.
  const hw=this.halfA.w,hh=this.halfA.h;
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.halfA.fb);
  gl.viewport(0,0,hw,hh);
  gl.useProgram(this.pBright);
  bind(gl,0,this.full.tex);
  gl.uniform1i(this.uBright.uTex,0);gl.uniform1f(this.uBright.uThresh,.58);
  gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(this.pBlur);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.halfB.fb);
  bind(gl,0,this.halfA.tex);
  gl.uniform1i(this.uBlur.uTex,0);gl.uniform2f(this.uBlur.uDir,1/hw,0);
  gl.drawArrays(gl.TRIANGLES,0,6);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.halfA.fb);
  bind(gl,0,this.halfB.tex);
  gl.uniform2f(this.uBlur.uDir,0,1/hh);
  gl.drawArrays(gl.TRIANGLES,0,6);
  // Composition finale à l'écran.
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,w,h);
  gl.useProgram(this.pPresent);
  bind(gl,0,this.full.tex);bind(gl,1,this.halfA.tex);
  gl.uniform1i(this.uPresent.uScene,0);gl.uniform1i(this.uPresent.uBloom,1);
  gl.uniform3fv(this.uPresent.uTint,o.tint);gl.uniform3fv(this.uPresent.uFlashCol,o.flashCol);
  gl.uniform1f(this.uPresent.uAmt,o.amt);gl.uniform1f(this.uPresent.uSat,o.sat);
  gl.uniform1f(this.uPresent.uCon,o.con);gl.uniform1f(this.uPresent.uVig,o.vig);
  gl.uniform1f(this.uPresent.uGrain,o.grain);gl.uniform1f(this.uPresent.uTime,o.time);
  gl.uniform1f(this.uPresent.uBloomStr,o.bloom);gl.uniform1f(this.uPresent.uFlashAmt,o.flashAmt);
  gl.uniform1f(this.uPresent.uAber,o.aber);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 // Sans WebGL : multiply de la lightmap, vignette et flash en Canvas 2D.
 fallback(scene,lights,o){
  const c=this.ctx;if(!c)return;
  const w=this.canvas.width,h=this.canvas.height;
  c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;
  c.drawImage(scene,0,0);
  c.globalCompositeOperation='multiply';c.drawImage(lights,0,0);
  c.globalCompositeOperation='source-over';
  const g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.28,w/2,h/2,Math.max(w,h)*.72);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${o.vig*.65})`);
  c.fillStyle=g;c.fillRect(0,0,w,h);
  if(o.flashAmt>0){
   c.globalAlpha=o.flashAmt;
   c.fillStyle=`rgb(${o.flashCol.map(v=>Math.round(v*255)).join(',')})`;
   c.fillRect(0,0,w,h);c.globalAlpha=1;
  }
 }
}
