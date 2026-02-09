import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, addSource } from "../../src/config/manager";
import type { Docs2aiConfig } from "../../src/config/schema";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadConfig", () => {
  it("returns null when no config file exists", () => {
    (existsSync as any).mockReturnValue(false);
    expect(loadConfig("/home/user/project")).toBeNull();
  });

  it("parses YAML config with snake_case to camelCase conversion", () => {
    (existsSync as any).mockImplementation((path: string) =>
      path.endsWith(".docs2ai.yaml")
    );
    (readFileSync as any).mockReturnValue(`
version: 1
output_dir: .ai/docs
sources:
  - name: stripe
    url: https://docs.stripe.com/api
    crawl: true
    max_depth: 3
    output: stripe.md
`);

    const result = loadConfig("/home/user/project");
    expect(result).not.toBeNull();
    expect(result!.config.version).toBe(1);
    expect(result!.config.outputDir).toBe(".ai/docs");
    expect(result!.config.sources).toHaveLength(1);
    expect(result!.config.sources[0].name).toBe("stripe");
    expect(result!.config.sources[0].maxDepth).toBe(3);
    expect(result!.config.sources[0].crawl).toBe(true);
  });
});

describe("saveConfig", () => {
  it("writes YAML with camelCase to snake_case conversion", () => {
    const config: Docs2aiConfig = {
      version: 1,
      outputDir: ".ai/docs",
      sources: [
        {
          name: "test",
          url: "https://example.com",
          crawl: false,
          maxDepth: 2,
          output: "test.md",
        },
      ],
    };

    saveConfig(config, "/tmp/.docs2ai.yaml");

    expect(writeFileSync).toHaveBeenCalled();
    const written = (writeFileSync as any).mock.calls[0][1] as string;
    expect(written).toContain("output_dir:");
    expect(written).toContain("max_depth:");
    expect(written).not.toContain("outputDir");
    expect(written).not.toContain("maxDepth");
  });
});

describe("addSource", () => {
  it("adds a new source", () => {
    const config: Docs2aiConfig = {
      version: 1,
      outputDir: ".ai/docs",
      sources: [],
    };

    addSource(config, {
      name: "new",
      url: "https://example.com",
      crawl: false,
      maxDepth: 2,
      output: "new.md",
    });

    expect(config.sources).toHaveLength(1);
    expect(config.sources[0].name).toBe("new");
  });

  it("replaces existing source with same name (upsert)", () => {
    const config: Docs2aiConfig = {
      version: 1,
      outputDir: ".ai/docs",
      sources: [
        {
          name: "existing",
          url: "https://old.com",
          crawl: false,
          maxDepth: 1,
          output: "old.md",
        },
      ],
    };

    addSource(config, {
      name: "existing",
      url: "https://new.com",
      crawl: true,
      maxDepth: 3,
      output: "updated.md",
    });

    expect(config.sources).toHaveLength(1);
    expect(config.sources[0].url).toBe("https://new.com");
    expect(config.sources[0].crawl).toBe(true);
  });
});
