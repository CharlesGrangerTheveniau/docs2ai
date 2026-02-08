import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { docusaurus } from "../../src/platforms/docusaurus";

const fixturesDir = join(__dirname, "../fixtures");

describe("docusaurus platform strategy", () => {
  it("detects Docusaurus pages", () => {
    const html = readFileSync(join(fixturesDir, "docusaurus-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(docusaurus.detect("https://docusaurus.io/docs", $)).toBe(true);
  });

  it("does not detect non-Docusaurus pages", () => {
    const html = readFileSync(join(fixturesDir, "generic-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(docusaurus.detect("https://example.com", $)).toBe(false);
  });

  it("returns correct content selector", () => {
    expect(docusaurus.contentSelector()).toContain("article");
    expect(docusaurus.contentSelector()).toContain(".theme-doc-markdown");
  });

  it("returns remove selectors for Docusaurus-specific elements", () => {
    const selectors = docusaurus.removeSelectors();
    expect(selectors).toContain(".navbar");
    expect(selectors).toContain(".theme-doc-sidebar-container");
    expect(selectors).toContain(".pagination-nav");
  });

  it("returns menu link selector for nav", () => {
    expect(docusaurus.navLinkSelector()).toBe(".menu__link[href]");
  });
});
