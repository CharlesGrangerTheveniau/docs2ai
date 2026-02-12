# CLAUDE.md — docmunch

## Project Overview

docmunch is an open-source CLI tool that converts online documentation pages into clean, AI-ready Markdown files. The goal is to let developers paste a documentation URL and get a `.md` file they can drop into their project so that AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context about the APIs and libraries they're using.

## Core Pipeline

The architecture is a linear pipeline with modular stages:

```
URL → Resolver → Fetcher → Extractor → Transformer → Writer
```

- **Resolver**: Detects the doc platform (Mintlify, Docusaurus, GitBook, ReadMe, Swagger, generic) from URL patterns, HTML meta tags, or DOM structure. Returns a platform identifier that downstream stages use to select strategies.
- **Fetcher**: Retrieves the raw HTML. Three-tier fallback: (1) fast static fetch via `ofetch`, (2) headless Playwright if static fetch fails (403/406/429), (3) visible (non-headless) Playwright if bot protection challenge is detected (Cloudflare, etc.). Playwright is auto-installed on first need. Rate limiting and politeness logic lives here.
- **Extractor**: Pulls meaningful content from raw HTML. Uses platform-specific selectors first (e.g. known content containers for Mintlify, Docusaurus), falls back to `@mozilla/readability` for generic extraction. Uses `cheerio` for DOM querying. Strips navbars, footers, cookie banners, sidebars.
- **Transformer**: Converts clean HTML to Markdown via `Turndown` + `turndown-plugin-gfm`. Custom rules handle code blocks, callouts/admonitions, tabbed content, and tables. Code block preservation (language tags, indentation) is critical — never break code examples.
- **Writer**: Outputs Markdown with YAML frontmatter (source URL, fetch date, platform, title). Computes per-page token estimates and SHA-256 content hashes. Two output modes for crawl: single-file (all pages stitched with `---` separators) or directory (one `.md` per page with `_index.json` source manifest and `manifest.json` root manifest). Manages the `.docmunch.yaml` config file for multi-source projects.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **CLI framework**: `citty` (from UnJS) for command parsing
- **Terminal output**: `consola` for logs, spinners, progress
- **HTTP fetching**: `ofetch` for static pages and registry API calls
- **Browser automation**: `playwright` (optional/lazy dependency) for JS-rendered sites
- **DOM parsing**: `cheerio` for HTML querying and platform-specific selectors
- **Content extraction**: `@mozilla/readability` for generic content isolation
- **HTML → Markdown**: `turndown` + `turndown-plugin-gfm`
- **Config**: `js-yaml` for `.docmunch.yaml`, `gray-matter` for frontmatter
- **Hashing**: `node:crypto` (SHA-256) for content hashing
- **MCP**: `@modelcontextprotocol/sdk` for Model Context Protocol server, `zod` for tool input schemas
- **Search**: `minisearch` for full-text search over loaded docs
- **Build**: `tsup` for building the CLI
- **Testing**: `vitest`
- **Linting**: `eslint` + `prettier`

## Project Structure

