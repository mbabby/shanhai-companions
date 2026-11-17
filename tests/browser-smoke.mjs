import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOT_DIR || join(tmpdir(), 'shanhai-browser-smoke');
await mkdir(output, { recursive: true });
const errors = [];
const outcomes = [];
async function checkLayout(page) {
  const battleMode = await page.locator('#app').evaluate(node => node.classList.contains('battle-mode'));
  assert.equal(await page.locator('.layout').evaluate(node => getComputedStyle(node).display), battleMode ? 'block' : 'grid', 'Stylesheet must load with correct phase layout');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal page overflow');
  assert.match(await page.locator('.site-footer').innerText(), /刷新后重置/);
}
async function settled(page) { await page.locator('#app[data-playing="false"]').waitFor(); }
async function click(page, action, extra = '') { await page.locator(`[data-action="${action}"]${extra}`).first().click(); await settled(page); await checkLayout(page); }
async function finishFight(page, lose = false) {
  let turns = 0;
  while (await page.locator('[data-action="move"]').count()) {
    assert.ok(turns++ < 100, 'Battle must finish within 100 actions');
    if (lose && await page.locator('[data-action="switch"]:enabled').count()) await click(page, 'switch', ':enabled');
    else {
      const skill = page.locator('[data-action="move"][data-id$="-skill"]:enabled');
      if (await skill.count()) await skill.click();
      else await click(page, 'move', '[data-id$="-basic"]');
    }
    await settled(page);
    await checkLayout(page);
    const feedback = page.locator('.battle-controls .feedback');
    if (await feedback.count()) assert.equal(await feedback.innerText(), '', 'No action error feedback');
  }
  assert.equal(await page.locator('.result-panel').count(), 1);
  return { turns, title: await page.locator('.section-heading').innerText() };
}
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const starter of ['fox', 'turtle', 'deer']) {
      await page.goto(baseURL);
      await page.locator('[data-action="choose"]').first().waitFor();
      await checkLayout(page);
      if (starter === 'fox') await page.screenshot({ path: `${output}/choose-${viewport.width}.png`, fullPage: true });
      await click(page, 'choose', `[data-id="${starter}"]`);
      for (let encounter = 0; encounter < 2; encounter++) {
        const candidate = encounter === 0 && starter !== 'deer' ? '[data-id="deer"]' : '';
        await click(page, 'encounter', candidate);
        await click(page, 'bond', '[data-correct="false"]');
        assert.match(await page.locator('.feedback').innerText(), /迟疑/);
        assert.match(await page.locator('.bond-progress').innerText(), /0 \/ 2/);
        await click(page, 'back-tracks');
        await click(page, 'encounter', candidate);
        await click(page, 'bond', '[data-correct="true"]');
        assert.match(await page.locator('.bond-progress').innerText(), /1 \/ 2/);
        await click(page, 'bond', '[data-correct="false"]');
        assert.match(await page.locator('.bond-progress').innerText(), /1 \/ 2/);
        await click(page, 'bond', '[data-correct="true"]');
      }
      assert.equal(await page.locator('[data-action="lead"]').count(), 3);
      const lead = page.locator('[data-action="lead"]');
      await lead.nth(1).click();
      assert.equal(await lead.first().getAttribute('aria-pressed'), 'true');
      await click(page, 'start-battle');
      if (starter === 'fox') await page.screenshot({ path: `${output}/battle-${viewport.width}.png`, fullPage: true });
      outcomes.push({ width: viewport.width, starter, ...await finishFight(page) });
      if (starter === 'fox') {
        await click(page, 'start-battle');
        assert.match(await page.locator('.battle-toolbar').innerText(), /第 1 回合/);
        const bars = await page.locator('.hp-track[role="progressbar"]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('aria-valuenow'), n.getAttribute('aria-valuemax')]));
        assert.ok(bars.every(([hp, max]) => hp === max), 'Retry restores health');
        const defeat = await finishFight(page, true);
        assert.match(defeat.title, /歇一歇/);
        await click(page, 'party');
        await click(page, 'lead');
        await click(page, 'start-battle');
        await finishFight(page);
      }
      await click(page, 'restart');
      assert.equal(await page.locator('[data-action="choose"]').count(), 3);
      await click(page, 'choose');
      await page.reload();
      assert.equal(await page.locator('[data-action="choose"]').count(), 3, 'Reload resets journey as disclosed');
    }
    const viewportOutcomes = outcomes.filter(result => result.width === viewport.width);
    assert.ok(viewportOutcomes.some(result => /认可/.test(result.title)), 'At least one victory per viewport');
    assert.ok(viewportOutcomes.some(result => /歇一歇/.test(result.title)), 'At least one defeat per viewport');
    await context.close();
  }
  assert.deepEqual(errors, [], 'No browser console/page errors');
  console.log(JSON.stringify({ outcomes, errors, screenshots: output }, null, 2));
} finally { await browser.close(); }
