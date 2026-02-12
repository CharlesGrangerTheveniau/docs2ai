import { describe, it, expect } from "vitest";
import {
  buildSearchIndex,
  generatePreview,
  extractSections,
  listSections,
} from "../../src/mcp/search";
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

  it("returns preview field in search results", () => {
    const index = buildSearchIndex(testPages);
    const results = index.search("Authentication");

    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].preview).toBe("string");
    expect(results[0].preview.length).toBeGreaterThan(0);
  });
});

describe("generatePreview", () => {
  it("strips first heading and trims", () => {
    const content = "# Getting Started\nWelcome to the docs.";
    const preview = generatePreview(content);
    expect(preview).toBe("Welcome to the docs.");
  });

  it("truncates long content at word boundary", () => {
    const content = "a".repeat(100) + " " + "b".repeat(150);
    const preview = generatePreview(content, 50);
    expect(preview.length).toBeLessThanOrEqual(54); // 50 + "..."
    expect(preview.endsWith("...")).toBe(true);
  });

  it("returns full content when shorter than maxLength", () => {
    const content = "Short content.";
    expect(generatePreview(content)).toBe("Short content.");
  });

  it("handles empty content", () => {
    expect(generatePreview("")).toBe("");
  });
});

const sectionContent = `# API Reference

## Authentication

Use API keys to authenticate.
Pass the key in the Authorization header.

## Rate Limits

Default rate limit is 100 requests per minute.
Contact support for higher limits.

### Burst Mode

Burst mode allows 500 requests per minute for 10 seconds.

## Errors

All errors return JSON with a message field.
`;

describe("extractSections", () => {
  it("extracts a single section by heading text", () => {
    const result = extractSections(sectionContent, ["Authentication"]);
    expect(result).toContain("## Authentication");
    expect(result).toContain("Authorization header");
    expect(result).not.toContain("Rate Limits");
  });

  it("extracts multiple sections", () => {
    const result = extractSections(sectionContent, [
      "Authentication",
      "Errors",
    ]);
    expect(result).toContain("## Authentication");
    expect(result).toContain("## Errors");
    expect(result).not.toContain("Rate Limits");
  });

  it("matches case-insensitively", () => {
    const result = extractSections(sectionContent, ["authentication"]);
    expect(result).toContain("## Authentication");
  });

  it("matches partial heading text", () => {
    const result = extractSections(sectionContent, ["Rate"]);
    expect(result).toContain("## Rate Limits");
    expect(result).toContain("Burst Mode");
  });

  it("includes nested subsections", () => {
    const result = extractSections(sectionContent, ["Rate Limits"]);
    expect(result).toContain("## Rate Limits");
    expect(result).toContain("### Burst Mode");
    expect(result).toContain("500 requests");
  });

  it("returns null when no sections match", () => {
    const result = extractSections(sectionContent, ["Nonexistent"]);
    expect(result).toBeNull();
  });

  it("returns null for empty sections array", () => {
    const result = extractSections(sectionContent, []);
    expect(result).toBeNull();
  });
});

describe("listSections", () => {
  it("returns all headings up to h3", () => {
    const headings = listSections(sectionContent);
    expect(headings).toContain("API Reference");
    expect(headings).toContain("Authentication");
    expect(headings).toContain("Rate Limits");
    expect(headings).toContain("Burst Mode");
    expect(headings).toContain("Errors");
  });

  it("returns empty array for content without headings", () => {
    expect(listSections("Just plain text")).toEqual([]);
  });
});
