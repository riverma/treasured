// The update notice sits at the top of the frame, which is also where every sub-screen puts
// its Back button. Moving the notice there covered Back on About, Settings, Import, Install
// and the person editor — so the shell adds `.with-update` to `#app`, which pushes
// everything below it down. This guards that contract.
//
// The production build has no way to force the service-worker state from outside, so the
// class is applied directly: what is under test is the layout rule, not the plumbing.

import { expect, test, type Page } from '@playwright/test';

async function pastOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Look around first' }).click();
  await page.waitForTimeout(1000);
}

test('the update notice does not land on top of Back', async ({ page }) => {
  await pastOnboarding(page);
  await page.goto('/#/about');
  await page.waitForTimeout(1200);

  const plain = await page.evaluate(
    () => getComputedStyle(document.getElementById('app')!).getPropertyValue('--top-pad')
  );

  await page.evaluate(() => document.getElementById('app')!.classList.add('with-update'));
  await page.waitForTimeout(300);

  const shifted = await page.evaluate(
    () => getComputedStyle(document.getElementById('app')!).getPropertyValue('--top-pad')
  );
  expect(shifted).not.toBe(plain);

  // and Back really does clear the notice's own band
  const back = await page.locator('.back').boundingBox();
  expect(back).not.toBeNull();
  expect(back!.y).toBeGreaterThan(55);
});

test('settings offers a way to ask for a new version on purpose', async ({ page }) => {
  await pastOnboarding(page);
  await page.goto('/#/settings');
  await page.waitForTimeout(1200);

  const check = page.getByRole('button', { name: 'Check for a new version' });
  await expect(check).toBeVisible();
  await check.click();

  // Whatever the answer, it must say something rather than go quiet — the house rule.
  await expect
    .poll(async () => (await page.locator('.scroll').innerText()).match(/newest one|Update now|Looking|Home Screen/) !== null,
      { timeout: 10_000 })
    .toBe(true);
});

test('about says who made it', async ({ page }) => {
  await pastOnboarding(page);
  await page.goto('/#/about');
  await page.waitForTimeout(1200);
  await expect(page.getByRole('link', { name: 'Rishi Verma' })).toBeVisible();
});
