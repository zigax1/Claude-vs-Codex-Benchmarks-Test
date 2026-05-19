# HN digest agent

Scrapes the top 5 Hacker News stories, pulls the article body with `@mozilla/readability`, summarizes each in two sentences with OpenAI `gpt-4o-mini`, and prints a markdown digest to stdout.

## Run

```bash
npm install
export OPENAI_API_KEY=sk-...
npm start > digest.md
```

## Behavior on failure

Per-story failures (no URL, dead host, paywall, unreadable HTML, summarizer error) are caught and the story is moved into a `Skipped` section at the bottom of the digest. The agent always produces valid markdown and exits 0 unless the HN scrape itself fails.

## Knobs (top of `src/index.ts`)

- `TOP_N` — number of stories to summarize (default 5)
- `FETCH_TIMEOUT_MS` — per-request HTTP timeout (default 15s)
- `MAX_ARTICLE_CHARS` — article body cap before summarization (default 12 000 chars)
