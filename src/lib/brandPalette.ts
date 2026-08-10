/**
 * The user's own colors → a template palette.
 *
 * The model the user sees is deliberately tiny and positional (SPEC.md §6):
 *
 *   1. Hintergrund  → `background` (the largest area of every template)
 *   2. Flächen      → `accent` (chips, badges, rules, colored frames)
 *   3. Schrift      → `text` (and a derived `muted`)
 *
 * Every field is optional; whatever is missing is derived from what is there,
 * so one color already produces a complete, readable palette. Deriving rather
 * than guessing is what makes "my colors" behave the same in all eight
 * templates — which the earlier model (one loose accent color) did not.
 */
import type { Palette } from "../engine/types";

/** Palette id of the user's own colors — not part of any template. */
export const BRAND_PALETTE_ID = "brand";

export interface BrandColors {
  /** Page background. */
  background?: string;
  /** Chips, badges, rules — the small strong highlights. */
  accent?: string;
  /** Main text. */
  text?: string;
}

/** WCAG relative luminance of a #rrggbb color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return 0;
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel =
      Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Readable text color on the given background. */
export function textOn(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? "#1e1e1e" : "#ffffff";
}

function channels(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return [0, 0, 0];
  return [0, 2, 4].map((o) =>
    Number.parseInt(match[1].slice(o, o + 2), 16),
  ) as [number, number, number];
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");
}

/** Blend two colors; `t` = 0 keeps `a`, `t` = 1 gives `b`. */
export function mixColors(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(
    ab + (bb - ab) * t,
  )}`;
}

const isDark = (hex: string) => relativeLuminance(hex) <= 0.4;

/** Cards on a background: barely lifted off it, never a hard white edge. */
function surfaceOn(background: string): string {
  return isDark(background)
    ? mixColors(background, "#ffffff", 0.12)
    : mixColors(background, "#ffffff", 0.7);
}

/** A highlight that always stands out on the background. */
function accentOn(background: string): string {
  return isDark(background)
    ? mixColors(background, "#ffffff", 0.62)
    : mixColors(background, "#000000", 0.62);
}

/** True when the user has given at least one color. */
export function hasBrandColors(colors: BrandColors): boolean {
  return Boolean(colors.background || colors.accent || colors.text);
}

/**
 * Build the "Deine Farben" palette. Returns null when nothing is set, so the
 * Anpassen step simply shows no extra chip.
 */
export function deriveBrandPalette(
  base: Palette,
  colors: BrandColors,
): Palette | null {
  if (!hasBrandColors(colors)) return null;
  const background = colors.background ?? base.colors.background;
  const accent = colors.accent ?? accentOn(background);
  const text = colors.text ?? textOn(background);
  return {
    id: BRAND_PALETTE_ID,
    name: "Deine Farben",
    colors: {
      background,
      surface: surfaceOn(background),
      accent,
      text,
      // Secondary text: the main text softened towards the background, so it
      // stays readable whatever the two colors are.
      muted: mixColors(text, background, 0.45),
      textOnAccent: textOn(accent),
    },
  };
}
