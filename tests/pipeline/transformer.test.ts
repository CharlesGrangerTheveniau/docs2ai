import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "../../src/pipeline/transformer";

const fixturesDir = join(__dirname, "../fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("transform", () => {
  describe("code block preservation", () => {
    it("preserves code blocks with language-* class", () => {
      const md = transform(
        '<pre><code class="language-python">def hello():\n    print("Hello")</code></pre>'
      );
      expect(md).toContain("```python");
      expect(md).toContain('def hello():');
      expect(md).toContain('print("Hello")');
    });

    it("preserves code blocks with data-language attribute", () => {
      const md = transform(
        '<pre data-language="typescript"><code>const x: number = 1;</code></pre>'
      );
      expect(md).toContain("```typescript");
      expect(md).toContain("const x: number = 1;");
    });

    it("preserves code blocks with data-lang attribute", () => {
      const md = transform(
        '<pre data-lang="rust"><code>fn main() {}</code></pre>'
      );
      expect(md).toContain("```rust");
      expect(md).toContain("fn main() {}");
    });

    it("preserves code blocks with data-lang on code element", () => {
      const md = transform(
        '<pre><code data-lang="go">func main() {}</code></pre>'
      );
      expect(md).toContain("```go");
      expect(md).toContain("func main() {}");
    });

    it("preserves code blocks without language", () => {
      const md = transform(
        "<pre><code>plain code\nwith lines</code></pre>"
      );
      expect(md).toContain("```");
      expect(md).toContain("plain code");
      expect(md).toContain("with lines");
    });

    it("preserves indentation in code blocks", () => {
      const md = transform(
        '<pre><code class="language-yaml">services:\n  web:\n    image: nginx</code></pre>'
      );
      expect(md).toContain("  web:");
      expect(md).toContain("    image: nginx");
    });

    it("preserves inline code", () => {
      const md = transform(
        "<p>Use the <code>docs2ai</code> command.</p>"
      );
      expect(md).toContain("`docs2ai`");
    });
  });

  describe("callout conversion", () => {
    it("converts warning admonitions to blockquotes", () => {
      const md = transform(
        '<div class="admonition warning"><p>Be careful!</p></div>'
      );
      expect(md).toContain("> **Warning**");
      expect(md).toContain("Be careful!");
    });

    it("converts tip callouts to blockquotes", () => {
      const md = transform(
        '<div class="callout tip"><p>Helpful tip here.</p></div>'
      );
      expect(md).toContain("> **Tip**");
      expect(md).toContain("Helpful tip here.");
    });

    it("converts aside elements to blockquotes", () => {
      const md = transform(
        "<aside><p>Side note content.</p></aside>"
      );
      expect(md).toContain("> **Note**");
      expect(md).toContain("Side note content.");
    });

    it("converts role=alert elements to blockquotes", () => {
      const md = transform(
        '<div role="alert"><p>Alert content.</p></div>'
      );
      expect(md).toContain("> **Note**");
      expect(md).toContain("Alert content.");
    });
  });

  describe("tabbed content", () => {
    it("converts tab panels with labels", () => {
      const md = transform(
        '<div class="tab-panel" aria-label="npm"><pre><code>npm install pkg</code></pre></div>'
      );
      expect(md).toContain("**npm**");
      expect(md).toContain("npm install pkg");
    });

    it("converts tabpanel role elements", () => {
      const md = transform(
        '<div role="tabpanel" aria-label="yarn"><p>yarn add pkg</p></div>'
      );
      expect(md).toContain("**yarn**");
      expect(md).toContain("yarn add pkg");
    });
  });

  describe("hidden elements", () => {
    it("removes display:none elements", () => {
      const md = transform(
        '<p>Visible</p><div style="display: none">Hidden</div>'
      );
      expect(md).toContain("Visible");
      expect(md).not.toContain("Hidden");
    });

    it("preserves hidden tab panels", () => {
      const md = transform(
        '<div class="tab-panel" style="display: none" aria-label="hidden-tab"><p>Tab content</p></div>'
      );
      expect(md).toContain("Tab content");
    });
  });

  describe("full fixture code block preservation", () => {
    it("preserves all code blocks from code-blocks fixture", () => {
      const html = loadFixture("code-blocks.html");
      const md = transform(html);

      // Python code block
      expect(md).toContain("```python");
      expect(md).toContain('print("Hello, World!")');

      // TypeScript data-language
      expect(md).toContain("```typescript");
      expect(md).toContain("interface Config");

      // Rust data-lang
      expect(md).toContain("```rust");
      expect(md).toContain('println!("Hello, Rust!")');

      // Go data-lang on code element
      expect(md).toContain("```go");
      expect(md).toContain('fmt.Println("Hello, Go!")');

      // YAML with indentation
      expect(md).toContain("```yaml");
      expect(md).toContain("    ports:");

      // Inline code
      expect(md).toContain("`docs2ai`");
    });
  });
});
