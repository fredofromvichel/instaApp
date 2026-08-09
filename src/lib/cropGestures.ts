/**
 * Pure gesture → crop math (task 05). Drag pans, pinch (or the −/+ buttons)
 * zooms — expressed as transformations of the engine's CropState so gestures,
 * preview, and export can never disagree. Results are always clamped: the
 * photo can neither uncover its slot while zoomed in nor wander out of it
 * while zoomed out.
 */
import {
  clampCrop,
  computePhotoPlacement,
  placementOverflow,
} from "../engine/geometry";
import type { CropState } from "../engine/types";

/** Below this an axis has no room to move — dividing by it would blow up. */
const MIN_OVERFLOW = 0.0001;

/**
 * Pan the crop by a drag of (dx, dy) in canvas pixels over the photo slot
 * frame. Dragging right moves the photo right (zoomed in: shows more of its
 * left side; zoomed out: slides it toward the frame's right edge). Axes with
 * no room to move (photo exactly as wide/tall as the frame) simply don't pan.
 */
export function panCrop(
  crop: CropState,
  dxCanvas: number,
  dyCanvas: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): CropState {
  const clamped = clampCrop(crop);
  const frame = { x: 0, y: 0, w: frameWidth, h: frameHeight };
  const placement = computePhotoPlacement(
    imageWidth,
    imageHeight,
    frame,
    clamped,
  );
  // The offset spans ±overflow canvas pixels, in both zoom regimes: zoomed in
  // it is the hidden part of the photo, zoomed out the gap it can slide into.
  const overflow = placementOverflow(placement, frame);
  return clampCrop({
    zoom: clamped.zoom,
    offsetX:
      Math.abs(overflow.x) > MIN_OVERFLOW
        ? clamped.offsetX - dxCanvas / overflow.x
        : clamped.offsetX,
    offsetY:
      Math.abs(overflow.y) > MIN_OVERFLOW
        ? clamped.offsetY - dyCanvas / overflow.y
        : clamped.offsetY,
  });
}

/**
 * Multiply the zoom by a factor: the ratio of current to initial finger
 * distance while pinching, or a fixed step from the "− Kleiner / + Größer"
 * buttons.
 */
export function zoomCrop(crop: CropState, factor: number): CropState {
  if (!Number.isFinite(factor) || factor <= 0) return clampCrop(crop);
  return clampCrop({ ...crop, zoom: crop.zoom * factor });
}
