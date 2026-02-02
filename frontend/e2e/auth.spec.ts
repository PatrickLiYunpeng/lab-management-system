import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /登录/i })).toBeVisible();
    await expect(page.getByPlaceholder(/用户名/i)).toBeVisible();
    await expect(page.getByPlaceholder(/密码/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/用户名/i).fill('invalid_user');
    await page.getByPlaceholder(/密码/i).fill('wrong_password');
    await page.getByRole('button', { name: /登录/i }).click();
    
    // Should show error message
    await expect(page.getByText(/用户名或密码错误|登录失败/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // This test requires a running backend with a test user
    await page.goto('/login');
    await page.getByPlaceholder(/用户名/i).fill('admin');
    await page.getByPlaceholder(/密码/i).fill('admin123');
    await page.getByRole('button', { name: /登录/i }).click();
    
    // Should redirect to dashboard on success
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
