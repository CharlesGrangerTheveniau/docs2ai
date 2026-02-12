import { defineCommand } from "citty";
import consola from "consola";
import { ofetch } from "ofetch";

const DEFAULT_REGISTRY_URL = "https://docmunch.dev";

interface RegistrySource {
  name: string;
  url: string;
  platform: string;
  display_name?: string;
  description?: string;
  page_count?: number;
  total_tokens?: number;
}

export const registryCommand = defineCommand({
  meta: {
    name: "registry",
    description: "List available documentation sources from the registry",
  },
  args: {
    "registry-url": {
      type: "string",
      description: "Registry API base URL",
    },
    token: {
      type: "string",
      description: "Auth token for authenticated access",
    },
    json: {
      type: "boolean",
      description: "Output raw JSON",
      default: false,
    },
  },
  async run({ args }) {
    const registryUrl =
      (args["registry-url"] as string) ||
      process.env.DOCMUNCH_REGISTRY_URL ||
      DEFAULT_REGISTRY_URL;
    const token =
      (args.token as string) || process.env.DOCMUNCH_TOKEN || undefined;
    const jsonOutput = args.json as boolean;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    consola.start(`Fetching sources from ${registryUrl}...`);

    const sources = await ofetch<RegistrySource[]>(
      `${registryUrl}/api/sources`,
      { headers }
    );

    if (jsonOutput) {
      console.log(JSON.stringify(sources, null, 2));
      return;
    }

    if (sources.length === 0) {
      consola.info("No sources available in the registry.");
      return;
    }

    consola.success(`${sources.length} sources available:\n`);

    for (const source of sources) {
      const name = source.display_name || source.name;
      const pages = source.page_count ? ` (${source.page_count} pages)` : "";
      const tokens = source.total_tokens
        ? ` ~${Math.round(source.total_tokens / 1000)}k tokens`
        : "";

      console.log(`  ${source.name}`);
      if (source.display_name) console.log(`    Name:     ${name}`);
      console.log(`    URL:      ${source.url}`);
      console.log(`    Platform: ${source.platform}${pages}${tokens}`);
      if (source.description) console.log(`    ${source.description}`);
      console.log();
    }

    consola.info(`Run \`docmunch pull <name>\` to download a source.`);
  },
});
