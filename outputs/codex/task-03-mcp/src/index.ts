#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const HN_API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const MAX_TOP_STORIES = 500;

type HnItemType = "job" | "story" | "comment" | "poll" | "pollopt";

interface HnItem {
  id: number;
  deleted?: boolean;
  type?: HnItemType;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

interface HnUser {
  id: string;
  created?: number;
  karma?: number;
  about?: string;
  submitted?: number[];
}

interface TopStory {
  id: number;
  title: string;
  url: string | null;
  score: number;
}

class HnApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HnApiError";
  }
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const url = `${HN_API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new HnApiError(`Network failure while fetching ${url}: ${message}`);
  }

  if (!response.ok) {
    throw new HnApiError(
      `Hacker News API request failed for ${url}: ${response.status} ${response.statusText}`,
    );
  }

  try {
    return (await response.json()) as T | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new HnApiError(`Invalid JSON from Hacker News API for ${url}: ${message}`);
  }
}

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new HnApiError(`${label} must be a positive integer.`);
  }
}

async function getStoryById(id: number): Promise<HnItem> {
  validatePositiveInteger(id, "id");

  const item = await getItemById(id);
  if (item.type !== "story") {
    throw new HnApiError(`Hacker News item ${id} is a ${item.type ?? "unknown item"}, not a story.`);
  }

  return item;
}

async function getItemById(id: number): Promise<HnItem> {
  validatePositiveInteger(id, "id");

  const item = await fetchJson<HnItem>(`/item/${id}.json`);
  if (!item) {
    throw new HnApiError(`No Hacker News item found for id ${id}.`);
  }

  return item;
}

const server = new McpServer({
  name: "hacker-news-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "get_top_stories",
  {
    title: "Get Top Stories",
    description: "Return the top N Hacker News stories with id, title, url, and score.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .positive()
        .max(MAX_TOP_STORIES)
        .describe("Number of top stories to return. Maximum is 500."),
    },
  },
  async ({ limit }) => {
    try {
      const storyIds = await fetchJson<number[]>("/topstories.json");
      if (!storyIds) {
        throw new HnApiError("Hacker News API returned no top stories.");
      }

      const output: TopStory[] = [];
      const batchSize = 25;

      for (let index = 0; index < storyIds.length && output.length < limit; index += batchSize) {
        const batchIds = storyIds.slice(index, index + batchSize);
        const items = await Promise.all(batchIds.map((id) => getItemById(id)));
        const stories = items.filter((item) => item.type === "story");

        output.push(
          ...stories.map((story) => ({
            id: story.id,
            title: story.title ?? "",
            url: story.url ?? null,
            score: story.score ?? 0,
          })),
        );
      }

      const limitedOutput = output.slice(0, limit);

      if (limitedOutput.length === 0) {
        throw new HnApiError("Hacker News API returned no story items from the top stories feed.");
      }

      return jsonResult(limitedOutput);
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "get_story",
  {
    title: "Get Story",
    description: "Return full Hacker News story details for a story id.",
    inputSchema: {
      id: z.number().int().positive().describe("Hacker News story id."),
    },
  },
  async ({ id }) => {
    try {
      const story = await getStoryById(id);
      return jsonResult(story);
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "get_user",
  {
    title: "Get User",
    description: "Return a Hacker News user profile by case-sensitive username.",
    inputSchema: {
      username: z.string().min(1).describe("Case-sensitive Hacker News username."),
    },
  },
  async ({ username }) => {
    try {
      const user = await fetchJson<HnUser>(`/user/${encodeURIComponent(username)}.json`);
      if (!user) {
        throw new HnApiError(`No Hacker News user found for username "${username}".`);
      }

      return jsonResult(user);
    } catch (error) {
      return errorResult(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
