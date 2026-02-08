import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { resolve } from "./resolver";
import { getStrategy } from "../platforms/registry";
import type { PlatformId } from "../platforms/base";

export interface ExtractResult {
  content: string;
  title: string;
  platform: PlatformId;
}

/**
 * Extract meaningful content from raw HTML.
 * Uses platform-specific selectors when available, falls back to Readability.
 */
export function extract(html: string, url: string): ExtractResult {
  const $ = cheerio.load(html);
  const platform = resolve(url, $);
  const strategy = getStrategy(platform);

  const title = extractTitle($);

  // Non-generic platforms: use selector-based extraction first
  if (platform !== "generic") {
    for (const sel of strategy.removeSelectors()) {
      $(sel).remove();
    }

    const contentEl = $(strategy.contentSelector()).first();
    const selectorContent = contentEl.html();

    if (selectorContent && selectorContent.trim().length >= 100) {
      return { content: selectorContent, title, platform };
    }
    // Fall through to Readability if selector extraction yields too little
  }

  // Generic / fallback: Readability extraction
  const { document } = parseHTML(html);
  const reader = new Readability(document as any);
  const article = reader.parse();

  const content = article?.content || $("body").html() || html;

  return {
    content,
    title: title || article?.title || "",
    platform,
  };
}

/**
 * Extract page title from common sources.
 */
function extractTitle($: cheerio.CheerioAPI): string {
  const h1 = $("h1").first().text().trim();
  if (h1) return h1;

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  if (ogTitle) return ogTitle;

  return $("title").text().trim();
}
