import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { resolve } from "../../src/pipeline/resolver";

const fixturesDir = join(__dirname, "../fixtures");

function loadFixture(name: string) {
  const html = readFileSync(join(fixturesDir, name), "utf-8");
  return cheerio.load(html);
}

describe("resolve", () => {
  it("detects Mintlify from meta generator tag", () => {
    const $ = loadFixture("mintlify-sample.html");
    expect(resolve("https://docs.example.com/getting-started", $)).toBe(
      "mintlify"
    );
  });

  it("detects Docusaurus from meta generator tag", () => {
    const $ = loadFixture("docusaurus-sample.html");
    expect(resolve("https://docusaurus.io/docs/installation", $)).toBe(
      "docusaurus"
    );
  });

  it("detects ReadMe from rm- class patterns", () => {
    const $ = loadFixture("readme-sample.html");
    expect(resolve("https://docs.readme.com/reference", $)).toBe("readme");
  });

  it("detects GitBook from meta generator tag", () => {
    const $ = loadFixture("gitbook-sample.html");
    expect(resolve("https://docs.example.gitbook.io/guide", $)).toBe(
      "gitbook"
    );
  });

  it("falls back to generic for unknown platforms", () => {
    const $ = loadFixture("generic-sample.html");
    expect(resolve("https://example.com/docs", $)).toBe("generic");
  });
});