```
docmunch/
├── src/
│   ├── cli.ts              # CLI entry point, command definitions
│   ├── commands/
│   │   ├── fetch.ts         # `docmunch <url>` — one-shot extraction
│   │   ├── add.ts           # `docmunch add <url>` — add source to config
│   │   ├── update.ts        # `docmunch update` — refresh all sources
│   │   ├── list.ts          # `docmunch list` — show configured sources
│   │   ├── serve.ts         # `docmunch serve` — start MCP server
│   │   ├── pull.ts          # `docmunch pull <name>` — download from registry
│   │   └── registry.ts     # `docmunch registry` — list registry sources
│   ├── pipeline/
│   │   ├── resolver.ts      # Platform detection
│   │   ├── fetcher.ts       # HTML fetching (static + browser)
│   │   ├── extractor.ts     # Content extraction from HTML
│   │   ├── transformer.ts   # HTML → Markdown conversion
│   │   ├── writer.ts        # File output + frontmatter + token/hash computation
│   │   ├── manifest.ts      # JSON manifest generation (_index.json, manifest.json)
│   │   └── meta-extractor.ts # Site-level metadata from <head> (og:*, icons, etc.)
│   ├── platforms/           # Platform-specific strategies
│   │   ├── base.ts          # Base platform interface
│   │   ├── registry.ts      # Platform strategy registry (getStrategy)
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
│   │   ├── search.ts        # Full-text search with MiniSearch + preview generation
│   │   └── server.ts        # MCP server with 4 tools + registry options plumbing
│   ├── config/
│   │   ├── schema.ts        # Config file types
│   │   └── manager.ts       # Read/write .docmunch.yaml
│   └── utils/
│       ├── url.ts           # URL normalization, validation, hostname slugging
│       ├── slug.ts          # Pathname-based slugging for directory output
│       ├── dedup.ts         # Content deduplication for multi-page crawls
│       └── tokens.ts        # Token estimation (~4 chars/token heuristic)
├── tests/
│   ├── pipeline/            # resolver, extractor, transformer, writer, manifest, meta-extractor
│   ├── platforms/           # mintlify, docusaurus, gitbook, readme, generic
│   ├── mcp/                 # loader, search, server
│   ├── crawl/               # boundary
│   ├── config/              # manager
│   ├── integration/         # full pipeline tests
│   ├── utils/               # slug, tokens
│   └── fixtures/            # Saved HTML snapshots + MCP doc fixtures
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .docmunch.yaml
├── CLAUDE.md
└── README.md
```

## CLI Interface

```bash
# One-shot: fetch a single URL, output to stdout
docmunch https://developers.yousign.com/docs/set-up-your-account

# One-shot: fetch and write to file
docmunch https://developers.yousign.com/docs/set-up-your-account -o .ai/yousign.md

# Crawl mode: directory output (one .md per page + manifests)
# Defaults to .ai/docs/<name>/ when no -o is given
docmunch https://developers.yousign.com/docs/set-up-your-account --crawl --name yousign

# Crawl mode: explicit directory output
docmunch https://developers.yousign.com/docs/set-up-your-account --crawl -o .ai/docs/yousign/

# Crawl mode: single-file output (backward compatible, when -o ends with .md)
docmunch https://developers.yousign.com/docs/set-up-your-account --crawl -o .ai/yousign.md

# Force rewrite (skip change detection)
docmunch https://docs.stripe.com/api/charges --crawl --name stripe --force

# Add a source to project config (crawl sources default to directory output)
docmunch add https://docs.stripe.com/api/charges --name stripe --crawl

# Refresh all configured sources
docmunch update

# Refresh one source
docmunch update --name stripe

# List configured sources
docmunch list

# Browse available docs on the registry
docmunch registry
docmunch registry --json

# Download pre-crawled docs from registry
docmunch pull stripe
docmunch pull stripe --registry-url https://custom.registry.dev --token <token>

# Start MCP server (exposes docs to AI tools via Model Context Protocol)
docmunch serve                          # default: serves .ai/docs/
docmunch serve -d ./my-docs/            # custom directory
docmunch serve --registry               # stream from hosted registry (future)
docmunch serve --registry --team myteam # scoped to team (future)
```

## Registry Commands

### `docmunch registry` — browse available sources

Lists all documentation sources available on the hosted registry.

```bash
docmunch registry                              # list all sources
docmunch registry --json                       # raw JSON output
docmunch registry --registry-url <url>         # custom registry
docmunch registry --token <token>              # authenticated access
```

Hits `GET {registryUrl}/api/sources`. Shows name, URL, platform, page count, token estimate, and description for each source.

### `docmunch pull <name>` — download a source

The `pull` command downloads a pre-crawled documentation package from the hosted registry API.

```bash
docmunch pull <name> [--registry-url <url>] [--token <token>] [--force]
```

- `name` — positional, required (source name like "stripe")
- `--registry-url` — base URL of registry API (default: `https://docmunch.dev`, overridable via `DOCMUNCH_REGISTRY_URL` env var)
- `--token` — auth token for paid access (default from `DOCMUNCH_TOKEN` env var)
- `--force` — overwrite existing files even if unchanged

