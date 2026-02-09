# CLAUDE.md — docs2ai

## Project Overview

docs2ai is an open-source CLI tool that converts online documentation pages into clean, AI-ready Markdown files. The goal is to let developers paste a documentation URL and get a `.md` file they can drop into their project so that AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context about the APIs and libraries they're using.

## Core Pipeline

The architecture is a linear pipeline with modular stages:

```
URL → Resolver → Fetcher → Extractor → Transformer → Writer
```

- **Resolver**: Detects the doc platform (Mintlify, Docusaurus, GitBook, ReadMe, Swagger, generic) from URL patterns, HTML meta tags, or DOM structure. Returns a platform identifier that downstream stages use to select strategies.
- **Fetcher**: Retrieves the raw HTML. Two modes: fast path (native `fetch`/`ofetch` for static/SSR sites) and heavy path (Playwright for JS-rendered SPAs). Handles crawl mode (following sidebar links, respecting crawl depth). Rate limiting and politeness logic lives here.
- **Extractor**: Pulls meaningful content from raw HTML. Uses platform-specific selectors first (e.g. known content containers for Mintlify, Docusaurus), falls back to `@mozilla/readability` for generic extraction. Uses `cheerio` for DOM querying. Strips navbars, footers, cookie banners, sidebars.
- **Transformer**: Converts clean HTML to Markdown via `Turndown` + `turndown-plugin-gfm`. Custom rules handle code blocks, callouts/admonitions, tabbed content, and tables. Code block preservation (language tags, indentation) is critical — never break code examples.
- **Writer**: Outputs Markdown with YAML frontmatter (source URL, fetch date, platform, title). Two output modes for crawl: single-file (all pages stitched with `---` separators) or directory (one `.md` per page with `_index.json` source manifest and `manifest.json` root manifest). Manages the `.docs2ai.yaml` config file for multi-source projects.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **CLI framework**: `citty` (from UnJS) for command parsing
- **Terminal output**: `consola` for logs, spinners, progress
- **HTTP fetching**: `ofetch` for static pages
- **Browser automation**: `playwright` (optional/lazy dependency) for JS-rendered sites
- **DOM parsing**: `cheerio` for HTML querying and platform-specific selectors
- **Content extraction**: `@mozilla/readability` for generic content isolation
- **HTML → Markdown**: `turndown` + `turndown-plugin-gfm`
- **Config**: `js-yaml` for `.docs2ai.yaml`, `gray-matter` for frontmatter
- **MCP**: `@modelcontextprotocol/sdk` for Model Context Protocol server, `zod` for tool input schemas
- **Search**: `minisearch` for full-text search over loaded docs
- **Build**: `tsup` for building the CLI
- **Testing**: `vitest`
- **Linting**: `eslint` + `prettier`

## Project Structure

```
docs2ai/
├── src/
│   ├── cli.ts              # CLI entry point, command definitions
│   ├── commands/
│   │   ├── fetch.ts         # `docs2ai <url>` — one-shot extraction
│   │   ├── add.ts           # `docs2ai add <url>` — add source to config
│   │   ├── update.ts        # `docs2ai update` — refresh all sources
│   │   ├── list.ts          # `docs2ai list` — show configured sources
│   │   └── serve.ts         # `docs2ai serve` — start MCP server
│   ├── pipeline/
│   │   ├── resolver.ts      # Platform detection
│   │   ├── fetcher.ts       # HTML fetching (static + browser)
│   │   ├── extractor.ts     # Content extraction from HTML
│   │   ├── transformer.ts   # HTML → Markdown conversion
│   │   ├── writer.ts        # File output + frontmatter (single & directory modes)
│   │   └── manifest.ts      # JSON manifest generation (_index.json, manifest.json)
│   ├── platforms/           # Platform-specific strategies
│   │   ├── base.ts          # Base platform interface
│   │   ├── mintlify.ts
│   │   ├── docusaurus.ts
│   │   ├── gitbook.ts
│   │   ├── readme.ts
│   │   └── generic.ts       # Fallback using Readability
│   ├── crawl/
│   │   ├── crawler.ts       # Link discovery + crawl orchestration
│   │   └── boundary.ts      # Crawl boundary detection (URL prefix, nav scope)
│   ├── mcp/
│   │   ├── loader.ts        # Reads docs directory into memory
│   │   ├── search.ts        # Full-text search with MiniSearch
│   │   └── server.ts        # MCP server with 4 tools
│   ├── config/
│   │   ├── schema.ts        # Config file types
│   │   └── manager.ts       # Read/write .docs2ai.yaml
│   └── utils/
│       ├── url.ts           # URL normalization, validation, hostname slugging
│       ├── slug.ts          # Pathname-based slugging for directory output
│       ├── dedup.ts         # Content deduplication for multi-page crawls
│       └── tokens.ts        # Token estimation (future)
├── tests/
│   ├── pipeline/
│   ├── platforms/
│   └── fixtures/            # Saved HTML snapshots for deterministic tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .docs2ai.yaml            # Example config
├── CLAUDE.md
└── README.md
```

