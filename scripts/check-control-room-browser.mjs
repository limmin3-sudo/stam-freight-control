import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { webFiles } from './web-files.mjs';

// Exercise the built app under the same kind of subpath used by Pages. No real
// accounts, contracts, companion logs or live services are needed by this preview.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'apps/control-room/dist');
const output = process.env.STAM_QA_OUTPUT || '/tmp/stam-control-room-qa';
const prefix = '/stam-freight-control/';
const playwright = process.env.STAM_PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(playwright));
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const name = pathname.slice(prefix.length) || 'index.html';
  const file = path.resolve(dist, name);
  if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.STAM_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
async function checkMonitorFill(page, station) {
  await page.waitForSelector(`.study-monitor[data-monitor="${station}"]`);
  await page.locator('.study-monitor').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  const boxes = await page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
    return { display: rect('.study-display'), monitor: rect('.study-monitor'), header: rect('.camera-study>header'), controls: rect('.study-controls') };
  });
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(boxes.display[key] - boxes.monitor[key]) < 1, `Monitor must fill work area: ${key}`);
  assert.ok(boxes.monitor.y >= boxes.header.bottom && boxes.monitor.bottom <= boxes.controls.y + 1, 'Monitor must not cover toolbar space');
}
try {
  assert.equal((await webFiles()).some(file => file.startsWith('apps/')), false, 'Preview must not be included in the existing public bundle');
  for (const lang of ['ko', 'mix', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, reducedMotion: 'reduce' });
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    await page.addInitScript(() => {
      if (sessionStorage.getItem('qa-seeded')) return;
      localStorage.setItem('vh-missions', JSON.stringify([{ id: 'qa-preserve', cargo: [] }]));
      localStorage.setItem('sfc-run', JSON.stringify({ aboard: [{ boxId: 'qa-box', cell: [2, 0, 4] }] }));
      localStorage.setItem('sfc-lang', 'mix');
      sessionStorage.setItem('qa-seeded', '1');
    });
    await page.goto(base + '#/bridge?lang=' + lang);
    await page.waitForSelector('.console-hotspot');
    await page.locator('.room-picture img').evaluate(img => img.decode());
    await page.locator('.brand-emblem').evaluate(img => img.decode());
    assert.equal(await page.locator('img.interface-glyph').count(), 0, 'Current reference keeps the line icons; image assets are an optional future style');
    assert.ok(await page.locator('svg.interface-glyph').count() >= 4);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.brand-symbol').count(), 0);
    assert.equal(await page.evaluate(() => document.fonts.check('500 16px SUIT') && document.fonts.check('500 16px Oxanium')), true);
    assert.ok(await page.locator('.brand-emblem').evaluate(img => img.naturalWidth > 400));
    const before = await page.evaluate(() => ({ ...localStorage }));
    await page.screenshot({ path: path.join(output, `bridge-${lang}.png`), fullPage: true });
    for (const screen of ['mission', 'map', 'operations']) {
      await page.locator(`.hotspot-${screen}`).click();
      await page.waitForSelector(`[data-screen="${screen}"]`);
      assert.equal(await page.locator('#workspace-title').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator(`#nav-${screen}`).getAttribute('aria-current'), 'page');
      if (screen === 'map') {
        await page.locator('.glass-chart-stage img').evaluate(img => img.decode());
        const stage = await page.locator('.glass-chart-stage').boundingBox();
        assert.ok(stage.width > 250 && stage.height > 150, 'Glass map must have a visible, proportional work area');
        assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Desktop map must keep the dock on screen');
        await page.locator('[data-destination="arccorp"]').click();
        assert.equal(await page.locator('[data-planet="arccorp"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-action="preview-route"]').click();
        assert.equal(await page.locator('.glass-route-preview').count(), 1);
        await page.screenshot({ path: path.join(output, `map-glass-${lang}.png`), fullPage: true });
        await page.locator('[data-planet="hurston"]').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-destination="hurston"]').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-action="preview-route"]').click();
        assert.equal(await page.locator('.glass-route-preview').count(), 0);
      }
      await page.reload();
      await page.waitForSelector(`[data-screen="${screen}"]`);
      await page.locator('.return-link').click();
      await page.waitForSelector('.bridge-scene');
      await page.goBack();
      await page.waitForSelector(`[data-screen="${screen}"]`);
      await page.goForward();
      await page.waitForSelector('.bridge-scene');
      assert.equal(await page.locator(`#nav-${screen}`).evaluate(el => el === document.activeElement), true);
    }
    // Keyboard-only access and Escape return without needing to click the room.
    await page.locator('#nav-operations').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-screen="operations"]');
    await page.screenshot({ path: path.join(output, `operations-${lang}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForSelector('.bridge-scene');
    for (const width of [1366, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of ['bridge', 'mission', 'map', 'operations']) {
        await page.goto(base + `#/${screen}?lang=${lang}`);
        await page.waitForSelector(screen === 'bridge' ? '.bridge-scene' : `[data-screen="${screen}"]`);
        const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        assert.ok(dimensions.scroll <= dimensions.client + 1, `${lang}/${screen}/${width}: horizontal overflow`);
        const navSizes = await page.locator('.station-navigation a').evaluateAll(links => links.map(link => link.getBoundingClientRect().height));
        assert.ok(navSizes.every(height => height >= 44));
        if (width === 390 && screen === 'bridge') await page.screenshot({ path: path.join(output, `mobile-${lang}.png`), fullPage: true });
        if (width === 390 && screen === 'map') {
          await page.locator('.glass-chart-stage img').evaluate(img => img.decode());
          await page.screenshot({ path: path.join(output, `mobile-map-glass-${lang}.png`), fullPage: true });
        }
      }
    }
    if (lang === 'ko') {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(base + '#/bridge?lang=ko');
      await page.locator('.study-open').click();
      await page.waitForSelector('.study-viewport canvas[data-mode="overview"]');
      await page.waitForSelector('.study-viewport canvas[data-art-ready="true"]');
      assert.equal(await page.locator('.study-viewport canvas').getAttribute('data-map-head-occluded'), 'true', 'Solid rear guard must hide the map operator head from the entrance');
      await page.screenshot({ path: path.join(output, 'spatial-overview.png'), fullPage: true });
      await page.getByRole('button', { name: '자유 둘러보기', exact: true }).click();
      await page.waitForSelector('.study-viewport[data-mode="explore"]');
      const start = await page.locator('.study-viewport canvas').getAttribute('data-position');
      await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
      assert.notEqual(await page.locator('.study-viewport canvas').getAttribute('data-position'), start, 'WASD must move the free camera');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => { window.cameraSamples = []; window.cameraSampling = setInterval(() => { const value = document.querySelector('.study-viewport canvas')?.dataset.position; if (value) window.cameraSamples.push(value.split(',').map(Number)); }, 60); });
      await page.locator('[data-study-station="map"]').click();
      await page.waitForSelector('.study-viewport[data-mode="seated"]', { timeout: 20000 });
      const samples = await page.evaluate(() => { clearInterval(window.cameraSampling); return window.cameraSamples; });
      assert.ok(samples.some(point => point[0] > 4.8), `Map camera must travel around the table: ${JSON.stringify(samples)}`);
      assert.ok(samples.every(point => Math.hypot(point[0], point[2]) > 3.6), 'Camera must stay outside the table');
      const seated = await page.locator('.study-viewport canvas').evaluate(canvas => ({ position: canvas.dataset.position.split(',').map(Number), direction: canvas.dataset.direction.split(',').map(Number) }));
      assert.ok(seated.position[2] < -5, 'Map operator must sit beyond the far table rim');
      assert.ok(seated.direction[2] > .97, 'Map operator must face inward toward the table, not toward the windows');
      assert.ok(Math.abs(seated.direction[1]) < .005, 'Monitor must be viewed squarely rather than from above');
      await checkMonitorFill(page, 'map');
      await page.screenshot({ path: path.join(output, 'navigation-seat.png'), fullPage: true });
      // Simulate space reserved by future sidebars without hard-coded window offsets.
      await page.locator('.study-display').evaluate(el => { el.style.width = 'calc(100% - 240px)'; el.style.alignSelf = 'center'; });
      await checkMonitorFill(page, 'map');
      await page.screenshot({ path: path.join(output, 'monitor-reserved-sides.png'), fullPage: true });
      await page.locator('.study-display').evaluate(el => { el.style.removeProperty('width'); el.style.removeProperty('align-self'); });
      await page.locator('.study-enter').click();
      await page.waitForSelector('[data-screen="map"]');
      assert.equal(await page.locator('dialog.camera-study').count(), 0);
      await page.locator('.return-link').click();
      // Repeat mount/unmount; reduced motion must also finish console docking.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('.study-open').click();
      await page.waitForSelector('.study-viewport canvas[data-mode="overview"]');
      await page.locator('[data-study-station="mission"]').click();
      await page.waitForSelector('.study-viewport[data-mode="seated"]');
      await checkMonitorFill(page, 'mission');
      await page.locator('[data-study-station="operations"]').click();
      await page.waitForSelector('.study-viewport[data-station="operations"][data-mode="seated"]');
      await checkMonitorFill(page, 'operations');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.camera-study'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.study-open').click();
      await page.waitForSelector('.study-viewport canvas[data-mode="overview"]');
      await page.locator('[data-study-station="operations"]').click();
      await page.waitForSelector('.study-viewport[data-station="operations"][data-mode="seated"]');
      assert.ok(await page.locator('dialog.camera-study').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await checkMonitorFill(page, 'operations');
      await page.screenshot({ path: path.join(output, 'mobile-camera.png'), fullPage: true });
      await page.getByRole('button', { name: '닫기', exact: true }).click();
      assert.equal(await page.locator('.study-viewport canvas').count(), 0);
      console.log('PASS 3D: free WASD movement, real semicircle camera travel, table clearance, seated monitor, screen entry, repeated mounts, reduced motion and Escape');
    }
    await page.locator('select').selectOption(lang === 'en' ? 'ko' : 'en');
    assert.equal(await page.locator('html').getAttribute('lang'), lang === 'en' ? 'ko' : 'en');
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before, 'Legacy data and preferences must not be changed by the preview');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    console.log(`PASS ${lang}: built subpath, all consoles, history, reload, keyboard, locale, 320–1536px, legacy storage unchanged, browser errors 0`);
    await page.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