**Flow**: Hits `GET {registryUrl}/api/pull/{name}`, downloads each page's `.md` content, writes to `{outputDir}/{name}/`, builds `_index.json` and updates `manifest.json`, and optionally adds the source to `.docmunch.yaml`.

**Note**: Requires the hosted registry API (Repo 2) to be available. Can be tested against a mock endpoint.

## MCP Server

The `serve` command starts a Model Context Protocol (MCP) server over stdio, exposing fetched documentation to AI coding tools like Claude Code and Cursor.

### How it works

The server reads the on-disk directory structure produced by crawl mode (`manifest.json` → `_index.json` → `.md` files), loads all content into memory, and builds a full-text search index with previews. It exposes 4 tools:

| Tool | Input | Returns |
|------|-------|---------|
| `list_sources` | — | All sources with name, url, platform, pageCount, displayName, description, iconUrl |
| `list_pages` | `source` | Pages in that source (title + path) |
| `read_page` | `source`, `path`, `sections?` | Full markdown content of one page, or only specific sections if `sections` array is provided |
| `search_docs` | `query`, `source?`, `limit?` | Matching pages with metadata + preview excerpt (~200 chars) |

### Claude Code setup

```bash
claude mcp add --scope project docmunch -- npx docmunch serve -d .ai/docs/
```

Run `/mcp` inside Claude Code to verify the connection. Use `--scope user` instead to make it available across all projects.

### Cursor setup

Open Settings (`Cmd+,` / `Ctrl+,`) → **MCP** → **+ Add new MCP server**:

- **Name**: `docmunch`
- **Type**: `command`
- **Command**: `npx docmunch serve -d .ai/docs/`

Or create `.cursor/mcp.json` at the project root:

```json
{
  "mcpServers": {
    "docmunch": {
      "command": "npx",
      "args": ["docmunch", "serve", "-d", ".ai/docs/"]
    }
  }
}
```

Restart Cursor for the server to be picked up. A green dot in Settings → MCP confirms it's running.

### Architecture notes

- **stdout is sacred** — The MCP server communicates over stdio. **All logging MUST go to stderr, never stdout.** Any stdout output that isn't valid MCP JSON-RPC will break the protocol. This means: no `console.log()`, no `consola`, no `process.stdout.write()` anywhere in the MCP codepath (`src/mcp/`, `src/commands/serve.ts`). If you need to log for debugging, use `process.stderr.write()` or `console.error()`.
- **Dynamic imports enforce the boundary** — `serve.ts` uses `await import()` for `../mcp/server` and the MCP SDK. This keeps consola (used by fetch/crawl commands) from being loaded into the serve process. Do not convert these to static imports.
- **No imports from `src/pipeline/` or `src/platforms/`** — the MCP server reads the on-disk format directly, keeping clean separation from the fetch pipeline. These modules use consola and would pollute stdout.
- **Errors are silent** — `loader.ts` catches file-read errors and skips silently (no console output). This is intentional — logging would corrupt the stdio transport.
- **Eager loading** — all markdown loaded at startup since the search index needs it. 100-200 pages is well within memory limits.
- **Token-efficient** — `list_sources`, `list_pages`, and `search_docs` return metadata only (search_docs includes ~200 char previews). `read_page` returns full content by default, but supports optional `sections` filtering to return only specific heading sections, reducing token usage.
- **Registry plumbing** — `createMcpServer` accepts optional `RegistryOptions` (`url`, `token`, `team`) for future remote source loading. The plumbing is in place but actual remote fetching is deferred until the registry API is finalized.

