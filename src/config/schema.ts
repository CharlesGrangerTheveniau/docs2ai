/** Configuration for a single documentation source. */
export interface SourceConfig {
  name: string;
  url: string;
  crawl: boolean;
  maxDepth: number;
  output: string;
}

/** Top-level .docs2ai.yaml configuration. */
export interface Docs2aiConfig {
  version: number;
  outputDir: string;
  sources: SourceConfig[];
}
