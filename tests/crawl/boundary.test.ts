import { describe, it, expect } from "vitest";
import {
  getCrawlPrefix,
  isInBounds,
  normalizeUrl,
} from "../../src/crawl/boundary";

describe("getCrawlPrefix", () => {
  it("extracts origin and path prefix", () => {
    const result = getCrawlPrefix(
      "https://docs.example.com/api/v2/users"
    );
    expect(result.origin).toBe("https://docs.example.com");
    expect(result.pathPrefix).toBe("/api/v2/");
  });

  it("handles root-level pages", () => {
    const result = getCrawlPrefix("https://example.com/docs");
    expect(result.origin).toBe("https://example.com");
    expect(result.pathPrefix).toBe("/");
  });

  it("handles trailing slashes", () => {
    const result = getCrawlPrefix("https://example.com/docs/getting-started");
    expect(result.pathPrefix).toBe("/docs/");
  });
});

describe("isInBounds", () => {
  it("returns true for in-bounds URLs", () => {
    expect(
      isInBounds(
        "https://docs.example.com/api/v2/endpoints",
        "https://docs.example.com",
        "/api/v2/"
      )
    ).toBe(true);
  });

  it("returns false for different origins", () => {
    expect(
      isInBounds(
        "https://other.com/api/v2/endpoints",
        "https://docs.example.com",
        "/api/v2/"
      )
    ).toBe(false);
  });

  it("returns false for out-of-bounds paths", () => {
    expect(
      isInBounds(
        "https://docs.example.com/blog/post",
        "https://docs.example.com",
        "/api/v2/"
      )
    ).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(
      isInBounds("not-a-url", "https://docs.example.com", "/api/")
    ).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("strips hash fragments", () => {
    expect(normalizeUrl("https://example.com/docs#section")).toBe(
      "https://example.com/docs"
    );
  });

  it("strips query strings", () => {
    expect(normalizeUrl("https://example.com/docs?page=1")).toBe(
      "https://example.com/docs"
    );
  });

  it("strips trailing slashes", () => {
    expect(normalizeUrl("https://example.com/docs/")).toBe(
      "https://example.com/docs"
    );
  });

  it("normalizes combined hash + query + trailing slash", () => {
    expect(normalizeUrl("https://example.com/docs/?q=1#top")).toBe(
      "https://example.com/docs"
    );
  });
});
