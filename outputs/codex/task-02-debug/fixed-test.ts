import { test, expect } from '@playwright/test';

test('search returns results', async ({ page }) => {
  await page.goto('https://example.com/search');
  await page.fill('input[name="q"]', 'AI agents');
  await page.click('button[type="submit"]');

  const results = page.locator('.result-item');
  await expect(results).toHaveCountGreaterThan(0);
  await expect(results.first()).toContainText('AI');
});

/*
The bug was a race after submitting the search: .all() snapshots the current
matching elements immediately, so it can run before the results have rendered.
Using Playwright's auto-retrying locator assertions waits for the UI to reach
the expected state instead of adding a brittle sleep.
*/
