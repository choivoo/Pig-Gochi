import { expect, test } from '@playwright/test';
import { canvasHasContent, getSave, hatchFast, skipTutorial, startNewGame, trackErrors } from './helpers';

test.use({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

const GAMES = ['별 모으기', '낚시', '기억력 카드', '점프 달리기', '미로 탐험', '리듬 탭'];

test('all six minigames start, render, pause, resume and can be left', async ({ page }) => {
  const errs = trackErrors(page);
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  for (const name of GAMES) {
    await page.getByRole('button', { name: '놀이', exact: true }).click();
    await page.getByRole('tab', { name: /미니게임/ }).click();
    await page.getByRole('button', { name: `${name} 시작` }).click();
    await expect(page.locator('.mg-card h3')).toHaveText(name);
    await page.getByRole('button', { name: '시작!' }).click();
    await page.waitForTimeout(700);
    expect(await canvasHasContent(page, '.mg-canvas canvas'), `${name} renders`).toBe(true);
    await page.getByRole('button', { name: '일시정지' }).click();
    await expect(page.getByRole('button', { name: '계속하기' })).toBeVisible();
    await page.getByRole('button', { name: '계속하기' }).click();
    // leave without a reward
    await page.getByRole('button', { name: '게임 종료' }).click();
    await expect(page.locator('.mg-wrap')).toHaveCount(0);
  }
  expect((await getSave(page)).counters.minigames ?? 0).toBe(0); // leaving early never pays
  expect(errs).toEqual([]);
});

test('stars: full 45s run pays out once and records the best score', async ({ page }) => {
  test.setTimeout(120000);
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  await page.evaluate(() => window.__PIXEL_LIFE__.store.getState().startMinigame('stars'));
  await page.getByRole('button', { name: '시작!' }).click();
  const cb = (await page.locator('.mg-canvas canvas').boundingBox())!;
  const t0 = Date.now();
  while (!(await page.locator('.grade').count()) && Date.now() - t0 < 60000) {
    await page.mouse.move(cb.x + cb.width * (0.2 + 0.6 * ((Date.now() / 700) % 1)), cb.y + cb.height * 0.85);
    await page.mouse.down(); await page.mouse.move(cb.x + cb.width * ((Date.now() / 900) % 1), cb.y + cb.height * 0.85); await page.mouse.up();
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.grade')).toBeVisible();
  const s = await getSave(page);
  expect(s.counters.minigames).toBe(1);
  expect(s.minigameRecords.stars.plays).toBe(1);
  expect(s.counters.coinsEarned).toBeGreaterThan(0);
});

test('rhythm: pressing keys in time produces judgements and a result screen', async ({ page }) => {
  test.setTimeout(120000);
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  await page.evaluate(() => window.__PIXEL_LIFE__.store.getState().startMinigame('rhythm'));
  await page.getByRole('button', { name: '시작!' }).click();
  const t0 = Date.now();
  while (!(await page.locator('.grade').count()) && Date.now() - t0 < 80000) {
    await page.keyboard.press(['KeyA', 'KeyS', 'KeyD'][Math.floor(Date.now() / 250) % 3]);
    await page.waitForTimeout(120);
  }
  await expect(page.locator('.grade')).toBeVisible();
  expect((await getSave(page)).minigameRecords.rhythm.plays).toBe(1);
});
