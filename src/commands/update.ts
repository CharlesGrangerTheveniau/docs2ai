import { defineCommand } from "citty";
import { join, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import * as cheerio from "cheerio";
import consola from "consola";
import { loadConfig } from "../config/manager";
import { fetchPage } from "../pipeline/fetcher";
import { extract } from "../pipeline/extractor";
import { transform } from "../pipeline/transformer";
import { write, writePages } from "../pipeline/writer";
import { crawl } from "../crawl/crawler";
import { resolve } from "../pipeline/resolver";
import { getStrategy } from "../platforms/registry";
import {
  buildSourceManifest,
  writeSourceManifest,
  updateRootManifest,
} from "../pipeline/manifest";
import { extractSiteMeta } from "../pipeline/meta-extractor";

export const updateCommand = defineCommand({
  meta: {
    name: "update",
    description: "Refresh configured documentation sources",
  },
  args: {
    name: {
      type: "string",
      description: "Update only the named source",
    },
    force: {
      type: "boolean",
      description: "Force rewrite all files, even if content is unchanged",
      default: false,
    },
  },
  async run({ args }) {
    const result = loadConfig();
    if (!result) {
      consola.error("No .docmunch.yaml found. Run `docmunch add <url>` first.");
      process.exit(1);
    }

    const { config, configPath } = result;
    const configDir = dirname(configPath);
    const filterName = args.name as string | undefined;
    const force = args.force as boolean;

    const sources = filterName
      ? config.sources.filter((s) => s.name === filterName)
      : config.sources;

    if (sources.length === 0) {
      if (filterName) {
        consola.error(`Source "${filterName}" not found in config.`);
      } else {
        consola.error("No sources configured.");
      }
      process.exit(1);
    }

    for (const source of sources) {
      const isDirectoryOutput = !source.output.endsWith(".md");

      consola.start(`Updating "${source.name}" from ${source.url}...`);

      if (source.crawl) {
        // Fetch first page to resolve platform and get link discovery
        const firstHtml = await fetchPage(source.url);
        const $ = cheerio.load(firstHtml);
        const platformId = resolve(source.url, $);
        const strategy = getStrategy(platformId);

        const crawlResult = await crawl(source.url, {
          maxDepth: source.maxDepth,
          navLinkSelector: strategy.navLinkSelector(),
          discoverUrls: strategy.discoverUrls?.bind(strategy),
          onPageFetched: (url, current, total) => {
            consola.info(`  [${current}/${total}] ${url}`);
          },
        });

        const { pages, effectivePrefix } = crawlResult;

        if (isDirectoryOutput) {
          // Directory mode: one .md file per page + manifests
          const outputDir = join(configDir, config.outputDir, source.output);
          const pageEntries = pages.map((page) => {
            const { content, title, platform } = extract(page.html, page.url);
            const md = transform(content);
            return { url: page.url, title, platform, markdown: md };
          });

          const firstPlatform = pageEntries[0]?.platform || "generic";
          const { entries: manifestPages, written } = writePages(pageEntries, outputDir, effectivePrefix, { force });

          if (written > 0 || force) {
            const siteMeta = extractSiteMeta(firstHtml, source.url);
            const sourceManifest = buildSourceManifest(
              source.name,
              source.url,
              firstPlatform,
              manifestPages,
              siteMeta
            );
            writeSourceManifest(sourceManifest, outputDir);

            const rootDir = join(configDir, config.outputDir);
            updateRootManifest(rootDir, {
              name: source.name,
              path: source.output,
              fetched_at: sourceManifest.fetched_at,
              display_name: siteMeta.displayName,
              description: siteMeta.description,
              icon_url: siteMeta.iconUrl,
              page_count: manifestPages.length,
            });
          }

          const unchanged = pages.length - written;
          const parts = [`Updated "${source.name}" → ${outputDir} (${written} written)`];
          if (unchanged > 0) parts.push(`(${unchanged} unchanged)`);
          consola.success(parts.join(" "));
        } else {
          // Single-file mode: stitch all pages together
          const outputPath = join(configDir, config.outputDir, source.output);
          mkdirSync(dirname(outputPath), { recursive: true });

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
            sourceUrl: source.url,
            title: firstTitle,
            platform: firstPlatform,
            force,
          });

          consola.success(`Updated "${source.name}" → ${outputPath}`);
        }
      } else {
        const outputPath = join(configDir, config.outputDir, source.output);
        mkdirSync(dirname(outputPath), { recursive: true });

        const html = await fetchPage(source.url);
        const { content, title, platform } = extract(html, source.url);
        const markdown = transform(content);
        write(markdown, outputPath, {
          sourceUrl: source.url,
          title,
          platform,
          force,
        });

        consola.success(`Updated "${source.name}" → ${outputPath}`);
      }
    }
  },
});
