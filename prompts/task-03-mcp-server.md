# Task 3 — Write an MCP server

**Time budget:** ~40 min

## Prompt (paste verbatim into both Claude and Codex)

Build an MCP server in TypeScript using `@modelcontextprotocol/sdk`. It should wrap the public Hacker News Firebase API (https://github.com/HackerNews/API) and expose 3 tools:

- `get_top_stories(limit: number)` — returns top N stories with id, title, url, score
- `get_story(id: number)` — returns full story details
- `get_user(username: string)` — returns user profile

Use **stdio** transport. Include proper TypeScript types, error handling, and a `package.json`. Should run with `npm start`. Provide all files.

## Pass criteria

- Code compiles (or runs via tsx)
- Uses MCP SDK correctly with stdio
- All 3 tools registered with proper input schemas
- Error handling for invalid IDs / users / network failures
- README with install instructions
