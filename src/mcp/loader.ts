import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

/** A single loaded documentation page. */
export interface LoadedPage {
  source: string;
  path: string;
  title: string;
  url: string;
  platform: string;
  fetchedAt: string;
  content: string;
}

/** A loaded documentation source (from _index.json). */
export interface LoadedSource {
  name: string;
  url: string;
  platform: string;
  fetchedAt: string;
  pageCount: number;
}

/** All loaded documentation data. */
export interface LoadedDocs {
  sources: LoadedSource[];
  pages: LoadedPage[];
}

interface RootManifest {
  sources: { name: string; path: string; fetched_at: string }[];
}

interface SourceManifest {
  name: string;
  url: string;
  platform: string;
  fetched_at: string;
  pages: { title: string; path: string }[];
}

/**
 * Load all documentation from a docs directory into memory.
 * Reads manifest.json → each source's _index.json → each page's .md file.
 * Silently skips missing files (no console output — critical for stdio transport).
 */
export function loadDocs(docsDir: string): LoadedDocs {
  const sources: LoadedSource[] = [];
  const pages: LoadedPage[] = [];

  let rootManifest: RootManifest;
  try {
    const raw = readFileSync(join(docsDir, "manifest.json"), "utf-8");
    rootManifest = JSON.parse(raw);
  } catch {
    return { sources: [], pages: [] };
  }

  for (const sourceEntry of rootManifest.sources) {
    const sourceDir = join(docsDir, sourceEntry.path);
    let sourceManifest: SourceManifest;
    try {
      const raw = readFileSync(join(sourceDir, "_index.json"), "utf-8");
      sourceManifest = JSON.parse(raw);
    } catch {
      continue;
    }

    let pageCount = 0;

    for (const pageEntry of sourceManifest.pages) {
      try {
        const raw = readFileSync(join(sourceDir, pageEntry.path), "utf-8");
        const parsed = matter(raw);
        pages.push({
          source: sourceManifest.name,
          path: pageEntry.path,
          title: pageEntry.title,
          url: String(parsed.data.source || ""),
          platform: String(parsed.data.platform || sourceManifest.platform),
          fetchedAt: String(parsed.data.fetched_at || sourceManifest.fetched_at),
          content: parsed.content.trim(),
        });
        pageCount++;
      } catch {
        continue;
      }
    }

    sources.push({
      name: sourceManifest.name,
      url: sourceManifest.url,
      platform: sourceManifest.platform,
      fetchedAt: sourceManifest.fetched_at,
      pageCount,
    });
  }

  return { sources, pages };
}
