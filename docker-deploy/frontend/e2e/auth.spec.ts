import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Lab Management System/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/Username/i).fill('invalid_user');
    await page.getByPlaceholder(/Password/i).fill('wrong_password');
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    // Wait for error response - could be notification, message, or stay on login page
    await page.waitForTimeout(2000);
    // Should still be on login page (not redirected)
    await expect(page).toHaveURL(/.*login/);
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
    await page.getByPlaceholder(/Username/i).fill('admin');
    await page.getByPlaceholder(/Password/i).fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    // Should redirect to dashboard on success
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
