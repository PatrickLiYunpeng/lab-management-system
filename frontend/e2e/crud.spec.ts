import { test, expect } from '@playwright/test';

// Tests run serially with shared auth state from setup project
test.describe.configure({ mode: 'serial' });

test.describe('Sites CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
  });

  test('should display sites list', async ({ page }) => {
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
  });

  test('should open create site modal', async ({ page }) => {
    await expect(page.locator('.ant-table')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /新增|Add/i }).click();
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Work Orders CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work-orders');
    await page.waitForLoadState('networkidle');
  });

  test('should display work orders list', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新增|Add/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('should have filter options', async ({ page }) => {
    await expect(page.locator('.ant-select').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open create work order modal', async ({ page }) => {
    await page.getByRole('button', { name: /新增|Add/i }).click();
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/equipment');
    await page.waitForLoadState('networkidle');
  });

  test('should display equipment list', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新增|Add/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('should have tabs for list and gantt view', async ({ page }) => {
    await expect(page.locator('.ant-tabs')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Client & SLA Management', () => {
  test('should display clients page', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    // Check for table on clients page (use first() to avoid strict mode)
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 10000 });
  });
});
