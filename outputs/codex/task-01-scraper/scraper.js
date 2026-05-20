const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto("https://news.ycombinator.com/", {
      waitUntil: "domcontentloaded",
    });

    const stories = await page.$$eval("tr.athing", (rows) =>
      rows.slice(0, 30).map((row) => {
        const rankText = row.querySelector(".rank")?.textContent || "";
        const titleLink = row.querySelector(".titleline > a");
        const subtextRow = row.nextElementSibling;
        const scoreText =
          subtextRow?.querySelector(".score")?.textContent || "0 points";
        const author =
          subtextRow?.querySelector(".hnuser")?.textContent?.trim() || "";
        const age =
          subtextRow?.querySelector(".age")?.textContent?.trim() || "";
        const subtextLinks = Array.from(
          subtextRow?.querySelectorAll("a") || []
        );
        const commentsLink = subtextLinks.find((link) =>
          /comments?|discuss/i.test(link.textContent || "")
        );
        const commentsText = commentsLink?.textContent || "0 comments";
        const href = titleLink?.getAttribute("href") || "";

        return {
          rank: Number.parseInt(rankText, 10),
          title: titleLink?.textContent?.trim() || "",
          url:
            href && !href.startsWith("item?id=")
              ? new URL(href, window.location.href).href
              : null,
          points: Number.parseInt(scoreText, 10) || 0,
          author,
          comments_count: Number.parseInt(commentsText, 10) || 0,
          age,
        };
      })
    );

    process.stdout.write(`${JSON.stringify(stories, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
