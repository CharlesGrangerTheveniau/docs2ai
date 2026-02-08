import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { generic } from "../../src/platforms/generic";

describe("generic platform strategy", () => {
  it("always detects (fallback)", () => {
    const $ = cheerio.load("<html><body></body></html>");
    expect(generic.detect("https://example.com", $)).toBe(true);
  });

  it("returns broad content selector", () => {
    const sel = generic.contentSelector();
    expect(sel).toContain("article");
    expect(sel).toContain("main");
  });

  it("returns null for nav link selector", () => {
    expect(generic.navLinkSelector()).toBeNull();
  });

  it("returns standard remove selectors", () => {
    const selectors = generic.removeSelectors();
    expect(selectors).toContain("nav");
    expect(selectors).toContain("header");
    expect(selectors).toContain("footer");
    expect(selectors).toContain("script");
    expect(selectors).toContain("style");
  });
});
