import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { createMcpServer } from "../../src/mcp/server";

const fixtureDir = join(__dirname, "../fixtures/mcp-docs");

/**
 * Helper to call an MCP tool handler directly.
 * The McpServer stores tools in a plain object keyed by tool name,
 * each with a `handler` function that takes the args object.
 */
async function callTool(
  server: ReturnType<typeof createMcpServer>,
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const registeredTools = (server as any)._registeredTools as Record<
    string,
    { handler: Function }
  >;
  const tool = registeredTools[name];
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool.handler(args) as any;
}

describe("MCP server", () => {
  const server = createMcpServer(fixtureDir);

  describe("list_sources", () => {
    it("returns 2 sources with correct metadata", async () => {
      const result = await callTool(server, "list_sources");

      expect(result.isError).toBeUndefined();
      const sources = JSON.parse(result.content[0].text);
      expect(sources).toHaveLength(2);

      const acme = sources.find((s: any) => s.name === "acme");
      expect(acme.url).toBe("https://docs.acme.com/getting-started");
      expect(acme.platform).toBe("mintlify");
      expect(acme.pageCount).toBe(2);

      const widgets = sources.find((s: any) => s.name === "widgets");
      expect(widgets.pageCount).toBe(1);
    });
  });

  describe("list_pages", () => {
    it("returns pages for a valid source", async () => {
      const result = await callTool(server, "list_pages", { source: "acme" });

      expect(result.isError).toBeUndefined();
      const pages = JSON.parse(result.content[0].text);
      expect(pages).toHaveLength(2);
      expect(pages.map((p: any) => p.title)).toContain("Getting Started");
      expect(pages.map((p: any) => p.title)).toContain("Authentication Guide");
    });

    it("returns error for invalid source", async () => {
      const result = await callTool(server, "list_pages", {
        source: "nonexistent",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  describe("read_page", () => {
    it("returns full markdown content", async () => {
      const result = await callTool(server, "read_page", {
        source: "acme",
        path: "getting-started.md",
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("# Getting Started");
      expect(result.content[0].text).toContain("npm install acme-sdk");
    });

    it("returns error for invalid page", async () => {
      const result = await callTool(server, "read_page", {
        source: "acme",
        path: "nonexistent.md",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("returns error for invalid source", async () => {
      const result = await callTool(server, "read_page", {
        source: "nonexistent",
        path: "getting-started.md",
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("search_docs", () => {
    it("returns matching results", async () => {
      const result = await callTool(server, "search_docs", {
        query: "authentication",
      });

      expect(result.isError).toBeUndefined();
      const results = JSON.parse(result.content[0].text);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("source");
      expect(results[0]).toHaveProperty("path");
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("score");
    });

    it("filters by source", async () => {
      const result = await callTool(server, "search_docs", {
        query: "dashboard",
        source: "widgets",
      });

      const results = JSON.parse(result.content[0].text);
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.source).toBe("widgets");
      }
    });

    it("returns error for empty query", async () => {
      const result = await callTool(server, "search_docs", { query: "" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("empty");
    });
  });
});
