/**
 * Validate whether a string is a valid URL.
 */
export function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a URL for deduplication: strip hash, query, trailing slash.
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return parsed.href.replace(/\/$/, "");
}

/**
 * Derive a short name/slug from a URL's hostname.
 */
export function slugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/\./g, "-").replace(/^www-/, "");
  } catch {
    return "source";
  }
}
