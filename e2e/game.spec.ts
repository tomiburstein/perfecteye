import { expect, test } from '@playwright/test';
import { generateDailyChallenge } from '../src/games/classic/generator';
import { polar } from '../src/platform/geometry';
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
  expect(share?.split('\n').length).toBeGreaterThanOrEqual(9);
  expect(share).toMatch(/🎯 [🟩🟨⬜]{5} \d+/u);
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=PERFECTEYE/);

  // World standing: percentile overall and per test, computed by the server.
  await expect(page.locator('.world__big')).toBeVisible();
  await expect(page.locator('.world__rounds li')).toHaveCount(5);

  await page.getByRole('button', { name: 'Scoreboards' }).click();
  await page.getByRole('tab', { name: 'Statistics' }).click();
  await expect(page.locator('.stat-tile').first()).toContainText('1');
  await expect(page.locator('.stat-tile').nth(1)).toContainText(String(total));

  // Back home: the day is done and cannot be played again.
  await page.getByRole('button', { name: 'PerfectEye home' }).click();
  await expect(page.getByText(`You scored ${total}/500 today.`)).toBeVisible();
  await expect(page.getByRole('button', { name: "See today's results" })).toBeVisible();
  expect(errors).toEqual([]);
});

test('free play: unlimited games that do not touch daily stats', async ({ page }) => {
  const errors = await collectErrors(page);
  await openAt(page, DAY_1);
  for (let game = 0; game < 2; game++) {
    if (game === 0) await page.getByRole('button', { name: 'Play free' }).click();
    else await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText('Free play').first()).toBeVisible();
    await playWholeGame(page);
    await expect(page.getByRole('heading', { name: /Total score: \d+\/500/ })).toBeAttached();
    await expect(page.getByText(/don’t count towards your stats/)).toBeVisible();
  }
  // Daily challenge is still untouched and playable.
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByRole('button', { name: "Play today's challenge" })).toBeVisible();
  await page.getByRole('button', { name: 'Scoreboards' }).click();
  await page.getByRole('tab', { name: 'Statistics' }).click();
  await expect(page.locator('.stat-tile').first()).toContainText('0');
  // ...but free play games are listed in "My games".
  await page.getByRole('tab', { name: 'My games' }).click();
  await expect(page.locator('.games__row')).toHaveCount(2);
  await expect(page.locator('.games__row').first()).toContainText('Free play');
  expect(errors).toEqual([]);
});

test('after the daily challenge you can keep playing in free play', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);
  await page.getByRole('button', { name: /Play again/ }).click();
  await expect(page.getByRole('heading', { name: /Find the Center/ })).toBeVisible();
  await expect(page.getByText('Free play').first()).toBeVisible();
});

test('angle: the same opening built on either side scores (almost) perfect', async ({ page }) => {
  const c = generateDailyChallenge('2026-11-20').angle;
  for (const side of [1, -1]) {
    await page.goto('about:blank');
    await page.evaluate(() => localStorage.clear()).catch(() => {});
    await openAt(page, DAY_1);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: "Play today's challenge" }).click();
    await playRound(page);
    await next(page);
    await playRound(page);
    await next(page);
    await page.getByRole('button', { name: 'Show me' }).click();
    await page.clock.runFor(3500);
    const box = (await page.locator('svg.board').boundingBox())!;
    const p = polar(c.vertex, c.inputBaseDeg + side * c.targetDeg, 330);
    const x = box.x + (p.x / 1000) * box.width;
    const y = box.y + (p.y / 1000) * box.height;
    const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    if (hasTouch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await page.getByRole('button', { name: 'Confirm' }).click();
    const text = (await page.locator('.result .sr-only').textContent()) ?? '';
    expect(Number(/\d+/.exec(text)?.[0]), `side ${side}`).toBeGreaterThanOrEqual(95);
  }
});

