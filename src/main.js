import {createGame,update,startAction,interact,nearby,respawn,enterVeille,upgrade,serialize,ROOMS,SHRINE,SUBTITLES,distance,clamp} from './core.js';
import {Renderer} from './render.js';
const $=id=>document.getElementById(id);
const icon=(name,extra='')=>`<span class="game-icon icon-${name}${extra?' '+extra:''}" aria-hidden="true"></span>`;
const SAVE_KEY='cloche-des-cendres-v1';
let stored=null,storageAvailable=true;
try{stored=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{storageAvailable=false;}
let s=createGame(stored),mode='title',lastTime=0,toastTimer=0,areaTimer=0,stepTimer=0,autosave=0;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,muted=false,volume=.3;
const renderer=new Renderer($('game'));renderer.resize();
const keys=new Set();let pointer={x:0,y:0,active:false},padButtons=[],usingPad=false,usingTouch=false;
let holdLeft=0;
const stick={id:null,ox:0,oy:0,x:0,y:0};
// Préférence tactile : auto (détection), on (forcé), off (désactivé) — persistée à part de la sauvegarde de jeu.
let touchPref='auto';try{touchPref=localStorage.getItem('cloche-touch-mode')||'auto';}catch{}
let autoTouch=false;
function applyTouch(){const on=touchPref==='on'||(touchPref==='auto'&&autoTouch);
 if(on&&!usingTouch){usingTouch=true;document.body.classList.add('touch');if(mode!=='title')$('touch-controls').hidden=false;}
 else if(!on&&usingTouch){usingTouch=false;document.body.classList.remove('touch');$('touch-controls').hidden=true;resetStick();}
}
function enableTouch(){autoTouch=true;applyTouch();}
function setTouchMode(pref){touchPref=pref;try{localStorage.setItem('cloche-touch-mode',pref);}catch{}applyTouch();}
function resetStick(){stick.id=null;stick.x=0;stick.y=0;$('stick-zone').classList.remove('active');$('stick-knob').style.transform='translate(-50%,-50%)';}
if(matchMedia('(pointer: coarse)').matches||touchPref==='on')enableTouch();
window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){pointer.active=false;enableTouch();}},{capture:true});
const audioNames=['knifeSlice','knifeSlice2','footstep00','footstep01','cloth1','metalPot1','handleCoins','doorOpen_1','bookOpen'];
const audio=Object.fromEntries(audioNames.map(name=>[name,new Audio(new URL('../assets/audio/'+name+'.ogg',import.meta.url).href)]));
let audioContext;
function sound(name,gain=1){if(muted)return;const a=audio[name];if(!a)return;const copy=a.cloneNode();copy.volume=clamp(volume*gain,0,1);copy.play().catch(()=>{});}
function bell(){if(muted)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();for(const [freq,mul]of [[220,1],[442,.35],[588,.2]]){const osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;g.gain.setValueAtTime(volume*.25*mul,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+3);osc.connect(g).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+3);}}catch{}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize(s)));$('saved').textContent='PROGRESSION SAUVEGARDÉE';}catch{storageAvailable=false;$('saved').textContent='SAUVEGARDE INDISPONIBLE';}}
if(!storageAvailable)$('saved').textContent='SAUVEGARDE INDISPONIBLE';
if(stored)$('start').innerHTML='Reprendre le pèlerinage <span>↗</span>';
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastTimer=3.7;}
function banner(name,sub,dur=3){$('area-banner').textContent=name;$('area-sub').textContent=sub;$('area-banner').classList.add('show');$('area-sub').classList.add('show');areaTimer=dur;}
function inscription(text,note=''){
 setModal(`<div class="eyebrow">GRAVÉ DANS LA PIERRE</div><h2>Une inscription.</h2><p class="inscription-text">«&#8239;${text}&#8239;»</p>${note?`<p class="inscription-note">${note}</p>`:''}<button class="primary" id="inscription-back">Reprendre la route</button>`,'inscription');
 $('inscription-back').onclick=resume;
}
function setModal(html,nextMode){mode=nextMode;keys.clear();resetStick();$('touch-controls').hidden=true;$('modal-content').innerHTML=html;$('modal').hidden=false;$('map-screen').hidden=true;}
function resume(){mode='play';keys.clear();resetStick();$('touch-controls').hidden=!usingTouch;$('modal').hidden=true;$('map-screen').hidden=true;$('game').focus();lastTime=performance.now();}
function pause(){if(mode!=='play'&&mode!=='map')return;holdLeft=0;save();setModal(`<div class="eyebrow">LE TEMPS SUSPENDU</div><h2>Une halte dans les cendres.</h2><p>Le sanctuaire peut attendre.</p><button class="primary" id="resume">Reprendre le pèlerinage</button><button class="secondary" id="help">Commandes & conseils</button><label>Volume <input id="volume" aria-label="Volume sonore" type="range" min="0" max="100" value="${volume*100}"></label><label>Réduire les effets et secousses <input type="checkbox" id="reduced" ${reduced?'checked':''}></label><label>Commandes tactiles <select id="touch-mode" aria-label="Commandes tactiles"><option value="auto"${touchPref==='auto'?' selected':''}>Auto</option><option value="on"${touchPref==='on'?' selected':''}>Toujours</option><option value="off"${touchPref==='off'?' selected':''}>Jamais</option></select></label><button class="secondary" id="credits">À propos & crédits</button><button class="text-button" id="restart">Recommencer la démo</button>`,'pause');
 $('resume').onclick=resume;$('help').onclick=help;$('credits').onclick=()=>credits(false);$('restart').onclick=confirmRestart;$('volume').oninput=e=>volume=Number(e.target.value)/100;$('reduced').onchange=e=>reduced=e.target.checked;$('touch-mode').onchange=e=>setTouchMode(e.target.value);
}
function help(){setModal(`<div class="eyebrow">LES GESTES DU PÈLERIN</div><h2>Observer. Esquiver. Riposter.</h2><div class="control-grid"><span>ZQSD / WASD / Flèches</span><span>Se déplacer</span><span>Souris</span><span>Orienter l’épée</span><span>Clic gauche court / J</span><span>Attaque légère</span><span>Clic gauche maintenu / K</span><span>Attaque lourde</span><span>Clic droit</span><span>Parade</span><span>Espace</span><span>Esquive directionnelle</span><span>R / F</span><span>Boire une fiole</span><span>E / Entrée</span><span>Interagir</span><span>M / Échap</span><span>Carte / Pause</span></div><p>Manette standard : stick gauche pour marcher, droit pour viser ; RB pour l’attaque légère, RT pour la lourde, LB pour la parade, A ou B pour esquiver, Y pour soigner, X pour interagir, Start pour la pause, Select pour la carte.</p>${usingTouch?`<p>Écran tactile : stick virtuel à gauche pour marcher, boutons à droite — ${icon('sword')} légère, ${icon('hammer')} lourde, ${icon('shield')} parade, ${icon('dodge')} esquive, ${icon('potion')} fiole, ${icon('fragment')} interagir. L’épée vise automatiquement l’ennemi le plus proche.</p>`:''}<p>Les marques ambrées annoncent les attaques. Attendez une ouverture : l’attaque lourde interrompt les ennemis ordinaires, et une roulade peut l’interrompre une fois le coup porté. La parade, au début du geste, renverse un assaillant de front : frappez-le aussitôt, la riposte est fatale. Une action pressée pendant un geste part à la fin de celui-ci. Le refuge recharge les fioles, mais réveille les ennemis.</p><button class="primary" id="help-back">Entrer dans les ruines</button>`,'help');$('help-back').onclick=resume;}
function credits(fromTitle){setModal(`<div class="eyebrow">UNE PREMIÈRE ÉTINCELLE</div><h2>La Cloche des Cendres</h2><p>Démo originale de dark fantasy en vue trois quarts. Construite en JavaScript et Canvas 2D. Aucun compte ni serveur de jeu nécessaire.</p><p>Débris de décor : <a href="https://opengameart.org/content/32x32-dungeon-tileset" target="_blank" rel="noreferrer">Stealthix — Dungeon Tileset</a> · CC0.<br>Sons : <a href="https://kenney.nl/assets/rpg-audio" target="_blank" rel="noreferrer">Kenney — RPG Audio</a> · CC0.</p><p>Le pèlerin et les icônes couleur de l’interface utilisent des sprites originaux en pixel art HD-2D. Architecture, arbres, effets et son de cloche sont des créations procédurales du prototype.</p><p>La progression est conservée dans ce navigateur. Les animations et l’équilibrage restent à affiner avec vos retours.</p><button class="primary" id="credits-back">Retour</button>`,'credits');$('credits-back').onclick=()=>{if(fromTitle){mode='title';$('modal').hidden=true;}else{mode='play';pause();}};}
function confirmRestart(){setModal(`<div class="eyebrow">UN NOUVEAU PÈLERINAGE</div><h2>Recommencer ?</h2><p>La progression locale, les améliorations et les fragments de cette démo seront effacés.</p><button class="primary" id="confirm-restart">Recommencer depuis le refuge</button><button class="secondary" id="cancel-restart">Conserver ma progression</button>`,'confirm');$('confirm-restart').onclick=()=>{s=createGame();save();renderer.camera={x:s.player.x,y:s.player.y};resume();toast('Un nouveau pèlerin se lève.');};$('cancel-restart').onclick=()=>{mode='play';pause();};}
function shrine(){
 const prog=s.progress,p=s.player;
 const upgradeButton=(kind,title)=>{const cost=(kind==='vigor'?40:35)+prog[kind]*30;return `<button class="secondary upgrade" id="upgrade-${kind}" ${prog[kind]>=3||p.souls<cost?'disabled':''}><span>${title} · ${prog[kind]}/3</span><span>${prog[kind]>=3?'MAX':cost+' '+icon('fragment')}</span></button>`;};
 const romains=['','I','II','III'],veilOn=prog.bossDefeated&&prog.cycle<3,m=Math.pow(1.4,prog.cycle+1);
 const veil=prog.bossDefeated?`<p><strong>Entrer dans la veille</strong> — les cendres du sanctuaire se relèvent plus féroces : ×${(Math.round(m*100)/100).toString().replace('.',',')} PV et dégâts, une fiole de plus. Tout le reste est conservé.</p><button class="${veilOn?'primary':'secondary'}" id="veille" ${veilOn?'':'disabled'}>${veilOn?'Entrer dans la veille ('+romains[prog.cycle+1]+') — ennemis renforcés':'Le serment se dénoue'}</button>`:'';
 setModal(`<div class="eyebrow">LE DERNIER REFUGE</div><h2>La flamme se souvient.</h2><p>Santé et fioles restaurées. Les habitants du sanctuaire se relèvent.</p><div class="stat-line"><span>Fragments disponibles</span><span>${p.souls} ${icon('fragment')}</span></div>${upgradeButton('vigor','Vigueur +20 PV')}${upgradeButton('healing','Soin +14 PV')}<p>${prog.talisman?`${icon('talisman')} Talisman du souffle équipé.`:'Un talisman oublié repose dans le jardin à l’est.'}</p>${veil}<button class="${veilOn?'secondary':'primary'}" id="leave-shrine">Repartir</button>`,'shrine');
 $('leave-shrine').onclick=resume;for(const kind of ['vigor','healing'])$('upgrade-'+kind).onclick=()=>{if(upgrade(s,kind)){sound('handleCoins');save();shrine();}};
 if(prog.bossDefeated)$('veille').onclick=()=>{if(enterVeille(s)){renderer.camera={x:s.player.x,y:s.player.y};resume();toast('Les cendres se relèvent — veille '+romains[s.progress.cycle]+', ennemis renforcés.');}};
 bell();
}
function death(){setModal(`<div class="eyebrow">LE SERMENT PERDURE</div><h2 class="death-title">Vous êtes tombé.</h2><p style="text-align:center">${s.drop?s.drop.amount+' fragments attendent là où vous êtes tombé. Une nouvelle mort les remplacera.':'La flamme vous appelle à nouveau.'}</p><button class="primary" id="respawn">Se relever au refuge</button>`,'dead');$('respawn').onclick=()=>{respawn(s);renderer.camera={x:s.player.x,y:s.player.y};resume();save();};}
function victory(){save();bell();const veilOn=s.progress.cycle<3,romains=['','I','II','III'],m=veilOn?Math.pow(1.4,s.progress.cycle+1):1;
 setModal(`<div class="eyebrow">LE SERMENT EST ROMPU</div><h2>Enfin, le silence.</h2><p>Le gardien s’effondre. Pour la première fois depuis des siècles, la cloche se tait. Une lumière pâle traverse les pierres.</p><div class="stat-line"><span>Chutes du pèlerin</span><span>${s.progress.deaths}</span></div><div class="stat-line"><span>Raccourci</span><span>${s.progress.shortcut?'Ouvert':'Non découvert'}</span></div><div class="stat-line"><span>Talisman du souffle</span><span>${s.progress.talisman?'Recueilli':'Non découvert'}</span></div>${s.progress.cycle?`<div class="stat-line"><span>Veille en cours</span><span>${romains[s.progress.cycle]}</span></div>`:''}<p>Merci d’avoir joué à cette première démo.</p><p><strong>Entrer dans la veille</strong> poursuit le pèlerinage en boucle : tout demeure — fragments, améliorations, butin — mais les cendres du sanctuaire se relèvent plus féroces, avec ×${(Math.round(m*100)/100).toString().replace('.',',')} PV et dégâts, et une fiole de plus. Vous pourrez entamer une nouvelle veille depuis le refuge.</p><button class="primary" id="veille" ${veilOn?'':'disabled'}>${veilOn?'Entrer dans la veille ('+romains[s.progress.cycle+1]+') — ennemis renforcés':'Le serment se dénoue'}</button><button class="secondary" id="explore">Continuer à explorer</button><button class="text-button" id="again">Recommencer la démo</button>`,'victory');
 $('veille').onclick=()=>{if(enterVeille(s)){renderer.camera={x:s.player.x,y:s.player.y};resume();toast('Les cendres se relèvent — veille '+romains[s.progress.cycle]+', ennemis renforcés.');}};
 $('explore').onclick=resume;$('again').onclick=confirmRestart;}
