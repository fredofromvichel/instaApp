import { describe, expect, it } from "vitest";
import { PALETTES } from "../templates/palettes";
import {
  deriveBrandPalette,
  hasBrandColors,
  mixColors,
  relativeLuminance,
  textOn,
} from "./brandPalette";

const base = PALETTES[0];
if (!base) throw new Error("palette set is empty");

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

describe("mixColors", () => {
  it("returns the endpoints and the midpoint", () => {
    expect(mixColors("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixColors("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("deriveBrandPalette", () => {
  it("is empty until the user sets a color", () => {
    expect(hasBrandColors({})).toBe(false);
    expect(deriveBrandPalette(base, {})).toBeNull();
  });

  it("uses the first color as the background of the whole design", () => {
    const brand = deriveBrandPalette(base, { background: "#123456" });
    expect(brand?.colors.background).toBe("#123456");
    expect(brand?.id).toBe("brand");
  });

  it("derives readable text and a visible accent from one color", () => {
    const dark = deriveBrandPalette(base, { background: "#101820" });
    expect(dark?.colors.text).toBe("#ffffff");
    // The derived accent must not disappear into the background.
    expect(
      Math.abs(
        relativeLuminance(dark?.colors.accent ?? "") -
          relativeLuminance("#101820"),
      ),
    ).toBeGreaterThan(0.1);

    const light = deriveBrandPalette(base, { background: "#fdf6e3" });
    expect(light?.colors.text).toBe("#1e1e1e");
  });

  it("lifts cards off the background in both directions", () => {
    const onDark = deriveBrandPalette(base, { background: "#101820" });
    expect(relativeLuminance(onDark?.colors.surface ?? "")).toBeGreaterThan(
      relativeLuminance("#101820"),
    );
    const onLight = deriveBrandPalette(base, { background: "#e8e2d8" });
    expect(relativeLuminance(onLight?.colors.surface ?? "")).toBeGreaterThan(
      relativeLuminance("#e8e2d8"),
    );
  });

  it("takes all three colors and picks the text on the accent", () => {
    const brand = deriveBrandPalette(base, {
      background: "#1b3a2f",
      accent: "#f2c14e",
      text: "#f8f4e8",
    });
    expect(brand?.colors.background).toBe("#1b3a2f");
    expect(brand?.colors.accent).toBe("#f2c14e");
    expect(brand?.colors.text).toBe("#f8f4e8");
    // Yellow accent → dark text on it.
    expect(brand?.colors.textOnAccent).toBe("#1e1e1e");
  });

  it("respects a low-contrast choice instead of overriding it", () => {
    const brand = deriveBrandPalette(base, {
      background: "#333333",
      text: "#3a3a3a",
    });
    expect(brand?.colors.text).toBe("#3a3a3a");
  });

  it("works from the accent alone (kits saved before the roles existed)", () => {
    const brand = deriveBrandPalette(base, { accent: "#c4633c" });
    expect(brand?.colors.accent).toBe("#c4633c");
    expect(brand?.colors.background).toBe(base.colors.background);
  });
});