test('each test has a 60-second timer; time out with no answer scores 0', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await expect(page.getByRole('timer')).toHaveText(/^(1:00|0:59)$/);
  await page.clock.runFor(50_000);
  await expect(page.getByRole('timer')).toHaveText(/0:1\d/);
  await page.clock.runFor(11_000);
  await expect(page.getByText("Time's up with no answer: 0 points.")).toBeVisible();
  await expect(page.locator('.result .sr-only')).toContainText('0');
  // With an answer on the board, it counts when time runs out.
  await next(page);
  await tapBoard(page, 0.5, 0.5);
  await page.clock.runFor(61_000);
  await expect(page.getByText(/^Time's up! Off by/)).toBeVisible();
});

test('the timer keeps running across reloads', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await page.clock.runFor(40_000);
  await page.reload();
  await page.getByRole('button', { name: "Continue today's challenge" }).click();
  await expect(page.getByRole('timer')).toHaveText(/0:(19|20)/);
});

test('world ranking: name change, today worldwide and my games', async ({ page, browser }) => {
  // Another player finishes first, so percentiles have someone to compare with.
  const other = await browser.newPage();
  await openAt(other, DAY_1);
  await other.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(other);
  await expect(other.locator('.world__big')).toBeVisible();
  await other.close();

  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);
  await expect(page.locator('.world__big')).toContainText(/Better than \d+% of today’s players/);
  await expect(page.locator('.world__rank')).toContainText(/of \d+ players/);

  // First finished game: the name prompt is already open.
  await expect(page.getByLabel('What name should appear in the world ranking?')).toBeVisible();
  await page.getByLabel('What name should appear in the world ranking?').fill('<bad>');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('That name can’t be used.', { exact: false })).toBeVisible();
  const name = `Ana ${Math.floor(Math.random() * 9000) + 1000}`;
  await page.getByLabel('What name should appear in the world ranking?').fill(name);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.world__as')).toContainText(name);

  await page.getByRole('button', { name: 'Scoreboards' }).click();
  await expect(page.locator('.ranking__row.is-me').first()).toContainText(name);
  await expect(page.locator('.boards__meta')).toContainText(/\d+ players today/);
  await page.getByRole('tab', { name: 'My games' }).click();
  await expect(page.locator('.games__row')).toHaveCount(1);
  await expect(page.locator('.games__row')).toContainText('Daily #9');
});

test('without the ranking server the game still works', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, body: 'down' }));
  const errors = await collectErrors(page);
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);
  await expect(page.getByText('The world ranking isn’t available right now.', { exact: false })).toBeVisible();
  await expect(page.getByTestId('share-text')).toContainText('PERFECTEYE #009');
  expect(errors.filter((e) => !e.includes('503'))).toEqual([]);
});

test('first visit shows a short introduction before the first daily challenge', async ({ page }) => {
  await openAt(page, DAY_1, 'en', false);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
  await expect(page.locator('.intro__step')).toHaveCount(3);
  // No timer is running yet: nothing has started.
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Practise first' }).click();
  await expect(page.getByText('Free play').first()).toBeVisible();
  // Seen once: next time the daily challenge starts directly.
  await page.getByRole('button', { name: 'PerfectEye home' }).click();
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await expect(page.getByRole('heading', { name: /Find the Center/ })).toBeVisible();
});

test('angle master shows that the base was rotated', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playRound(page);
  await next(page);
  await playRound(page);
  await next(page);
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.clock.runFor(3500);
  await expect(page.locator('.rotate-hint')).toBeAttached();
  await expect(page.locator('.rotate-hint text')).toHaveText('rotated base');
});

test('link previews use an absolute image URL', async ({ page }) => {
  await page.goto('/');
  const img = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(img).toMatch(/^https:\/\/.+\/og-image\.png$/);
  expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toMatch(/^https:\/\//);
});

test('how the world answered and your evolution', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(page);
  await expect(page.getByRole('heading', { name: 'How the world answered' })).toBeVisible();
  await expect(page.locator('.wa__card')).toHaveCount(5);
  await expect(page.locator('.wa__you').first()).toBeAttached();
  // A free-play game, then the evolution sparklines appear.
  await page.getByRole('button', { name: /Play again/ }).click();
  await playWholeGame(page);
  await page.getByRole('button', { name: 'Scoreboards' }).click();
  await page.getByRole('tab', { name: 'Statistics' }).click();
  await expect(page.getByText('Your evolution')).toBeVisible();
  await expect(page.locator('.evo__row')).toHaveCount(5);
});

