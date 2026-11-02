const { test, expect } = require('@playwright/test');

test('user can add a task and see it in the list', async ({ page }) => {
  // Use a unique title, because all tests share the same in-memory server.
  const title = `Study for the exam ${Date.now()}`;
  await page.goto('/');

  await page.getByPlaceholder('What do you need to study?').fill(title);
  await page.locator('select[name="priority"]').selectOption('high');
  await page.getByPlaceholder('Hours').fill('2');
  await page.getByRole('button', { name: 'Add' }).click();

  const task = page.locator('#tasks li', { hasText: title });
  await expect(task).toBeVisible();
  await expect(task).toContainText('high · no deadline');

  // The form is cleared after adding, so the user can add the next task.
  await expect(page.getByPlaceholder('What do you need to study?')).toHaveValue('');
});
