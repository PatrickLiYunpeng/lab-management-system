import { test, expect } from '@playwright/test';

test.describe('Task Material Selection', () => {
  test('should load materials in task creation modal', async ({ page }) => {
    // Navigate to work orders page
    await page.goto('/work-orders');
    await page.waitForLoadState('networkidle');
    
    // Wait for the table to load with data-testid
    await expect(page.locator('[data-testid="work-orders-table"]')).toBeVisible({ timeout: 10000 });
    
    // Wait for actual data rows to appear (skip hidden measure row)
    const dataRow = page.locator('.ant-table-tbody tr.ant-table-row').first();
    await expect(dataRow).toBeVisible({ timeout: 10000 });
    
    // Click the expand button in the first data row
    const expandButton = dataRow.locator('button').first();
    await expect(expandButton).toBeVisible({ timeout: 5000 });
    await expandButton.click();
    
    // Wait for the expanded content (SubTaskManager) to render
    await page.waitForTimeout(1000);
    
    // Find and click the "新增任务" (Add Task) button in the expanded row
    const addTaskButton = page.getByRole('button', { name: '新增任务' });
    await expect(addTaskButton).toBeVisible({ timeout: 10000 });
    await addTaskButton.click();
    
    // Wait for TaskModal to appear
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
    
    // Wait for materials to load
    await page.waitForTimeout(2000);
    
    // Check for the material loading status message
    const materialStatus = page.locator('text=/已加载.*种可消耗材料/');
    await expect(materialStatus).toBeVisible({ timeout: 10000 });
    
    // Get the text to verify materials were loaded
    const statusText = await materialStatus.textContent();
    console.log('Material status:', statusText);
    
    // Verify that at least some materials were loaded (not 0)
    expect(statusText).not.toContain('已加载 0 种');
    
    // Click on "添加材料消耗" button to add a consumption row
    const addMaterialButton = page.getByRole('button', { name: /添加材料消耗/i });
    await expect(addMaterialButton).toBeVisible({ timeout: 5000 });
    await addMaterialButton.click();
    
    // Wait for the row to appear
    await page.waitForTimeout(500);
    
    // Find the material Select dropdown and click to open it
    const materialSelect = page.locator('.ant-modal .ant-select').filter({ hasText: /选择材料|加载材料|暂无/ }).first();
    await expect(materialSelect).toBeVisible({ timeout: 5000 });
    await materialSelect.click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(500);
    
    // Check if dropdown has options
    const dropdownOptions = page.locator('.ant-select-dropdown .ant-select-item-option');
    const optionCount = await dropdownOptions.count();
    console.log('Dropdown option count:', optionCount);
    
    // Verify there are options in the dropdown
    expect(optionCount).toBeGreaterThan(0);
    
    // Log the first few options for debugging
    if (optionCount > 0) {
      const firstOption = await dropdownOptions.first().textContent();
      console.log('First option:', firstOption);
    }
    
    // Close the modal
    await page.keyboard.press('Escape');
  });
});
