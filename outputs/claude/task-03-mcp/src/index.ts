#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

class HnError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HnError";
  }
}

async function hnFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${HN_BASE}${path}`);
  } catch (err) {
    throw new HnError(0, `network error contacting HN: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new HnError(res.status, `HN responded ${res.status} for ${path}`);
  const data = await res.json();
  if (data === null) throw new HnError(404, `${path} returned null (not found)`);
  return data as T;
}

interface Story {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  text?: string;
  kids?: number[];
  descendants?: number;
  dead?: boolean;
  deleted?: boolean;
}

interface User {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

function asText(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function asError(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

const server = new McpServer({ name: "hn-mcp", version: "0.1.0" });

server.registerTool(
  "get_top_stories",
  {
    description: "Returns the top N Hacker News stories with id, title, url, and score.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .describe("How many top stories to return (1-500)"),
    },
  },
  async ({ limit }) => {
    try {
      const ids = await hnFetch<number[]>("/topstories.json");
      const slice = ids.slice(0, limit);
      const stories = await Promise.all(
        slice.map(async (id) => {
          try {
            const item = await hnFetch<Story>(`/item/${id}.json`);
            return {
              id: item.id,
              title: item.title ?? null,
              url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
              score: item.score ?? 0,
            };
          } catch (err) {
            return { id, error: err instanceof Error ? err.message : "fetch failed" };
          }
        })
      );
      return asText(stories);
    } catch (err) {
      return asError(`get_top_stories failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

server.registerTool(
  "get_story",
  {
    description: "Returns the full details of a single story (or any HN item) by id.",
    inputSchema: {
      id: z.number().int().positive().describe("HN item id"),
    },
  },
  async ({ id }) => {
    try {
      const story = await hnFetch<Story>(`/item/${id}.json`);
      return asText(story);
    } catch (err) {
      if (err instanceof HnError && err.status === 404) {
        return asError(`Story ${id} not found.`);
      }
      return asError(`get_story failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

server.registerTool(
  "get_user",
  {
    description: "Returns a Hacker News user's profile (id, karma, created, about, submitted).",
    inputSchema: {
      username: z.string().min(1).describe("HN username (case-sensitive)"),
    },
  },
  async ({ username }) => {
    try {
      const user = await hnFetch<User>(`/user/${encodeURIComponent(username)}.json`);
      return asText(user);
    } catch (err) {
      if (err instanceof HnError && err.status === 404) {
        return asError(`User "${username}" not found.`);
      }
      return asError(`get_user failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
