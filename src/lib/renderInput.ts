/**
 * Central place that turns wizard state (+ brand kit) into a RenderInput.
 * The user's own palette is not part of the template, so it is re-derived
 * here from the saved brand colors whenever it is the selected one.
 */
import type { Palette, RenderInput, Template } from "../engine/types";
import type { WizardState } from "../state/wizard";
import { BRAND_PALETTE_ID, deriveBrandPalette } from "./brandPalette";
import type { BrandKit } from "./brandStore";

/** The user's own palette ("Deine Farben"), or none if she set no colors. */
export function brandPalettesFor(template: Template, kit: BrandKit): Palette[] {
  const base = template.palettes[0];
  if (!base) return [];
  const brand = deriveBrandPalette(base, kit.colors);
  return brand ? [brand] : [];
}

export function buildRenderInput(
  state: WizardState,
  template: Template,
  kit: BrandKit,
): RenderInput {
  const palette =
    state.paletteId === BRAND_PALETTE_ID
      ? brandPalettesFor(template, kit)[0]
      : undefined;
  return {
    template,
    formatId: state.formatId ?? "square",
    paletteId: state.paletteId ?? undefined,
    palette,
    variantId: state.variantId ?? undefined,
    values: state.values,
    adjustments: state.adjustments,
  };
}
