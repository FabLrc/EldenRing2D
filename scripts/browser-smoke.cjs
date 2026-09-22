// Test d’intégration optionnel : PLAYWRIGHT_MODULE doit pointer vers Playwright.
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],badResponses=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push(r.url());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('data:'))external.push(r.url());});
  mkdirSync('test-results',{recursive:true});
  await page.goto('http://127.0.0.1:4173/?debug=1');await page.waitForTimeout(600);
  await page.screenshot({path:'test-results/title.png'});
  await page.getByRole('button',{name:'Entrer dans le sanctuaire'}).click();await page.getByRole('button',{name:'Entrer dans les ruines'}).click();
  const before=await page.evaluate(()=>window.__demo.state.player.x);
  await page.keyboard.down('KeyD');await page.waitForFunction(x=>window.__demo.state.player.x>x+35,before,{timeout:5000});await page.keyboard.up('KeyD');
  assert.ok(await page.evaluate(()=>window.__demo.state.player.x)>before+30);
  await page.keyboard.press('Space');await page.waitForTimeout(80);assert.ok(await page.evaluate(()=>window.__demo.state.player.stamina)<100);
  await page.waitForTimeout(500);await page.keyboard.press('KeyM');assert.equal(await page.locator('#map-screen').isVisible(),true);await page.screenshot({path:'test-results/map.png'});await page.keyboard.press('KeyM');
  // Refuge et améliorations, puis rechargement de la sauvegarde réelle.
  await page.evaluate(()=>{const s=window.__demo.state;s.player.x=480;s.player.y=1510;s.player.souls=100;});
  await page.keyboard.press('KeyE');await page.getByRole('button',{name:'Vigueur +20 PV'}).click();assert.equal(await page.evaluate(()=>window.__demo.state.player.maxHp),120);await page.getByRole('button',{name:'Repartir'}).click();
  await page.reload();await page.getByRole('button',{name:'Reprendre le pèlerinage'}).click();assert.equal(await page.evaluate(()=>window.__demo.state.player.maxHp),120);
  await page.screenshot({path:'test-results/game.png'});
  // Un vrai coup déclenché par la souris blesse un adversaire dans la simulation.
  await page.evaluate(()=>{const d=window.__demo,s=d.state;s.player.x=1120;s.player.y=1530;s.player.invulnerable=2;s.enemies.forEach(e=>{e.state='stun';e.timer=10;});s.enemies[0].x=1160;s.enemies[0].y=1530;});await page.waitForTimeout(650);
  const target=await page.evaluate(()=>{const d=window.__demo,r=d.renderer,c=document.getElementById('game'),b=c.getBoundingClientRect(),e=d.state.enemies[0];return {x:((e.x-r.camera.x)*r.zoom+c.width/2)*b.width/c.width,y:((e.y-r.camera.y)*r.zoom+c.height/2)*b.height/c.height};});
  await page.mouse.click(target.x,target.y);await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>window.__demo.state.enemies[0].hp)<65);await page.screenshot({path:'test-results/combat.png'});
  // Mort et respawn passent par les écrans de jeu, aucun rechargement.
  await page.evaluate(async()=>{const {hurtPlayer}=await import('/src/core.js');const s=window.__demo.state;s.player.invulnerable=0;hurtPlayer(s,999);});await page.getByRole('button',{name:'Se relever au refuge'}).click();assert.equal(await page.evaluate(()=>window.__demo.state.dead),false);
  // Deuxième phase et écran de fin.
  await page.evaluate(async()=>{const {hurtEnemy}=await import('/src/core.js');const s=window.__demo.state;s.player.x=544;s.player.y=640;s.player.invulnerable=10;const b=s.enemies.find(e=>e.type==='boss');hurtEnemy(s,b,340);});await page.waitForTimeout(600);assert.equal(await page.locator('#boss-hud').isVisible(),true);await page.screenshot({path:'test-results/boss.png'});
  await page.evaluate(async()=>{const {hurtEnemy}=await import('/src/core.js');const s=window.__demo.state;hurtEnemy(s,s.enemies.find(e=>e.type==='boss'),999);});await page.getByRole('button',{name:'Continuer à explorer'}).waitFor();await page.screenshot({path:'test-results/victory.png'});await page.getByRole('button',{name:'Continuer à explorer'}).click();
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Reprendre le pèlerinage'}).isVisible(),true);
  await page.getByRole('button',{name:'Reprendre le pèlerinage'}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__demo.mode),'pause');
  await page.setViewportSize({width:1024,height:640});await page.getByRole('button',{name:'Reprendre le pèlerinage'}).click();await page.screenshot({path:'test-results/compact.png'});
  // Manette standard simulée : axes et transitions des boutons.
  await page.evaluate(()=>{window.fakePad={axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.fakePad]});const s=window.__demo.state;s.player.x=480;s.player.y=1534;s.player.action=null;window.fakePad.axes[0]=1;});
  await page.waitForFunction(()=>window.__demo.state.player.x>505);await page.evaluate(()=>{window.fakePad.axes[0]=0;window.fakePad.buttons[9].pressed=true;});await page.waitForFunction(()=>window.__demo.mode==='pause');
  await page.evaluate(()=>window.fakePad.buttons[9].pressed=false);await page.waitForTimeout(60);await page.evaluate(()=>window.fakePad.buttons[0].pressed=true);await page.waitForFunction(()=>window.__demo.mode==='play');await page.evaluate(()=>{window.fakePad.buttons[0].pressed=false;});
  // L’export sous un sous-répertoire charge les ressources sans chemins absolus.
  await page.goto('http://127.0.0.1:4173/dist/index.html');await page.getByRole('button',{name:'Reprendre le pèlerinage'}).waitFor();await page.waitForTimeout(300);assert.equal(await page.locator('#fatal').isVisible(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(external,[]);
  console.log('OK — démarrage, clavier/souris, esquive, carte, refuge, upgrade, sauvegarde, combat, mort, boss, victoire, pause, affichage compact, manette simulée et export statique. Aucune erreur JS/HTTP ni requête externe.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
