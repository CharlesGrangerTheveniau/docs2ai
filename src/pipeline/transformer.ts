import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/**
 * Convert clean HTML to Markdown.
 */
export function transform(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  td.use(gfm);

  addCalloutRule(td);
  addTabbedContentRule(td);
  addCodeBlockLangRule(td);
  addHiddenElementRule(td);

  return td.turndown(html);
}

function isElement(node: TurndownService.Node): node is HTMLElement {
  return node.nodeType === 1;
}

function getAttr(node: TurndownService.Node, attr: string): string {
  if (isElement(node)) {
    return node.getAttribute(attr) || "";
  }
  return "";
}

function getTagName(node: TurndownService.Node): string {
  if (isElement(node)) {
    return node.tagName.toLowerCase();
  }
  return "";
}

/**
 * Convert callouts/admonitions to blockquotes.
 * Matches: aside, .admonition, .callout, .alert, [role="alert"]
 */
function addCalloutRule(td: TurndownService): void {
  td.addRule("callouts", {
    filter(node) {
      if (!isElement(node)) return false;
      const tag = getTagName(node);
      if (tag === "aside") return true;
      const cls = getAttr(node, "class");
      if (
        /\b(admonition|callout|alert|notice|warning|info|tip|note|caution|danger)\b/i.test(
          cls
        )
      )
        return true;
      if (getAttr(node, "role") === "alert") return true;
      return false;
    },
    replacement(content, node) {
      const cls = getAttr(node, "class").toLowerCase();
      let type = "Note";
      if (/warning|caution/.test(cls)) type = "Warning";
      else if (/danger|error/.test(cls)) type = "Danger";
      else if (/tip|success/.test(cls)) type = "Tip";
      else if (/info/.test(cls)) type = "Info";

      const lines = content.trim().split("\n");
      const quoted = lines.map((line) => `> ${line}`).join("\n");
      return `\n> **${type}**\n${quoted}\n\n`;
    },
  });
}

/**
 * Convert tabbed content into labeled sections.
 * Matches: .tab-panel, .tabpanel, [role="tabpanel"]
 */
function addTabbedContentRule(td: TurndownService): void {
  td.addRule("tabbed-content", {
    filter(node) {
      if (!isElement(node)) return false;
      const cls = getAttr(node, "class");
      if (/\b(tab-panel|tabpanel|tabs__item)\b/i.test(cls)) return true;
      if (getAttr(node, "role") === "tabpanel") return true;
      return false;
    },
    replacement(content, node) {
      const label =
        getAttr(node, "aria-label") ||
        getAttr(node, "data-label") ||
        getAttr(node, "data-value") ||
        "";
      if (label) {
        return `\n**${label}**\n\n${content.trim()}\n\n`;
      }
      return `\n${content.trim()}\n\n`;
    },
  });
}

/**
 * Ensure code blocks with data-language/data-lang produce proper fenced blocks.
 */
function addCodeBlockLangRule(td: TurndownService): void {
  td.addRule("code-block-lang", {
    filter(node) {
      if (!isElement(node)) return false;
      if (getTagName(node) !== "pre") return false;
      const codeEl = node.querySelector("code");
      if (!codeEl) return false;
      const lang =
        getAttr(node, "data-language") ||
        getAttr(node, "data-lang") ||
        (codeEl.getAttribute("data-language") || "") ||
        (codeEl.getAttribute("data-lang") || "");
      return lang.length > 0;
    },
    replacement(_content, node) {
      if (!isElement(node)) return _content;
      const codeEl = node.querySelector("code")!;
      const lang =
        getAttr(node, "data-language") ||
        getAttr(node, "data-lang") ||
        (codeEl.getAttribute("data-language") || "") ||
        (codeEl.getAttribute("data-lang") || "");
      const code = codeEl.textContent || "";
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },
  });
}

/**
 * Remove hidden elements (display:none) except tab panels.
 */
function addHiddenElementRule(td: TurndownService): void {
  td.addRule("hidden-elements", {
    filter(node) {
      if (!isElement(node)) return false;
      const style = getAttr(node, "style");
      if (!/display\s*:\s*none/i.test(style)) return false;
      // Don't remove tab panels — they're hidden but contain valid content
      const cls = getAttr(node, "class");
      if (/\b(tab-panel|tabpanel)\b/i.test(cls)) return false;
      if (getAttr(node, "role") === "tabpanel") return false;
      return true;
    },
    replacement() {
      return "";
    },
  });
}
