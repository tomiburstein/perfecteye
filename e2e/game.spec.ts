import { expect, test } from '@playwright/test';
import { DAY_1, collectErrors, next, openAt, playRound, playWholeGame, tapBoard } from './helpers';

test('home screen shows the daily challenge without console errors', async ({ page }) => {
  const errors = await collectErrors(page);
  await openAt(page, DAY_1);
  await expect(page.getByRole('heading', { name: 'How accurate is your eye?' })).toBeVisible();
  await expect(page.getByText('Daily challenge #9')).toBeVisible();
  await expect(page.getByRole('button', { name: "Play today's challenge" })).toBeVisible();
  await expect(page.locator('.countdown__time')).toHaveText(/^0(8:59:[45]\d|9:00:00)$/);
  expect(errors).toEqual([]);
});

test('full game: five rounds, results, share text and stats', async ({ page }) => {
  const errors = await collectErrors(page);
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);

  await expect(page.getByText('Challenge #9 complete')).toBeVisible();
  const heading = await page.locator('#results-title').textContent();
  const total = Number(/(\d+)\/500/.exec(heading ?? '')?.[1]);
  const rows = await page.locator('.row__score').allTextContents();
  expect(rows).toHaveLength(5);
  expect(rows.map(Number).reduce((a, b) => a + b, 0)).toBe(total);

  const share = await page.getByTestId('share-text').textContent();
  expect(share).toContain('PERFECTEYE #009');
  expect(share).toContain(`TOTAL: ${total}/500`);
  expect(share?.split('\n')).toHaveLength(9);
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=PERFECTEYE/);

  await page.getByRole('button', { name: 'Statistics' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.stat-tile').first()).toContainText('1');
  await expect(dialog.locator('.stat-tile').nth(1)).toContainText(String(total));
  await dialog.getByRole('button', { name: 'Close' }).first().click();

  // Back home: the day is done and cannot be played again.
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByText(`You scored ${total}/500 today.`)).toBeVisible();
  await expect(page.getByRole('button', { name: "See today's results" })).toBeVisible();
  expect(errors).toEqual([]);
});

test('copy to clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText('Copied to clipboard!')).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip.startsWith('PERFECTEYE #009')).toBe(true);
});

test('reloading never allows scoring a round twice', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playRound(page, 0.2, 0.2);
  const firstScore = await page.locator('.result .sr-only').textContent();

  await page.reload();
  await expect(page.getByRole('button', { name: "Continue today's challenge" })).toBeVisible();
  await page.getByRole('button', { name: "Continue today's challenge" }).click();
  await expect(page.getByRole('heading', { name: /Perfect Half/ })).toBeVisible();

  // Memory round: the target is shown once; after a reload it is not shown again.
  await playRound(page);
  await next(page);
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.reload();
  await page.getByRole('button', { name: "Continue today's challenge" }).click();
  await expect(page.getByRole('heading', { name: /Angle Master/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show me' })).toHaveCount(0);
  await expect(page.getByText('The figure was already shown. Rebuild it from memory.')).toBeVisible();

  // Finish and check that round 1 kept its original score.
  await playRound(page);
  await next(page);
  await playRound(page);
  await next(page);
  await playRound(page);
  await next(page);
  const firstRow = await page.locator('.row__score').first().textContent();
  expect(firstScore).toContain(String(firstRow));
});

test('a game started before midnight UTC keeps its challenge', async ({ page }) => {
  await openAt(page, new Date('2026-11-20T23:59:30Z'));
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playRound(page);
  await page.clock.setSystemTime(new Date('2026-11-21T00:00:30Z'));
  await page.clock.runFor(2000);
  await next(page);
  for (let i = 0; i < 4; i++) {
    await playRound(page);
    await next(page);
  }
  await expect(page.getByText('Challenge #9 complete')).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByText('Daily challenge #10')).toBeVisible();
  await expect(page.getByRole('button', { name: "Play today's challenge" })).toBeVisible();
});

test('a new day brings a new challenge automatically', async ({ page }) => {
  await openAt(page, new Date('2026-11-20T23:59:58Z'));
  await expect(page.getByText('Daily challenge #9')).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.getByText('Daily challenge #10')).toBeVisible();
});

test('language switch translates the UI and is remembered', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué tan preciso es tu ojo?' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Jugar el desafío de hoy' })).toBeVisible();
  await page.getByRole('button', { name: 'Jugar el desafío de hoy' }).click();
  await expect(page.getByRole('heading', { name: /Encuentra el centro/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
});

test('browser language is detected (Spanish)', async ({ page }) => {
  await openAt(page, DAY_1, 'es-AR');
  await expect(page.getByText('Desafío diario #9')).toBeVisible();
});

test('dark mode toggles and is remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openAt(page, DAY_1);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await bg();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(bg).not.toBe(light);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('follows the system dark preference by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openAt(page, DAY_1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const lang of ['en', 'es']) {
test(`layout fits the screen in every round (${lang})`, async ({ page }) => {
  await openAt(page, DAY_1, lang);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.locator('.btn--cta').click();
  const vp = page.viewportSize()!;
  for (let round = 0; round < 5; round++) {
    expect(await overflow()).toBe(false);
    const board = await page.locator('svg.board').boundingBox();
    expect(board).not.toBeNull();
    expect(Math.abs(board!.width - board!.height)).toBeLessThan(1); // never deformed
    await playRound(page);
    const b = await page.locator('.game__foot .btn').boundingBox();
    expect(b!.y + b!.height, `round ${round + 1}`).toBeLessThanOrEqual(vp.height + 1);
    await next(page);
  }
});
}

test('dragging adjusts the marker without scrolling the page', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await tapBoard(page, 0.3, 0.3);
  const marker = page.locator('.mk-user');
  const before = await marker.getAttribute('transform');
  const box = (await page.locator('svg.board').boundingBox())!;
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const sx = box.x + box.width * 0.3;
  const sy = box.y + box.height * 0.3;
  if (hasTouch) {
    // Real touch drag through the Chrome DevTools protocol.
    const cdp = await page.context().newCDPSession(page);
    const tp = (x: number, y: number) => [{ x, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(sx, sy) });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(sx + i * 8, sy + i * 12) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 80, sy + 120, { steps: 10 });
    await page.mouse.up();
  }
  const after = await marker.getAttribute('transform');
  expect(after).not.toBe(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('keyboard can play a round', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test only on desktop');
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await page.locator('svg.board').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.locator('.result')).toBeVisible();
});

test('corrupted storage does not break the app', async ({ page }) => {
  const errors = await collectErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('perfecteye-classic.v1.history', '{"2026-11-19":{"day":"x"}}');
    localStorage.setItem('perfecteye-classic.v1.progress', 'not json');
    localStorage.setItem('perfecteye.settings', '{"theme":"pink","lang":"xx"}');
  });
  await openAt(page, DAY_1);
  await expect(page.getByRole('button', { name: "Play today's challenge" })).toBeVisible();
  expect(errors).toEqual([]);
});
