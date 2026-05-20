# Task 5 — Claude Opus 4.7 — notes

- **Time:** generated in-session
- **Attempts:** 1
- **What worked:** `npx tsc --noEmit` clean. Bogus-key smoke test (`OPENAI_API_KEY=sk-bogus npx tsx src/index.ts`) caught every per-article OpenAI 401, accumulated them in a `Skipped` section, and still produced valid markdown. Uses `VirtualConsole` to suppress jsdom CSS parser warnings so stderr stays clean. Has `FETCH_TIMEOUT_MS` (15s), `MAX_ARTICLE_CHARS` cap (12k), and a content-type guard before passing to Readability.
- **What broke:** nothing observed.
- **Subjective:** tighter than Codex's — ~165 LOC, single file, every knob is a named constant at the top. Would ship.
