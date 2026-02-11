import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import matter from "gray-matter";
import { filePathForPage } from "../utils/slug";

/** Strip the fetched_at line so two outputs can be compared ignoring timestamp. */
function stripTimestamp(content: string): string {
  return content.replace(/^fetched_at:.*$/m, "");
}

export interface WriterOptions {
  sourceUrl: string;
  title: string;
  platform: string;
  force?: boolean;
}

/**
 * Write Markdown with frontmatter to a file or stdout.
 * Returns true if the file was actually written (content changed), false if skipped.
 */
export function write(
  markdown: string,
  outputPath: string | undefined,
  options: WriterOptions
): boolean {
  const content = matter.stringify(markdown, {
    source: options.sourceUrl,
    fetched_at: new Date().toISOString(),
    platform: options.platform,
    title: options.title,
    docmunch_version: "0.2.0",
  });

  if (outputPath) {
    if (!options.force && existsSync(outputPath)) {
      try {
        const existing = readFileSync(outputPath, "utf-8");
        if (stripTimestamp(existing) === stripTimestamp(content)) return false;
      } catch {
        // Can't read existing, write anyway
      }
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf-8");
    return true;
  } else {
    process.stdout.write(content);
    return true;
  }
}

/**
 * Write a single page's Markdown with frontmatter to a file path.
 * Returns true if the file was actually written (content changed), false if skipped.
 */
export function writePage(
  markdown: string,
  filePath: string,
  options: WriterOptions
): boolean {
  const content = matter.stringify(markdown, {
    source: options.sourceUrl,
    fetched_at: new Date().toISOString(),
    platform: options.platform,
    title: options.title,
    docmunch_version: "0.2.0",
  });

  if (!options.force && existsSync(filePath)) {
    try {
      const existing = readFileSync(filePath, "utf-8");
      if (stripTimestamp(existing) === stripTimestamp(content)) return false;
    } catch {
      // Can't read existing, write anyway
    }
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return true;
}

export interface PageEntry {
  url: string;
  title: string;
  platform: string;
  markdown: string;
}

export interface WritePagesResult {
  entries: { title: string; path: string }[];
  written: number;
}

/**
 * Write multiple crawled pages to a directory, one .md file per page.
 * Skips files whose content hasn't changed (ignoring fetched_at).
 * Returns manifest page entries and the number of files actually written.
 */
export function writePages(
  pages: PageEntry[],
  outputDir: string,
  basePrefix: string,
  options?: { force?: boolean }
): WritePagesResult {
  const usedPaths = new Set<string>();
  const entries: { title: string; path: string }[] = [];
  let written = 0;

  for (const page of pages) {
    let relPath = filePathForPage(page.url, basePrefix);

    // Handle slug collisions by appending a numeric suffix
    if (usedPaths.has(relPath)) {
      const base = relPath.replace(/\.md$/, "");
      let i = 2;
      while (usedPaths.has(`${base}-${i}.md`)) i++;
      relPath = `${base}-${i}.md`;
    }
    usedPaths.add(relPath);

    const filePath = join(outputDir, relPath);
    const didWrite = writePage(page.markdown, filePath, {
      sourceUrl: page.url,
      title: page.title,
      platform: page.platform,
      force: options?.force,
    });
    if (didWrite) written++;

    entries.push({ title: page.title, path: relPath });
  }

  return { entries, written };
}