function toggleMap(){if(mode==='map'){resume();return;}if(mode!=='play')return;mode='map';keys.clear();resetStick();$('touch-controls').hidden=true;renderer.drawMap($('map'),s);$('map-screen').hidden=false;}
$('map-button').onclick=toggleMap;$('close-map').onclick=resume;
$('pause-button').onclick=()=>{if(mode==='play'||mode==='map')pause();else if(mode==='pause')resume();};
$('brand').onclick=e=>{e.preventDefault();pause();};$('title-credits').onclick=()=>credits(true);
$('sound').onclick=()=>{muted=!muted;$('sound').classList.toggle('muted',muted);$('sound').setAttribute('aria-label',muted?'Activer le son':'Désactiver le son');};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('app').requestFullscreen?.().catch(()=>toast('Le plein écran est indisponible dans cette fenêtre.'));};
$('start').onclick=()=>{mode='play';$('title-screen').hidden=true;$('hud').hidden=false;if(usingTouch)$('touch-controls').hidden=false;bell();if(!stored)help();else toast('La flamme se souvient de vous.');save();};
function movement(){if(stick.id!==null)return {x:stick.x,y:stick.y};let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft'));let y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('KeyZ')||keys.has('ArrowUp'));return {x,y};}
function action(kind){if(mode!=='play')return;startAction(s,kind,lastInput);}
let lastInput={x:0,y:0};
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'&&!e.repeat){if(mode==='play'||mode==='map')pause();else if(['pause','help','shrine','inscription'].includes(mode))resume();return;}
 if(e.code==='KeyM'&&!e.repeat){toggleMap();return;}
 if(mode!=='play')return;keys.add(e.code);usingPad=false;
 if(e.repeat)return;
 if(e.code==='Space')action('roll');if(['KeyR','KeyF'].includes(e.code))action('heal');if(e.code==='KeyJ')action('light');if(e.code==='KeyK')action('heavy');if(['KeyE','Enter'].includes(e.code))interact(s);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
$('game').addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY,active:true};usingPad=false;});
$('game').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){pointer.active=false;return;}pointer={x:e.clientX,y:e.clientY,active:true};usingPad=false;if(mode==='play'){const target=renderer.toWorld(pointer.x,pointer.y);if(!s.player.action)s.player.face=Math.atan2(target.y-s.player.y,target.x-s.player.x);if(e.button===2)action('parry');else if(e.button===0)holdLeft=performance.now();}});
window.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(e.button===0&&holdLeft){const held=performance.now()-holdLeft;holdLeft=0;if(held<190)action('light');}});
$('app').addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{keys.clear();resetStick();if(mode==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();resetStick();if(mode==='play')pause();}});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>{if(mode!=='title')save();});
// Stick virtuel : doigt flottant dans la zone bas-gauche, capture multi-touch.
{
 const zone=$('stick-zone'),base=$('stick-base'),knob=$('stick-knob'),R=44;
 zone.addEventListener('pointerdown',e=>{
  if(stick.id!==null)return;
  e.preventDefault();usingPad=false;stick.id=e.pointerId;zone.setPointerCapture(e.pointerId);
  stick.ox=e.clientX;stick.oy=e.clientY;zone.classList.add('active');
  const zr=zone.getBoundingClientRect();base.style.left=e.clientX-zr.left+'px';base.style.top=e.clientY-zr.top+'px';
 });
 zone.addEventListener('pointermove',e=>{
  if(e.pointerId!==stick.id)return;
  const dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,len=Math.hypot(dx,dy);
  const m=len?Math.min(len,R):0,nx=len?dx/len:0,ny=len?dy/len:0;
  stick.x=nx*m/R;stick.y=ny*m/R;
  knob.style.transform=`translate(calc(-50% + ${nx*m}px),calc(-50% + ${ny*m}px))`;
 });
 const end=e=>{if(e.pointerId===stick.id)resetStick();};
 zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);
 // Boutons d’action : pointerdown seul, pas de double tir via click.
 for(const btn of document.querySelectorAll('#touch-buttons .touch-btn')){
  btn.addEventListener('pointerdown',e=>{
   e.preventDefault();e.stopPropagation();usingPad=false;
   btn.setPointerCapture(e.pointerId);btn.classList.add('pressed');
   const kind=btn.dataset.action;
   if(kind==='interact')interact(s);else action(kind);
  });
  const up=()=>btn.classList.remove('pressed');
  btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
 }
}
function nearestFoe(){return s.enemies.filter(e=>!e.dead&&distance(e,s.player)<145).sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];}
function gamepad(input){
 const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(!pad){padButtons=[];return input;}
 const dead=v=>Math.abs(v)>.2?v:0;const x=dead(pad.axes[0]||0),y=dead(pad.axes[1]||0),rx=dead(pad.axes[2]||0),ry=dead(pad.axes[3]||0);
 const buttons=pad.buttons.map(b=>b.pressed);const pressed=i=>buttons[i]&&!padButtons[i];
 if(x||y||rx||ry||buttons.some(Boolean))usingPad=true;
 if(pressed(9)){if(mode==='play'||mode==='map')pause();else if(mode==='pause')resume();}
 if(pressed(8))toggleMap();
 if(mode==='title'&&pressed(0))$('start').click();
 else if(mode!=='play'&&pressed(0)){
   const candidates={help:'help-back',shrine:'leave-shrine',dead:'respawn',victory:'explore',pause:'resume',map:'close-map',inscription:'inscription-back'};if(candidates[mode])$(candidates[mode]).click();
 }else if(mode==='play'){
  const aim=rx||ry?Math.atan2(ry,rx):null;
  if(aim!==null&&!s.player.action)s.player.face=aim;
  lastInput={x,y};if(pressed(5))action('light');if(pressed(7))action('heavy');if(pressed(4))action('parry');if(pressed(0)||pressed(1))action('roll');if(pressed(3))action('heal');if(pressed(2))interact(s);
 }
 padButtons=buttons;
 if(usingPad){input={x,y};if(rx||ry)input.angle=Math.atan2(ry,rx);else if(x||y){
   const target=nearestFoe();
   input.angle=target?Math.atan2(target.y-s.player.y,target.x-s.player.x):Math.atan2(y,x);
  }}return input;
}
function hud(){
 const p=s.player;$('hp-bar').style.width=p.hp/p.maxHp*100+'%';$('stamina-bar').style.width=p.stamina+'%';$('hp-value').textContent=Math.ceil(p.hp)+' / '+p.maxHp;$('flasks').textContent=p.flasks;$('souls').textContent=p.souls;$('talisman').hidden=!s.progress.talisman;
 const room=ROOMS.find(r=>r.id===s.area);$('area').textContent=room?.name.toUpperCase()||'LE SANCTUAIRE';
 $('objective').textContent=s.progress.bossDefeated?'La cloche s’est tue.':s.bossActive?'Briser le serment du gardien':'Atteindre le clocher · au nord';
 // Niveau de veille affiché en permanence ; le survol détaille les multiplicateurs.
 const cyc=s.progress.cycle,badge=$('veille-badge');
 badge.hidden=!cyc;
 if(cyc){const m=Math.pow(1.4,cyc),x=n=>(Math.round(n*100)/100).toString().replace('.',',');
  badge.textContent='Veille '+['','I','II','III'][cyc];
  badge.dataset.tip=`Veille ${['','I','II','III'][cyc]} — les cendres du sanctuaire se relèvent.\nEnnemis et gardien : PV ×${x(m)}, dégâts ×${x(m)}.\nFioles : ${3+cyc} au lieu de 3.\nFragments, améliorations et butin conservés.`;}
 const n=nearby(s);$('interact').hidden=!n||s.dead;
 if(n)$('interact').innerHTML=`<kbd>${usingPad?'X':usingTouch?icon('fragment'):'E'}</kbd> ${n.label}`;
 $('touch-buttons').querySelector('[data-action="interact"]')?.toggleAttribute('data-active',!!n&&!s.dead);
 const boss=s.enemies.find(e=>e.type==='boss');$('boss-hud').hidden=!s.bossActive;$('boss-bar').style.width=boss.hp/boss.maxHp*100+'%';$('boss-phase').textContent=boss.phase===2?'LES CHAÎNES BRISÉES':'LE SERMENT';
}
function events(){while(s.events.length){const e=s.events.shift();if(e.type==='sound')sound(e.name);if(e.type==='toast')toast(e.text);if(e.type==='save')save();if(e.type==='shrine')shrine();if(e.type==='death')death();if(e.type==='victory')victory();
 if(e.type==='bossIntro'){banner('LE GARDIEN DU CLOCHER','il veille sur ce qui ne sonne plus',3.6);bell();setTimeout(bell,550);setTimeout(bell,1100);}
 if(e.type==='bossPhase')bell();
 if(e.type==='bossDeath'){bell();setTimeout(bell,450);}
 if(e.type==='inscription')inscription(e.text,e.note);
 if(e.type==='area')banner(e.room.name,SUBTITLES[e.room.id]||'',3);}}
