import { describe, it, expect, vi, afterEach } from "vitest";
import { write } from "../../src/pipeline/writer";
import { writeFileSync, mkdirSync } from "node:fs";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("write", () => {
  it("writes to stdout when no output path is given", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    write("# Hello", undefined, {
      sourceUrl: "https://example.com",
      title: "Hello",
      platform: "generic",
    });

    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain("https://example.com");
    expect(output).toContain("title: Hello");
    expect(output).toContain("platform: generic");
    expect(output).toContain("ctxify_version: 0.1.0");
    expect(output).toContain("# Hello");
  });

  it("writes to file when output path is given", () => {
    write("# Test", "/tmp/test.md", {
      sourceUrl: "https://example.com/docs",
      title: "Test",
      platform: "mintlify",
    });

    expect(mkdirSync).toHaveBeenCalledWith("/tmp", { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    const content = (writeFileSync as any).mock.calls[0][1] as string;
    expect(content).toContain("https://example.com/docs");
    expect(content).toContain("platform: mintlify");
    expect(content).toContain("# Test");
  });

  it("includes fetched_at timestamp in frontmatter", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    write("content", undefined, {
      sourceUrl: "https://example.com",
      title: "Page",
      platform: "generic",
    });

    const output = stdoutSpy.mock.calls[0][0] as string;
    expect(output).toContain("fetched_at:");
  });
});
