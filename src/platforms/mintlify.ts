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
    return "nav a[href], .sidebar a[href]";
  },
};
