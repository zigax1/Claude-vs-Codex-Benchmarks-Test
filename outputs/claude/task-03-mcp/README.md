# hn-mcp-server

An MCP server (stdio transport) that wraps the public Hacker News Firebase API.

## Tools

- `get_top_stories({ limit: number })` — top N stories with `id`, `title`, `url`, `score`. URL falls back to the HN discussion page when the item has no external link.
- `get_story({ id: number })` — full story/comment payload (any HN item id).
- `get_user({ username: string })` — user profile with `id`, `karma`, `created`, `about`, `submitted`.

## Run

```bash
npm install
npm start
```

The server speaks MCP over stdio, so wire it into a client (Claude Desktop, the MCP inspector, etc.) — it is not meant to be invoked interactively from a shell. With the MCP inspector:

```bash
npx @modelcontextprotocol/inspector npm start
```

## Error handling

- Network errors are reported via `isError: true` text content.
- 404s on missing stories / users return a clean message rather than throwing.
- HN's `topstories.json` returns up to 500 ids — `limit` is bounded to that range by the input schema.
