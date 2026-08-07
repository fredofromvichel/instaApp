import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./qr";

describe("normalizeUrl", () => {
  it("passes full URLs through", () => {
    expect(normalizeUrl("https://tierheim.de/bello")).toBe(
      "https://tierheim.de/bello",
    );
  });

  it("prepends https:// when the scheme is missing", () => {
    expect(normalizeUrl("tierheim.de/bello")).toBe("https://tierheim.de/bello");
    expect(normalizeUrl("www.example.de")).toBe("https://www.example.de/");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.de  ")).toBe("https://example.de/");
  });

  it("rejects empty and invalid input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
    expect(normalizeUrl("kein link")).toBeNull();
    expect(normalizeUrl("nur-text")).toBeNull();
  });
});
