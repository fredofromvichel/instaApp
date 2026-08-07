/**
 * Central place that turns wizard state (+ brand kit) into a RenderInput.
 * Brand palettes ("brand-N") are not part of the template, so they are
 * re-derived here from the saved brand colors.
 */
import type { Palette, RenderInput, Template } from "../engine/types";
import type { WizardState } from "../state/wizard";
import { deriveBrandPalette } from "./brandPalette";
import type { BrandKit } from "./brandStore";

export function brandPalettesFor(template: Template, kit: BrandKit): Palette[] {
  const base = template.palettes[0];
  if (!base) return [];
  return kit.colors.map((color, index) =>
    deriveBrandPalette(base, color, index),
  );
}

export function buildRenderInput(
  state: WizardState,
  template: Template,
  kit: BrandKit,
): RenderInput {
  let palette: Palette | undefined;
  if (state.paletteId?.startsWith("brand-")) {
    palette = brandPalettesFor(template, kit).find(
      (p) => p.id === state.paletteId,
    );
  }
  return {
    template,
    formatId: state.formatId ?? "square",
    paletteId: state.paletteId ?? undefined,
    palette,
    values: state.values,
    adjustments: state.adjustments,
  };
}
