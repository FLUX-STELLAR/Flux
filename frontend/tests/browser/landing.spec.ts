import { test, expect } from '@playwright/test';

test('landing explains the workflow without opening an operator session', async ({ page }) => {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Liquidity. Right on time.' })).toBeVisible();
  await expect(page.locator('.lp-header img')).toHaveAttribute('src', '/favicon.svg');
  const panel = page.getByRole('tabpanel');
  await expect(panel).toContainText('Required top-up');
  await page.getByRole('tab', { name: /Your policy/ }).click();
  await expect(panel).toContainText('Awaiting operator approval');
  await page.getByRole('tab', { name: /Your policy/ }).press('ArrowDown');
  await expect(page.getByRole('tab', { name: /Close the loop/ })).toBeFocused();
  await expect(panel).toContainText('Ready for payout');
  await page.getByRole('tab', { name: /Close the loop/ }).press('Home');
  await expect(panel).toContainText('Required top-up');
  await page.getByRole('heading', { name: 'Liquidity. Right on time.' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/flux-landing-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('intro opens the existing workspace and browser history returns to landing', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore the workspace', exact: true }).click();
  const intro = page.getByRole('dialog', { name: 'Entering the Flux workspace' });
  await expect(intro).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeFocused();
  await page.screenshot({ path: 'test-results/flux-intro.png' });
  await expect(intro).toBeHidden({ timeout: 5000 });
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.locator('.brand img')).toHaveAttribute('src', '/favicon.svg');
  await page.getByRole('button', { name: 'New funding request' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Liquidity. Right on time.' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(intro).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});

test('intro can be skipped with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Launch app', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});

test('mobile navigation and reduced-motion entry work without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile product navigation' })
    .getByRole('link', { name: 'How it works' })
    .click();
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(
    page.getByRole('heading', { name: 'From payout plan to funding-ready.' }),
  ).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/flux-landing-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Enter the workspace', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Entering the Flux workspace' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});
