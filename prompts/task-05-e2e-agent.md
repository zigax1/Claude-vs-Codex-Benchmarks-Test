# Task 5 — End-to-end agent (HN digest)

**Time budget:** ~50 min

## Prompt (paste verbatim into both Claude and Codex)

Build an agent in Node.js/TypeScript that does the following pipeline:

1. Scrape the top 5 stories from `https://news.ycombinator.com/` (titles + URLs)
2. For each story with a URL, fetch the article and extract the main text content (use `@mozilla/readability` or similar)
3. Summarize each article in 2 sentences using OpenAI's `gpt-4o-mini`
4. Output a final markdown digest to stdout with: HN title, source URL, 2-sentence summary, points

Handle failures gracefully — if any article fails to fetch or summarize, skip it and continue. Output should still be valid markdown. Use `OPENAI_API_KEY` from env. Single file or small project. Provide all files and a run command.

## Pass criteria

- Runs end-to-end with one command
- Produces valid markdown
- Errors on individual articles don't crash the agent
- Output is actually readable
- No infinite loops on tool retries
