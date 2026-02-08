/** Configuration for a single documentation source. */
export interface SourceConfig {
  name: string;
  url: string;
  crawl: boolean;
  maxDepth: number;
  output: string;
}

/** Top-level .ctxify.yaml configuration. */
export interface CtxifyConfig {
  version: number;
  outputDir: string;
  sources: SourceConfig[];
}
