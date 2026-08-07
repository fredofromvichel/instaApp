/**
 * Shared building blocks for the template sets (tasks 10–12):
 * self-hosted font stacks and full-canvas frame helpers.
 */
import type { Frame } from "../engine/types";

/** Geometric sans for clean, commercial layouts (self-hosted via Fontsource). */
export const SANS = "'Outfit Variable', system-ui, sans-serif";

/** Warm editorial serif for quotes and emotional layouts. */
export const SERIF = "'Fraunces Variable', Georgia, serif";

export const FULL_FRAMES: Record<"square" | "portrait" | "story", Frame> = {
  square: { x: 0, y: 0, w: 1080, h: 1080 },
  portrait: { x: 0, y: 0, w: 1080, h: 1350 },
  story: { x: 0, y: 0, w: 1080, h: 1920 },
};
