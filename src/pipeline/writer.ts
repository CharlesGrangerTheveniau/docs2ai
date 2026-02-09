import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import matter from "gray-matter";

export interface WriterOptions {
  sourceUrl: string;
  title: string;
  platform: string;
}

/**
 * Write Markdown with frontmatter to a file or stdout.
 */
export function write(
  markdown: string,
  outputPath: string | undefined,
  options: WriterOptions
): void {
  const content = matter.stringify(markdown, {
    source: options.sourceUrl,
    fetched_at: new Date().toISOString(),
    platform: options.platform,
    title: options.title,
    docs2ai_version: "0.1.0",
  });

  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf-8");
  } else {
    process.stdout.write(content);
  }
}
