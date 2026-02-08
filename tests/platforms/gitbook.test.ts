import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { gitbook } from "../../src/platforms/gitbook";

const fixturesDir = join(__dirname, "../fixtures");

describe("gitbook platform strategy", () => {
  it("detects GitBook pages from meta generator", () => {
    const html = readFileSync(join(fixturesDir, "gitbook-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(gitbook.detect("https://docs.example.gitbook.io/guide", $)).toBe(true);
  });

  it("detects GitBook pages from gitbook.io hostname", () => {
    const $ = cheerio.load("<html><body></body></html>");
    expect(gitbook.detect("https://myproject.gitbook.io/docs", $)).toBe(true);
  });

  it("does not detect non-GitBook pages", () => {
    const html = readFileSync(join(fixturesDir, "generic-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(gitbook.detect("https://example.com", $)).toBe(false);
  });

  it("returns content selector with page.contentEditor", () => {
    expect(gitbook.contentSelector()).toContain('[data-testid="page.contentEditor"]');
  });

  it("returns nav link selector", () => {
    expect(gitbook.navLinkSelector()).toBe("nav a[href]");
  });
});
