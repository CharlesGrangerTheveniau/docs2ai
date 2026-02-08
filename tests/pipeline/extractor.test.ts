import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extract } from "../../src/pipeline/extractor";

const fixturesDir = join(__dirname, "../fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("extract", () => {
  it("extracts content from Mintlify pages", () => {
    const html = loadFixture("mintlify-sample.html");
    const result = extract(html, "https://docs.example.com/getting-started");
    expect(result.platform).toBe("mintlify");
    expect(result.title).toBe("Getting Started");
    expect(result.content).toContain("Installation");
    expect(result.content).toContain("npm install @mintlify/sdk");
  });

  it("strips nav and footer from Mintlify pages", () => {
    const html = loadFixture("mintlify-sample.html");
    const result = extract(html, "https://docs.example.com/getting-started");
    expect(result.content).not.toContain("Copyright 2025 Mintlify");
  });

  it("extracts content from Docusaurus pages", () => {
    const html = loadFixture("docusaurus-sample.html");
    const result = extract(html, "https://docusaurus.io/docs/installation");
    expect(result.platform).toBe("docusaurus");
    expect(result.title).toBe("Installation");
    expect(result.content).toContain("Node.js version 18.0");
  });

  it("strips sidebar and pagination from Docusaurus", () => {
    const html = loadFixture("docusaurus-sample.html");
    const result = extract(html, "https://docusaurus.io/docs/installation");
    expect(result.content).not.toContain("menu__link");
  });

  it("extracts content from ReadMe pages", () => {
    const html = loadFixture("readme-sample.html");
    const result = extract(html, "https://docs.readme.com/reference");
    expect(result.platform).toBe("readme");
    expect(result.title).toBe("API Reference");
    expect(result.content).toContain("Authorization: Bearer");
  });

  it("extracts content from GitBook pages", () => {
    const html = loadFixture("gitbook-sample.html");
    const result = extract(html, "https://docs.example.gitbook.io/guide");
    expect(result.platform).toBe("gitbook");
    expect(result.title).toBe("Welcome");
    expect(result.content).toContain("Quick Start");
  });

  it("extracts content from generic pages via Readability", () => {
    const html = loadFixture("generic-sample.html");
    const result = extract(html, "https://example.com/docs");
    expect(result.platform).toBe("generic");
    expect(result.title).toBe("Documentation");
    expect(result.content).toContain("Getting Started");
  });

  it("extracts title from h1", () => {
    const html = loadFixture("mintlify-sample.html");
    const result = extract(html, "https://docs.example.com/getting-started");
    expect(result.title).toBe("Getting Started");
  });
});
