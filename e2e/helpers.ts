import { expect, type Page } from '@playwright/test';

export const DAY_1 = new Date('2026-11-20T15:00:00Z');

/** Freeze the clock at a known UTC time (timers can still be advanced). */
export async function openAt(page: Page, time: Date, lang = 'en', onboarded = true) {
  await page.clock.install({ time });
  await page.addInitScript(
    ([l, ob]) => {
      Object.defineProperty(navigator, 'languages', { get: () => [l] });
      if (ob) {
        // Skip the first-time introduction (it has its own test).
        try {
          const s = JSON.parse(localStorage.getItem('perfecteye.settings') || '{}');
          if (s && typeof s === 'object' && s.onboarded === undefined) {
            s.onboarded = true;
            localStorage.setItem('perfecteye.settings', JSON.stringify(s));
          }
        } catch {
          /* ignore */
        }
      }
    },
    [lang, onboarded] as const,
  );
  await page.goto('/');
}

export async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Tap/click at a relative position of the board. Uses real touch on touch devices. */
export async function tapBoard(page: Page, fx: number, fy: number) {
  const board = page.locator('svg.board');
  const box = await board.boundingBox();
  if (!box) throw new Error('no board');
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Play the current round with a tap at (fx, fy); handles memory previews. */
export async function playRound(page: Page, fx = 0.5, fy = 0.5) {
  const show = page.getByRole('button', { name: /^(Show me|Mostrar)$/ });
  if (await show.isVisible()) {
    await show.click();
    await page.clock.runFor(5500);
  }
  await tapBoard(page, fx, fy);
  const confirm = page.getByRole('button', { name: /^(Confirm|Confirmar)$/ });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.locator('.result')).toBeVisible();
}

export async function next(page: Page) {
  await page.getByRole('button', { name: /^(Next test|See results|Siguiente prueba|Ver resultados)$/ }).click();
}

export async function playWholeGame(page: Page) {
  const taps: [number, number][] = [
    [0.47, 0.52],
    [0.5, 0.45],
    [0.8, 0.25],
    [0.3, 0.3],
    [0.5, 0.5],
  ];
  for (const [fx, fy] of taps) {
    await playRound(page, fx, fy);
    await next(page);
  }
}
