// Smoke tactile : stick virtuel + bouton esquive, via émulation CDP.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const client0 = await page.createCDPSession();
    await client0.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' }]
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/?debug=1', { waitUntil: 'networkidle0' });
    await new Promise(r=>setTimeout(r,400));

    // body.touch actif, rotate-hint masqué en paysage, touch-controls masqués sur le titre.
    const touchOn = await page.evaluate(() => document.body.classList.contains('touch'));
    assert.equal(touchOn, true, 'body.touch devrait être actif (pointer coarse)');
    const controlsHidden = await page.$eval('#touch-controls', el => el.hidden);
    assert.equal(controlsHidden, true, 'touch-controls masqués sur le titre');
    const rotateDisplay = await page.$eval('#rotate-hint', el => getComputedStyle(el).display);
    assert.equal(rotateDisplay, 'none', 'pas de rotate-hint en paysage');
    const titleFits = await page.$eval('.title-content', el => {
      const r=el.getBoundingClientRect(); return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;
    });
    assert.equal(titleFits, true, 'le contenu du titre tient dans le paysage mobile');

    // Démarrage : le help s’ouvre (pas de sauvegarde) — touch-controls masqués sous la modale.
    await page.click('#start');
    await new Promise(r=>setTimeout(r,300));
    assert.equal(await page.$eval('#touch-controls', el => el.hidden), true, 'masqués sous le help');
    const modalFits = await page.$eval('.modal-card', el => {
      const r=el.getBoundingClientRect(); return r.y>=0&&r.bottom<=innerHeight;
    });
    assert.equal(modalFits, true, 'la modale reste dans le viewport paysage');
    await page.click('#help-back');
    await new Promise(r=>setTimeout(r,200));
    assert.equal(await page.$eval('#touch-controls', el => el.hidden), false, 'visibles en jeu');

    // Le rappel clavier est masqué en tactile.
    const controlsVisible = await page.$eval('.controls', el => getComputedStyle(el).display);
    assert.notEqual(controlsVisible, 'flex', '.controls masqués en tactile');

    // Stick virtuel : toucher bas-gauche et glisser à droite → le pèlerin avance.
    const before = await page.evaluate(() => window.__demo.state.player.x);
    const zone = await page.$('#stick-zone');
    const box = await zone.boundingBox();
    const sx = box.x + 60, sy = box.y + box.height - 60;
    const client = await page.createCDPSession();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: sx, y: sy, id: 1, radiusX: 8, radiusY: 8, force: 1 }]
    });
    // Stick base visible.
    assert.equal(await page.$eval('#stick-zone', el => el.classList.contains('active')), true, 'zone stick active');
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: sx + 40, y: sy, id: 1, radiusX: 8, radiusY: 8, force: 1 }]
    });
    await new Promise(r=>setTimeout(r,600));
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = await page.evaluate(() => window.__demo.state.player.x);
    assert.ok(after > before + 15, `stick devrait déplacer le pèlerin (avant=${before}, après=${after})`);

    // Bouton esquive : consomme de l’endurance.
    const stamBefore = await page.evaluate(() => window.__demo.state.player.stamina);
    const btn = await page.$('#touch-buttons .touch-btn[data-action="roll"]');
    const bb = await btn.boundingBox();
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, id: 2, radiusX: 8, radiusY: 8, force: 1 }]
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise(r=>setTimeout(r,80));
    const stamAfter = await page.evaluate(() => window.__demo.state.player.stamina);
    assert.ok(stamAfter < stamBefore, `bouton esquive déclenchée (avant=${stamBefore}, après=${stamAfter})`);

// Pause : touch-controls masqués sous la modale + bascule manuelle.
    await page.click('#pause-button');
    await new Promise(r=>setTimeout(r,150));
    assert.equal(await page.$eval('#touch-controls', el => el.hidden), true, 'masqués en pause');
    await page.select('#touch-mode', 'off');
    assert.equal(await page.evaluate(() => document.body.classList.contains('touch')), false, 'pref off retire body.touch');
    await page.select('#touch-mode', 'on');
    assert.equal(await page.evaluate(() => document.body.classList.contains('touch')), true, 'pref on force body.touch');
    await page.select('#touch-mode', 'auto');
    await page.click('#resume');
    await new Promise(r=>setTimeout(r,150));
    assert.equal(await page.$eval('#touch-controls', el => el.hidden), false, 'reviennent après reprise');

    // HUD et commandes restent dans leurs zones dédiées sur plusieurs paysages mobiles.
    for (const [width, height] of [[740,360],[844,390],[932,430]]) {
      await page.setViewport({ width, height, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const layout = await page.evaluate(() => {
        const rect = selector => {
          const {x,y,width,height} = document.querySelector(selector).getBoundingClientRect();
          return {x,y,width,height,right:x+width,bottom:y+height};
        };
        const interact = document.querySelector('#interact'), boss = document.querySelector('#boss-hud');
        const toast = document.querySelector('#toast'), oldToast = toast.textContent, oldClass = toast.className;
        const oldInteract = interact.hidden, oldBoss = boss.hidden;
        interact.hidden = false; boss.hidden = false; toast.textContent = 'Message mobile'; toast.classList.add('show');
        const result = {
          width: innerWidth, height: innerHeight,
          stick: rect('#stick-zone'), buttons: rect('#touch-buttons'),
          vitals: rect('.vitals'), inventory: rect('.inventory'), objective: rect('.objective'),
          boss: rect('#boss-hud'), toast: rect('#toast'), interact: rect('#interact'),
          buttonRects: [...document.querySelectorAll('.touch-btn')].map(button => {
            const r=button.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
          })
        };
        interact.hidden = oldInteract; boss.hidden = oldBoss; toast.textContent = oldToast; toast.className = oldClass;
        return result;
      });
      const overlaps = (a,b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
      assert.ok(layout.stick.y >= height*.55 && layout.stick.right <= width*.43, `${width}x${height}: stick limité au bas-gauche`);
      assert.ok(layout.buttons.x >= 0 && layout.buttons.right <= width && layout.buttons.bottom <= height, `${width}x${height}: commandes dans l’écran`);
      assert.ok(layout.buttonRects.every(r => r.width >= 48 && r.height >= 48 && r.x >= 0 && r.right <= width && r.y >= 0 && r.bottom <= height), `${width}x${height}: boutons tactiles accessibles`);
      assert.ok(layout.objective.right <= width && layout.vitals.x >= 0 && layout.inventory.bottom < layout.stick.y, `${width}x${height}: HUD compact et dégagé`);
      assert.ok(!overlaps(layout.boss, layout.toast) && !overlaps(layout.toast, layout.interact), `${width}x${height}: retours visuels empilés sans chevauchement`);
      assert.ok(!overlaps(layout.stick, layout.interact) && !overlaps(layout.buttons, layout.interact), `${width}x${height}: invite d’interaction dégagée`);
    }

    // Portrait : le rotate-hint s’affiche.
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await new Promise(r=>setTimeout(r,150));
    assert.equal(await page.$eval('#rotate-hint', el => getComputedStyle(el).display), 'grid', 'rotate-hint en portrait');

    await page.screenshot({ path: 'test-results/touch-landscape.png' });
    assert.deepEqual(errors, []);
    console.log('OK — tactile : titre/modale, HUD paysage (740–932 px), commandes, pause et portrait. Aucune erreur JS.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
