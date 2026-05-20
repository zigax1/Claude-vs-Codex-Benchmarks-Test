# Task 1 — Codex (GPT-5.5) — notes

- **Time:** ~26 seconds (per Codex CLI status)
- **Attempts:** 1
- **What worked:** terser, more idiomatic Playwright (`page.$$eval` instead of `page.evaluate` + DOM API). When I installed playwright in the empty folder and ran it, output was clean: 30 valid items, no nulls. Comments-link regex (`/comments?|discuss/i`) is robust to job-post variants.
- **What broke:** Codex declined to install playwright itself ("would add files outside the approved single-file slice"), so it could not self-verify; it provided QA notes for the user to run. `age` is the raw textContent ("3 hours ago") rather than a parseable timestamp — readable but less downstream-friendly than ISO.
- **Subjective:** cleaner code than Claude's, sticks tighter to the spec (`url: null` for Ask HN). Would ship.
