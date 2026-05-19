# Task 1 — Build a scraper

**Time budget:** ~25 min

## Prompt (paste verbatim into both Claude and Codex)

Build a Node.js script using Playwright that scrapes `https://news.ycombinator.com/`. Extract the top 30 stories with these fields: `rank`, `title`, `url`, `points`, `author`, `comments_count`, `age`. Output a single JSON array to stdout. Single file, no build step. Handle the case where a story has no URL (Ask HN posts).

## Pass criteria

- Runs cleanly with `node scraper.js` after `npm i playwright`
- Output is valid JSON with 30 items
- No null/undefined for fields that should exist
- Ask HN posts handled gracefully (e.g. URL is null or the HN item URL)
