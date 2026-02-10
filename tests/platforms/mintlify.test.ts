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
    expect(mintlify.navLinkSelector()).toBe("nav a[href], .sidebar a[href], [class*='sidebar'] a[href]");
  });

  describe("discoverUrls", () => {
    it("discovers paths from __next_f script data", () => {
      const html = `<html><body>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/api-reference/checkouts/create\\"}"])</script>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/api-reference/orders/list\\"}"])</script>
      </body></html>`;
      const urls = mintlify.discoverUrls!(html, "https://docs.example.com/api-reference/intro");
      expect(urls).toContain("https://docs.example.com/api-reference/checkouts/create");
      expect(urls).toContain("https://docs.example.com/api-reference/orders/list");
    });

    it("infers mount prefix for deep subpath apps", () => {
      // Simulates Vercel-style mounting: app at /docs/rest-api/reference/
      // Raw paths are app-relative: /welcome, /endpoints/foo
      const html = `<html><body>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/welcome\\"}"])</script>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/endpoints/access-groups\\"}"])</script>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/sdk\\"}"])</script>
      </body></html>`;
      const urls = mintlify.discoverUrls!(
        html,
        "https://docs.vercel.com/docs/rest-api/reference/welcome"
      );
      expect(urls).toContain("https://docs.vercel.com/docs/rest-api/reference/welcome");
      expect(urls).toContain("https://docs.vercel.com/docs/rest-api/reference/endpoints/access-groups");
      expect(urls).toContain("https://docs.vercel.com/docs/rest-api/reference/sdk");
    });

    it("does not double-prefix paths that already include the mount prefix", () => {
      const html = `<html><body>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/welcome\\"}"])</script>
        <script>self.__next_f.push([1,"{\\"href\\":\\"/docs/rest-api/reference/other\\"}"])</script>
      </body></html>`;
      const urls = mintlify.discoverUrls!(
        html,
        "https://docs.vercel.com/docs/rest-api/reference/welcome"
      );
      expect(urls).toContain("https://docs.vercel.com/docs/rest-api/reference/welcome");
      expect(urls).toContain("https://docs.vercel.com/docs/rest-api/reference/other");
    });
  });
});
