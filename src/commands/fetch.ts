import { defineCommand } from "citty";
import { dirname } from "node:path";
import consola from "consola";
import * as cheerio from "cheerio";
import { fetchPage, fetchWithBrowser } from "../pipeline/fetcher";
import { extract } from "../pipeline/extractor";
import { transform } from "../pipeline/transformer";
import { write, writePages } from "../pipeline/writer";
import { crawl } from "../crawl/crawler";
import { resolve } from "../pipeline/resolver";
import { getStrategy } from "../platforms/registry";
import { slugFromUrl } from "../utils/url";
import {
  buildSourceManifest,
  writeSourceManifest,
  updateRootManifest,
} from "../pipeline/manifest";
import { extractSiteMeta } from "../pipeline/meta-extractor";

/**
 * Determine whether crawl output should go to a directory (one file per page)
 * or a single stitched file.
 */
function resolveOutputMode(
  output: string | undefined,
  shouldCrawl: boolean,
  name: string
): { mode: "single-file" | "directory"; outputPath: string | undefined; outputDir: string } {
  if (!shouldCrawl) {
    return { mode: "single-file", outputPath: output, outputDir: "" };
  }

  // Crawl + explicit .md output → single file (backward compat)
  if (output && output.endsWith(".md")) {
    return { mode: "single-file", outputPath: output, outputDir: "" };
  }

  // Crawl + explicit directory path
  if (output) {
    const dir = output.endsWith("/") ? output : output + "/";
    return { mode: "directory", outputPath: undefined, outputDir: dir };
  }

  // Crawl + no output → default directory
  return { mode: "directory", outputPath: undefined, outputDir: `.ai/docs/${name}/` };
}

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
      description: "Output file path or directory",
    },
    name: {
      type: "string",
      description: "Name for this source (auto-derived from hostname if omitted)",
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
    force: {
      type: "boolean",
      description: "Force rewrite all files, even if content is unchanged",
      default: false,
    },
  },
  async run({ args }) {
    const url = args.url as string;
    const output = args.output as string | undefined;
    const shouldCrawl = args.crawl as boolean;
    const maxDepth = parseInt(args["max-depth"] as string, 10);
    const name = (args.name as string) || slugFromUrl(url);
    const force = args.force as boolean;

    const { mode, outputPath, outputDir } = resolveOutputMode(output, shouldCrawl, name);
    const silent = mode === "single-file" && !outputPath;

    if (shouldCrawl) {
      if (!silent) consola.start(`Crawling from ${url} (max depth: ${maxDepth})...`);

      // Fetch first page to resolve platform and get navLinkSelector
      const firstHtml = await fetchPage(url);
      const $ = cheerio.load(firstHtml);
      const platformId = resolve(url, $);
      const strategy = getStrategy(platformId);
      const navLinkSelector = strategy.navLinkSelector();

      const crawlResult = await crawl(url, {
        maxDepth,
        navLinkSelector,
        discoverUrls: strategy.discoverUrls?.bind(strategy),
        onPageFetched: (pageUrl, current, total) => {
          if (!silent) consola.info(`[${current}/${total}] ${pageUrl}`);
        },
      });

      const { pages, effectivePrefix } = crawlResult;
      if (!silent) consola.success(`Crawled ${pages.length} pages`);

      if (mode === "directory") {
        // Directory mode: one .md file per page + manifests
        const pageEntries = pages.map((page) => {
          const { content, title, platform } = extract(page.html, page.url);
          const md = transform(content);
          return { url: page.url, title, platform, markdown: md };
        });

        const firstPlatform = pageEntries[0]?.platform || "generic";
        const { entries: manifestPages, written } = writePages(pageEntries, outputDir, effectivePrefix, { force });

        if (written > 0 || force) {
          const siteMeta = extractSiteMeta(firstHtml, url);
          const sourceManifest = buildSourceManifest(name, url, firstPlatform, manifestPages, siteMeta);
          writeSourceManifest(sourceManifest, outputDir);

          // Update root manifest in the parent directory
          const rootDir = dirname(outputDir.replace(/\/$/, ""));
          updateRootManifest(rootDir, {
            name,
            path: name + "/",
            fetched_at: sourceManifest.fetched_at,
            display_name: siteMeta.displayName,
            description: siteMeta.description,
            icon_url: siteMeta.iconUrl,
            page_count: manifestPages.length,
          });
        }

        const unchanged = pages.length - written;
        const parts = [`Written ${written} pages to ${outputDir}`];
        if (unchanged > 0) parts.push(`(${unchanged} unchanged)`);
        consola.success(parts.join(" "));
      } else {
        // Single-file mode: stitch all pages together
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

        write(markdown, outputPath, {
          sourceUrl: url,
          title: firstTitle,
          platform: firstPlatform,
          force,
        });

        if (!silent) consola.success(`Written to ${outputPath}`);
      }
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
          write(markdown, outputPath, {
            sourceUrl: url,
            title: result.title || title,
            platform: result.platform,
            force,
          });
          if (!silent) consola.success(`Written to ${outputPath}`);
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

      write(markdown, outputPath, {
        sourceUrl: url,
        title,
        platform,
        force,
      });

      if (!silent) consola.success(`Written to ${outputPath}`);
    }
  },
});
