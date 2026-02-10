import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

export const mintlify: PlatformStrategy = {
  id: "mintlify",

  detect(url: string, $: CheerioAPI): boolean {
    if ($('meta[name="generator"][content*="Mintlify"]').length > 0) return true;
    if ($("script[src*='mintlify']").length > 0) return true;
    if ($("[data-mintlify]").length > 0) return true;
    return false;
  },

  contentSelector(): string {
    return "article, main";
  },

  removeSelectors(): string[] {
    return [
      "nav",
      "header",
      "footer",
      "[role='navigation']",
      ".sidebar",
      "[class*='sidebar']",
      "[class*='cookie']",
      "[class*='banner']",
      "script",
      "style",
    ];
  },

  navLinkSelector(): string | null {
    return "nav a[href], .sidebar a[href], [class*='sidebar'] a[href]";
  },

  discoverUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const paths = new Set<string>();

    // Mintlify uses Next.js — sidebar nav is in __next_f script data, not <a> tags.
    // The data contains escaped JSON like \"href\":\"/api-reference/checkouts/create\"
    $("script").each((_, el) => {
      const text = $(el).html() || "";
      // Match escaped JSON paths: \"href\":\"/some-path\"
      const escaped = /\\?"href\\?"\s*:\s*\\?"(\/[a-z0-9][a-z0-9\/-]*)\\?"/g;
      let match = escaped.exec(text);
      while (match !== null) {
        paths.add(match[1]);
        match = escaped.exec(text);
      }
    });

    const origin = new URL(baseUrl).origin;
    const pathname = new URL(baseUrl).pathname;

    // Infer the Mintlify app mount prefix.
    // Raw paths in __next_f are app-relative (e.g. /welcome, /endpoints/...).
    // When the app is mounted at a subpath (e.g. /docs/rest-api/reference),
    // we find the prefix by matching a raw path to the end of the start URL.
    let mountPrefix = "";
    for (const p of paths) {
      if (pathname !== p && pathname.endsWith(p)) {
        const candidate = pathname.slice(0, pathname.length - p.length);
        if (candidate.length > mountPrefix.length) {
          mountPrefix = candidate;
        }
      }
    }

    return [...paths].map((p) => {
      if (mountPrefix && p.startsWith(mountPrefix)) {
        return origin + p;
      }
      return origin + mountPrefix + p;
    });
  },
};
