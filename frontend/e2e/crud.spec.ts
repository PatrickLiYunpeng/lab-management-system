import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/用户名/i).fill('admin');
  await page.getByPlaceholder(/密码/i).fill('admin123');
  await page.getByRole('button', { name: /登录/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Sites CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/sites');
  });

  test('should display sites list', async ({ page }) => {
    await expect(page.getByText('新增站点')).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('should open create site modal', async ({ page }) => {
    await page.getByText('新增站点').click();
    await expect(page.getByText('站点名称')).toBeVisible();
    await expect(page.getByText('站点代码')).toBeVisible();
  });
});

test.describe('Work Orders CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/work-orders');
  });

  test('should display work orders list', async ({ page }) => {
    await expect(page.getByText('新增工单')).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('should have filter options', async ({ page }) => {
    // Check filter dropdowns exist
    await expect(page.getByPlaceholder(/搜索工单/i)).toBeVisible();
    await expect(page.getByText('实验室').first()).toBeVisible();
  });

  test('should open create work order modal', async ({ page }) => {
    await page.getByText('新增工单').click();
    await expect(page.getByText('工单标题')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/equipment');
  });

  test('should display equipment list', async ({ page }) => {
    await expect(page.getByText('新增设备')).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('should have tabs for list and gantt view', async ({ page }) => {
    await expect(page.getByText('设备列表')).toBeVisible();
    await expect(page.getByText('排程甘特图')).toBeVisible();
  });
});

test.describe('Client & SLA Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display clients page', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByText('新增客户')).toBeVisible();
  });

  test('should display SLA configuration page', async ({ page }) => {
    await page.goto('/client-slas');
    await expect(page.getByText('新增SLA配置')).toBeVisible();
  });

  test('should display source categories page', async ({ page }) => {
    await page.goto('/source-categories');
    await expect(page.getByText('新增来源类别')).toBeVisible();
  });
});
