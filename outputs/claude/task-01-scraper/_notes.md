# Task 1 — Claude Opus 4.7 — notes

- **Time:** generated in-session (no per-task timer)
- **Attempts:** 1 (single pass, no follow-up needed)
- **What worked:** ran cleanly with `npm i playwright && node scraper.js` → 30 valid items, no nulls. Pulls `age` as the ISO timestamp on the `title` attr of `.age` (more parseable than "3h ago"). Adds an `is_ask_hn` flag and falls URL back to the HN discussion page — useful but slightly beyond spec.
- **What broke:** Ask HN posts were not on the live frontpage during my test run, so the branch is exercised by code review rather than empirical hit.
- **Subjective:** verbose for 60 LOC of logic — helper functions (`absolutize`, `parseIntOr`) feel like over-engineering for a one-off scraper. Would ship.
