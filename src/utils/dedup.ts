import { createHash } from "node:crypto";

interface PageContent {
  title: string;
  markdown: string;
}

/**
 * Deduplicate sections across crawled pages.
 * Removes paragraphs that appear in more than 50% of pages (likely boilerplate).
 */
export function deduplicateSections(pages: PageContent[]): PageContent[] {
  if (pages.length <= 1) return pages;

  // Count how many pages each paragraph hash appears in
  const paragraphCounts = new Map<string, number>();
  const threshold = Math.ceil(pages.length * 0.5);

  for (const page of pages) {
    const paragraphs = extractParagraphs(page.markdown);
    const seen = new Set<string>();
    for (const p of paragraphs) {
      const hash = hashParagraph(p);
      if (!seen.has(hash)) {
        seen.add(hash);
        paragraphCounts.set(hash, (paragraphCounts.get(hash) || 0) + 1);
      }
    }
  }

  // Build set of boilerplate hashes
  const boilerplate = new Set<string>();
  for (const [hash, count] of paragraphCounts) {
    if (count > threshold) {
      boilerplate.add(hash);
    }
  }

  if (boilerplate.size === 0) return pages;

  // Filter out boilerplate paragraphs
  return pages.map((page) => {
    const paragraphs = extractParagraphs(page.markdown);
    const filtered = paragraphs.filter((p) => !boilerplate.has(hashParagraph(p)));
    return { title: page.title, markdown: filtered.join("\n\n") };
  });
}

function extractParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function hashParagraph(text: string): string {
  return createHash("md5").update(text.trim()).digest("hex");
}
