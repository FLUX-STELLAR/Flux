import { test, expect } from '@playwright/test';

test('editor iframe loads and authenticates even when cookies are unavailable', async ({
  page,
}) => {
  await page.route('**/api/**', async (route) => {
    const headers = await route.request().allHeaders();
    delete headers.cookie;
    await route.continue({ headers });
  });
  await page.goto('/health');
  await page.setContent(
    '<iframe title="Editor preview" src="/" style="width:1200px;height:900px;border:0"></iframe>',
  );
  const app = page.frameLocator('iframe');
  await expect(app.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible({
    timeout: 8000,
  });
  await app.getByRole('button', { name: 'New funding request' }).click();
  await expect(app.getByRole('dialog')).toBeVisible();
  await app.getByRole('button', { name: 'Close dialog' }).click();
  await page.screenshot({ path: 'test-results/flux-embedded.png', fullPage: true });
});
