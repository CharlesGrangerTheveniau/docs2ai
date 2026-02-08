import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { readme } from "../../src/platforms/readme";

const fixturesDir = join(__dirname, "../fixtures");

describe("readme platform strategy", () => {
  it("detects ReadMe pages from rm- classes", () => {
    const html = readFileSync(join(fixturesDir, "readme-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(readme.detect("https://docs.readme.com", $)).toBe(true);
  });

  it("does not detect non-ReadMe pages", () => {
    const html = readFileSync(join(fixturesDir, "generic-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(readme.detect("https://example.com", $)).toBe(false);
  });

  it("returns correct content selector", () => {
    expect(readme.contentSelector()).toContain(".rm-Article");
    expect(readme.contentSelector()).toContain(".rm-Markdown");
  });

  it("returns sidebar nav link selector", () => {
    expect(readme.navLinkSelector()).toBe(".rm-Sidebar a[href]");
  });
});
