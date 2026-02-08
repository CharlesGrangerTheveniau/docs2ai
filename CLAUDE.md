# CLAUDE.md — doc2ctx

## Project Overview

doc2ctx is an open-source CLI tool that converts online documentation pages into clean, AI-ready Markdown files. The goal is to let developers paste a documentation URL and get a `.md` file they can drop into their project so that AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context about the APIs and libraries they're using.

## Core Pipeline

The architecture is a linear pipeline with modular stages:

```
URL → Resolver → Fetcher → Extractor → Transformer → Writer
```

- **Resolver**: Detects the doc platform (Mintlify, Docusaurus, GitBook, ReadMe, Swagger, generic) from URL patterns, HTML meta tags, or DOM structure. Returns a platform identifier that downstream stages use to select strategies.
- **Fetcher**: Retrieves the raw HTML. Two modes: fast path (native `fetch`/`ofetch` for static/SSR sites) and heavy path (Playwright for JS-rendered SPAs). Handles crawl mode (following sidebar links, respecting crawl depth). Rate limiting and politeness logic lives here.
- **Extractor**: Pulls meaningful content from raw HTML. Uses platform-specific selectors first (e.g. known content containers for Mintlify, Docusaurus), falls back to `@mozilla/readability` for generic extraction. Uses `cheerio` for DOM querying. Strips navbars, footers, cookie banners, sidebars.
- **Transformer**: Converts clean HTML to Markdown via `Turndown` + `turndown-plugin-gfm`. Custom rules handle code blocks, callouts/admonitions, tabbed content, and tables. Code block preservation (language tags, indentation) is critical — never break code examples.
- **Writer**: Outputs the final `.md` file with YAML frontmatter (source URL, fetch date, platform, title). Manages the `.doc2ctx.yaml` config file for multi-source projects.

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
- **Config**: `js-yaml` for `.doc2ctx.yaml`, `gray-matter` for frontmatter
- **Build**: `tsup` for building the CLI
- **Testing**: `vitest`
- **Linting**: `eslint` + `prettier`

## Project Structure

```
doc2ctx/
├── src/
│   ├── cli.ts              # CLI entry point, command definitions
│   ├── commands/
│   │   ├── fetch.ts         # `doc2ctx <url>` — one-shot extraction
│   │   ├── add.ts           # `doc2ctx add <url>` — add source to config
│   │   ├── update.ts        # `doc2ctx update` — refresh all sources
│   │   └── list.ts          # `doc2ctx list` — show configured sources
│   ├── pipeline/
│   │   ├── resolver.ts      # Platform detection
│   │   ├── fetcher.ts       # HTML fetching (static + browser)
│   │   ├── extractor.ts     # Content extraction from HTML
│   │   ├── transformer.ts   # HTML → Markdown conversion
│   │   └── writer.ts        # File output + frontmatter
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
│   ├── config/
│   │   ├── schema.ts        # Config file types
│   │   └── manager.ts       # Read/write .doc2ctx.yaml
│   └── utils/
│       ├── url.ts           # URL normalization, validation
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
├── .doc2ctx.yaml            # Example config
├── CLAUDE.md
└── README.md
```

## CLI Interface

```bash
# One-shot: fetch a single URL, output to stdout
doc2ctx https://developers.yousign.com/docs/set-up-your-account

# One-shot: fetch and write to file
doc2ctx https://developers.yousign.com/docs/set-up-your-account -o .ai/yousign.md

# Crawl mode: follow sidebar/nav links
doc2ctx https://developers.yousign.com/docs/set-up-your-account --crawl --max-depth 2 -o .ai/yousign.md

# Add a source to project config
doc2ctx add https://docs.stripe.com/api/charges --name stripe --crawl

# Refresh all configured sources
doc2ctx update

# Refresh one source
doc2ctx update --name stripe

# List configured sources
doc2ctx list
```

## Config File Format (.doc2ctx.yaml)

```yaml
version: 1
output_dir: .ai/docs
sources:
  - name: yousign
    url: https://developers.yousign.com/docs/set-up-your-account
    crawl: true
    max_depth: 2
    output: yousign.md
  - name: stripe
    url: https://docs.stripe.com/api/charges
    crawl: false
    output: stripe-charges.md
```

## Output Markdown Format

Generated files should have this structure:

```markdown
---
source: https://developers.yousign.com/docs/set-up-your-account
fetched_at: 2025-02-08T14:30:00Z
platform: mintlify
title: Set Up Your Account
doc2ctx_version: 0.1.0
---

# Set Up Your Account

[clean extracted content here]
```

## Design Principles

1. **Code blocks are sacred.** Never break, reformat, or lose code examples during extraction. Language tags and indentation must survive perfectly. Test this aggressively.
2. **Playwright is optional.** The core static fetch path must work without Playwright installed. Detect its absence gracefully and prompt the user to install it only when needed for JS-rendered sites.
3. **Platform strategies are pluggable.** Adding support for a new doc platform should mean adding one file in `src/platforms/` that implements the base interface. No changes to the pipeline.
4. **Sensible defaults, full control.** The tool should work great with zero config (`doc2ctx <url>`), but power users can control crawl depth, output paths, and more.
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
2. Detect and handle at least: Mintlify, Docusaurus, and generic sites
3. Preserve code blocks perfectly
4. Include proper frontmatter
5. Support basic crawl mode (follow nav/sidebar links)

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
- When stitching multi-page crawls into one file, add clear `## Page: <title>` separators and deduplicate repeated headers/footers.