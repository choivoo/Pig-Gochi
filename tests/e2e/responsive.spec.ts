import { expect, test } from '@playwright/test';
import { canvasHasContent, hatchFast, skipTutorial, startNewGame, trackErrors } from './helpers';

// PART 23.4: emulated viewports (no physical devices were available -> reported as emulation)
const SIZES = [
  { w: 320, h: 640 }, { w: 360, h: 740 }, { w: 390, h: 844 }, { w: 430, h: 932 }, { w: 768, h: 1024 }, { w: 1024, h: 768 }, { w: 1440, h: 900 },
];
for (const s of SIZES) {
  test(`layout at ${s.w}x${s.h}: no horizontal scroll, reachable controls, visible pet`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2, hasTouch: s.w < 800, isMobile: s.w < 800 });
    const page = await ctx.newPage();
    const errs = trackErrors(page);
    await startNewGame(page);
    await hatchFast(page);
    await skipTutorial(page);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
    expect(m.sw).toBeLessThanOrEqual(m.iw);
    expect(m.sh).toBeLessThanOrEqual(m.ih + 1);
    // every bottom menu button is fully inside the viewport and large enough for touch
    const acts = page.locator('.actions .act');
    expect(await acts.count()).toBe(8);
    for (let i = 0; i < 8; i++) {
      const b = await acts.nth(i).boundingBox();
      expect(b).not.toBeNull();
      expect(b!.x).toBeGreaterThanOrEqual(0); expect(b!.x + b!.width).toBeLessThanOrEqual(s.w + 0.5);
      expect(b!.y + b!.height).toBeLessThanOrEqual(s.h + 0.5);
      expect(b!.height).toBeGreaterThanOrEqual(44); expect(b!.width).toBeGreaterThanOrEqual(44);
    }
    const stage = await page.locator('.stage canvas').boundingBox();
    expect(stage).not.toBeNull();
    expect(stage!.width).toBeGreaterThan(Math.min(s.w, 300) * 0.8 * (s.w < 800 ? 1 : 0.4));
    expect(await canvasHasContent(page, '.stage canvas')).toBe(true);
    // the pet is inside the visible canvas and not covered by UI (hit-test at its centre lands on the canvas)
    const hit = await page.evaluate(() => {
      const p = window.__PIXEL_LIFE__.petScreenCenter();
      const el = document.elementFromPoint(p.x, p.y);
      return { tag: el?.tagName ?? '', x: p.x, y: p.y, iw: window.innerWidth, ih: window.innerHeight };
    });
    expect(hit.tag).toBe('CANVAS');
    expect(hit.x).toBeGreaterThan(0); expect(hit.x).toBeLessThan(hit.iw); expect(hit.y).toBeGreaterThan(0); expect(hit.y).toBeLessThan(hit.ih);
    await page.screenshot({ path: `test-results/layout-${s.w}x${s.h}.png` });
    // a modal sheet fits and can be closed
    await page.getByRole('button', { name: '먹이', exact: true }).click();
    const sheet = await page.locator('.sheet').boundingBox();
    expect(sheet!.x).toBeGreaterThanOrEqual(-0.5); expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(s.w + 0.5);
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0);
    expect(errs).toEqual([]);
    await ctx.close();
  });
}
