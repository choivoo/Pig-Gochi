import { expect, type Page } from '@playwright/test';

export interface Hook { store: { getState(): any; setState(s: any): void }; petScreenCenter(): { x: number; y: number } } // eslint-disable-line @typescript-eslint/no-explicit-any
declare global { interface Window { __PIXEL_LIFE__: Hook } }

export function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console.error: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  return errs;
}

/** title -> intro -> setup -> game with an egg (UI driven). */
export async function startNewGame(page: Page, opts: { name?: string; egg?: number; eggName?: string } = {}): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('.title', { timeout: 20000 });
  await page.getByRole('button', { name: '새 게임' }).click();
  await page.waitForSelector('.intro');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await page.waitForSelector('.setup');
  await page.fill('input.input', opts.name ?? '민지');
  await page.getByRole('button', { name: '다음' }).click();
  await page.locator('.egg-card').nth(opts.egg ?? 0).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.fill('input.input', opts.eggName ?? '별이');
  await page.getByRole('button', { name: '육성 시작!' }).click();
  await page.waitForSelector('.game');
  await page.waitForFunction(() => !!window.__PIXEL_LIFE__);
}

export const getSave = (page: Page) => page.evaluate(() => window.__PIXEL_LIFE__.store.getState().save);

/** Hatch by tapping the egg through the real canvas input. */
export async function hatchViaUi(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const p = await page.evaluate(() => window.__PIXEL_LIFE__.petScreenCenter());
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(200);
  }
  await page.waitForSelector('.cine');
  await page.locator('.cine .btn', { hasText: '건너뛰기' }).click();
  await page.locator('.cine .btn.pink').click();
  await expect(page.locator('.cine')).toHaveCount(0);
}

export async function skipTutorial(page: Page): Promise<void> {
  const b = page.getByRole('button', { name: '튜토리얼 건너뛰기' });
  if (await b.count()) await b.click();
}

/** Quick state helper: hatch through the store (not the subject of the test). */
export async function hatchFast(page: Page): Promise<void> {
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.__PIXEL_LIFE__.store.getState().tapEgg(); });
  await page.waitForSelector('.cine');
  await page.locator('.cine .btn', { hasText: '건너뛰기' }).click();
  await page.locator('.cine .btn.pink').click();
}

export async function canvasHasContent(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel) as HTMLCanvasElement | null;
    if (!c) return false;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const first = [d[0], d[1], d[2]];
    let diff = 0;
    for (let i = 0; i < d.length; i += 4 * 37) if (d[i] !== first[0] || d[i + 1] !== first[1] || d[i + 2] !== first[2]) diff++;
    return diff > 40;
  }, selector);
}
