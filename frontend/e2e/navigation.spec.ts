import { test, expect, Page } from '@playwright/test';

// Helper to login before tests
async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/用户名/i).fill('admin');
  await page.getByPlaceholder(/密码/i).fill('admin123');
  await page.getByRole('button', { name: /登录/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Check main navigation items exist
    await expect(page.getByText('仪表板')).toBeVisible();
    await expect(page.getByText('站点管理')).toBeVisible();
    await expect(page.getByText('实验室管理')).toBeVisible();
    await expect(page.getByText('人员管理')).toBeVisible();
    await expect(page.getByText('设备管理')).toBeVisible();
    await expect(page.getByText('工单管理')).toBeVisible();
  });

  test('should navigate to sites page', async ({ page }) => {
    await page.getByText('站点管理').click();
    await expect(page).toHaveURL(/.*sites/);
    await expect(page.getByText('新增站点')).toBeVisible();
  });

  test('should navigate to laboratories page', async ({ page }) => {
    await page.getByText('实验室管理').click();
    await expect(page).toHaveURL(/.*laboratories/);
  });

  test('should navigate to equipment page', async ({ page }) => {
    await page.getByText('设备管理').click();
    await expect(page).toHaveURL(/.*equipment/);
  });

  test('should navigate to work orders page', async ({ page }) => {
    await page.getByText('工单管理').click();
    await expect(page).toHaveURL(/.*work-orders/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for dashboard elements
    await expect(page.getByText(/实时视图|历史分析/i)).toBeVisible();
  });

  test('should toggle between realtime and historical views', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find and click toggle buttons if present
    const historicalTab = page.getByText('历史分析');
    if (await historicalTab.isVisible()) {
      await historicalTab.click();
      // Should show date range picker in historical view
      await expect(page.locator('.ant-picker')).toBeVisible();
    }
  });
});