## CLI Interface

```bash
# One-shot: fetch a single URL, output to stdout
docs2ai https://developers.yousign.com/docs/set-up-your-account

# One-shot: fetch and write to file
docs2ai https://developers.yousign.com/docs/set-up-your-account -o .ai/yousign.md

# Crawl mode: directory output (one .md per page + manifests)
# Defaults to .ai/docs/<name>/ when no -o is given
docs2ai https://developers.yousign.com/docs/set-up-your-account --crawl --name yousign

# Crawl mode: explicit directory output
docs2ai https://developers.yousign.com/docs/set-up-your-account --crawl -o .ai/docs/yousign/

# Crawl mode: single-file output (backward compatible, when -o ends with .md)
docs2ai https://developers.yousign.com/docs/set-up-your-account --crawl -o .ai/yousign.md

# Add a source to project config (crawl sources default to directory output)
docs2ai add https://docs.stripe.com/api/charges --name stripe --crawl

# Refresh all configured sources
docs2ai update

# Refresh one source
docs2ai update --name stripe

# List configured sources
docs2ai list

# Start MCP server (exposes docs to AI tools via Model Context Protocol)
docs2ai serve                          # default: serves .ai/docs/
docs2ai serve -d ./my-docs/            # custom directory
```

## MCP Server

The `serve` command starts a Model Context Protocol (MCP) server over stdio, exposing fetched documentation to AI coding tools like Claude Code and Cursor.

### How it works

The server reads the on-disk directory structure produced by crawl mode (`manifest.json` → `_index.json` → `.md` files), loads all content into memory, and builds a full-text search index. It exposes 4 tools:

| Tool | Input | Returns |
|------|-------|---------|
| `list_sources` | — | All sources with name, url, platform, pageCount |
| `list_pages` | `source` | Pages in that source (title + path) |
| `read_page` | `source`, `path` | Full markdown content of one page |
| `search_docs` | `query`, `source?`, `limit?` | Matching pages (metadata only, no content) |

### Claude Code configuration

```json
{
  "mcpServers": {
    "docs2ai": {
      "command": "npx",
      "args": ["docs2ai", "serve", "-d", ".ai/docs/"]
    }
  }
}
```

### Architecture notes

- **stdout is sacred** — The MCP server communicates over stdio. **All logging MUST go to stderr, never stdout.** Any stdout output that isn't valid MCP JSON-RPC will break the protocol. This means: no `console.log()`, no `consola`, no `process.stdout.write()` anywhere in the MCP codepath (`src/mcp/`, `src/commands/serve.ts`). If you need to log for debugging, use `process.stderr.write()` or `console.error()`.
- **Dynamic imports enforce the boundary** — `serve.ts` uses `await import()` for `../mcp/server` and the MCP SDK. This keeps consola (used by fetch/crawl commands) from being loaded into the serve process. Do not convert these to static imports.
- **No imports from `src/pipeline/` or `src/platforms/`** — the MCP server reads the on-disk format directly, keeping clean separation from the fetch pipeline. These modules use consola and would pollute stdout.
- **Errors are silent** — `loader.ts` catches file-read errors and skips silently (no console output). This is intentional — logging would corrupt the stdio transport.
- **Eager loading** — all markdown loaded at startup since the search index needs it. 100-200 pages is well within memory limits.
- **Token-efficient** — `list_sources`, `list_pages`, and `search_docs` return metadata only. Only `read_page` returns full content, minimizing context window usage.

## Config File Format (.docs2ai.yaml)

```yaml
version: 1
output_dir: .ai/docs
sources:
  - name: yousign
    url: https://developers.yousign.com/docs/set-up-your-account
    crawl: true
    max_depth: 2
    output: yousign/          # directory output (one .md per page + _index.json)
  - name: stripe
    url: https://docs.stripe.com/api/charges
    crawl: false
    output: stripe-charges.md # single-file output
```

## Output Formats

### Single-file output

Used for non-crawl fetches, or crawl with `-o file.md`:

```markdown
---
source: https://developers.yousign.com/docs/set-up-your-account
fetched_at: 2025-02-08T14:30:00Z
platform: mintlify
title: Set Up Your Account
docs2ai_version: 0.1.0
---

# Set Up Your Account

[clean extracted content here]
```

