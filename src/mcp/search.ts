import MiniSearch from "minisearch";
import type { LoadedPage } from "./loader";

/** A search result with metadata (no content). */
export interface SearchResult {
  source: string;
  path: string;
  title: string;
  url: string;
  score: number;
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
 * Build a full-text search index over all loaded pages.
 * Indexes title and content fields with prefix and fuzzy matching.
 */
export function buildSearchIndex(pages: LoadedPage[]): SearchIndex {
  const miniSearch = new MiniSearch<LoadedPage>({
    fields: ["title", "content"],
    storeFields: ["source", "path", "title", "url"],
    idField: "id",
  });

  const documents = pages.map((page, i) => ({
    id: String(i),
    ...page,
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
      }));
    },
  };
}
