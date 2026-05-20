# Results — claude-opus-4-7 vs gpt-5.5

_Run on 2026-05-19 by @ZigaSetar. 5 tasks, 1 run(s) per model._

![Chart](chart.png)

## Headline

- **Quality wins:** Claude 4 · Codex 1
- **Total cost:** Claude **$0.30** · Codex **$0.08** (Codex was 73% cheaper)

## Per-task scores

| # | Task | Claude quality | Codex quality | Claude cost | Codex cost | Winner |
|---|------|---------------:|--------------:|------------:|-----------:|:------:|
| 1 | Build HN scraper | 8.75 | 8.60 | $0.04 | $0.0057 | Claude |
| 2 | Debug flaky test | 9.60 | 5.05 | $0.0093 | $0.0019 | Claude |
| 3 | Write MCP server | 9.60 | 9.75 | $0.05 | $0.02 | Codex |
| 4 | Refactor TS module | 9.45 | 6.40 | $0.13 | $0.04 | Claude |
| 5 | E2E agent | 9.60 | 8.60 | $0.07 | $0.02 | Claude |

## Per-task detail

### Task 1 — Build HN scraper
_Claude wins_

| Model | Correctness (60%) | Code quality (25%) | Edge cases (15%) | Quality | Cost | Time (min) | Tokens (in/out) |
|------|------------------:|-------------------:|-----------------:|--------:|-----:|-----------:|:----------------|
| Claude | 9 | 8 | 9 | 8.75 | $0.04 | None | 238 / 1407 |
| Codex | 9 | 8 | 8 | 8.60 | $0.0057 | None | 176 / 546 |

**Claude:** Ran cleanly, returned 30 valid items, 0 nulls. Extracts age as ISO timestamp via the title attribute on .age (more parseable downstream than Codex's '3 hours ago' string). Adds an is_ask_hn flag and falls back URL to the HN discussion page — useful but slightly beyond spec.

**Codex:** Cleaner, more idiomatic Playwright (uses page.$$eval, no helper functions). 30 valid items, 0 nulls when run. Returns url:null for Ask HN per spec — more literal interpretation. Did not install playwright itself ('would add files outside the approved single-file slice') so did not self-verify; verified externally.

### Task 2 — Debug flaky test
_Claude wins_

| Model | Correctness (60%) | Code quality (25%) | Edge cases (15%) | Quality | Cost | Time (min) | Tokens (in/out) |
|------|------------------:|-------------------:|-----------------:|--------:|-----:|-----------:|:----------------|
| Claude | 10 | 9 | 9 | 9.60 | $0.0093 | None | 344 / 305 |
| Codex | 4 | 7 | 6 | 5.05 | $0.0019 | None | 255 / 157 |

**Claude:** Correct diagnosis of the .all() snapshot vs auto-retry race. Fix uses real Playwright matchers (toBeVisible + not.toHaveCount(0) + toContainText) — all of which exist and auto-retry. Slightly redundant assertions but safe.

**Codex:** Diagnosis is correct (race after click). But the fix calls await expect(results).toHaveCountGreaterThan(0) — that matcher does NOT exist in @playwright/test. Confirmed by grepping the installed types: only toHaveCount(n) exists. The fix would throw 'toHaveCountGreaterThan is not a function' at runtime. Hallucinated API.

### Task 3 — Write MCP server
_Codex wins_

| Model | Correctness (60%) | Code quality (25%) | Edge cases (15%) | Quality | Cost | Time (min) | Tokens (in/out) |
|------|------------------:|-------------------:|-----------------:|--------:|-----:|-----------:|:----------------|
| Claude | 10 | 9 | 9 | 9.60 | $0.05 | None | 279 / 2121 |
| Codex | 10 | 9 | 10 | 9.75 | $0.02 | None | 207 / 1919 |

**Claude:** tsc --noEmit clean. stdio handshake works: initialize + tools/list both return correct payloads. All 3 tools register with zod input schemas. HnError class covers HTTP and 404. URL falls back to the HN discussion page for Ask HN / no-link items.

**Codex:** tsc --noEmit clean. Same stdio handshake passes. Slightly more thorough: separates network/HTTP/JSON-parse failure modes in fetchJson, has fuller HnItem type (covers all fields including parts/dead/deleted/parent), distinguishes HnItemType union. 230 LOC vs Claude's ~140 — longer but better-typed.

### Task 4 — Refactor TS module
_Claude wins_

| Model | Correctness (60%) | Code quality (25%) | Edge cases (15%) | Quality | Cost | Time (min) | Tokens (in/out) |
|------|------------------:|-------------------:|-----------------:|--------:|-----:|-----------:|:----------------|
| Claude | 10 | 9 | 8 | 9.45 | $0.13 | None | 3355 / 4454 |
| Codex | 6 | 7 | 7 | 6.40 | $0.04 | None | 2485 / 3226 |

**Claude:** tsc --noEmit clean (exit 0). Behavior preserved file-by-file. 11 files, all <70 LOC, modular layout matches spec (routes/services/middleware/db/types). Includes package.json + tsconfig.json. JwtPayload cast uses 'as unknown as JwtPayload' to satisfy strict mode.

**Codex:** More granular split (15 files — db queries in db/users.ts + db/projects.ts, routes/me.ts as its own router, types split 3 ways). However: omits package.json + tsconfig.json, and tsc fails with 4 strict-mode errors (3 unsafe casts to AuthenticatedRequest in routes/projects.ts, 1 in services/authService.ts). Code would not compile under the same strict tsconfig Claude used. Verification log in _verification/typecheck.log.

### Task 5 — E2E agent
_Claude wins_

| Model | Correctness (60%) | Code quality (25%) | Edge cases (15%) | Quality | Cost | Time (min) | Tokens (in/out) |
|------|------------------:|-------------------:|-----------------:|--------:|-----:|-----------:|:----------------|
| Claude | 10 | 9 | 9 | 9.60 | $0.07 | None | 331 / 2634 |
| Codex | 9 | 8 | 8 | 8.60 | $0.02 | None | 245 / 1621 |

**Claude:** tsc --noEmit clean. Bogus-key smoke test: agent caught every per-article OpenAI 401, produced valid markdown with a Skipped section. Suppresses jsdom CSS parser warnings via VirtualConsole. Has FETCH_TIMEOUT_MS, MAX_ARTICLE_CHARS cap, content-type guard.

**Codex:** tsc --noEmit clean. Stdout discipline is correct (markdown only) — initial fear of pollution was the mixed 2>&1 in my smoke test. The 344KB of jsdom CSS noise is on stderr, not stdout, so redirecting stdout to a file gives a clean digest. Has AbortController + ARTICLE_TIMEOUT_MS. Does NOT suppress jsdom warnings (messy stderr in production) — Claude does.

## Pricing assumptions

Token counts come from `tools/count_tokens.py` (see source). Costs use the per-million-token rates encoded at the top of that file. Verify against:

- Anthropic: <https://www.anthropic.com/pricing>
- OpenAI: <https://openai.com/api/pricing>

If pricing has changed since this report was generated, recompute by editing the constants and re-running `python tools/render_report.py`.

## Reproduce

```bash
# Paste the same prompts into Claude and Codex; save outputs under outputs/{claude,codex}/
python tools/count_tokens.py prompts/task-01-scraper.md outputs/claude/task-01-scraper/scraper.js claude-opus-4-7
python chart.py
python tools/render_report.py
```
