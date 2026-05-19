import * as cheerio from 'cheerio';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import OpenAI from 'openai';

const HN = 'https://news.ycombinator.com/';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ARTICLE_CHARS = 12_000;
const TOP_N = 5;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 hn-digest-agent/0.1';

interface Story {
  rank: number;
  title: string;
  url: string | null;
  points: number;
  is_ask_hn: boolean;
}

interface DigestItem {
  title: string;
  hnUrl: string;
  sourceUrl: string;
  points: number;
  summary: string;
}

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeTopStories(): Promise<Story[]> {
  const res = await fetchWithTimeout(HN);
  if (!res.ok) throw new Error(`HN responded ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const stories: Story[] = [];
  $('tr.athing').slice(0, TOP_N).each((_, row) => {
    const $row = $(row);
    const rank = parseInt($row.find('.rank').text()) || stories.length + 1;
    const $a = $row.find('.titleline > a').first();
    const title = $a.text().trim();
    const rawHref = $a.attr('href') || '';
    const isInternal = rawHref.startsWith('item?id=');
    const url = rawHref ? (isInternal ? null : new URL(rawHref, HN).toString()) : null;
    const subtext = $row.next().find('.subtext');
    const points = parseInt(subtext.find('.score').text()) || 0;
    stories.push({ rank, title, url, points, is_ask_hn: isInternal });
  });
  return stories;
}

async function extractArticle(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
    throw new Error(`unsupported content-type: ${ct}`);
  }
  const html = await res.text();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => {}); // swallow jsdom parse warnings
  const dom = new JSDOM(html, { url, virtualConsole });
  const parsed = new Readability(dom.window.document).parse();
  const text = parsed?.textContent?.trim();
  if (!text || text.length < 200) return null;
  return text.slice(0, MAX_ARTICLE_CHARS);
}

async function summarize(client: OpenAI, title: string, text: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 160,
    messages: [
      {
        role: 'system',
        content: 'You summarize articles in exactly two sentences. Be specific, no filler.',
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nArticle:\n${text}\n\nWrite a 2-sentence summary.`,
      },
    ],
  });
  const out = response.choices[0]?.message?.content?.trim();
  if (!out) throw new Error('empty summary');
  return out;
}

function renderMarkdown(items: DigestItem[], failures: { title: string; reason: string }[]): string {
  const lines: string[] = ['# Hacker News digest', ''];
  if (items.length === 0) {
    lines.push('_No articles could be summarized this run._', '');
  }
  for (const it of items) {
    lines.push(`## ${it.title}`, '');
    lines.push(`- **Points:** ${it.points}`);
    lines.push(`- **Source:** ${it.sourceUrl}`);
    lines.push(`- **HN:** ${it.hnUrl}`);
    lines.push('', it.summary, '');
  }
  if (failures.length > 0) {
    lines.push('---', '', '### Skipped', '');
    for (const f of failures) lines.push(`- ${f.title} — ${f.reason}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set');
    process.exit(2);
  }
  const client = new OpenAI({ apiKey });

  const stories = await scrapeTopStories();
  const items: DigestItem[] = [];
  const failures: { title: string; reason: string }[] = [];

  for (const story of stories) {
    if (!story.url) {
      failures.push({ title: story.title, reason: 'Ask HN / no external URL' });
      continue;
    }
    try {
      const text = await extractArticle(story.url);
      if (!text) {
        failures.push({ title: story.title, reason: 'no readable content' });
        continue;
      }
      const summary = await summarize(client, story.title, text);
      items.push({
        title: story.title,
        hnUrl: HN,
        sourceUrl: story.url,
        points: story.points,
        summary,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      failures.push({ title: story.title, reason });
    }
  }

  process.stdout.write(renderMarkdown(items, failures) + '\n');
}

main().catch((err) => {
  console.error('agent failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
