import { defineCommand } from "citty";
import consola from "consola";
import * as cheerio from "cheerio";
import { fetchPage, fetchWithBrowser } from "../pipeline/fetcher";
import { extract } from "../pipeline/extractor";
import { transform } from "../pipeline/transformer";
import { write } from "../pipeline/writer";
import { crawl } from "../crawl/crawler";
import { resolve } from "../pipeline/resolver";
import { getStrategy } from "../platforms/registry";

export const fetchCommand = defineCommand({
  meta: {
    name: "fetch",
    description: "Fetch a documentation URL and convert to Markdown",
  },
  args: {
    url: {
      type: "positional",
      description: "Documentation URL to convert",
      required: true,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output file path",
    },
    crawl: {
      type: "boolean",
      description: "Follow sidebar/nav links",
      default: false,
    },
    "max-depth": {
      type: "string",
      description: "Maximum crawl depth",
      default: "2",
    },
  },
  async run({ args }) {
    const url = args.url as string;
    const output = args.output as string | undefined;
    const shouldCrawl = args.crawl as boolean;
    const maxDepth = parseInt(args["max-depth"] as string, 10);
    const silent = !output;

    if (shouldCrawl) {
      if (!silent) consola.start(`Crawling from ${url} (max depth: ${maxDepth})...`);

      // Fetch first page to resolve platform and get navLinkSelector
      const firstHtml = await fetchPage(url);
      const $ = cheerio.load(firstHtml);
      const platformId = resolve(url, $);
      const strategy = getStrategy(platformId);
      const navLinkSelector = strategy.navLinkSelector();

      const pages = await crawl(url, {
        maxDepth,
        navLinkSelector,
        onPageFetched: (pageUrl, current, total) => {
          if (!silent) consola.info(`[${current}/${total}] ${pageUrl}`);
        },
      });

      if (!silent) consola.success(`Crawled ${pages.length} pages`);

      const sections: string[] = [];
      let firstTitle = "";
      let firstPlatform = "";

      for (const page of pages) {
        const { content, title, platform } = extract(page.html, page.url);
        if (!firstTitle) {
          firstTitle = title;
          firstPlatform = platform;
        }
        const md = transform(content);
        sections.push(`## ${title}\n\nSource: ${page.url}\n\n${md}`);
      }

      const markdown = sections.join("\n\n---\n\n");

      write(markdown, output, {
        sourceUrl: url,
        title: firstTitle,
        platform: firstPlatform,
      });

      if (!silent) consola.success(`Written to ${output}`);
    } else {
      if (!silent) consola.start(`Fetching ${url}...`);
      let html = await fetchPage(url);

      const { content, title, platform } = extract(html, url);

      // If content is suspiciously small, try Playwright
      if (content.trim().length < 200) {
        if (!silent) consola.warn("Content looks thin, retrying with browser...");
        try {
          html = await fetchWithBrowser(url);
          const result = extract(html, url);
          const markdown = transform(result.content);
          write(markdown, output, {
            sourceUrl: url,
            title: result.title || title,
            platform: result.platform,
          });
          if (!silent) consola.success(`Written to ${output}`);
          return;
        } catch (err: any) {
          if (err?.code === "ERR_PLAYWRIGHT_NOT_INSTALLED") {
            consola.warn(
              "This page may require a browser to render. Install Playwright:\n" +
                "  npm install -D playwright && npx playwright install chromium"
            );
          } else {
            consola.warn("Browser fallback failed, using static content.");
          }
        }
      }

      if (!silent) consola.success(`Extracted content (platform: ${platform})`);
      const markdown = transform(content);

      write(markdown, output, {
        sourceUrl: url,
        title,
        platform,
      });

      if (!silent) consola.success(`Written to ${output}`);
    }
  },
});
