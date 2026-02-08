import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { mintlify } from "../../src/platforms/mintlify";

const fixturesDir = join(__dirname, "../fixtures");

describe("mintlify platform strategy", () => {
  it("detects Mintlify pages", () => {
    const html = readFileSync(join(fixturesDir, "mintlify-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(mintlify.detect("https://docs.example.com", $)).toBe(true);
  });

  it("does not detect non-Mintlify pages", () => {
    const html = readFileSync(join(fixturesDir, "generic-sample.html"), "utf-8");
    const $ = cheerio.load(html);
    expect(mintlify.detect("https://example.com", $)).toBe(false);
  });

  it("returns correct content selector", () => {
    expect(mintlify.contentSelector()).toBe("article, main");
  });

  it("returns remove selectors including nav and footer", () => {
    const selectors = mintlify.removeSelectors();
    expect(selectors).toContain("nav");
    expect(selectors).toContain("footer");
  });

  it("returns nav link selector", () => {
    expect(mintlify.navLinkSelector()).toBe("nav a[href], .sidebar a[href]");
  });
});
