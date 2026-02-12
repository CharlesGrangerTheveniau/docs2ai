# docmunch

Convert documentation URLs into clean, AI-ready Markdown files. Drop them into your project so AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context.

## Install

```bash
# Run directly
npx docmunch <url>

# Or install globally
npm install -g docmunch
```

## Usage

```bash
# Fetch a single page to stdout
docmunch https://docs.stripe.com/api/charges

# Write to a file
docmunch https://docs.stripe.com/api/charges -o .ai/stripe.md

# Crawl linked pages (directory output by default)
docmunch https://docs.stripe.com/api/charges --crawl --name stripe

# Crawl with single-file output
docmunch https://docs.stripe.com/api/charges --crawl -o .ai/stripe.md

# Force rewrite even if content unchanged
docmunch https://docs.stripe.com/api/charges --crawl --name stripe --force

# Manage sources in a config file
docmunch add https://docs.stripe.com/api/charges --name stripe --crawl
docmunch update            # refresh all sources
docmunch update --name stripe  # refresh one
docmunch list              # show configured sources

# Download pre-crawled docs from registry
docmunch pull stripe
```

## Features

- **Platform detection** — auto-detects Mintlify, Docusaurus, GitBook, ReadMe, and falls back to Readability for generic sites
- **Code block preservation** — language tags and indentation survive extraction perfectly
- **Crawl mode** — follows sidebar/nav links with configurable depth, scoped to the documentation path
- **Smart fetching** — static fetch by default, auto-retries with Playwright for blocked sites (403, Cloudflare). Playwright is auto-installed on first need
- **Token estimation** — each page includes an estimated token count in manifests, with source-level totals
- **Content hashing** — SHA-256 hash per page for smart refresh (only re-process changed pages)
- **Change detection** — skips writing files whose content hasn't changed (ignoring timestamps)
- **Graceful interruption** — press Ctrl+C during a crawl to stop and choose whether to save pages collected so far
- **YAML frontmatter** — each output includes source URL, fetch date, platform, and title
- **Config file** — manage multiple doc sources with `.docmunch.yaml`
- **MCP server** — expose fetched docs to AI tools (Claude Code, Cursor) via Model Context Protocol
- **Registry pull** — download pre-crawled documentation packages from the hosted registry

## MCP Server

Once you've crawled documentation, `docmunch serve` starts an MCP server that lets AI coding tools query your docs directly.

> **Prerequisite:** Install docmunch globally (`npm install -g docmunch`) or use `npx` to run it without installing. The setup examples below use `npx`, which downloads the package automatically if needed.

### Quick start

```bash
# 1. Crawl some docs
npx docmunch https://docs.stripe.com/api/charges --crawl --name stripe

# 2. Start the MCP server
npx docmunch serve
```

### Claude Code

```bash
claude mcp add --scope project docmunch -- npx docmunch serve -d .ai/docs/
```

That's it. Run `/mcp` inside Claude Code to verify the server is connected.

Use `--scope user` instead to make it available across all your projects.

### Cursor

Open Cursor Settings (`Cmd+,` / `Ctrl+,`) → **MCP** → **+ Add new MCP server**, then:

- **Name**: `docmunch`
- **Type**: `command`
- **Command**: `npx docmunch serve -d .ai/docs/`

Alternatively, create a `.cursor/mcp.json` file at your project root:

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

Restart Cursor for the server to be picked up. A green dot next to the server name in Settings → MCP confirms it's running.

### Available tools

Once connected, your AI assistant has access to:

- **`list_sources`** — see all available documentation sources with metadata
- **`list_pages`** — list pages within a source
- **`read_page`** — read the full markdown content of a page
- **`search_docs`** — full-text search across all docs with preview excerpts

### Options

```bash
docmunch serve              # serves .ai/docs/ (default)
docmunch serve -d ./docs/   # custom directory
```

## Pull Command

Download pre-crawled documentation packages from the hosted registry:

```bash
docmunch pull stripe                          # download to .ai/docs/stripe/
docmunch pull stripe --registry-url <url>     # custom registry
docmunch pull stripe --token <token>          # authenticated access
docmunch pull stripe --force                  # overwrite existing
```

Environment variables `DOCMUNCH_REGISTRY_URL` and `DOCMUNCH_TOKEN` are also supported.

## Output Formats

### Directory output (crawl mode default)

One `.md` file per crawled page, with JSON manifests:

```
.ai/docs/
├── manifest.json              ← root manifest (all sources)
└── stripe/
    ├── _index.json            ← source manifest (pages + metadata)
    ├── charges.md
    └── guides/
        └── authentication.md
```

Manifests include per-page `token_count` and `content_hash`, plus source-level `total_tokens`.

### Single-file output

Used for non-crawl fetches or crawl with `-o file.md`:

```markdown
---
source: https://docs.stripe.com/api/charges
fetched_at: 2025-02-08T14:30:00Z
platform: generic
title: Charges
docmunch_version: 0.2.0
---

# Charges

[clean extracted content here]
```

## Config (.docmunch.yaml)

```yaml
version: 1
output_dir: .ai/docs
sources:
  - name: stripe
    url: https://docs.stripe.com/api/charges
    crawl: true
    max_depth: 2
    output: stripe/
  - name: yousign
    url: https://developers.yousign.com/docs/set-up-your-account
    crawl: false
    output: yousign.md
```

## License

MIT
