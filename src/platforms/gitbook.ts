import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

export const gitbook: PlatformStrategy = {
  id: "gitbook",

  detect(url: string, $: CheerioAPI): boolean {
    if ($('meta[name="generator"][content*="GitBook"]').length > 0) return true;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.endsWith(".gitbook.io")) return true;
    } catch {
      // invalid URL, skip host check
    }
    if ($('[data-testid="page.contentEditor"]').length > 0) return true;
    return false;
  },

  contentSelector(): string {
    return '[data-testid="page.contentEditor"], main, article';
  },

  removeSelectors(): string[] {
    return [
      "nav",
      "header",
      "footer",
      "[class*='sidebar']",
      "[class*='toc']",
      "[class*='cookie']",
      "script",
      "style",
    ];
  },

  navLinkSelector(): string | null {
    return "nav a[href]";
  },
};
