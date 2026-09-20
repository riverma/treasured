// Persistence and the empty-first-run contract, in a real engine.
//
// Two reasons this suite exists and the unit suite cannot replace it.
//
// One: `data.slice` is a Svelte `$state` proxy, and handing a proxy to Dexie throws
// DataCloneError — the transaction writes nothing while the app still renders from memory,
// so the loss only surfaces on the next launch. Under Vitest the same broken code passes,
// because fake-indexeddb's structured-clone implementation accepts proxies a browser
// refuses.
//
// Two: Treasured ships empty. No seed, no sample people, no demo contacts. That promise is
// only meaningful if it is checked against the real build in a real browser.

import { expect, test, type Page } from '@playwright/test';

/** Row counts read straight from IndexedDB, not from anything the app tells us. */
async function rowCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, number>>((resolve) => {
        const open = indexedDB.open('treasured');
        open.onerror = () => resolve({});
        open.onsuccess = () => {
          const db = open.result;
          const names = [...db.objectStoreNames];
          if (!names.length) return resolve({});
          const tx = db.transaction(names, 'readonly');
          const counts: Record<string, number> = {};
          let left = names.length;
          for (const name of names) {
            const req = tx.objectStore(name).count();
            req.onsuccess = () => {
              counts[name] = req.result;
              if (--left === 0) resolve(counts);
            };
          }
        };
      })
  );
}

test('a fresh install holds nobody at all', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  const counts = await rowCounts(page);
  // Either the database was never created, or it exists and is empty. Both are correct;
  // what must never happen is people appearing that the user did not put there.
  expect(counts.people ?? 0).toBe(0);
  expect(counts.rings ?? 0).toBe(0);
  expect(counts.ringMembers ?? 0).toBe(0);
});

test('the empty state is shown rather than invented data', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);

  // A fresh install opens on onboarding now, so step past it to reach the panes.
  await page.getByRole('button', { name: 'Look around first' }).click();
  await page.waitForTimeout(1200);

  // The empty state, not a card. Asserting on the absence of particular names would mean
  // writing those names down here, which is the thing this suite exists to prevent — so
  // the check is that nothing person-shaped rendered on any of the three panes.
  await expect(page.locator('.centre').first()).toBeVisible();
  expect(await page.locator('.face').count()).toBe(0);      // no Today card
  expect(await page.locator('.slot').count()).toBe(0);      // no deck cards
  expect(await page.locator('.person').count()).toBe(0);    // no weekly three
  expect(await page.locator('h1').count()).toBe(0);
});

test('reloading an empty install does not conjure anyone', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.reload();
  await page.waitForTimeout(1200);
  expect((await rowCounts(page)).people ?? 0).toBe(0);
});

test('a record on disk means onboarding is not shown again', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Look around first' }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByText('A wallet for the people you love')).toHaveCount(0);
});

test('a record already on disk is read back and rendered', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Look around first' }).click();
  await page.waitForTimeout(900);

  // Written straight to IndexedDB, because in a production build there is no source module
  // to import and, until onboarding exists, no UI that creates a person. The write-path
  // guard against DataCloneError returns in the onboarding spec, which drives the real form.
  await page.evaluate(async () => {
    const open = indexedDB.open('treasured');
    await new Promise((r) => { open.onsuccess = r; });
    const db = open.result;
    const tx = db.transaction(['people', 'rings'], 'readwrite');
    tx.objectStore('people').put({
      id: 'e2e-1', fullName: 'Q', name: 'Q', initial: 'Q', essence: '',
      palette: {
        key: 'rose',
        gradientColors: ['#e08591', '#ed9fa5', '#f4bdbf', '#fadcd9'],
        gradientLocations: [0, 0.3, 0.6, 1],
        angle: 155, fontColor: '#3a0e16',
        softColor: '#3a0e16b8', lineColor: '#3a0e162e'
      },
      lastSeenAt: null, since: '', birthday: null,
      recentSentiment: 'warm', sentimentHistory: [], relations: ['friend'],
      treasures: [], quotes: [], contact: { hasContact: false },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    tx.objectStore('rings').put({
      id: 'all', name: 'Everyone', description: '', color: '#b8895a',
      isDefault: true, position: 0, createdAt: new Date().toISOString()
    });
    await new Promise((r) => { tx.oncomplete = r; });
  });

  await page.reload();
  await page.waitForTimeout(1500);
  expect((await rowCounts(page)).people ?? 0).toBe(1);
  await expect(page.locator('h1')).toContainText('Q');
});
