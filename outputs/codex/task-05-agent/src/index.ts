import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import OpenAI from "openai";

type HnStory = {
  title: string;
  url: string | null;
  points: number | null;
};

type DigestItem = {
  title: string;
  url: string;
  points: number | null;
  summary: string;
};

const HN_URL = "https://news.ycombinator.com/";
const USER_AGENT =
  "hn-digest-agent/1.0 (+https://news.ycombinator.com/; Node.js)";
const MAX_STORIES = 5;
const ARTICLE_TIMEOUT_MS = 12_000;
const SUMMARY_MODEL = "gpt-4o-mini";
const MAX_ARTICLE_CHARS = 12_000;
const quietConsole = new VirtualConsole();

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const stories = await fetchTopStories();
  const digestItems: DigestItem[] = [];

  for (const story of stories) {
    if (!story.url) {
      console.error(`Skipping "${story.title}": story has no article URL.`);
      continue;
    }

    try {
      const articleText = await fetchReadableArticleText(story.url);
      const summary = await summarizeArticle(openai, story.title, articleText);

      digestItems.push({
        title: story.title,
        url: story.url,
        points: story.points,
        summary,
      });
    } catch (error) {
      console.error(`Skipping "${story.title}": ${formatError(error)}`);
    }
  }

  process.stdout.write(renderMarkdownDigest(digestItems));
}

async function fetchTopStories(): Promise<HnStory[]> {
  const response = await fetch(HN_URL, {
    headers: { "user-agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Hacker News: HTTP ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url: HN_URL, virtualConsole: quietConsole });
  const document = dom.window.document;

  return [...document.querySelectorAll<HTMLTableRowElement>("tr.athing")]
    .slice(0, MAX_STORIES)
    .map((row) => {
      const titleLink = row.querySelector<HTMLAnchorElement>(".titleline > a");
      const subtext = row.nextElementSibling;
      const scoreText =
        subtext?.querySelector<HTMLElement>(".score")?.textContent ?? null;

      return {
        title: titleLink?.textContent?.trim() ?? "Untitled HN story",
        url: normalizeStoryUrl(titleLink?.getAttribute("href")),
        points: parsePoints(scoreText),
      };
    });
}

async function fetchReadableArticleText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARTICLE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`article fetch returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`article is not HTML (${contentType || "unknown type"})`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url, virtualConsole: quietConsole });
    const article = new Readability(dom.window.document).parse();
    const text = article?.textContent?.replace(/\s+/g, " ").trim();

    if (!text) {
      throw new Error("readability could not extract article text");
    }

    return text.slice(0, MAX_ARTICLE_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

async function summarizeArticle(
  openai: OpenAI,
  title: string,
  text: string,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You write concise, accurate article summaries. Return exactly two readable sentences and no markdown.",
      },
      {
        role: "user",
        content: `HN title: ${title}\n\nArticle text:\n${text}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 180,
  });

  const summary = completion.choices[0]?.message.content?.trim();
  if (!summary) {
    throw new Error("OpenAI returned an empty summary");
  }

  return summary;
}

function renderMarkdownDigest(items: DigestItem[]): string {
  const lines = [
    "# Hacker News Digest",
    "",
    `Generated from the top ${MAX_STORIES} Hacker News stories.`,
    "",
  ];

  if (items.length === 0) {
    lines.push("_No articles could be summarized._", "");
    return lines.join("\n");
  }

  for (const item of items) {
    lines.push(
      `## ${escapeMarkdownHeading(item.title)}`,
      "",
      `- Source: ${item.url}`,
      `- Points: ${item.points ?? "unknown"}`,
      "",
      item.summary,
      "",
    );
  }

  return lines.join("\n");
}

function normalizeStoryUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  return new URL(rawUrl, HN_URL).toString();
}

function parsePoints(scoreText: string | null): number | null {
  if (!scoreText) {
    return null;
  }

  const match = scoreText.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function escapeMarkdownHeading(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/#/g, "\\#").trim();
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
