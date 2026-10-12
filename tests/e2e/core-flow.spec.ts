import { expect, test } from '@playwright/test';
import { canvasHasContent, getSave, hatchViaUi, skipTutorial, startNewGame, trackErrors } from './helpers';

test.use({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

test('PART 23.3: first visit -> new game -> hatch -> care -> minigame -> shop -> decorate -> reload -> continue', async ({ page }) => {
  const errs = trackErrors(page);
  await startNewGame(page, { name: '민지', egg: 0, eggName: '별이' });
  expect(await canvasHasContent(page, '.stage canvas')).toBe(true);
  await hatchViaUi(page);
  let save = await getSave(page);
  const pet = save.ownedPets[save.activePetId];
  expect(pet.speciesId).toBe('mongle');
  expect(pet.name).toBe('별이');

  // tutorial: acknowledge status, then feed
  await page.locator('.tutorial').getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '먹이', exact: true }).click();
  await page.getByRole('button', { name: /기본 사료/ }).click();
  await expect.poll(async () => (await getSave(page)).counters.feeds).toBe(1);

  // stroke by dragging on the pet
  for (let r = 0; r < 3; r++) {
    const p = await page.evaluate(() => window.__PIXEL_LIFE__.petScreenCenter());
    await page.mouse.move(p.x - 18, p.y); await page.mouse.down();
    for (let i = 0; i < 14; i++) await page.mouse.move(p.x - 18 + i * 3, p.y + (i % 2) * 3);
    await page.mouse.up(); await page.waitForTimeout(1700);
  }
  expect((await getSave(page)).counters.strokes).toBeGreaterThanOrEqual(1);

  // bath: rub the foam
  await page.getByRole('button', { name: '목욕', exact: true }).click();
  const cb = await page.locator('.mg-canvas canvas').boundingBox();
  if (!cb) throw new Error('no bath canvas');
  for (let k = 0; k < 8; k++) { await page.mouse.move(cb.x + cb.width * 0.25, cb.y + cb.height * (0.35 + 0.05 * k)); await page.mouse.down(); await page.mouse.move(cb.x + cb.width * 0.75, cb.y + cb.height * (0.35 + 0.05 * k), { steps: 15 }); await page.mouse.up(); }
  await expect.poll(async () => (await getSave(page)).counters.baths, { timeout: 8000 }).toBe(1);
  await expect(page.locator('.mg-wrap')).toHaveCount(0, { timeout: 5000 });

  // minigame: run into the first obstacle -> finishes -> coins
  const coinsBefore = (await getSave(page)).coins;
  await page.getByRole('button', { name: '놀이', exact: true }).click();
  await page.getByRole('tab', { name: /미니게임/ }).click();
  await page.getByRole('button', { name: '점프 달리기 시작' }).click();
  await page.getByRole('button', { name: '시작!' }).click();
  await expect(page.locator('.grade')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '나가기' }).click();
  save = await getSave(page);
  expect(save.coins).toBeGreaterThan(coinsBefore);
  expect(save.counters.minigames).toBe(1);

  // shop: buy an item, double tap must not double-charge
  await skipTutorial(page);
  await page.getByRole('button', { name: '상점', exact: true }).click();
  await page.getByRole('tab', { name: '가구' }).click();
  await page.getByRole('button', { name: /작은 소파/ }).click();
  const owned0 = (await getSave(page)).inventory['furn:sofa_small'] ?? 0;
  const buyBtn = page.locator('.storage-note .btn.gold');
  await buyBtn.dblclick();
  await page.waitForTimeout(300);
  const owned1 = (await getSave(page)).inventory['furn:sofa_small'] ?? 0;
  expect(owned1 - owned0).toBe(1);
  await page.getByRole('button', { name: '닫기' }).click();

  // decorate: place the sofa, save
  await page.getByRole('button', { name: '꾸미기', exact: true }).click();
  await page.getByRole('button', { name: /작은 소파 놓기/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect.poll(async () => (await getSave(page)).roomLayout.some((l: { itemId: string }) => l.itemId === 'sofa_small')).toBe(true);

  // persistence: reload -> continue -> data intact
  await page.evaluate(() => window.__PIXEL_LIFE__.store.getState().flush());
  const before = await getSave(page);
  await page.reload();
  await page.waitForSelector('.title');
  const cont = page.getByRole('button', { name: '이어하기' });
  await expect(cont).toBeEnabled();
  await cont.click();
  await page.waitForSelector('.game');
  const after = await getSave(page);
  expect(after.coins).toBe(before.coins);
  expect(after.roomLayout.map((l: { itemId: string }) => l.itemId).sort()).toEqual(before.roomLayout.map((l: { itemId: string }) => l.itemId).sort());
  expect(after.ownedPets[after.activePetId].speciesId).toBe('mongle');
  expect(after.counters.feeds).toBe(1);
  expect(errs).toEqual([]);
});
