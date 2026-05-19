// scraper.js — top 30 Hacker News stories to JSON
// usage: npm i playwright && node scraper.js
//
// Ask HN / Show HN / job posts often link to the HN item itself; in those
// cases the row's titleline <a> already points at "item?id=...". We normalize
// those into absolute https URLs so consumers always get a usable href, and
// flag null only when no anchor exists at all (extremely rare).

const { chromium } = require('playwright');

const HN = 'https://news.ycombinator.com/';

function absolutize(href) {
  if (!href) return null;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  return new URL(href, HN).toString();
}

function parseIntOr(value, fallback) {
  const n = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function scrape() {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.goto(HN, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('tr.athing', { timeout: 15_000 });

    const stories = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.athing')).slice(0, 30);
      return rows.map((row) => {
        const rankText = (row.querySelector('.rank')?.textContent || '').trim();
        const titleAnchor = row.querySelector('.titleline > a');
        const title = titleAnchor?.textContent?.trim() || null;
        const rawHref = titleAnchor?.getAttribute('href') || null;

        const subtext = row.nextElementSibling?.querySelector('.subtext');
        const scoreText = subtext?.querySelector('.score')?.textContent || '';
        const author = subtext?.querySelector('.hnuser')?.textContent?.trim() || null;
        const ageEl = subtext?.querySelector('.age');
        const age = ageEl?.getAttribute('title')?.split(' ')[0] || ageEl?.textContent?.trim() || null;

        // The comments anchor is the last <a> in subtext. For job posts it can be missing.
        const links = subtext ? Array.from(subtext.querySelectorAll('a')) : [];
        const commentsAnchor = links[links.length - 1];
        const commentsText = commentsAnchor?.textContent?.trim() || '';

        return {
          rank: rankText,
          title,
          rawHref,
          scoreText,
          author,
          age,
          commentsText,
          commentsHref: commentsAnchor?.getAttribute('href') || null,
        };
      });
    });

    return stories.map((s) => {
      const isHnInternal = s.rawHref && s.rawHref.startsWith('item?id=');
      const url = absolutize(s.rawHref);
      const commentsCount = /comment/.test(s.commentsText) ? parseIntOr(s.commentsText, 0) : 0;
      return {
        rank: parseIntOr(s.rank, null),
        title: s.title,
        url, // Ask HN / job posts: URL points at the HN discussion page
        is_ask_hn: !!isHnInternal,
        points: parseIntOr(s.scoreText, 0), // job posts have no score → 0
        author: s.author, // job posts have no author → null
        comments_count: commentsCount,
        age: s.age,
      };
    });
  } finally {
    await browser.close();
  }
}

scrape()
  .then((rows) => {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
  })
  .catch((err) => {
    console.error('scrape failed:', err.message);
    process.exit(1);
  });