test('the world answers are only shown to people who already played', async ({ request }) => {
  const res = await request.get('/api/world?day=2026-11-20&playerId=ffffffffffffffff');
  expect(res.status()).toBe(403);
});

test('privacy page and contact form', async ({ page }) => {
  await openAt(page, DAY_1);
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
  await expect(page.getByText('No cookies, no ads', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Contact & bugs' }).first().click();
  await expect(page.getByRole('heading', { name: 'Contact & bugs' })).toBeVisible();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Write at least a few words.')).toBeVisible();
  await page.getByLabel('Idea or suggestion').check();
  await page.getByLabel('Your message').fill('Please add a hexagon test! (e2e)');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Thanks! We’ll read it soon.')).toBeVisible();
  // Home is one tap away.
  await page.getByRole('button', { name: 'PerfectEye home' }).click();
  await expect(page.getByRole('button', { name: "Play today's challenge" })).toBeVisible();
});

test('owner panel: password, players per day, messages and hiding a name', async ({ page, browser }) => {
  // A player with an offensive-ish but allowed name finishes the daily challenge.
  const other = await browser.newPage();
  await openAt(other, DAY_1);
  await other.getByRole('button', { name: "Play today's challenge" }).click();
  await playWholeGame(other);
  const name = `Troll ${Math.floor(Math.random() * 9000) + 1000}`;
  await other.getByLabel('What name should appear in the world ranking?').fill(name);
  await other.getByRole('button', { name: 'Save' }).click();
  await expect(other.locator('.world__as')).toContainText(name);
  await other.goto('/#contact');
  await other.getByLabel('Offensive name in the ranking').check();
  await other.getByLabel('Your message').fill(`Please remove ${name}`);
  await other.getByRole('button', { name: 'Send' }).click();
  await expect(other.getByText('Thanks!', { exact: false })).toBeVisible();
  await other.close();

  await openAt(page, DAY_1);
  await page.goto('/#admin');
  await page.getByLabel('Panel password').fill('wrong-password-000');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByText('Wrong password.')).toBeVisible();
  await page.getByLabel('Panel password').fill('test-admin-token-123');
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('heading', { name: 'Players per day' })).toBeVisible();
  await expect(page.locator('.table tbody tr').first()).toBeVisible();
  await expect(page.locator('.msgs__item', { hasText: `Please remove ${name}` })).toBeVisible();

  const row = page.locator('.mod li', { hasText: name });
  await row.getByRole('button', { name: 'Hide' }).click();
  await expect(row).toContainText('(hidden)');

  const res = await page.request.get('/api/results?day=2026-11-20');
  const top = (await res.json()).top as { name: string }[];
  expect(top.some((r) => r.name === name)).toBe(false);
});

test('owner API refuses requests without the password', async ({ request }) => {
  expect((await request.get('/api/admin')).status()).toBe(401);
  expect((await request.post('/api/admin/hide', { data: { day: '2026-11-20', playerId: 'aaaaaaaaaaaaaaaa', hidden: true } })).status()).toBe(401);
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

test('arrow keys adjust the answer without clicking the board first', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test only on desktop');
  await openAt(page, DAY_1);
  await page.getByRole('button', { name: "Play today's challenge" }).click();
  await expect(page.getByText(/Keyboard: arrows to fine-tune/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  const marker = page.locator('.mk-user');
  await expect(marker).toHaveAttribute('transform', 'translate(505 500)');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(marker).toHaveAttribute('transform', 'translate(505 501)');
  await page.keyboard.press('Enter');
  await expect(page.locator('.result')).toBeVisible();
  // Perfect Shape: 1/2/3 choose a point, arrows move it.
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /^(Next test)$/ }).click();
    const show = page.getByRole('button', { name: 'Show me' });
    if (await show.isVisible()) {
      await show.click();
      await page.clock.runFor(5500);
    }
    if (i === 3) break;
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
  }
  const before = await page.locator('.mk-user').nth(1).locator('circle').first().getAttribute('cx');
  await page.keyboard.press('2');
  await page.keyboard.press('ArrowRight');
  const after = await page.locator('.mk-user').nth(1).locator('circle').first().getAttribute('cx');
  expect(Number(after) - Number(before)).toBeCloseTo(5, 5);
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
