// Editing and removing a person, through the real UI.
//
// Both were impossible before 1.1.0: a person was write-once, and delete was wired only to
// the dev harness, which is compiled out of a production build. So these walk the whole
// path — onboarding, flip the card, edit, save, reload — against the real build.

import { expect, test, type Page } from '@playwright/test';

async function peopleRows(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('treasured');
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          const db = open.result;
          if (![...db.objectStoreNames].includes('people')) return resolve(0);
          const req = db.transaction('people', 'readonly').objectStore('people').count();
          req.onsuccess = () => resolve(req.result);
        };
      })
  );
}

/** Create one person through onboarding, which is the only way in. */
async function addSomeone(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Add someone' }).click();
  await page.getByPlaceholder('Their name').fill(name);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Keep them' }).click();
  await expect.poll(() => peopleRows(page), { timeout: 10_000 }).toBe(1);
}

test('the edit screen is reachable from the back of the card', async ({ page }) => {
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();          // flip to the card back
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);
  await expect(page.locator('h1')).toContainText('Edit');
  expect(await page.evaluate(() => window.location.hash)).toContain('/card/');
});

test('a renamed person keeps the new name and gets a new initial', async ({ page }) => {
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);

  await page.getByPlaceholder('Their name').fill('Zephyr');
  await page.getByPlaceholder('a line about who they are').fill('someone new');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1200);

  await page.reload();
  await page.waitForTimeout(1800);

  await expect(page.locator('h1').first()).toContainText('Zephyr');
  // the monogram is derived from the name, and was previously frozen at creation
  await expect(page.locator('.mono').first()).toHaveText('Z');
  expect(await peopleRows(page)).toBe(1);
});

test('cancelling leaves the person as they were', async ({ page }) => {
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);

  await page.getByPlaceholder('Their name').fill('Discarded');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1800);

  await expect(page.locator('h1').first()).toContainText('Quill');
});

test('a person can be removed, and asks once before doing it', async ({ page }) => {
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: 'Remove this person' }).click();
  await page.waitForTimeout(400);
  // the confirm carries a keep-it button at the same weight
  await expect(page.getByRole('button', { name: 'Keep them' })).toBeVisible();

  await page.getByRole('button', { name: /^Yes, remove/ }).click();
  await expect.poll(() => peopleRows(page), { timeout: 10_000 }).toBe(0);

  await page.reload();
  await page.waitForTimeout(1800);
  expect(await peopleRows(page)).toBe(0);
});

test('last together can be set by hand', async ({ page }) => {
  // It had exactly one writer in the whole app — a side effect of tapping a channel in the
  // reach sheet — so seeing someone in person left no way at all to record it.
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.reload();
  await page.waitForTimeout(1800);

  // the card says so, rather than "not yet"
  await expect(page.locator('.seen')).toContainText('just now');
});

test('a person can be put in a ring from their own card', async ({ page }) => {
  // The whole of the owner's complaint: membership was only ever modelled as people inside
  // a ring, edited from a sheet behind a pill on a pane you do not land on. A person's card
  // and editor said nothing about rings, so there was no way to ask what someone is part of.
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);

  await page.getByPlaceholder('New ring').fill('Climbing');
  await page.getByRole('button', { name: 'Add ring' }).click();
  await page.waitForTimeout(1000);

  // the chip is now there and selected, without leaving the person
  const chip = page.locator('.chip', { hasText: 'Climbing' });
  await expect(chip).toHaveClass(/selected/);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(1000);
  await page.locator('.turn').click();
  await page.waitForTimeout(1000);

  // and the card says so
  await expect(page.locator('.rings')).toContainText('Climbing');
});

test('an empty ring does not make Today claim you know nobody', async ({ page }) => {
  // Today used to be scoped to the active ring, so choosing an empty one showed the
  // fresh-install line to someone with people — while This week, which never filtered,
  // carried on listing them.
  await addSomeone(page, 'Quill');
  await page.locator('.turn').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(700);
  await page.getByPlaceholder('New ring').fill('Book club');
  await page.getByRole('button', { name: 'Add ring' }).click();
  await page.waitForTimeout(900);
  // leave the ring, so it is empty
  await page.locator('.chip', { hasText: 'Book club' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(1000);

  await page.locator('[role="tab"]').filter({ hasText: 'Deck' }).click();
  await page.waitForTimeout(900);
  await page.locator('.pill', { hasText: 'Everyone' }).click();
  await page.waitForTimeout(800);
  await page.locator('.pickable', { hasText: 'Book club' }).click();
  await page.waitForTimeout(1000);

  await page.locator('[role="tab"]').filter({ hasText: 'Today' }).click();
  await page.waitForTimeout(1100);
  await expect(page.locator('.pane[aria-label="Today"]')).not.toContainText('Nobody here yet');
  await expect(page.locator('.pane[aria-label="Today"] h1')).toContainText('Quill');
});
