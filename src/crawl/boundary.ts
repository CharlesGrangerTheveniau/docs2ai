import { normalizeUrl } from "../utils/url";

export { normalizeUrl };

/**
 * Determine the crawl boundary from a starting URL.
 * Links are in-bounds if they share the same origin and path prefix.
 */
export function getCrawlPrefix(url: string): {
  origin: string;
  pathPrefix: string;
} {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/");
  // Remove the last segment (the current page slug)
  pathParts.pop();
  const pathPrefix = pathParts.join("/") + "/";
  return { origin: parsed.origin, pathPrefix };
}

/**
 * Check whether a candidate URL falls within the crawl boundary.
 */
export function isInBounds(
  candidateUrl: string,
  origin: string,
  pathPrefix: string
): boolean {
  try {
    const parsed = new URL(candidateUrl);
    return parsed.origin === origin && parsed.pathname.startsWith(pathPrefix);
  } catch {
    return false;
  }
}
