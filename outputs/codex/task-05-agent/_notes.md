# Task 5 — Codex (GPT-5.5) — notes

- **Time:** Codex spent several minutes running its own QA (`npm install` → `npm run build` → `npm run digest` without key → dummy-key live run) per its CLI summary
- **Attempts:** 1, with internal self-verification
- **What worked:** `npx tsc --noEmit` clean. `npm run build` passes. **stdout discipline is correct** — the digest markdown writes to stdout (`process.stdout.write`), per-article failures go to stderr. With a bogus key, stdout was exactly 104 bytes of valid markdown ("# Hacker News Digest ... _No articles could be summarized._"). Has `AbortController` + `ARTICLE_TIMEOUT_MS` so it can't hang indefinitely.
- **What broke:** stderr emits ~344KB of jsdom CSS parser warnings per run because Codex did not install a `VirtualConsole` suppressor. Stdout (the actual digest) is unaffected, but the noise pollutes logs and would be annoying in production.
- **Subjective:** functionally correct end-to-end — markdown is clean, failures are caught. The jsdom log noise is a polish miss, not a behavioral bug. Would land with a one-line fix request.
