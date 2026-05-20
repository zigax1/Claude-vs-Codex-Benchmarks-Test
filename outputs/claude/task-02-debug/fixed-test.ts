import { test, expect } from '@playwright/test';

test('search returns results', async ({ page }) => {
  await page.goto('https://example.com/search');
  await page.fill('input[name="q"]', 'AI agents');
  await page.click('button[type="submit"]');

  const results = page.locator('.result-item');
  await expect(results.first()).toBeVisible();
  await expect(results).not.toHaveCount(0);
  await expect(results.first()).toContainText('AI');
});

/*
Why it was flaky:
The original code called `page.locator('.result-item').all()` immediately after
`click()`, snapshotting the DOM before the results had rendered, then asserted
on a plain number (`results.length`), which `expect` does NOT auto-retry. The
fix replaces the snapshot+length pattern with Playwright's auto-retrying
locator assertions (`toBeVisible`, `not.toHaveCount(0)`, `toContainText`),
which poll the DOM until they pass or the test timeout is hit, eliminating the
render race.
*/
