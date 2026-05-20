# Hacker News MCP Server

An MCP server in TypeScript that wraps the public Hacker News Firebase API using stdio transport.

## Tools

- `get_top_stories(limit: number)` returns the top N stories with `id`, `title`, `url`, and `score`.
- `get_story(id: number)` returns full details for a Hacker News story.
- `get_user(username: string)` returns a Hacker News user profile.

## Install

```sh
npm install
```

## Run

```sh
npm start
```

The server communicates over stdio and is intended to be launched by an MCP client.

## Development

Type-check the server:

```sh
npm run build
```

## Notes

- The Hacker News API base URL is `https://hacker-news.firebaseio.com/v0`.
- `get_top_stories` accepts a maximum limit of `500`, matching the API's top stories endpoint.
- Tool calls return MCP error results for missing stories, non-story items, missing users, invalid input, API errors, and network failures.