## Config File Format (.docmunch.yaml)

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
docmunch_version: 0.2.0
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
  "total_tokens": 12500,
  "pages": [
    { "title": "Set Up Your Account", "path": "set-up-your-account.md", "token_count": 850, "content_hash": "a1b2c3..." },
    { "title": "Authentication", "path": "guides/authentication.md", "token_count": 1200, "content_hash": "d4e5f6..." }
  ],
  "display_name": "Yousign Docs",
  "description": "Official Yousign API documentation",
  "icon_url": "https://developers.yousign.com/favicon.ico",
  "page_count": 2
}
```

The root `manifest.json`:

```json
{
  "sources": [
    {
      "name": "yousign",
      "path": "yousign/",
      "fetched_at": "2025-02-08T14:30:00Z",
      "display_name": "Yousign Docs",
      "description": "Official Yousign API documentation",
      "icon_url": "https://developers.yousign.com/favicon.ico",
      "page_count": 15,
      "total_tokens": 12500
    }
  ]
}
```

### Manifest fields

- **`token_count`** (per page): Estimated token count of the page's markdown content (~4 chars/token heuristic). Useful for AI context budgeting.
- **`content_hash`** (per page): SHA-256 hash of the markdown body (post-transform, excluding frontmatter). Enables smart refresh — only re-process changed pages.
- **`total_tokens`** (per source): Sum of all page token counts.

### Output mode decision logic

```
if (!crawl)                          → single file (unchanged)
if (crawl && -o ends with .md)       → single file (backward compat)
if (crawl && no -o)                  → directory at .ai/docs/<name>/
if (crawl && -o doesn't end with .md)→ directory at -o path
```

## Design Principles

1. **Code blocks are sacred.** Never break, reformat, or lose code examples during extraction. Language tags and indentation must survive perfectly. Test this aggressively.
2. **Playwright is auto-installed.** The core static fetch path works without Playwright. When a site blocks static fetch (403, Cloudflare), the fetcher auto-installs Playwright globally on first need and retries with a browser. No manual setup required.
3. **Platform strategies are pluggable.** Adding support for a new doc platform should mean adding one file in `src/platforms/` that implements the base interface. No changes to the pipeline.
4. **Sensible defaults, full control.** The tool should work great with zero config (`docmunch <url>`), but power users can control crawl depth, output paths, and more.
5. **Deterministic and testable.** Use saved HTML fixtures for tests so they don't depend on live sites. The pipeline is pure functions where possible (input HTML → output Markdown).
6. **Lean dependencies.** Don't add dependencies for things the stdlib can handle. Every dependency should earn its place. Token estimation uses a simple heuristic, content hashing uses `node:crypto`.

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

- 162 tests across 19 test files
- Unit tests for each pipeline stage using HTML fixtures
- Integration tests that run the full pipeline on fixture files
- Platform-specific tests with saved HTML from each doc site
- MCP server tests (loader, search with previews, server tool handlers)
- Utility tests (slug generation, token estimation)
- No live network calls in tests (mock fetch, use fixtures)
- Test code block preservation specifically — this is the most important quality signal

## Current State (v0.3)

All core functionality is implemented and working:

1. Single URL fetch with stdout or file output
2. Platform detection: Mintlify, Docusaurus, GitBook, ReadMe, and generic (Readability fallback)
3. Perfect code block preservation
4. YAML frontmatter on all output
5. Crawl mode with directory output (one .md per page + JSON manifests)
6. Backward-compatible single-file crawl output when `-o file.md` is used
7. Config management via `.docmunch.yaml` (`add`, `update`, `list` commands)
8. MCP server with 4 tools (list_sources, list_pages, read_page, search_docs with previews)
9. Site metadata extraction (display_name, description, icon_url, og_image, language)
10. Token estimation per page (`token_count`) and source (`total_tokens`)
11. Content hashing per page (`content_hash`, SHA-256)
12. Search result previews (~200 char excerpts) in MCP search_docs
13. `pull` command for downloading from hosted registry
14. `registry` command for browsing available sources on the registry
15. `--force` flag for forcing rewrites even when content is unchanged
16. Smart change detection (skips writing unchanged files, ignoring timestamp differences)
17. Graceful Ctrl+C during crawl with save/discard prompt
18. `--registry` and `--team` flags on serve (plumbing for future remote loading)
19. Section filtering on `read_page` MCP tool (optional `sections` param to reduce tokens)

### Upcoming / not yet implemented

- Registry API remote loading in MCP server (plumbed, waiting for Repo 2 API)
- LLM-based summarization or token budgets
- Auth-gated docs
- PDF or non-HTML sources
- Web UI

## Common Pitfalls

- Many doc sites lazy-load content or use client-side rendering. If extraction returns empty/minimal content, the fetcher should automatically retry with Playwright.
- Sidebar navigation structures vary wildly between platforms. Don't assume a single CSS selector works everywhere. The resolver + platform strategy pattern exists for this reason.
- Some doc sites use custom web components (e.g. `<code-block>`, `<callout>`) that Turndown won't know about. Add custom Turndown rules for common ones.
- When crawling, avoid infinite loops from circular links. Track visited URLs.
- When stitching multi-page crawls into one file (single-file mode), add clear `## Page: <title>` separators and deduplicate repeated headers/footers. Directory mode avoids this problem by writing one file per page.
- **MCP server + stdout**: The MCP stdio transport uses stdout for JSON-RPC messages. Any non-JSON-RPC output on stdout (e.g. `console.log`, consola, debug prints) will break the protocol and cause cryptic connection failures. Code in `src/mcp/` and `src/commands/serve.ts` must never write to stdout. Use `console.error()` or `process.stderr.write()` if you need debug output. The dynamic imports in `serve.ts` exist specifically to prevent consola from being loaded.

## Fetcher Fallback Chain

The fetcher (`src/pipeline/fetcher.ts`) uses a three-tier strategy:

1. **Static fetch** (`ofetch`) — fast, no dependencies. Works for most doc sites.
2. **Headless Playwright** — triggered on HTTP 403, 406, or 429. Handles JS-rendered SPAs.
3. **Visible Playwright** (`headless: false`) — triggered when headless returns a bot-protection challenge page (Cloudflare "Verify you are human", etc.). A browser window briefly opens and closes.

Challenge detection uses pattern matching on the response HTML (`isChallengeContent`). Patterns: "verify you are human", "just a moment", "checking your browser", etc.

Playwright is auto-installed globally (`npm install -g playwright && npx playwright install chromium`) on first need. If auto-install fails, a clear error message tells the user what to run manually.

**Build note**: `playwright` is marked as `external` in `tsup.config.ts` to prevent bundling. It's loaded via dynamic `import("playwright")`.

## Crawl Boundary Logic

The crawler (`src/crawl/crawler.ts`) determines which URLs to follow using a path prefix:

1. `getCrawlPrefix(startUrl)` extracts the initial prefix by removing the last path segment (e.g. `https://example.com/api/docs/intro` → prefix `/api/docs/`).
2. **Boundary widening** (only for known platforms): When a platform strategy provides a `navLinkSelector`, the crawler collects all same-origin nav links on the first page and computes their common path prefix via `computeCommonPrefix`. This widens the boundary to cover the full doc tree.
3. **Generic sites never widen.** The generic strategy has `navLinkSelector: null`. Even though it provides `discoverUrls` (heuristic sidebar detection), this is only used for link discovery — links are filtered against the tight URL prefix from step 1. This prevents non-doc links (site nav, footer links) from expanding the crawl scope.
4. **Generic sidebar detection** (`discoverUrls` in `src/platforms/generic.ts`): Tries sidebar-specific CSS selectors (`aside a`, `[class*="sidebar"] a`, etc.) to find doc navigation links. Returns empty if no sidebar-like structure is found — the crawler then only follows links matching the URL prefix.

### Graceful interruption

Pressing Ctrl+C during a crawl stops the BFS loop and prompts the user to save or discard pages collected so far. A second Ctrl+C force-exits.

## Error Handling

`cli.ts` registers global `uncaughtException` and `unhandledRejection` handlers to format errors nicely via consola instead of showing raw stack traces. The `ERR_PLAYWRIGHT_NOT_INSTALLED` error code gets a user-friendly message.
