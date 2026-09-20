// Onboarding, which since the app ships empty is the only way anyone gets in.
//
// This also restores the guard that the unit suite is structurally blind to: a write must
// reach IndexedDB, not just the screen. `data.slice` is a Svelte `$state` proxy, and handing
// a proxy to Dexie throws DataCloneError — the transaction writes nothing while the app
// renders happily from memory. Under Vitest the broken code passes, because fake-indexeddb
// accepts proxies a browser refuses. So the check has to happen here, through the real form.

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

test('a fresh install opens on onboarding, not an empty Today', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.getByText('A wallet for the people you love')).toBeVisible();
  expect(await peopleRows(page)).toBe(0);
});

test('someone added through the form reaches IndexedDB and survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Add someone' }).click();
  await page.getByPlaceholder('Their name').fill('Q');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Keep them' }).click();

  await expect.poll(() => peopleRows(page), { timeout: 10_000 }).toBe(1);

  await page.reload();
  await page.waitForTimeout(1800);
  expect(await peopleRows(page)).toBe(1);
  // and they are on Today, not lost behind an onboarding that forgot it had run
  await expect(page.locator('h1').first()).toContainText('Q');
});

test('you can leave onboarding without adding anyone', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Look around first' }).click();
  await page.waitForTimeout(900);

  expect(await peopleRows(page)).toBe(0);
  // and it does not re-appear on the next launch, because leaving was a real choice
  await page.reload();
  await page.waitForTimeout(1800);
  await expect(page.getByText('Nobody here yet').first()).toBeVisible();
});

test('works on plain http, where crypto.randomUUID does not exist', async ({ page }) => {
  // A freshly deployed custom domain serves over http until the certificate is issued.
  // crypto.randomUUID is a secure-context API, so on that origin it is simply absent —
  // and adding a person used to throw into nothing, leaving the button dead and silent.
  await page.addInitScript(() => { delete (Crypto.prototype as { randomUUID?: unknown }).randomUUID; });

  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe('undefined');

  await page.getByRole('button', { name: 'Add someone' }).click();
  await page.getByPlaceholder('Their name').fill('Q');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Grateful', exact: true }).click();
  await page.getByRole('button', { name: 'Keep them' }).click();

  await expect.poll(() => peopleRows(page), { timeout: 10_000 }).toBe(1);
  await expect(page.getByText('How does it feel?')).toHaveCount(0);
});
