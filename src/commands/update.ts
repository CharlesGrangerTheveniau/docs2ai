import { defineCommand } from "citty";
import { join, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import consola from "consola";
import { loadConfig } from "../config/manager";
import { fetchPage } from "../pipeline/fetcher";
import { extract } from "../pipeline/extractor";
import { transform } from "../pipeline/transformer";
import { write } from "../pipeline/writer";
import { crawl } from "../crawl/crawler";

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
  },
  async run({ args }) {
    const result = loadConfig();
    if (!result) {
      consola.error("No .docs2ai.yaml found. Run `docs2ai add <url>` first.");
      process.exit(1);
    }

    const { config, configPath } = result;
    const configDir = dirname(configPath);
    const filterName = args.name as string | undefined;

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
      const outputPath = join(configDir, config.outputDir, source.output);
      mkdirSync(dirname(outputPath), { recursive: true });

      consola.start(`Updating "${source.name}" from ${source.url}...`);

      if (source.crawl) {
        const pages = await crawl(source.url, {
          maxDepth: source.maxDepth,
          onPageFetched: (url, current, total) => {
            consola.info(`  [${current}/${total}] ${url}`);
          },
        });

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
        });
      } else {
        const html = await fetchPage(source.url);
        const { content, title, platform } = extract(html, source.url);
        const markdown = transform(content);
        write(markdown, outputPath, {
          sourceUrl: source.url,
          title,
          platform,
        });
      }

      consola.success(`Updated "${source.name}" → ${outputPath}`);
    }
  },
});
