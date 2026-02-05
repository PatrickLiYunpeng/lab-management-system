import { test as setup, expect } from '@playwright/test';

const authFile = './e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login');
  
  // Fill login form
  await page.getByPlaceholder(/Username/i).fill('admin');
  await page.getByPlaceholder(/Password/i).fill('admin123');
  
  // Click sign in and wait for navigation
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Verify login was successful
  await expect(page.locator('.ant-layout-sider')).toBeVisible({ timeout: 10000 });
  
  // Save storage state (includes localStorage with auth token)
  await page.context().storageState({ path: authFile });
});
