/**
 * Brand kit persistence (task 09): logo + favorite colors, on-device only.
 */
import { idbGet, idbPut } from "./db";

export interface BrandKit {
  logo?: { blob: Blob; width: number; height: number };
  colors: string[];
}

const KEY = "kit";
export const MAX_BRAND_COLORS = 6;

export async function loadBrandKit(): Promise<BrandKit> {
  try {
    return (await idbGet<BrandKit>("brand", KEY)) ?? { colors: [] };
  } catch {
    return { colors: [] };
  }
}

export async function saveBrandKit(kit: BrandKit): Promise<void> {
  await idbPut("brand", kit, KEY);
}
