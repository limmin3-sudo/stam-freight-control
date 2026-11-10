import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { webFiles } from './web-files.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'apps/control-room/dist');
const output = process.env.STAM_QA_OUTPUT || '/tmp/stam-space-qa';
const prefix = '/stam-freight-control/';
const { chromium } = await import(pathToFileURL(process.env.STAM_PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs'));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  const file = path.resolve(dist, pathname.slice(prefix.length) || 'index.html');
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(file);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.STAM_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
try {
  assert.equal((await webFiles()).some(file => file.startsWith('apps/')), false, 'Unpublished preview stays outside production bundle');
  for (const lang of ['ko', 'mix', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, reducedMotion: 'reduce' });
    const errors = [], requests = [], bad = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    page.on('response', response => { if (response.status() >= 400) bad.push(response.url()); });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('qa-seeded')) return;
      localStorage.setItem('vh-missions', '[{"id":"qa-preserve"}]');
      localStorage.setItem('sfc-run', '{"aboard":[{"boxId":"qa-box","cell":[2,0,4]}]}');
      localStorage.setItem('sfc-lang', 'mix');
      sessionStorage.setItem('qa-seeded', '1');
    });
    await page.goto(base + `#/lounge?lang=${lang}`);
    await page.locator('.space-background').evaluate(img => img.decode());
    await page.evaluate(() => document.fonts.ready);
    const before = await page.evaluate(() => ({ ...localStorage }));
    assert.equal(await page.locator('.space-target').count(), 5);
    assert.equal(requests.some(url => /\.mp4|\.glb/.test(url)), false, 'No video or retired 3D downloads on arrival');
    await page.locator('[data-target=gate]').hover();
    assert.equal(await page.locator('.space-segments polygon.is-lit').count(), 1);
    await page.screenshot({ path: path.join(output, `lounge-${lang}.png`), fullPage: true });
    await page.locator('[data-target=desk]').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-screen=guide]');
    assert.equal(await page.locator('#space-title').evaluate(el => el === document.activeElement), true);
    await page.locator('.space-partner img').evaluate(img => img.decode());
    await page.screenshot({ path: path.join(output, `guide-${lang}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-screen=lounge]');
    assert.equal(await page.locator('[data-target=desk]').evaluate(el => el === document.activeElement), true);
    await page.locator('[data-target=gate]').click();
    await page.waitForSelector('[data-screen=bridge]');
    await page.locator('.space-background').evaluate(img => img.decode());
    await page.screenshot({ path: path.join(output, `bridge-${lang}.png`), fullPage: true });
    for (const station of ['mission', 'map', 'operations']) {
      await page.locator(`[data-target=${station}]`).click();
      await page.waitForSelector(`[data-screen=${station}]`);
      assert.equal(await page.locator('#workspace-title').evaluate(el => el === document.activeElement), true);
      if (station === 'map') {
        await page.locator('[data-destination=arccorp]').click();
        await page.locator('[data-action=preview-route]').click();
        assert.equal(await page.locator('.glass-route-preview').count(), 1);
      }
      await page.reload();
      await page.waitForSelector(`[data-screen=${station}]`);
      await page.locator('.return-link').click();
      await page.waitForSelector('[data-screen=bridge]');
      await page.goBack();
      await page.waitForSelector(`[data-screen=${station}]`);
      await page.goForward();
      await page.waitForSelector('[data-screen=bridge]');
    }
    await page.goto(base + `#/cinema?lang=${lang}`);
    assert.equal(await page.locator('video').count(), 0);
    assert.equal(requests.some(url => /\.mp4/.test(url)), false, 'Video downloads only after play');
    await page.locator('.space-play').click();
    await page.waitForSelector('video');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    // Use the visible return link even when native video controls own focus.
    await page.locator('.return-link').click();
    await page.waitForSelector('[data-screen=lounge]');
    assert.equal(await page.locator('video').count(), 0);
    for (const width of [1366, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of ['lounge', 'guide', 'information', 'cinema', 'bridge', 'map', 'mission', 'operations']) {
        await page.goto(base + `#/${screen}?lang=${lang}`);
        await page.waitForSelector(`[data-screen=${screen}]`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${lang}/${width}/${screen} overflow`);
        if (width === 390 && ['lounge', 'bridge', 'guide', 'cinema'].includes(screen)) {
          await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode().catch(() => {}))));
          await page.screenshot({ path: path.join(output, `${screen}-mobile-${lang}.png`), fullPage: true });
        }
        if (['lounge', 'bridge'].includes(screen)) {
          assert.ok((await page.locator('.space-dock a').evaluateAll(links => links.map(el => el.getBoundingClientRect().height))).every(height => height >= 44));
          for (const target of await page.locator('.space-target').all()) assert.ok((await target.getAttribute('aria-label')).length > 0);
        }
      }
    }
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before, 'No mutation of saved contracts/run/language');
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, []);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, reducedMotion: 'no-preference' });
  await page.goto(base + '#/lounge?lang=ko');
  await page.locator('.space-background').evaluate(img => img.decode());
  await page.locator('[data-target=gate]').click();
  await page.waitForSelector('[data-moving=true]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  assert.ok(page.url().includes('/lounge'), 'Escape cancels deferred navigation');
  await page.locator('[data-target=desk]').click();
  await page.waitForSelector('[data-moving=true]');
  await page.getByRole('button', { name: '연출 건너뛰기', exact: true }).click();
  await page.waitForSelector('[data-screen=guide]');
  await page.goBack();
  await page.waitForSelector('[data-screen=lounge]');
  await page.locator('[data-target=gate]').click();
  await page.waitForSelector('[data-moving=true]');
  await page.locator('.space-dock a[href*="information"]').click();
  await page.waitForTimeout(1000);
  assert.ok(page.url().includes('/information'), 'A newer route cancels old transition');
  await page.goto(base + '#/lounge?lang=ko');
  await page.locator('.space-background').evaluate(img => img.decode());
  await page.locator('[data-target=gate]').click();
  await page.waitForSelector('[data-screen=bridge]');
  await page.locator('.space-settings summary').click();
  await page.getByRole('button', { name: '효과음 꺼짐', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '효과음 켜짐', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.locator('[data-target=mission]').hover();
  await page.getByRole('button', { name: '효과음 켜짐', exact: true }).click();
  await page.close();
  console.log('PASS: 3 languages, 4 viewport widths, lounge/bridge/console navigation, focus/history, interruption/skip, lazy video, sound toggle, storage preservation, unpublished boundary.');
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
