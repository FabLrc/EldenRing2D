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

    // Démarrage : le help s’ouvre (pas de sauvegarde) — touch-controls masqués sous la modale.
    await page.click('#start');
    await new Promise(r=>setTimeout(r,300));
    assert.equal(await page.$eval('#touch-controls', el => el.hidden), true, 'masqués sous le help');
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

    // Portrait : le rotate-hint s’affiche.
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await new Promise(r=>setTimeout(r,150));
    assert.equal(await page.$eval('#rotate-hint', el => getComputedStyle(el).display), 'grid', 'rotate-hint en portrait');

    await page.screenshot({ path: 'test-results/touch-landscape.png' });
    assert.deepEqual(errors, []);
    console.log('OK — tactile : détection, stick, bouton esquive, pause, portrait. Aucune erreur JS.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });