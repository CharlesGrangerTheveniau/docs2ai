import type { CheerioAPI } from "cheerio";
import type { PlatformStrategy } from "./base";

export const docusaurus: PlatformStrategy = {
  id: "docusaurus",

  detect(url: string, $: CheerioAPI): boolean {
    if ($('meta[name="generator"][content*="Docusaurus"]').length > 0)
      return true;
    if ($(".theme-doc-sidebar-container").length > 0) return true;
    if ($('meta[name="docusaurus_locale"]').length > 0) return true;
    return false;
  },

  contentSelector(): string {
    return "article, [role='main'], .theme-doc-markdown";
  },

  removeSelectors(): string[] {
    return [
      ".navbar",
      "footer",
      ".theme-doc-toc-desktop",
      ".theme-doc-sidebar-container",
      ".pagination-nav",
      ".theme-doc-breadcrumbs",
      "nav",
      "script",
      "style",
    ];
  },

  navLinkSelector(): string | null {
    return ".menu__link[href]";
  },
};
