import { expect, test } from '@playwright/test';
import { getSave, hatchFast, skipTutorial, startNewGame, trackErrors } from './helpers';

test.use({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

test('PART 31 scenario B: evolution cinematic, new sprite, dex entry, persistence', async ({ page }) => {
  const errs = trackErrors(page);
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  // inject enough care time + a care record favouring affection (time injection through the store, no real waiting)
  await page.evaluate(() => {
    const st = window.__PIXEL_LIFE__.store;
    const s = st.getState().save;
    const p = s.ownedPets[s.activePetId];
    st.setState({ save: { ...s, ownedPets: { ...s.ownedPets, [p.uid]: { ...p, growthMinutes: 60, care: { ...p.care, happyMinutes: 280, bondGained: 40, strokes: 40 } } } } });
  });
  await page.getByRole('button', { name: /진화할 수 있어요/ }).click();
  await expect(page.locator('.cine')).toBeVisible();
  await page.locator('.cine .btn', { hasText: '건너뛰기' }).click();
  await expect(page.locator('.cine .msg')).toContainText('축하해요');
  await expect(page.locator('.cine .msg')).toContainText('몽실');
  await page.locator('.cine .btn.pink').click();
  const save = await getSave(page);
  const pet = save.ownedPets[save.activePetId];
  expect(pet.speciesId).toBe('mongsil');
  expect(pet.stage).toBe('child');
  expect(save.encyclopedia.mongsil).toBeTruthy();
  await page.evaluate(() => window.__PIXEL_LIFE__.store.getState().flush());
  await page.reload();
  await page.getByRole('button', { name: '이어하기' }).click();
  await page.waitForSelector('.game');
  const again = await getSave(page);
  expect(again.ownedPets[again.activePetId].speciesId).toBe('mongsil');
  // dex shows the new form in colour
  await page.getByRole('button', { name: '도감', exact: true }).click();
  await expect(page.getByText(/발견한 생명체 2 \/ 21/)).toBeVisible();
  expect(errs).toEqual([]);
});

test('economy scenario D in the UI: too expensive -> blocked; funded -> buy once', async ({ page }) => {
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  await page.evaluate(() => { const st = window.__PIXEL_LIFE__.store; st.setState({ save: { ...st.getState().save, coins: 5 } }); });
  await page.getByRole('button', { name: '상점', exact: true }).click();
  await page.getByRole('tab', { name: '가구' }).click();
  await page.getByRole('button', { name: /작은 수족관/ }).click();
  await expect(page.locator('.storage-note .btn.gold')).toBeDisabled();
  await page.evaluate(() => { const st = window.__PIXEL_LIFE__.store; st.setState({ save: { ...st.getState().save, coins: 500 } }); });
  await page.locator('.storage-note .btn.gold').click();
  const s = await getSave(page);
  expect(s.inventory['furn:aquarium']).toBe(1);
  expect(s.coins).toBeGreaterThanOrEqual(400);
  expect(s.coins).toBeLessThan(500);
});

test('corrupted storage never crashes startup', async ({ page }) => {
  const errs = trackErrors(page);
  await page.addInitScript(() => { localStorage.setItem('pixel-life-mirror-v1', '{"schemaVersion":1,"ownedPets":{"x":{"speciesId":"???"}}}'); });
  await page.goto('/');
  await page.waitForSelector('.title');
  await expect(page.getByRole('button', { name: '이어하기' })).toBeDisabled();
  await page.getByRole('button', { name: '새 게임' }).click();
  await page.waitForSelector('.intro');
  expect(errs.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
});

test('settings: export, import, volume, reset', async ({ page }) => {
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  await page.getByRole('button', { name: '더보기 메뉴' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.getByText(/브라우저 데이터를 지우면/)).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '저장 데이터 내보내기' }).click()]);
  const path = await dl.path();
  const fs = await import('node:fs');
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  expect(json.format).toBe('pixel-life-save');
  expect(json.data.ownedPets).toBeTruthy();
  // import a modified copy
  json.data.coins = 777;
  fs.writeFileSync(path + '.mod.json', JSON.stringify(json));
  await page.locator('input[type=file]').setInputFiles(path + '.mod.json');
  await expect(page.getByRole('alertdialog')).toContainText('코인 777');
  await page.getByRole('button', { name: '교체하기' }).click();
  expect((await getSave(page)).coins).toBe(777);
  await page.getByRole('button', { name: '더보기 메뉴' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  // invalid file
  fs.writeFileSync(path + '.bad.json', '{"hello":1}');
  await page.locator('input[type=file]').setInputFiles(path + '.bad.json');
  await expect(page.getByRole('alert')).toContainText('가져오기 실패');
  // mute
  await page.getByLabel('소리 끄기 (음소거)').check();
  expect((await getSave(page)).settings.muted).toBe(true);
  // reset flow requires confirmation
  await page.getByRole('button', { name: '데이터 초기화' }).click();
  await page.getByRole('button', { name: '삭제하기' }).click();
  await page.waitForSelector('.title');
  await expect(page.getByRole('button', { name: '이어하기' })).toBeDisabled();
});

test('keyboard + accessibility: focus trap, escape, named controls', async ({ page }) => {
  await startNewGame(page);
  await hatchFast(page);
  await skipTutorial(page);
  const unnamed = await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length);
  expect(unnamed).toBe(0);
  await page.getByRole('button', { name: '먹이', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '먹이 주기' })).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
  expect(inside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('offline: after the first visit the game still starts without network (service worker)', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('.title');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForTimeout(4500); // let the precache message run
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.title', { timeout: 15000 });
  await page.getByRole('button', { name: '새 게임' }).click();
  await page.waitForSelector('.intro');
  const loaded = await page.evaluate(() => Array.from(document.images).every((i) => i.complete));
  expect(loaded).toBe(true);
  const manifest = await page.evaluate(() => fetch('./manifest.json').then((r) => r.ok));
  expect(manifest).toBe(true);
});

test('PWA: manifest is valid and icons exist', async ({ request }) => {
  const m = await (await request.get('/manifest.json')).json();
  expect(m.name).toContain('PIXEL LIFE');
  expect(m.display).toBe('standalone');
  for (const i of m.icons) expect((await request.get('/' + i.src)).ok()).toBe(true);
  expect((await request.get('/sw.js')).ok()).toBe(true);
});
