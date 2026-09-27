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
