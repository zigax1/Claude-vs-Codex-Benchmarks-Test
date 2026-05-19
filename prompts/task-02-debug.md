# Task 2 — Debug a flaky Playwright test

**Time budget:** ~20 min

## Prompt (paste verbatim into both Claude and Codex)

The following Playwright test passes 60% of runs and fails 40%. Find the bug, fix it, and explain what was wrong. Return only the fixed code plus a 2-sentence explanation.

```typescript
import { test, expect } from '@playwright/test';

test('search returns results', async ({ page }) => {
  await page.goto('https://example.com/search');
  await page.fill('input[name="q"]', 'AI agents');
  await page.click('button[type="submit"]');
  const results = await page.locator('.result-item').all();
  expect(results.length).toBeGreaterThan(0);
  await expect(page.locator('.result-item').first()).toContainText('AI');
});
```

## Pass criteria

- Identifies the race: after `click`, the test calls `.all()` synchronously before results render
- Fix uses `waitFor` / `waitForSelector` / network idle / Playwright's auto-retrying `expect`
- Explanation is technically correct (mentions navigation/render race, not just "add sleep")
