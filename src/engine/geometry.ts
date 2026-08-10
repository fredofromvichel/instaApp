/**
 * Pure geometry math for the render engine — no canvas dependency, fully
 * unit-tested (geometry.test.ts). Task 05 (photo gestures) and task 08
 * (repositioning) drive their interactions through these same functions, so
 * preview, gestures, and export can never disagree.
 */
import type { CropState, Frame, Guardrails, SlotAdjustment } from "./types";

export const MAX_ZOOM = 3;

/**
 * Photos may be zoomed *below* their cover fit. The slot then shows the whole
 * photo plus a gap, which the renderer fills with a blurred copy of the same
 * photo (SPEC.md §9) — so "smaller than the frame" can never look broken.
 * 0.35 is as small as a photo may get before it stops reading as the subject.
 */
export const MIN_ZOOM = 0.35;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Clamp a crop state to legal bounds (zoom in MIN..MAX, offsets in -1..1). */
export function clampCrop(crop: CropState): CropState {
  return {
    zoom: clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM),
    offsetX: clamp(crop.offsetX, -1, 1),
    offsetY: clamp(crop.offsetY, -1, 1),
  };
}

/**
 * Where the whole photo lands on the canvas for a frame + crop.
 *
 * zoom = 1 is the exact cover fit (frame fully covered, largest centered
 * crop); zoom > 1 shows less of the photo; zoom < 1 shrinks it below the
 * frame, leaving a gap the renderer fills with the blurred backdrop.
 *
 * offsetX/offsetY (-1..1) slide the photo along each axis: -1 aligns its
 * left/top edge with the frame's, 0 centers, +1 aligns the right/bottom edge.
 * The same formula covers both regimes — zoomed in, the photo never uncovers
 * the frame; zoomed out, it never leaves the frame.
 */
export function computePhotoPlacement(
  imageWidth: number,
  imageHeight: number,
  frame: Frame,
  crop: CropState,
): Frame {
  const { zoom, offsetX, offsetY } = clampCrop(crop);
  const coverScale = Math.max(frame.w / imageWidth, frame.h / imageHeight);
  const scale = coverScale * zoom;
  const w = imageWidth * scale;
  const h = imageHeight * scale;
  // Positive when the photo overflows the frame, negative when it falls short.
  const overflowX = (w - frame.w) / 2;
  const overflowY = (h - frame.h) / 2;
  return {
    x: frame.x - overflowX * (1 + offsetX),
    y: frame.y - overflowY * (1 + offsetY),
    w,
    h,
  };
}

/** How far the photo overflows the frame per axis (negative = gap). */
export function placementOverflow(placement: Frame, frame: Frame) {
  return {
    x: (placement.w - frame.w) / 2,
    y: (placement.h - frame.h) / 2,
  };
}

/** Does a placement fill the whole frame (i.e. no gap to fill)? */
export function coversFrame(placement: Frame, frame: Frame): boolean {
  const epsilon = 0.5;
  return (
    placement.x <= frame.x + epsilon &&
    placement.y <= frame.y + epsilon &&
    placement.x + placement.w >= frame.x + frame.w - epsilon &&
    placement.y + placement.h >= frame.y + frame.h - epsilon
  );
}

/**
 * Share of a movable element that must stay on the canvas. Below this it
 * would be effectively invisible — and an invisible element is one the user
 * cannot grab back.
 */
export const MIN_ON_CANVAS = 0.35;

/**
 * Clamp a user adjustment (SPEC.md §4, "frei, aber mit Netz").
 *
 * Movable slots may be dragged anywhere in `bounds` — out of their template
 * frame, overlapping other elements, even hanging over the image edge. The
 * single hard rule is that `MIN_ON_CANVAS` of the element stays inside, so
 * nothing can be lost off-screen. Scale stays within the slot's own range.
 *
 * `bounds` is the canvas (for carousels: the full N×-wide space), `frame` the
 * slot's template frame for the current format.
 */
export function clampAdjustment(
  adjustment: SlotAdjustment,
  guardrails: Guardrails,
  frame: Frame,
  bounds: Frame,
): SlotAdjustment {
  const scale = clamp(
    adjustment.scale,
    guardrails.minScale,
    guardrails.maxScale,
  );
  if (!guardrails.movable) return { dx: 0, dy: 0, scale };

  // Where the scaled frame sits before translation (applyAdjustment scales
  // about the frame center).
  const w = frame.w * scale;
  const h = frame.h * scale;
  const baseX = frame.x + (frame.w - w) / 2;
  const baseY = frame.y + (frame.h - h) / 2;
  const keepX = Math.min(w, bounds.w) * MIN_ON_CANVAS;
  const keepY = Math.min(h, bounds.h) * MIN_ON_CANVAS;
  return {
    dx: clamp(
      adjustment.dx,
      bounds.x + keepX - w - baseX,
      bounds.x + bounds.w - keepX - baseX,
    ),
    dy: clamp(
      adjustment.dy,
      bounds.y + keepY - h - baseY,
      bounds.y + bounds.h - keepY - baseY,
    ),
    scale,
  };
}

/**
 * Apply a (pre-clamped) adjustment to a frame: scale about the frame center,
 * then translate. Scaling about the center keeps nudged elements visually
 * anchored where the template put them.
 */
export function applyAdjustment(
  frame: Frame,
  adjustment: SlotAdjustment,
): Frame {
  const w = frame.w * adjustment.scale;
  const h = frame.h * adjustment.scale;
  return {
    x: frame.x + (frame.w - w) / 2 + adjustment.dx,
    y: frame.y + (frame.h - h) / 2 + adjustment.dy,
    w,
    h,
  };
}

/** Largest centered rect of the given aspect ratio fitting inside `frame`. */
export function containFit(
  contentWidth: number,
  contentHeight: number,
  frame: Frame,
): Frame {
  const scale = Math.min(frame.w / contentWidth, frame.h / contentHeight);
  const w = contentWidth * scale;
  const h = contentHeight * scale;
  return {
    x: frame.x + (frame.w - w) / 2,
    y: frame.y + (frame.h - h) / 2,
    w,
    h,
  };
}
