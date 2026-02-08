import type { CheerioAPI } from "cheerio";

/** Identifies a documentation platform */
export type PlatformId =
  | "mintlify"
  | "docusaurus"
  | "gitbook"
  | "readme"
  | "generic";

/** Strategy for extracting content from a specific doc platform */
export interface PlatformStrategy {
  id: PlatformId;

  /** Check if this strategy applies to the given URL/HTML */
  detect(url: string, $: CheerioAPI): boolean;

  /** CSS selector for the main content container */
  contentSelector(): string;

  /** CSS selectors for elements to remove (nav, footer, etc.) */
  removeSelectors(): string[];

  /** CSS selector for sidebar/nav links (used in crawl mode) */
  navLinkSelector(): string | null;
}