### Directory output (crawl mode default)

One `.md` file per crawled page, with JSON manifests for machine consumption:

```
.ai/docs/
├── manifest.json              ← root manifest (all sources)
└── yousign/
    ├── _index.json            ← source manifest (this source's pages)
    ├── set-up-your-account.md
    ├── guides/
    │   └── authentication.md
    └── api/
        └── webhooks.md
```

Each page `.md` has the same frontmatter as single-file output. The `_index.json` manifest:

```json
{
  "name": "yousign",
  "url": "https://developers.yousign.com/docs/set-up-your-account",
  "platform": "mintlify",
  "fetched_at": "2025-02-08T14:30:00Z",
  "pages": [
    { "title": "Set Up Your Account", "path": "set-up-your-account.md" },
    { "title": "Authentication", "path": "guides/authentication.md" }
  ]
}
```

### Output mode decision logic

```
if (!crawl)                          → single file (unchanged)
if (crawl && -o ends with .md)       → single file (backward compat)
if (crawl && no -o)                  → directory at .ai/docs/<name>/
if (crawl && -o doesn't end with .md)→ directory at -o path
```

## Design Principles

1. **Code blocks are sacred.** Never break, reformat, or lose code examples during extraction. Language tags and indentation must survive perfectly. Test this aggressively.
2. **Playwright is optional.** The core static fetch path must work without Playwright installed. Detect its absence gracefully and prompt the user to install it only when needed for JS-rendered sites.
3. **Platform strategies are pluggable.** Adding support for a new doc platform should mean adding one file in `src/platforms/` that implements the base interface. No changes to the pipeline.
4. **Sensible defaults, full control.** The tool should work great with zero config (`docs2ai <url>`), but power users can control crawl depth, output paths, and more.
5. **Deterministic and testable.** Use saved HTML fixtures for tests so they don't depend on live sites. The pipeline is pure functions where possible (input HTML → output Markdown).
6. **Lean dependencies.** Don't add dependencies for things the stdlib can handle. Every dependency should earn its place.

## Coding Conventions

- Use `async/await` everywhere, no raw promises or callbacks
- Use named exports, no default exports (except where required by tooling)
- Error handling: throw typed errors with descriptive messages, catch and format them nicely at the CLI layer only. Never silently swallow errors.
- Use `interface` for public contracts, `type` for unions and utility types
- File names: kebab-case. Variables/functions: camelCase. Types/interfaces: PascalCase.
- Keep functions small and focused. If a function is doing more than one pipeline stage, split it.
- Write JSDoc comments on all public interfaces and exported functions
- Prefer explicit return types on exported functions

## Testing Approach

- Unit tests for each pipeline stage using HTML fixtures
- Integration tests that run the full pipeline on fixture files
- Platform-specific tests with saved HTML from each doc site
- No live network calls in tests (mock fetch, use fixtures)
- Test code block preservation specifically — this is the most important quality signal

## Current Focus (v0.1)

Ship a working CLI that can:
1. Take a single URL and output clean Markdown to stdout or a file
2. Detect and handle at least: Mintlify, Docusaurus, GitBook, ReadMe, and generic sites
3. Preserve code blocks perfectly
4. Include proper frontmatter
5. Support crawl mode with directory output (one .md per page + JSON manifests)
6. Backward-compatible single-file crawl output when `-o file.md` is used

NOT in scope for v0.1:
- LLM-based summarization or token budgets
- Auth-gated docs
- PDF or non-HTML sources
- Web UI
- Doc registry / sharing

## Common Pitfalls

- Many doc sites lazy-load content or use client-side rendering. If extraction returns empty/minimal content, the fetcher should automatically retry with Playwright.
- Sidebar navigation structures vary wildly between platforms. Don't assume a single CSS selector works everywhere. The resolver + platform strategy pattern exists for this reason.
- Some doc sites use custom web components (e.g. `<code-block>`, `<callout>`) that Turndown won't know about. Add custom Turndown rules for common ones.
- When crawling, avoid infinite loops from circular links. Track visited URLs.
- When stitching multi-page crawls into one file (single-file mode), add clear `## Page: <title>` separators and deduplicate repeated headers/footers. Directory mode avoids this problem by writing one file per page.
- **MCP server + stdout**: The MCP stdio transport uses stdout for JSON-RPC messages. Any non-JSON-RPC output on stdout (e.g. `console.log`, consola, debug prints) will break the protocol and cause cryptic connection failures. Code in `src/mcp/` and `src/commands/serve.ts` must never write to stdout. Use `console.error()` or `process.stderr.write()` if you need debug output. The dynamic imports in `serve.ts` exist specifically to prevent consola from being loaded.