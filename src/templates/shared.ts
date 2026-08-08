/**
 * Shared building blocks for the template sets (tasks 10–12):
 * self-hosted font stacks, full-canvas frame helpers, and the standard
 * guardrail presets used across all templates.
 */
import type { Frame, Guardrails } from "../engine/types";

/**
 * Guardrail presets — deliberately generous so adjusting feels useful
 * (especially growing QR codes for scannability), while clamping still
 * makes broken layouts impossible.
 */
export const QR_RAILS: Guardrails = {
  maxOffsetX: 80,
  maxOffsetY: 80,
  minScale: 0.7,
  maxScale: 1.8,
};

export const LOGO_RAILS: Guardrails = {
  maxOffsetX: 60,
  maxOffsetY: 60,
  minScale: 0.7,
  maxScale: 1.5,
};

export const TEXT_RAILS: Guardrails = {
  maxOffsetX: 50,
  maxOffsetY: 50,
  minScale: 0.8,
  maxScale: 1.3,
};

export const BADGE_RAILS: Guardrails = {
  maxOffsetX: 80,
  maxOffsetY: 60,
  minScale: 0.8,
  maxScale: 1.4,
};

/** Geometric sans for clean, commercial layouts (self-hosted via Fontsource). */
export const SANS = "'Outfit Variable', system-ui, sans-serif";

/** Warm editorial serif for quotes and emotional layouts. */
export const SERIF = "'Fraunces Variable', Georgia, serif";

export const FULL_FRAMES: Record<"square" | "portrait" | "story", Frame> = {
  square: { x: 0, y: 0, w: 1080, h: 1080 },
  portrait: { x: 0, y: 0, w: 1080, h: 1350 },
  story: { x: 0, y: 0, w: 1080, h: 1920 },
};