function frame(now){
 const dt=Math.min((now-lastTime)/1000||.016,.04);lastTime=now;
 try{
  let input=movement();
  if(pointer.active&&!usingPad){const p=renderer.toWorld(pointer.x,pointer.y);input.angle=Math.atan2(p.y-s.player.y,p.x-s.player.x);}
  else if(usingTouch&&(input.x||input.y)){const target=nearestFoe();input.angle=target?Math.atan2(target.y-s.player.y,target.x-s.player.x):Math.atan2(input.y,input.x);}
  else if(input.x||input.y)input.angle=Math.atan2(input.y,input.x);
  input=gamepad(input);lastInput=input;
  if(mode==='play'){
   holdLeft&&performance.now()-holdLeft>=190&&(holdLeft=0,action('heavy'));
   update(s,input,dt);events();autosave+=dt;if(autosave>12){save();autosave=0;}
   stepTimer-=dt;if(s.player.moving&&!s.player.action&&stepTimer<=0){sound(Math.sin(s.player.walk)>0?'footstep00':'footstep01',.3);stepTimer=.31;}
  }else if(mode==='title')s.time+=dt;
  renderer.draw(s,dt,mode==='title'||(mode==='credits'&&!$('title-screen').hidden),reduced);
  if(mode!=='title')hud();
   toastTimer-=dt;if(toastTimer<0)$('toast').classList.remove('show');areaTimer-=dt;if(areaTimer<0){$('area-banner').classList.remove('show');$('area-sub').classList.remove('show');}
 }catch(error){console.error(error);$('fatal').hidden=false;return;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Interface de diagnostic uniquement sur une URL explicite, absente du jeu normal.
if(new URLSearchParams(location.search).has('debug'))window.__demo={get state(){return s;},get mode(){return mode;},renderer,update,interact,startAction,respawn,save,resume};
