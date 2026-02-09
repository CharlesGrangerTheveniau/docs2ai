# docs2ai

Convert documentation URLs into clean, AI-ready Markdown files. Drop them into your project so AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context.

## Install

```bash
# Run directly
npx docs2ai <url>

# Or install globally
npm install -g docs2ai
```

## Usage

```bash
# Fetch a single page to stdout
docs2ai https://docs.stripe.com/api/charges

# Write to a file
docs2ai https://docs.stripe.com/api/charges -o .ai/stripe.md

# Crawl linked pages
docs2ai https://docs.stripe.com/api/charges --crawl --max-depth 2 -o .ai/stripe.md

# Manage sources in a config file
docs2ai add https://docs.stripe.com/api/charges --name stripe --crawl
docs2ai update            # refresh all sources
docs2ai update --name stripe  # refresh one
docs2ai list              # show configured sources
```

## Features

- **Platform detection** — auto-detects Mintlify, Docusaurus, GitBook, ReadMe, and falls back to Readability for generic sites
- **Code block preservation** — language tags and indentation survive extraction perfectly
- **Crawl mode** — follows sidebar/nav links with configurable depth
- **YAML frontmatter** — each output includes source URL, fetch date, platform, and title
- **Config file** — manage multiple doc sources with `.docs2ai.yaml`
- **Playwright optional** — uses fast static fetch by default, Playwright only when needed for JS-rendered pages
- **MCP server** — expose fetched docs to AI tools (Claude Code, Cursor) via Model Context Protocol

## MCP Server

Once you've crawled documentation, `docs2ai serve` starts an MCP server that lets AI coding tools query your docs directly.

### Quick start

```bash
# 1. Crawl some docs
docs2ai https://docs.stripe.com/api/charges --crawl --name stripe

# 2. Start the MCP server
docs2ai serve
```

### Claude Code

Add to `.mcp.json` in your project root:

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

Claude Code will then have access to 4 tools:

- **`list_sources`** — see all available documentation sources
- **`list_pages`** — list pages within a source
- **`read_page`** — read the full markdown content of a page
- **`search_docs`** — full-text search across all docs

### Options

```bash
docs2ai serve              # serves .ai/docs/ (default)
docs2ai serve -d ./docs/   # custom directory
```

## Config (.docs2ai.yaml)

```yaml
version: 1
output_dir: .ai/docs
sources:
  - name: stripe
    url: https://docs.stripe.com/api/charges
    crawl: true
    max_depth: 2
    output: stripe.md
  - name: yousign
    url: https://developers.yousign.com/docs/set-up-your-account
    crawl: false
    output: yousign.md
```

## License

MIT
