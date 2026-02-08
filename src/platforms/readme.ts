import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

export const readme: PlatformStrategy = {
  id: "readme",

  detect(url: string, $: CheerioAPI): boolean {
    let rmClassCount = 0;
    $("[class]").each((_, el) => {
      const cls = $(el).attr("class") || "";
      if (/\brm-/.test(cls)) rmClassCount++;
    });
    if (rmClassCount > 2) return true;
    if ($(".rm-Article").length > 0) return true;
    if ($(".rm-Markdown").length > 0) return true;
    return false;
  },

  contentSelector(): string {
    return ".markdown-body, .rm-Article, .rm-Markdown";
  },

  removeSelectors(): string[] {
    return [
      "nav",
      "header",
      "footer",
      ".rm-Sidebar",
      ".rm-TableOfContents",
      "[class*='cookie']",
      "script",
      "style",
    ];
  },

  navLinkSelector(): string | null {
    return ".rm-Sidebar a[href]";
  },
};
