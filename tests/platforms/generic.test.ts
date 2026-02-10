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
    expect(selectors).toContain("button");
    expect(selectors).toContain("[role='tablist']");
    expect(selectors).toContain("[class*='copy-button']");
    expect(selectors).toContain("[class*='clipboard']");
  });

  describe("discoverUrls", () => {
    const base = "https://example.com/docs/intro";

    it("finds links in aside elements", () => {
      const html = `<html><body>
        <aside>
          <a href="/docs/intro">Intro</a>
          <a href="/docs/setup">Setup</a>
          <a href="/docs/api">API</a>
        </aside>
        <main><p>Content</p></main>
      </body></html>`;
      const urls = generic.discoverUrls!(html, base);
      expect(urls).toHaveLength(3);
      expect(urls).toContain("https://example.com/docs/intro");
      expect(urls).toContain("https://example.com/docs/setup");
      expect(urls).toContain("https://example.com/docs/api");
    });

    it("finds links in sidebar class elements", () => {
      const html = `<html><body>
        <div class="sidebar-nav">
          <a href="/docs/a">A</a>
          <a href="/docs/b">B</a>
          <a href="/docs/c">C</a>
          <a href="/docs/d">D</a>
        </div>
        <main><p>Content</p></main>
      </body></html>`;
      const urls = generic.discoverUrls!(html, base);
      expect(urls).toHaveLength(4);
    });

    it("ignores raw nav elements (usually header/footer nav)", () => {
      const html = `<html><body>
        <nav>
          <a href="/docs/a">A</a>
          <a href="/docs/b">B</a>
          <a href="/docs/c">C</a>
          <a href="/docs/d">D</a>
          <a href="/docs/e">E</a>
        </nav>
        <main><p>Content</p></main>
      </body></html>`;
      const urls = generic.discoverUrls!(html, base);
      expect(urls).toHaveLength(0);
    });

    it("skips hash-only and mailto links", () => {
      const html = `<html><body>
        <aside>
          <a href="#section">Jump</a>
          <a href="mailto:hi@example.com">Email</a>
          <a href="/docs/a">A</a>
          <a href="/docs/b">B</a>
          <a href="/docs/c">C</a>
        </aside>
      </body></html>`;
      const urls = generic.discoverUrls!(html, base);
      expect(urls).toHaveLength(3);
    });
  });
});
