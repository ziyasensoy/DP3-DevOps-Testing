const { test, expect } = require('@playwright/test');

// Create a task through the API, so each test only checks one thing in the browser.
async function createTask(request, title) {
  const res = await request.post('/api/tasks', { data: { title, priority: 'medium' } });
  expect(res.ok()).toBeTruthy();
}

test('user can mark a task as done', async ({ page, request }) => {
  const title = `Read chapter 3 ${Date.now()}`;
  await createTask(request, title);
  await page.goto('/');

  const task = page.locator('#tasks li', { hasText: title });
  await task.getByRole('checkbox').check();

  await expect(task).toHaveClass(/done/);
  await expect(task.getByRole('checkbox')).toBeChecked();
});

test('user can delete a task', async ({ page, request }) => {
  const title = `Old homework ${Date.now()}`;
  await createTask(request, title);
  await page.goto('/');

  const task = page.locator('#tasks li', { hasText: title });
  await expect(task).toBeVisible();
  await task.getByRole('button', { name: '✕' }).click();

  await expect(task).toHaveCount(0);
});
