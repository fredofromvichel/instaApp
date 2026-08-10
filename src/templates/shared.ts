/**
 * Shared building blocks for the templates: font stacks, frame helpers, and
 * the guardrail presets.
 *
 * Guardrails no longer cap *movement* (SPEC.md §4: everything the user owns is
 * freely placeable, `clampAdjustment` only keeps it on canvas). What they still
 * cap is *size* — that is what keeps a QR code scannable and a headline
 * legible, and it is per element type.
 */
import type { Frame, Guardrails } from "../engine/types";

export { GROTESK, SANS, SCRIPT, SERIF } from "../engine/fonts";

/** Text, badges: may shrink to a caption or grow to a poster headline. */
export const TEXT_RAILS: Guardrails = {
  movable: true,
  minScale: 0.6,
  maxScale: 2.2,
};

/** QR: never below 0.7 — smaller stops scanning reliably from a screen. */
export const QR_RAILS: Guardrails = {
  movable: true,
  minScale: 0.7,
  maxScale: 2.5,
};

export const LOGO_RAILS: Guardrails = {
  movable: true,
  minScale: 0.6,
  maxScale: 2.5,
};

/** The photo box itself is placeable too; its content pans/zooms separately. */
export const PHOTO_RAILS: Guardrails = {
  movable: true,
  minScale: 0.5,
  maxScale: 2,
};

export const FULL_FRAMES: Record<"square" | "portrait" | "story", Frame> = {
  square: { x: 0, y: 0, w: 1080, h: 1080 },
  portrait: { x: 0, y: 0, w: 1080, h: 1350 },
  story: { x: 0, y: 0, w: 1080, h: 1920 },
};

/** Full canvas of a two-page (carousel) template. */
export const WIDE_FRAMES: Record<"square" | "portrait" | "story", Frame> = {
  square: { x: 0, y: 0, w: 2160, h: 1080 },
  portrait: { x: 0, y: 0, w: 2160, h: 1350 },
  story: { x: 0, y: 0, w: 2160, h: 1920 },
};

/** Shift a frame set onto the second page of a two-page template. */
export function onPage2(
  frames: Record<"square" | "portrait" | "story", Frame>,
): Record<"square" | "portrait" | "story", Frame> {
  const shift = (frame: Frame): Frame => ({ ...frame, x: frame.x + 1080 });
  return {
    square: shift(frames.square),
    portrait: shift(frames.portrait),
    story: shift(frames.story),
  };
}
