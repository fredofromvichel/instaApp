import { describe, expect, it } from "vitest";
import { sampleTemplate } from "../templates/sample";
import { deriveBrandPalette, relativeLuminance, textOn } from "./brandPalette";

describe("relativeLuminance", () => {
  it("orders black < mid < white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
    const mid = relativeLuminance("#c96f4a");
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("tolerates missing # and invalid input", () => {
    expect(relativeLuminance("ffffff")).toBeCloseTo(1);
    expect(relativeLuminance("kaputt")).toBe(0);
  });
});

describe("textOn", () => {
  it("puts white text on dark colors and dark text on light colors", () => {
    expect(textOn("#2f4a6e")).toBe("#ffffff");
    expect(textOn("#f7f2ec")).toBe("#1e1e1e");
  });
});

describe("deriveBrandPalette", () => {
  it("swaps accent + textOnAccent, keeps the rest of the base palette", () => {
    const base = sampleTemplate.palettes[0];
    if (!base) throw new Error("sample template has no palette");
    const brand = deriveBrandPalette(base, "#123456", 0);
    expect(brand.colors.accent).toBe("#123456");
    expect(brand.colors.textOnAccent).toBe("#ffffff");
    expect(brand.colors.background).toBe(base.colors.background);
    expect(brand.id).toBe("brand-0");
  });
});
