# ctxify

Convert documentation URLs into clean, AI-ready Markdown files. Drop them into your project so AI coding assistants (Cursor, Claude Code, Copilot, etc.) have accurate, up-to-date context.

## Install

```bash
# Run directly
npx ctxify <url>

# Or install globally
npm install -g ctxify
```

## Usage

```bash
# Fetch a single page to stdout
ctxify https://docs.stripe.com/api/charges

# Write to a file
ctxify https://docs.stripe.com/api/charges -o .ai/stripe.md

# Crawl linked pages
ctxify https://docs.stripe.com/api/charges --crawl --max-depth 2 -o .ai/stripe.md

# Manage sources in a config file
ctxify add https://docs.stripe.com/api/charges --name stripe --crawl
ctxify update            # refresh all sources
ctxify update --name stripe  # refresh one
ctxify list              # show configured sources
```

## Features

- **Platform detection** — auto-detects Mintlify, Docusaurus, GitBook, ReadMe, and falls back to Readability for generic sites
- **Code block preservation** — language tags and indentation survive extraction perfectly
- **Crawl mode** — follows sidebar/nav links with configurable depth
- **YAML frontmatter** — each output includes source URL, fetch date, platform, and title
- **Config file** — manage multiple doc sources with `.ctxify.yaml`
- **Playwright optional** — uses fast static fetch by default, Playwright only when needed for JS-rendered pages

## Config (.ctxify.yaml)

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
