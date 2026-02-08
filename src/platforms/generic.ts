import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

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
};
