import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extract } from "../../src/pipeline/extractor";
import { transform } from "../../src/pipeline/transformer";

const fixturesDir = join(__dirname, "../fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

function fullPipeline(fixtureName: string, url: string) {
  const html = loadFixture(fixtureName);
  const { content, title, platform } = extract(html, url);
  const markdown = transform(content);
  return { markdown, title, platform };
}

describe("full pipeline integration", () => {
  it("processes Mintlify fixture end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "mintlify-sample.html",
      "https://docs.example.com/getting-started"
    );
    expect(platform).toBe("mintlify");
    expect(title).toBe("Getting Started");
    expect(markdown).toContain("Installation");
    expect(markdown).toContain("npm install @mintlify/sdk");
    // Should not contain nav/footer content
    expect(markdown).not.toContain("Copyright 2025 Mintlify");
  });

  it("processes Docusaurus fixture end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "docusaurus-sample.html",
      "https://docusaurus.io/docs/installation"
    );
    expect(platform).toBe("docusaurus");
    expect(title).toBe("Installation");
    expect(markdown).toContain("Node.js version 18.0");
    expect(markdown).toContain("npx create-docusaurus");
    // Should not contain sidebar or pagination
    expect(markdown).not.toContain("pagination-nav");
  });

  it("processes ReadMe fixture end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "readme-sample.html",
      "https://docs.readme.com/reference"
    );
    expect(platform).toBe("readme");
    expect(title).toBe("API Reference");
    expect(markdown).toContain("Authentication");
    expect(markdown).toContain("Authorization: Bearer");
  });

  it("processes GitBook fixture end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "gitbook-sample.html",
      "https://docs.example.gitbook.io/guide"
    );
    expect(platform).toBe("gitbook");
    expect(title).toBe("Welcome");
    expect(markdown).toContain("Quick Start");
  });

  it("processes generic fixture end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "generic-sample.html",
      "https://example.com/docs"
    );
    expect(platform).toBe("generic");
    expect(title).toBe("Documentation");
    expect(markdown).toContain("Getting Started");
  });

  it("preserves code blocks through full pipeline", () => {
    const html = loadFixture("code-blocks.html");
    const { content } = extract(html, "https://example.com/code");
    const markdown = transform(content);

    // Code content is preserved (Readability may strip class attrs on generic pages)
    expect(markdown).toContain('print("Hello, World!")');
    expect(markdown).toContain("interface Config");
    expect(markdown).toContain('println!("Hello, Rust!")');
    expect(markdown).toContain('fmt.Println("Hello, Go!")');

    // Inline code
    expect(markdown).toContain("`docmunch`");

    // Indentation preserved
    expect(markdown).toContain("./html:/usr/share/nginx/html");
  });

  it("preserves callout text through full pipeline", () => {
    const html = loadFixture("code-blocks.html");
    const { content } = extract(html, "https://example.com/code");
    const markdown = transform(content);

    // Callout text should survive even if formatting is lost via Readability
    expect(markdown).toContain("warning callout");
  });

  it("preserves tab content through full pipeline", () => {
    const html = loadFixture("code-blocks.html");
    const { content } = extract(html, "https://example.com/code");
    const markdown = transform(content);

    // Tab content should survive even if tab markers are lost via Readability
    expect(markdown).toContain("npm install docmunch");
    expect(markdown).toContain("yarn add docmunch");
  });

  it("processes two-column API doc end-to-end", () => {
    const { markdown, title, platform } = fullPipeline(
      "generic-api-two-column.html",
      "https://example.com/api/usage-records"
    );
    expect(platform).toBe("generic");
    expect(title).toBe("Retrieve Usage Record");
    // Endpoint preserved
    expect(markdown).toContain("/v1/usage-records/{id}");
    // Curl example from right column
    expect(markdown).toContain("Authorization: Bearer");
    // JSON response from right column
    expect(markdown).toContain("ur_abc123");
    // Button text stripped
    expect(markdown).not.toContain("Copy to clipboard");
  });
});
