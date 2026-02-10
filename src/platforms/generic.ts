import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

/**
 * CSS selectors targeting documentation sidebars, ordered by specificity.
 * These avoid header/footer navs and focus on sidebar-like containers.
 */
const SIDEBAR_SELECTORS = [
  "aside nav a[href]",
  "aside a[href]",
  '[class*="sidebar"] a[href]',
  '[class*="side-bar"] a[href]',
  '[role="complementary"] a[href]',
  '[class*="toc"] a[href]',
  '[class*="table-of-contents"] a[href]',
];

/** Minimum number of links to consider a selector a valid sidebar */
const MIN_SIDEBAR_LINKS = 3;

/**
 * Resolve <a> hrefs to absolute URLs within a scope.
 */
function resolveLinks(
  $: CheerioAPI,
  selector: string,
  baseUrl: string,
  scope?: cheerio.Cheerio<cheerio.AnyNode>
): string[] {
  const links: string[] = [];
  const els = scope ? scope.find(selector) : $(selector);

  els.each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    try {
      links.push(new URL(href, baseUrl).href);
    } catch {
      // invalid URL, skip
    }
  });

  return [...new Set(links)];
}

export const generic: PlatformStrategy = {
  id: "generic",

  detect(_url: string, _$: CheerioAPI): boolean {
    return true;
  },

  contentSelector(): string {
    return "article, main, [role='main'], .content";
  },

  removeSelectors(): string[] {
    return [
      "nav",
      "header",
      "footer",
      "[role='navigation']",
      "[class*='sidebar']",
      "[class*='cookie']",
      "[class*='banner']",
      "script",
      "style",
      "noscript",
    ];
  },

  navLinkSelector(): string | null {
    return null;
  },

  discoverUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);

    // Try sidebar-specific selectors first
    for (const selector of SIDEBAR_SELECTORS) {
      const links = resolveLinks($, selector, baseUrl);
      if (links.length >= MIN_SIDEBAR_LINKS) {
        return links;
      }
    }

    // No sidebar found — return empty so crawler keeps the tight URL prefix.
    // We intentionally don't fall back to raw <nav> elements because those
    // are usually the site's header/footer navigation, not a doc sidebar.
    return [];
  },
};
