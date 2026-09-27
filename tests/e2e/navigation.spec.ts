// Getting around, on a desktop with a mouse and no touchscreen.
//
// The default project emulates a Pixel 7, which has touch — and touch masked both of the
// bugs this file guards. Treasured is installed as a macOS dock app, so a pointer with no
// touchscreen is a first-class case, not an edge one.

import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false });

/** Two people, so the deck has something to thumb through. */
async function seed(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForTimeout(1500);
  for (const name of ['Quill', 'Rowan']) {
    if (await page.getByRole('button', { name: 'Add someone' }).count()) {
      await page.getByRole('button', { name: 'Add someone' }).first().click();
    } else {
      await page.goto('/#/onboarding/person');
      await page.waitForTimeout(800);
    }
    await page.getByPlaceholder('Their name').fill(name);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Keep them' }).click();
    await page.waitForTimeout(1200);
  }
}

test('the rail names all three screens and moves between them', async ({ page }) => {
  await seed(page);

  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(3);
  expect((await tabs.allTextContents()).map((t) => t.trim())).toEqual(['Deck', 'Today', 'This week']);

  await tabs.filter({ hasText: 'Deck' }).click();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => location.hash)).toContain('deck');

  await tabs.filter({ hasText: 'This week' }).click();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => location.hash)).toContain('connections');
});

test('a deck card opens when clicked with a mouse', async ({ page }) => {
  // Regression: capturing the pointer on pointerdown retargeted the synthesised click to
  // the stage, so the card's own handler never ran. Touch was unaffected, which is why it
  // survived — on a desktop the deck was a gallery you could not open anyone from.
  await seed(page);
  await page.locator('[role="tab"]').filter({ hasText: 'Deck' }).click();
  await page.waitForTimeout(900);

  await page.locator('.slot.active').click();
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => location.hash)).toContain('today');
});

test('a horizontal wheel leaves Today, rather than being swallowed', async ({ page }) => {
  // Regression: overscroll-behavior: contain on both axes meant a region that cannot scroll
  // sideways still blocked the wheel from chaining out to the pane surface.
  await seed(page);
  await page.locator('[role="tab"]').filter({ hasText: 'Today' }).click();
  await page.waitForTimeout(900);

  const before = await page.evaluate(() => document.querySelector('.panes')!.scrollLeft);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(-600, 0);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => document.querySelector('.panes')!.scrollLeft);
  expect(after).toBeLessThan(before);
});

test('arrow keys walk the panes', async ({ page }) => {
  await seed(page);
  await page.locator('[role="tab"][aria-selected="true"]').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => location.hash)).toContain('deck');
});

test('tabbing never lands on an offscreen pane', async ({ page }) => {
  // All three panes are always in the DOM. Without inert, one Tab from Today used to land
  // on the Deck's Next button, and six landed on a Connections card — at which point the
  // browser scrolled focus into view and the screen changed underneath you.
  await seed(page);
  await page.locator('[role="tab"]').filter({ hasText: 'Today' }).click();
  await page.waitForTimeout(900);

  const inert = await page.evaluate(() =>
    [...document.querySelectorAll('.pane')].map((e) => e.hasAttribute('inert'))
  );
  expect(inert).toEqual([true, false, true]);

  const startedAt = await page.evaluate(() => document.querySelector('.panes')!.scrollLeft);
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.querySelector('.panes')!.scrollLeft)).toBe(startedAt);
});

test('there is a way to add a second person', async ({ page }) => {
  // "Add by hand" used to route to /onboarding/person, which ignored the id and showed the
  // welcome splash again — a loop back to the importer you had just come from.
  await seed(page);
  await page.goto('/#/onboarding/person');
  await page.waitForTimeout(1200);
  await expect(page.getByPlaceholder('Their name')).toBeVisible();
});
