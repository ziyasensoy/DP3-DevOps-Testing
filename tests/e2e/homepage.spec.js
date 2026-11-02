const { test, expect } = require('@playwright/test');

test('homepage shows the title and the add task form', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Study Planner' })).toBeVisible();
  await expect(page.getByPlaceholder('What do you need to study?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
});
