import { defineCommand } from "citty";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import consola from "consola";
import { ofetch } from "ofetch";
import { loadConfig, saveConfig, addSource } from "../config/manager";
import type { DocmunchConfig } from "../config/schema";
import {
  buildSourceManifest,
  writeSourceManifest,
  updateRootManifest,
} from "../pipeline/manifest";

const DEFAULT_REGISTRY_URL = "https://docmunch.dev";

interface PullPageResponse {
  title: string;
  path: string;
  download_url: string;
}

interface PullResponse {
  name: string;
  url: string;
  platform: string;
  display_name?: string;
  description?: string;
  icon_url?: string | null;
  pages: PullPageResponse[];
}

export const pullCommand = defineCommand({
  meta: {
    name: "pull",
    description: "Download a pre-crawled doc package from the registry",
  },
  args: {
    name: {
      type: "positional",
      description: "Source name to pull (e.g. stripe)",
      required: true,
    },
    "registry-url": {
      type: "string",
      description: "Registry API base URL",
    },
    token: {
      type: "string",
      description: "Auth token for paid access",
    },
    force: {
      type: "boolean",
      description: "Overwrite existing files even if unchanged",
      default: false,
    },
  },
  async run({ args }) {
    const name = args.name as string;
    const registryUrl =
      (args["registry-url"] as string) ||
      process.env.DOCMUNCH_REGISTRY_URL ||
      DEFAULT_REGISTRY_URL;
    const token =
      (args.token as string) || process.env.DOCMUNCH_TOKEN || undefined;
    const force = args.force as boolean;

    // Resolve output directory from config or defaults
    const existing = loadConfig();
    const outputDir = existing
      ? join(dirname(existing.configPath), existing.config.outputDir, `${name}/`)
      : `.ai/docs/${name}/`;

    consola.start(`Pulling "${name}" from ${registryUrl}...`);

    // Fetch source metadata from registry
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = await ofetch<PullResponse>(
      `${registryUrl}/api/pull/${name}`,
      { headers }
    );

    consola.info(`Found ${data.pages.length} pages for "${data.name}"`);

    // Download each page
    let written = 0;
    for (let i = 0; i < data.pages.length; i++) {
      const page = data.pages[i];
      consola.info(`[${i + 1}/${data.pages.length}] ${page.path}`);

      const markdown = await ofetch<string>(page.download_url, {
        headers,
        responseType: "text",
      });

      const filePath = join(outputDir, page.path);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, markdown, "utf-8");
      written++;
    }

    // Build and write source manifest (_index.json)
    const manifestPages = data.pages.map((p) => ({
      title: p.title,
      path: p.path,
    }));

    const siteMeta = {
      displayName: data.display_name || data.name,
      description: data.description || "",
      iconUrl: data.icon_url || null,
      ogImage: null,
      language: null,
    };

    const sourceManifest = buildSourceManifest(
      data.name,
      data.url,
      data.platform,
      manifestPages,
      siteMeta
    );
    writeSourceManifest(sourceManifest, outputDir);

    // Update root manifest
    const rootDir = dirname(outputDir.replace(/\/$/, ""));
    updateRootManifest(rootDir, {
      name: data.name,
      path: name + "/",
      fetched_at: sourceManifest.fetched_at,
      display_name: siteMeta.displayName,
      description: siteMeta.description,
      icon_url: siteMeta.iconUrl,
      page_count: manifestPages.length,
    });

    // Optionally update .docmunch.yaml
    if (existing) {
      addSource(existing.config, {
        name: data.name,
        url: data.url,
        crawl: false,
        maxDepth: 0,
        output: `${name}/`,
      });
      saveConfig(existing.config, existing.configPath);
    }

    consola.success(`Pulled ${written} pages to ${outputDir}`);
  },
});
