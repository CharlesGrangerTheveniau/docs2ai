import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadDocs } from "./loader";
import { buildSearchIndex } from "./search";

/**
 * Create an MCP server that exposes documentation tools.
 * Eagerly loads all docs and builds a search index at creation time.
 */
export function createMcpServer(docsDir: string): McpServer {
  const docs = loadDocs(docsDir);
  const searchIndex = buildSearchIndex(docs.pages);

  const server = new McpServer({
    name: "doc2ctx",
    version: "0.1.0",
  });

  server.tool(
    "list_sources",
    "List all documentation sources available in the docs directory",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              docs.sources.map((s) => ({
                name: s.name,
                url: s.url,
                platform: s.platform,
                fetchedAt: s.fetchedAt,
                pageCount: s.pageCount,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "list_pages",
    "List all pages for a specific documentation source",
    { source: z.string().describe("Name of the documentation source") },
    async ({ source }) => {
      const sourceEntry = docs.sources.find((s) => s.name === source);
      if (!sourceEntry) {
        return {
          content: [{ type: "text", text: `Source "${source}" not found. Use list_sources to see available sources.` }],
          isError: true,
        };
      }
      const pages = docs.pages
        .filter((p) => p.source === source)
        .map((p) => ({ title: p.title, path: p.path }));
      return {
        content: [{ type: "text", text: JSON.stringify(pages, null, 2) }],
      };
    }
  );

  server.tool(
    "read_page",
    "Read the full markdown content of a documentation page",
    {
      source: z.string().describe("Name of the documentation source"),
      path: z.string().describe("Path of the page within the source (from list_pages)"),
    },
    async ({ source, path }) => {
      const page = docs.pages.find((p) => p.source === source && p.path === path);
      if (!page) {
        return {
          content: [{ type: "text", text: `Page "${path}" not found in source "${source}". Use list_pages to see available pages.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: page.content }],
      };
    }
  );

  server.tool(
    "search_docs",
    "Search across all documentation pages by keyword",
    {
      query: z.string().describe("Search query"),
      source: z.string().optional().describe("Filter results to a specific source"),
      limit: z.number().optional().describe("Maximum number of results (default 10)"),
    },
    async ({ query, source, limit }) => {
      if (!query.trim()) {
        return {
          content: [{ type: "text", text: "Search query cannot be empty." }],
          isError: true,
        };
      }
      const results = searchIndex.search(query, { source, limit });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              results.map((r) => ({
                source: r.source,
                path: r.path,
                title: r.title,
                score: r.score,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
