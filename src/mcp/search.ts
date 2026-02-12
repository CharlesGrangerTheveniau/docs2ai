import MiniSearch from "minisearch";
import type { LoadedPage } from "./loader";

/** A search result with metadata and optional preview (no full content). */
export interface SearchResult {
  source: string;
  path: string;
  title: string;
  url: string;
  score: number;
  preview: string;
}

/** Options for searching the index. */
export interface SearchOptions {
  source?: string;
  limit?: number;
}

/** Search index over loaded documentation pages. */
export interface SearchIndex {
  search(query: string, options?: SearchOptions): SearchResult[];
}

/**
 * Extract specific sections from markdown content by heading text.
 * Matches headings (any level) whose text contains one of the given section names (case-insensitive).
 * Returns the matched heading and all content until the next heading of equal or higher level.
 */
export function extractSections(
  content: string,
  sections: string[]
): string | null {
  if (!sections.length) return null;

  const lines = content.split("\n");
  const lowerSections = sections.map((s) => s.toLowerCase());
  const result: string[] = [];
  let capturing = false;
  let captureLevel = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].toLowerCase().trim();

      if (lowerSections.some((s) => text.includes(s))) {
        capturing = true;
        captureLevel = level;
        result.push(line);
        continue;
      }

      if (capturing && level <= captureLevel) {
        capturing = false;
      }
    }

    if (capturing) {
      result.push(line);
    }
  }

  return result.length > 0 ? result.join("\n").trim() : null;
}

/**
 * List all top-level section headings in a markdown document.
 * Returns heading text without the # prefix.
 */
export function listSections(content: string): string[] {
  const headings: string[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      headings.push(match[1].trim());
    }
  }
  return headings;
}

/**
 * Generate a short preview from page content.
 * Strips the first heading, trims to ~maxLength chars at a word boundary.
 */
export function generatePreview(content: string, maxLength = 200): string {
  const clean = content.replace(/^#.*\n/, "").trim();
  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

/**
 * Build a full-text search index over all loaded pages.
 * Indexes title and content fields with prefix and fuzzy matching.
 * Stores a preview per page for inclusion in search results.
 */
export function buildSearchIndex(pages: LoadedPage[]): SearchIndex {
  const miniSearch = new MiniSearch({
    fields: ["title", "content"],
    storeFields: ["source", "path", "title", "url", "preview"],
    idField: "id",
  });

  const documents = pages.map((page, i) => ({
    id: String(i),
    ...page,
    preview: generatePreview(page.content),
  }));

  miniSearch.addAll(documents);

  return {
    search(query: string, options?: SearchOptions): SearchResult[] {
      if (!query.trim()) return [];

      const filter = options?.source
        ? (result: { source: string }) => result.source === options.source
        : undefined;

      const results = miniSearch.search(query, {
        prefix: true,
        fuzzy: 0.2,
        filter: filter as any,
      });

      const limit = options?.limit ?? 10;

      return results.slice(0, limit).map((r) => ({
        source: r.source as string,
        path: r.path as string,
        title: r.title as string,
        url: r.url as string,
        score: r.score,
        preview: (r.preview as string) || "",
      }));
    },
  };
}
