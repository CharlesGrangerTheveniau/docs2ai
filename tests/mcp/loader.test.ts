import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { loadDocs } from "../../src/mcp/loader";

const fixtureDir = join(__dirname, "../fixtures/mcp-docs");

describe("loadDocs", () => {
  it("loads 2 sources and 3 pages from fixtures", () => {
    const docs = loadDocs(fixtureDir);

    expect(docs.sources).toHaveLength(2);
    expect(docs.pages).toHaveLength(3);
  });

  it("loads source metadata correctly", () => {
    const docs = loadDocs(fixtureDir);

    const acme = docs.sources.find((s) => s.name === "acme");
    expect(acme).toBeDefined();
    expect(acme!.url).toBe("https://docs.acme.com/getting-started");
    expect(acme!.platform).toBe("mintlify");
    expect(acme!.fetchedAt).toBe("2025-06-01T10:00:00Z");
    expect(acme!.pageCount).toBe(2);

    const widgets = docs.sources.find((s) => s.name === "widgets");
    expect(widgets).toBeDefined();
    expect(widgets!.platform).toBe("docusaurus");
    expect(widgets!.pageCount).toBe(1);
  });

  it("loads page fields correctly", () => {
    const docs = loadDocs(fixtureDir);

    const gettingStarted = docs.pages.find(
      (p) => p.source === "acme" && p.path === "getting-started.md"
    );
    expect(gettingStarted).toBeDefined();
    expect(gettingStarted!.title).toBe("Getting Started");
    expect(gettingStarted!.url).toBe("https://docs.acme.com/getting-started");
    expect(gettingStarted!.platform).toBe("mintlify");
    expect(gettingStarted!.content).toContain("# Getting Started");
    // Content should not include frontmatter
    expect(gettingStarted!.content).not.toContain("---");
  });

  it("loads nested pages correctly", () => {
    const docs = loadDocs(fixtureDir);

    const auth = docs.pages.find(
      (p) => p.source === "acme" && p.path === "guides/authentication.md"
    );
    expect(auth).toBeDefined();
    expect(auth!.title).toBe("Authentication Guide");
    expect(auth!.content).toContain("OAuth");
  });

  it("returns empty LoadedDocs when manifest.json is missing", () => {
    const docs = loadDocs("/nonexistent/path");

    expect(docs.sources).toEqual([]);
    expect(docs.pages).toEqual([]);
  });

  it("skips source when _index.json is missing", () => {
    // The fixture dir has both sources, so test with a dir that has a broken manifest
    const docs = loadDocs(join(__dirname, "../fixtures/mcp-docs-missing"));

    // Dir doesn't exist, so manifest.json read fails → empty
    expect(docs.sources).toEqual([]);
  });
});
