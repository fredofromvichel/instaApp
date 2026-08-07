/**
 * Brand colors → template palettes (task 09). A saved brand color becomes an
 * extra palette in the Anpassen step: the template's default palette with the
 * accent swapped and a contrast-safe text-on-accent color.
 */
import type { Palette } from "../engine/types";

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

export function deriveBrandPalette(
  base: Palette,
  color: string,
  index: number,
): Palette {
  return {
    id: `brand-${index}`,
    name: `Deine Farbe ${index + 1}`,
    colors: {
      ...base.colors,
      accent: color,
      textOnAccent: textOn(color),
    },
  };
}
