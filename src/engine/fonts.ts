/**
 * The font families a single text field may be switched to (SPEC.md §6).
 *
 * Deliberately four, not a font list: each one is a different *mood*, and
 * every one of them looks right in every template. All are self-hosted
 * variable fonts (Fontsource), imported once in `main.tsx`.
 */
import type { FontChoice } from "./types";

export interface FontOption {
  id: FontChoice;
  /** German label for the picker. */
  name: string;
  /** CSS font-family stack, or null to keep the template's own font. */
  family: string | null;
}

/** Geometric sans for clean, commercial layouts. */
export const SANS = "'Outfit Variable', system-ui, sans-serif";

/** Warm editorial serif for quotes and emotional layouts. */
export const SERIF = "'Fraunces Variable', Georgia, serif";

/** Wide, sturdy grotesk for announcements that need to shout. */
export const GROTESK = "'Archivo Variable', 'Arial Narrow', sans-serif";

/** Friendly handwriting for personal notes and quotes. */
export const SCRIPT = "'Caveat Variable', 'Segoe Script', cursive";

export const FONT_OPTIONS: FontOption[] = [
  { id: "vorlage", name: "Vorlage", family: null },
  { id: "modern", name: "Modern", family: SANS },
  { id: "elegant", name: "Elegant", family: SERIF },
  { id: "kraeftig", name: "Kräftig", family: GROTESK },
  { id: "handschrift", name: "Handschrift", family: SCRIPT },
];

/** The family a choice resolves to, or null for "keep the template's font". */
export function fontFamilyOf(choice: FontChoice | undefined): string | null {
  if (!choice || choice === "vorlage") return null;
  return FONT_OPTIONS.find((option) => option.id === choice)?.family ?? null;
}

/**
 * Handwriting is optically much smaller than a grotesk at the same pixel
 * size, so an unadjusted switch looks like a mistake. This factor is applied
 * to the auto-fit range when the user picks a different family.
 */
export function fontSizeFactor(choice: FontChoice | undefined): number {
  return choice === "handschrift" ? 1.25 : 1;
}
