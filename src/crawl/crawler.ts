import * as cheerio from "cheerio";
import { fetchPage } from "../pipeline/fetcher";
import { getCrawlPrefix, isInBounds, normalizeUrl } from "./boundary";

export interface CrawledPage {
  url: string;
  html: string;
}

export interface CrawlOptions {
  maxDepth: number;
  navLinkSelector?: string | null;
  onPageFetched?: (url: string, current: number, total: number) => void;
}

/**
 * Crawl documentation pages starting from a URL.
 * Follows in-bounds links via BFS up to maxDepth.
 */
export async function crawl(
  startUrl: string,
  options: CrawlOptions
): Promise<CrawledPage[]> {
  const { origin, pathPrefix } = getCrawlPrefix(startUrl);
  const visited = new Set<string>();
  const results: CrawledPage[] = [];

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[startUrl, 0]];
  visited.add(normalizeUrl(startUrl));

  while (queue.length > 0) {
    const [url, depth] = queue.shift()!;

    let html: string;
    try {
      html = await fetchPage(url);
    } catch {
      options.onPageFetched?.(url, results.length, results.length + queue.length);
      continue;
    }
    results.push({ url, html });
    options.onPageFetched?.(url, results.length, results.length + queue.length);

    if (depth < options.maxDepth) {
      const links = discoverLinks(
        html,
        url,
        origin,
        pathPrefix,
        options.navLinkSelector
      );
      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (!visited.has(normalized)) {
          visited.add(normalized);
          queue.push([link, depth + 1]);
        }
      }
    }

    // Politeness delay between requests
    if (queue.length > 0) {
      await delay(200);
    }
  }

  return results;
}

/**
 * Extract all in-bounds links from a page's HTML.
 * When navLinkSelector is provided, only links matching that selector are used.
 */
function discoverLinks(
  html: string,
  baseUrl: string,
  origin: string,
  pathPrefix: string,
  navLinkSelector?: string | null
): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const selector = navLinkSelector || "a[href]";

  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl).href;
      if (isInBounds(resolved, origin, pathPrefix)) {
        links.push(resolved);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
