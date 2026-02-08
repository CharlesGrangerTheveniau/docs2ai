import { defineCommand } from "citty";
import consola from "consola";
import { loadConfig } from "../config/manager";

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List configured documentation sources",
  },
  run() {
    const result = loadConfig();
    if (!result) {
      consola.info("No .ctxify.yaml found. Run `ctxify add <url>` to get started.");
      return;
    }

    const { config, configPath } = result;
    consola.info(`Config: ${configPath}`);
    consola.info(`Output dir: ${config.outputDir}\n`);

    if (config.sources.length === 0) {
      consola.info("No sources configured.");
      return;
    }

    for (const source of config.sources) {
      const crawlInfo = source.crawl
        ? ` (crawl, depth: ${source.maxDepth})`
        : "";
      console.log(`  ${source.name}${crawlInfo}`);
      console.log(`    URL:    ${source.url}`);
      console.log(`    Output: ${source.output}`);
      console.log();
    }
  },
});
