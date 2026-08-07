/**
 * Pure geometry math for the render engine — no canvas dependency, fully
 * unit-tested (geometry.test.ts). Task 05 (photo gestures) and task 08
 * (repositioning) drive their interactions through these same functions, so
 * preview, gestures, and export can never disagree.
 */
import type { CropState, Frame, Guardrails, SlotAdjustment } from "./types";

export const MAX_ZOOM = 3;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Clamp a crop state to legal bounds (zoom ≥ cover fit, offsets in -1..1). */
export function clampCrop(crop: CropState): CropState {
  return {
    zoom: clamp(crop.zoom, 1, MAX_ZOOM),
    offsetX: clamp(crop.offsetX, -1, 1),
    offsetY: clamp(crop.offsetY, -1, 1),
  };
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Which source-image rectangle fills a frame under cover semantics + crop.
 *
 * zoom = 1 shows the largest possible centered cover crop; higher zoom shows
 * less of the image. offsetX/offsetY (-1..1) pan across the leftover source
 * area: -1 hits the left/top edge, 0 is centered, +1 the right/bottom edge.
 * The visible area can therefore never leave the image.
 */
export function computeCoverCrop(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  crop: CropState,
): SourceRect {
  const { zoom, offsetX, offsetY } = clampCrop(crop);
  const coverScale = Math.max(
    frameWidth / imageWidth,
    frameHeight / imageHeight,
  );
  const scale = coverScale * zoom;
  const sw = frameWidth / scale;
  const sh = frameHeight / scale;
  const leftoverX = (imageWidth - sw) / 2;
  const leftoverY = (imageHeight - sh) / 2;
  return {
    sx: leftoverX * (1 + offsetX),
    sy: leftoverY * (1 + offsetY),
    sw,
    sh,
  };
}

/** Clamp a user adjustment to a slot's guardrails. */
export function clampAdjustment(
  adjustment: SlotAdjustment,
  guardrails: Guardrails,
): SlotAdjustment {
  return {
    dx: clamp(adjustment.dx, -guardrails.maxOffsetX, guardrails.maxOffsetX),
    dy: clamp(adjustment.dy, -guardrails.maxOffsetY, guardrails.maxOffsetY),
    scale: clamp(adjustment.scale, guardrails.minScale, guardrails.maxScale),
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
