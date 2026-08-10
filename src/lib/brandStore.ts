/**
 * Brand kit persistence (task 09): logo + the user's own colors, on-device
 * only.
 */
import type { BrandColors } from "./brandPalette";
import { idbGet, idbPut } from "./db";

export interface BrandKit {
  logo?: { blob: Blob; width: number; height: number };
  /** Hintergrund / Flächen / Schrift — see brandPalette.ts. */
  colors: BrandColors;
}

/** Kits written before the colors had roles: a loose list of accent colors. */
interface LegacyBrandKit {
  logo?: { blob: Blob; width: number; height: number };
  colors: string[] | BrandColors;
}

const KEY = "kit";

export const EMPTY_BRAND_KIT: BrandKit = { colors: {} };

/**
 * Old kits stored `colors` as an array, where every entry became its own
 * accent-only palette. The first one keeps working as the accent color.
 */
function migrate(kit: LegacyBrandKit): BrandKit {
  if (Array.isArray(kit.colors)) {
    const [accent] = kit.colors;
    return { logo: kit.logo, colors: accent ? { accent } : {} };
  }
  return { logo: kit.logo, colors: kit.colors ?? {} };
}

export async function loadBrandKit(): Promise<BrandKit> {
  try {
    const stored = await idbGet<LegacyBrandKit>("brand", KEY);
    return stored ? migrate(stored) : { colors: {} };
  } catch {
    return { colors: {} };
  }
}

export async function saveBrandKit(kit: BrandKit): Promise<void> {
  await idbPut("brand", kit, KEY);
}
