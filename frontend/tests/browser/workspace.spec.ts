import { test, expect } from '@playwright/test';

test('approval shows exact sub-cent funding instead of rounding to zero', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'New funding request' }).click();
  await page.getByLabel('Batch name').fill('Precision check');
  await page.getByLabel('Partner batch ID').fill('precision-batch-01');
  // Fresh sandbox balance has 200 USDT0 of headroom.
  await page.getByLabel('Payout amount · USDT0').fill('200.0000001');
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.calculation-total')).toContainText('$0.000001');
  await dialog.getByRole('button', { name: 'Create request', exact: true }).click();
  await expect(dialog.locator('.approval-check')).toContainText('$0.000001 USDT0');
  await dialog.getByRole('button', { name: 'Cancel request', exact: true }).click();
  await expect(dialog.getByText('Cancelled', { exact: true })).toBeVisible();
});

test('operator creates, approves, reconciles, exports and pays a batch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New funding request' }).click();
  await page.getByLabel('Batch name').fill('Browser payroll');
  await page.getByLabel('Partner batch ID').fill('browser-payroll-01');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create request', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Browser payroll' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Approve funding' })).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Approve funding' }).click();
  await dialog.getByRole('button', { name: 'Run sandbox transfer' }).click();
  await expect(dialog.getByText('Reconciled', { exact: true })).toBeVisible({ timeout: 15000 });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Export evidence' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/-evidence.json$/);
  await dialog.getByRole('button', { name: 'Simulate payout' }).click();
  await expect(
    dialog.getByText('Sandbox payout completed. Funds and batch are reconciled.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.metric-card').first()).toContainText('$5,000.00');
  await page.screenshot({ path: 'test-results/flux-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('policy hard limit is visible and delayed delivery recovers without a second transfer', async ({
  page,
}) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'New funding request' }).click();
  await page.getByLabel('Batch name').fill('Delayed supplier batch');
  await page.getByLabel('Partner batch ID').fill('browser-delay-01');
  await page.getByLabel('Payout amount · USDT0').fill('30000');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create request', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'maximum single transfer',
  );
  await page.getByLabel('Payout amount · USDT0').fill('250');
  await page.getByLabel('Sandbox scenario').selectOption('delayed');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create request', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Approve funding' }).click();
  await dialog.getByRole('button', { name: 'Run sandbox transfer' }).click();
  await expect(dialog.getByText('Needs attention', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await dialog.getByRole('button', { name: 'Retry observation' }).click();
  await expect(dialog.getByText('Needs attention', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Release sandbox delay' }).click();
  await expect(dialog.getByText('Reconciled', { exact: true })).toBeVisible();
});

test('mobile navigation, policy persistence, audit and integration pages work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/flux-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Treasury policy', exact: true }).click();
  await page.getByRole('button', { name: 'Pause funding', exact: true }).click();
  await expect(
    page.getByText('New funding is paused. Submitted transfers are still being observed.'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('New funding is paused. Submitted transfers are still being observed.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Treasury policy', exact: true }).click();
  await page.getByRole('button', { name: 'Resume funding', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Activity & audit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Audit trail' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Integrations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partner API' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
