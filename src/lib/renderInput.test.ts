import { describe, expect, it } from "vitest";
import type { WizardState } from "../state/wizard";
import { getTemplate } from "../templates/catalog";
import { BRAND_PALETTE_ID } from "./brandPalette";
import type { BrandKit } from "./brandStore";
import { brandPalettesFor, buildRenderInput } from "./renderInput";

const template = getTemplate("klassik");
if (!template) throw new Error("Klassik-Vorlage fehlt");

const state: WizardState = {
  step: "adjust",
  formatId: "square",
  templateId: "klassik",
  paletteId: null,
  variantId: null,
  values: {},
  adjustments: {},
};

const kit: BrandKit = { colors: { background: "#1b3a2f", accent: "#f2c14e" } };

describe("brandPalettesFor", () => {
  it("offers exactly one palette once colors are set", () => {
    expect(brandPalettesFor(template, kit)).toHaveLength(1);
    expect(brandPalettesFor(template, { colors: {} })).toHaveLength(0);
  });
});

describe("buildRenderInput", () => {
  it("passes the user's own palette through when it is selected", () => {
    // Regression: the brand palette used to be looked up by an id prefix that
    // no longer matched, so "Deine Farben" silently rendered the default.
    const input = buildRenderInput(
      { ...state, paletteId: BRAND_PALETTE_ID },
      template,
      kit,
    );
    expect(input.palette?.colors.background).toBe("#1b3a2f");
    expect(input.palette?.colors.accent).toBe("#f2c14e");
  });

  it("leaves template palettes to the engine", () => {
    const input = buildRenderInput(
      { ...state, paletteId: "sage" },
      template,
      kit,
    );
    expect(input.palette).toBeUndefined();
    expect(input.paletteId).toBe("sage");
  });

  it("has no palette to pass when the user set no colors", () => {
    const input = buildRenderInput(
      { ...state, paletteId: BRAND_PALETTE_ID },
      template,
      { colors: {} },
    );
    expect(input.palette).toBeUndefined();
  });
});
