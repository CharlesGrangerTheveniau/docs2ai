import { describe, it, expect } from "vitest";
import { buildSearchIndex } from "../../src/mcp/search";
import type { LoadedPage } from "../../src/mcp/loader";

const testPages: LoadedPage[] = [
  {
    source: "acme",
    path: "getting-started.md",
    title: "Getting Started",
    url: "https://docs.acme.com/getting-started",
    platform: "mintlify",
    fetchedAt: "2025-06-01T10:00:00Z",
    content: "Welcome to the Acme API. Install the SDK with npm install acme-sdk.",
  },
  {
    source: "acme",
    path: "guides/authentication.md",
    title: "Authentication Guide",
    url: "https://docs.acme.com/guides/authentication",
    platform: "mintlify",
    fetchedAt: "2025-06-01T10:00:00Z",
    content: "Acme uses API keys for authentication. Generate keys from your dashboard.",
  },
  {
    source: "widgets",
    path: "overview.md",
    title: "Widgets Overview",
    url: "https://widgets.io/docs/overview",
    platform: "docusaurus",
    fetchedAt: "2025-06-02T12:00:00Z",
    content: "Widgets is a component library for building interactive dashboards.",
  },
];

describe("buildSearchIndex", () => {
  it("finds pages by title word", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("Authentication");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Authentication Guide");
  });

  it("finds pages by content word", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("dashboard");

    expect(results.length).toBeGreaterThan(0);
    const paths = results.map((r) => r.path);
    expect(paths).toContain("guides/authentication.md");
  });

  it("filters by source", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("dashboard", { source: "widgets" });

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.source).toBe("widgets");
    }
  });

  it("returns empty array for no results", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("zzzznonexistent");

    expect(results).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("");

    expect(results).toEqual([]);
  });

  it("respects limit option", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("acme", { limit: 1 });

    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("supports fuzzy matching", () => {
    const index = buildSearchIndex(testPages);
    // "authenticaton" is a typo for "authentication"
    const results = index.search("authenticaton");

    expect(results.length).toBeGreaterThan(0);
  });

  it("returns score field", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("API");

    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].score).toBe("number");
    expect(results[0].score).toBeGreaterThan(0);
  });
});
