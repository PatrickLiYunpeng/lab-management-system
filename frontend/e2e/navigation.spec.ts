import { test, expect } from '@playwright/test';

// Tests run serially with shared auth state from setup project
test.describe.configure({ mode: 'serial' });

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display sidebar navigation', async ({ page }) => {
    await expect(page.getByRole('menuitem', { name: /仪表板/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('menuitem', { name: /工单管理/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /人员管理/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /设备管理/ })).toBeVisible();
  });

  test('should navigate to sites page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /地址管理/ }).click();
    await expect(page).toHaveURL(/.*locations/);
  });

  test('should navigate to laboratories page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /地址管理/ }).click();
    await expect(page).toHaveURL(/.*locations/);
  });

  test('should navigate to equipment page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /设备管理/ }).click();
    await expect(page).toHaveURL(/.*equipment/);
  });

  test('should navigate to work orders page', async ({ page }) => {
    await page.getByRole('menuitem', { name: /工单管理/ }).click();
    await expect(page).toHaveURL(/.*work-orders/);
  });
});

test.describe('Dashboard', () => {
  test('should display dashboard metrics', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Check for dashboard heading
    await expect(page.getByRole('heading', { name: '实时仪表板' })).toBeVisible({ timeout: 10000 });
  });

  test('should have dashboard tabs', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ant-tabs').first()).toBeVisible({ timeout: 10000 });
  });
});
