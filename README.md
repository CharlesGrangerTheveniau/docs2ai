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
